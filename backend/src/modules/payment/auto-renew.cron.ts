import cron from "node-cron";
import { prisma } from "../../db.js";
import { randomUUID } from "crypto";
import { activateTariffByPaymentId } from "../tariff/tariff-activation.service.js";
import { remnaGetUser, isRemnaConfigured } from "../remna/remna.client.js";
import { notifyAutoRenewSuccess, notifyAutoRenewFailed } from "../notification/telegram-notify.service.js";

// Run every hour at minute 0
export function startAutoRenewScheduler() {
  cron.schedule("0 * * * *", async () => {
    console.log("[auto-renew] Cron triggered, checking for subscriptions to renew...");
    try {
      await processAutoRenewals();
    } catch (e) {
      console.error("[auto-renew] Error in cron job:", e);
    }
  });
}

export async function processAutoRenewals() {
  if (!isRemnaConfigured()) {
    console.warn("[auto-renew] Remna is not configured. Skipping.");
    return;
  }

  // Find clients with autoRenewEnabled and an associated tariff
  const clients = await prisma.client.findMany({
    where: {
      autoRenewEnabled: true,
      autoRenewTariffId: { not: null },
      remnawaveUuid: { not: null },
      isBlocked: false,
    },
    include: { autoRenewTariff: true },
  });

  const now = Date.now();
  // 24 hours in milliseconds
  const RENEW_THRESHOLD = 24 * 60 * 60 * 1000;

  for (const client of clients) {
    if (!client.remnawaveUuid || !client.autoRenewTariff) continue;

    try {
      // Get current expireAt from Remna
      const remnaUser = await remnaGetUser(client.remnawaveUuid);
      if (remnaUser.error) {
        console.error(`[auto-renew] Failed to fetch remna user ${client.remnawaveUuid}:`, remnaUser.error);
        continue;
      }
      
      const userData = (remnaUser.data as any)?.response ?? (remnaUser.data as any);
      if (!userData || !userData.expireAt) continue;

      const expireAtDate = new Date(userData.expireAt);
      if (Number.isNaN(expireAtDate.getTime())) continue;

      const timeLeft = expireAtDate.getTime() - now;

      // Renew if less than 24 hours left, AND not expired more than 3 days ago (to prevent reviving ancient dead subs)
      // Actually, if it's already expired, Remnawave keeps it. Let's just say if timeLeft < 24 hours and timeLeft > - (3 * 24h)
      if (timeLeft <= RENEW_THRESHOLD && timeLeft >= -(3 * 24 * 60 * 60 * 1000)) {
        console.log(`[auto-renew] Client ${client.id} needs renewal. Balance: ${client.balance}, Price: ${client.autoRenewTariff.price}`);
        
        if (client.balance >= client.autoRenewTariff.price) {
          // Enough balance -> Renew
          
          // Deduct balance and create payment transaction
          await prisma.$transaction(async (tx) => {
            await tx.client.update({
              where: { id: client.id },
              data: { balance: { decrement: client.autoRenewTariff!.price } },
            });

            const payment = await tx.payment.create({
              data: {
                clientId: client.id,
                orderId: randomUUID(),
                amount: client.autoRenewTariff!.price,
                currency: client.autoRenewTariff!.currency.toUpperCase(),
                status: "PAID",
                provider: "balance",
                tariffId: client.autoRenewTariff!.id,
                paidAt: new Date(),
              },
            });

            const activationRes = await activateTariffByPaymentId(payment.id);
            if (!activationRes.ok) {
              throw new Error(`Activation failed: ${activationRes.error}`);
            }

            // Distribute referrals if possible
            import("../referral/referral.service.js")
              .then(m => m.distributeReferralRewards(payment.id))
              .catch(e => console.error("[auto-renew] Referral reward error:", e));
          });

          await notifyAutoRenewSuccess(client.id, client.autoRenewTariff.name, client.autoRenewTariff.price, client.autoRenewTariff.currency);
          console.log(`[auto-renew] Client ${client.id} successfully renewed.`);
        } else {
          // Not enough balance -> Disable auto-renew and notify
          await prisma.client.update({
            where: { id: client.id },
            data: { autoRenewEnabled: false },
          });
          await notifyAutoRenewFailed(client.id, client.autoRenewTariff.name, "balance");
          console.log(`[auto-renew] Client ${client.id} failed to renew due to insufficient balance.`);
        }
      }
    } catch (e) {
      console.error(`[auto-renew] Error processing client ${client.id}:`, e);
      // We can disable it on unexpected error to be safe, or leave it to try again next hour
      // For safety let's disable
      await prisma.client.update({
        where: { id: client.id },
        data: { autoRenewEnabled: false },
      }).catch(err => console.error("Failed to disable auto-renew on error:", err));
      
      await notifyAutoRenewFailed(client.id, client.autoRenewTariff.name, "error").catch(() => {});
    }
  }
}
