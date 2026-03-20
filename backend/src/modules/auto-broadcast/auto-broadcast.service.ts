/**
 * Авто-рассылка: настраиваемые правила (после регистрации, неактивность, без платежа и т.д.).
 * Джоб выбирает подходящих клиентов, отправляет сообщение и пишет лог.
 *
 * Триггеры делятся на два типа:
 *  - ONE-TIME: отправляется клиенту один раз за всё время (after_registration, no_payment,
 *              trial_not_connected, trial_used_never_paid, no_traffic)
 *  - RECURRING: может отправляться повторно, если условие снова наступило — дедупликация
 *              за последние RECURRING_COOLDOWN_DAYS дней (inactivity, subscription_expired,
 *              subscription_ending_soon)
 */

import { prisma } from "../../db.js";
import { getSystemConfig } from "../client/client.service.js";
import { sendEmail } from "../mail/mail.service.js";

/** Задержка между Telegram-сообщениями (мс). Telegram rate limit ~30 msg/sec, берём с запасом. */
const TELEGRAM_DELAY_MS = 50;
/** Задержка между email-сообщениями (мс). */
const EMAIL_DELAY_MS = 200;
/**
 * Для recurring-триггеров: кулдаун в днях. Если клиенту уже отправлялось это правило
 * в пределах кулдауна — пропускаем. Предотвращает спам при каждом запуске cron.
 */
const RECURRING_COOLDOWN_DAYS = 30;

const LOG_PREFIX = "[auto-broadcast]";

export type TriggerType =
  | "after_registration"
  | "inactivity"
  | "no_payment"
  | "trial_not_connected"
  | "trial_used_never_paid"
  | "no_traffic"
  | "subscription_expired"
  | "subscription_ending_soon";

/** Recurring-триггеры — могут повторяться, дедупликация по кулдауну */
const RECURRING_TRIGGERS: Set<TriggerType> = new Set([
  "inactivity",
  "subscription_expired",
  "subscription_ending_soon",
]);

function isRecurring(trigger: string): boolean {
  return RECURRING_TRIGGERS.has(trigger as TriggerType);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Telegram send ────────────────────────────────────────────────

async function sendTelegram(botToken: string, chatId: string, text: string): Promise<boolean> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!res.ok || !data.ok) {
      console.warn(`${LOG_PREFIX} Telegram send failed for chat ${chatId}: ${data.description ?? res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`${LOG_PREFIX} Telegram send error for chat ${chatId}:`, err);
    return false;
  }
}

// ─── Dedup helpers ────────────────────────────────────────────────

/** Для ONE-TIME триггеров: получить Set клиентов, которым уже КОГДА-ЛИБО отправлялось это правило */
async function getEverSentClientIds(ruleId: string): Promise<Set<string>> {
  const logs = await prisma.autoBroadcastLog.findMany({
    where: { ruleId },
    select: { clientId: true },
    distinct: ["clientId"],
  });
  return new Set(logs.map((l) => l.clientId));
}

/** Для RECURRING триггеров: получить Set клиентов, которым отправлялось за последние N дней */
async function getRecentlySentClientIds(ruleId: string, cooldownDays: number): Promise<Set<string>> {
  const since = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);
  const logs = await prisma.autoBroadcastLog.findMany({
    where: { ruleId, sentAt: { gte: since } },
    select: { clientId: true },
    distinct: ["clientId"],
  });
  return new Set(logs.map((l) => l.clientId));
}

// ─── Eligible clients ─────────────────────────────────────────────

/**
 * Получить ID клиентов, подходящих под правило (с учётом дедупликации).
 */
export async function getEligibleClientIds(ruleId: string): Promise<string[]> {
  const rule = await prisma.autoBroadcastRule.findUnique({
    where: { id: ruleId },
  });
  if (!rule) return [];

  // Получаем sent-set в зависимости от типа триггера
  const sentSet = isRecurring(rule.triggerType)
    ? await getRecentlySentClientIds(ruleId, RECURRING_COOLDOWN_DAYS)
    : await getEverSentClientIds(ruleId);

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  let clients: { id: string }[] = [];

  switch (rule.triggerType as TriggerType) {
    // ── after_registration ──────────────────────────────────────
    // Зарегистрирован N дней назад (или ранее). Широкое окно: от 0 до now-delayDays.
    // Дедупликация через sentSet (one-time) гарантирует однократную отправку.
    case "after_registration": {
      const registeredBefore = new Date(now.getTime() - rule.delayDays * dayMs);
      clients = await prisma.client.findMany({
        where: { createdAt: { lte: registeredBefore }, isBlocked: false },
        select: { id: true },
      });
      break;
    }

    // ── inactivity ──────────────────────────────────────────────
    // Нет оплат за последние N дней. Recurring: может повторяться.
    case "inactivity": {
      const since = new Date(now.getTime() - rule.delayDays * dayMs);
      const paidClientIds = await prisma.payment.findMany({
        where: { status: "PAID", paidAt: { gte: since } },
        select: { clientId: true },
        distinct: ["clientId"],
      });
      const activeSet = new Set(paidClientIds.map((p) => p.clientId));
      const all = await prisma.client.findMany({
        where: { isBlocked: false, createdAt: { lt: since } },
        select: { id: true },
      });
      clients = all.filter((c) => !activeSet.has(c.id));
      break;
    }

    // ── no_payment ──────────────────────────────────────────────
    // Зарегистрирован N дней назад, ни разу не платил. Широкое окно + one-time.
    case "no_payment": {
      const registeredBefore = new Date(now.getTime() - rule.delayDays * dayMs);
      clients = await prisma.client.findMany({
        where: {
          isBlocked: false,
          createdAt: { lte: registeredBefore },
          payments: { none: { status: "PAID" } },
        },
        select: { id: true },
      });
      break;
    }

    // ── trial_not_connected ─────────────────────────────────────
    // Зарегистрирован N дней назад, триал не подключал. One-time.
    case "trial_not_connected": {
      const registeredBefore = new Date(now.getTime() - rule.delayDays * dayMs);
      clients = await prisma.client.findMany({
        where: {
          isBlocked: false,
          createdAt: { lte: registeredBefore },
          trialUsed: false,
          remnawaveUuid: null,
        },
        select: { id: true },
      });
      break;
    }

    // ── trial_used_never_paid ───────────────────────────────────
    // Пользовался триалом, но ни разу не платил. One-time.
    case "trial_used_never_paid": {
      const registeredBefore = new Date(now.getTime() - rule.delayDays * dayMs);
      clients = await prisma.client.findMany({
        where: {
          isBlocked: false,
          createdAt: { lte: registeredBefore },
          trialUsed: true,
          payments: { none: { status: "PAID" } },
        },
        select: { id: true },
      });
      break;
    }

    // ── no_traffic ──────────────────────────────────────────────
    // Подключён к VPN (есть remnawaveUuid) N дней, напоминание. One-time.
    case "no_traffic": {
      const registeredBefore = new Date(now.getTime() - rule.delayDays * dayMs);
      clients = await prisma.client.findMany({
        where: {
          isBlocked: false,
          remnawaveUuid: { not: null },
          createdAt: { lte: registeredBefore },
        },
        select: { id: true },
      });
      break;
    }

    // ── subscription_expired ────────────────────────────────────
    // Подписка истекла (N дней назад или ранее). Recurring.
    case "subscription_expired": {
      const paidWithTariff = await prisma.payment.findMany({
        where: { status: "PAID", tariffId: { not: null }, paidAt: { not: null } },
        select: { clientId: true, paidAt: true, tariff: { select: { durationDays: true } } },
        orderBy: { paidAt: "desc" },
      });
      // Для каждого клиента берём последний платёж → считаем expiry
      const clientLastExpire = new Map<string, Date>();
      for (const p of paidWithTariff) {
        if (p.clientId && p.paidAt && p.tariff?.durationDays != null && !clientLastExpire.has(p.clientId)) {
          const expireAt = new Date(p.paidAt.getTime() + p.tariff.durationDays * dayMs);
          clientLastExpire.set(p.clientId, expireAt);
        }
      }
      const expiredIds: string[] = [];
      const expiredSince = rule.delayDays > 0
        ? new Date(now.getTime() - rule.delayDays * dayMs)
        : now;
      for (const [clientId, expireAt] of clientLastExpire) {
        if (expireAt <= expiredSince) {
          expiredIds.push(clientId);
        }
      }
      // Фильтруем заблокированных
      const blockedSet = new Set(
        (await prisma.client.findMany({ where: { isBlocked: true }, select: { id: true } })).map((c) => c.id),
      );
      clients = expiredIds.filter((id) => !blockedSet.has(id)).map((id) => ({ id }));
      break;
    }

    // ── subscription_ending_soon ────────────────────────────────
    // Подписка заканчивается через N дней. Recurring (за N, N-1, ... дней).
    // delayDays не ограничен хардкодом 1-3 — можно уведомлять за любое количество дней.
    case "subscription_ending_soon": {
      const daysLeft = Math.max(1, rule.delayDays);
      const windowStart = new Date(now.getTime() + (daysLeft - 1) * dayMs);
      const windowEnd = new Date(now.getTime() + daysLeft * dayMs);
      const paidWithTariff = await prisma.payment.findMany({
        where: { status: "PAID", tariffId: { not: null }, paidAt: { not: null } },
        select: { clientId: true, paidAt: true, tariff: { select: { durationDays: true } } },
        orderBy: { paidAt: "desc" },
      });
      const clientLastExpire = new Map<string, Date>();
      for (const p of paidWithTariff) {
        if (p.clientId && p.paidAt && p.tariff?.durationDays != null && !clientLastExpire.has(p.clientId)) {
          const expireAt = new Date(p.paidAt.getTime() + p.tariff.durationDays * dayMs);
          clientLastExpire.set(p.clientId, expireAt);
        }
      }
      const endingSoonIds: string[] = [];
      for (const [clientId, expireAt] of clientLastExpire) {
        if (expireAt >= windowStart && expireAt < windowEnd) {
          endingSoonIds.push(clientId);
        }
      }
      const blockedSet = new Set(
        (await prisma.client.findMany({ where: { isBlocked: true }, select: { id: true } })).map((c) => c.id),
      );
      clients = endingSoonIds.filter((id) => !blockedSet.has(id)).map((id) => ({ id }));
      break;
    }

    default:
      console.warn(`${LOG_PREFIX} Unknown trigger type: ${rule.triggerType}`);
      return [];
  }

  // Убираем уже отправленных (one-time = навсегда, recurring = за кулдаун)
  const eligible = clients.map((c) => c.id).filter((id) => !sentSet.has(id));

  console.log(
    `${LOG_PREFIX} Rule "${rule.name}" (${rule.triggerType}, delay=${rule.delayDays}): ` +
    `${clients.length} matched, ${sentSet.size} already sent, ${eligible.length} eligible`,
  );

  return eligible;
}

// ─── Run rule ─────────────────────────────────────────────────────

export type RunRuleResult = {
  ruleId: string;
  ruleName: string;
  sent: number;
  errors: string[];
};

/**
 * Выполнить одно правило: отправить сообщение подходящим клиентам и записать лог.
 */
export async function runRule(ruleId: string): Promise<RunRuleResult> {
  const rule = await prisma.autoBroadcastRule.findUnique({ where: { id: ruleId } });
  if (!rule) return { ruleId, ruleName: "", sent: 0, errors: ["Rule not found"] };
  if (!rule.enabled) return { ruleId, ruleName: rule.name, sent: 0, errors: [] };

  const clientIds = await getEligibleClientIds(ruleId);
  if (clientIds.length === 0) {
    return { ruleId, ruleName: rule.name, sent: 0, errors: [] };
  }

  const config = await getSystemConfig();
  const doTelegram = rule.channel === "telegram" || rule.channel === "both";
  const doEmail = rule.channel === "email" || rule.channel === "both";
  const botToken = config.telegramBotToken?.trim();

  // Проверка конфигурации каналов
  if (doTelegram && !botToken) {
    console.error(
      `${LOG_PREFIX} Rule "${rule.name}": telegram channel selected but telegram_bot_token is not configured in settings!`,
    );
  }

  const smtpConfig = doEmail
    ? {
        host: config.smtpHost || "",
        port: config.smtpPort ?? 587,
        secure: config.smtpSecure ?? false,
        user: config.smtpUser ?? null,
        password: config.smtpPassword ?? null,
        fromEmail: config.smtpFromEmail ?? null,
        fromName: config.smtpFromName ?? null,
      }
    : null;

  if (doEmail && (!smtpConfig?.host || !smtpConfig?.fromEmail)) {
    console.error(
      `${LOG_PREFIX} Rule "${rule.name}": email channel selected but SMTP is not configured (host or fromEmail missing)!`,
    );
  }

  const serviceName = config.serviceName || "Сервис";
  const subject = rule.subject?.trim() || `Сообщение от ${serviceName}`;
  const htmlMessage = rule.message.trim().replace(/\n/g, "<br>\n");
  const htmlBody = `<!DOCTYPE html><html><body style="font-family: sans-serif;">${htmlMessage}</body></html>`;

  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, telegramId: true, email: true },
  });

  let sent = 0;
  const errors: string[] = [];

  console.log(`${LOG_PREFIX} Rule "${rule.name}": sending to ${clients.length} clients...`);

  for (const c of clients) {
    let telegramOk = false;
    let emailOk = false;

    // Telegram
    if (doTelegram && botToken && c.telegramId?.trim()) {
      telegramOk = await sendTelegram(botToken, c.telegramId.trim(), rule.message.trim());
      if (!telegramOk && errors.length < 20) {
        errors.push(`Telegram fail: client ${c.id}`);
      }
      await delay(TELEGRAM_DELAY_MS);
    }

    // Email
    if (doEmail && smtpConfig?.host && smtpConfig?.fromEmail && c.email?.trim()) {
      try {
        const res = await sendEmail(smtpConfig, c.email.trim(), subject, htmlBody);
        emailOk = res.ok;
        if (!emailOk && errors.length < 20) {
          errors.push(`Email fail: ${c.email}`);
        }
      } catch (err) {
        if (errors.length < 20) {
          errors.push(`Email error: ${c.email} — ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      await delay(EMAIL_DELAY_MS);
    }

    const anySent = telegramOk || emailOk;
    if (anySent) {
      try {
        await prisma.autoBroadcastLog.create({
          data: { ruleId: rule.id, clientId: c.id },
        });
      } catch (logErr) {
        // Если лог не записался — не прерываем рассылку
        console.error(`${LOG_PREFIX} Failed to write log for rule ${rule.id}, client ${c.id}:`, logErr);
      }
      sent++;
    }
  }

  console.log(
    `${LOG_PREFIX} Rule "${rule.name}" done: ${sent}/${clients.length} sent` +
    (errors.length > 0 ? `, ${errors.length} error(s)` : ""),
  );

  return { ruleId, ruleName: rule.name, sent, errors };
}

// ─── Run all rules ────────────────────────────────────────────────

/**
 * Запустить все включённые правила.
 */
export async function runAllRules(): Promise<RunRuleResult[]> {
  const rules = await prisma.autoBroadcastRule.findMany({
    where: { enabled: true },
    select: { id: true, name: true },
  });

  if (rules.length === 0) {
    console.log(`${LOG_PREFIX} No enabled rules found.`);
    return [];
  }

  console.log(`${LOG_PREFIX} Running ${rules.length} enabled rule(s)...`);

  const results: RunRuleResult[] = [];
  for (const r of rules) {
    try {
      const res = await runRule(r.id);
      results.push(res);
    } catch (err) {
      console.error(`${LOG_PREFIX} Rule "${r.name}" (${r.id}) crashed:`, err);
      results.push({
        ruleId: r.id,
        ruleName: r.name,
        sent: 0,
        errors: [err instanceof Error ? err.message : String(err)],
      });
    }
  }

  const totalSent = results.reduce((s, r) => s + r.sent, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);
  console.log(`${LOG_PREFIX} All rules done: ${totalSent} sent, ${totalErrors} error(s)`);

  return results;
}
