import cron from "node-cron";
import { expireOldGiftCodes } from "./gift.service.js";

/**
 * Каждый час проверяем просроченные подарочные коды и возвращаем подписки дарителям.
 */
export function startGiftExpiryCron() {
  cron.schedule("15 * * * *", async () => {
    try {
      const expired = await expireOldGiftCodes();
      if (expired > 0) {
        console.log(`[gift-expiry] Expired ${expired} gift code(s)`);
      }
    } catch (e) {
      console.error("[gift-expiry] Error in cron job:", e);
    }
  });
}
