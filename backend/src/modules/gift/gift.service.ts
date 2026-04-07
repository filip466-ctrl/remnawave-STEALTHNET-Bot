/**
 * Сервис дополнительных подписок и подарков.
 *
 * Бизнес-логика:
 * 1. Покупка доп. подписки → создаётся дочерний Client (parentClientId → root),
 *    Remnawave-пользователь с суффиксом _1, _2, ...
 * 2. Подарить → генерируется 8-символьный код, подписка скрывается (giftStatus = GIFT_RESERVED)
 * 3. Активировать подарок → подписка переносится на получателя (parentClientId → recipient root)
 * 4. Отмена / экспирация → подписка возвращается дарителю
 */

import { randomBytes } from "crypto";
import { prisma } from "../../db.js";
import {
  remnaCreateUser,
  remnaUsernameFromClient,
  extractRemnaUuid,
  isRemnaConfigured,
  remnaGetUser,
  remnaUpdateUser,
} from "../remna/remna.client.js";
import { getSystemConfig } from "../client/client.service.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GiftResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

type SecondaryClient = {
  id: string;
  remnawaveUuid: string | null;
  subscriptionIndex: number | null;
  giftStatus: string | null;
  parentClientId: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Генерирует 8-символьный уникальный код (uppercase alphanumeric). */
function generateGiftCode(): string {
  return randomBytes(5)
    .toString("base64url")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 8)
    .toUpperCase();
}

/** Определяет следующий subscriptionIndex для данного root-клиента. */
async function getNextSubscriptionIndex(parentClientId: string): Promise<number> {
  const last = await prisma.client.findFirst({
    where: { parentClientId },
    orderBy: { subscriptionIndex: "desc" },
    select: { subscriptionIndex: true },
  });
  return (last?.subscriptionIndex ?? 0) + 1;
}

/** Генерирует Remnawave username для дочерней подписки: {rootUsername}_{index}. */
function secondaryRemnaUsername(
  rootClient: { telegramUsername?: string | null; telegramId?: string | null; email?: string | null; id: string },
  index: number,
): string {
  const base = remnaUsernameFromClient({
    telegramUsername: rootClient.telegramUsername,
    telegramId: rootClient.telegramId,
    email: rootClient.email,
    clientIdFallback: rootClient.id,
  });
  // Remnawave ограничение: 3-36 символов, [a-zA-Z0-9_-]
  const suffix = `_${index}`;
  return (base + suffix).slice(0, 36);
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Создаёт дополнительную подписку (дочерний Client + Remnawave user).
 * Вызывается ПОСЛЕ успешной оплаты тарифа (из webhook / оплата балансом).
 */
export async function createAdditionalSubscription(
  rootClientId: string,
  tariff: {
    durationDays: number;
    trafficLimitBytes: bigint | null;
    deviceLimit: number | null;
    internalSquadUuids: string[];
    trafficResetMode?: string;
  },
): Promise<GiftResult<{ secondaryClientId: string; subscriptionIndex: number }>> {
  if (!isRemnaConfigured()) {
    return { ok: false, error: "Сервис временно недоступен", status: 503 };
  }

  const config = await getSystemConfig();
  if (!config.giftSubscriptionsEnabled) {
    return { ok: false, error: "Дополнительные подписки отключены", status: 403 };
  }

  // Получаем root-клиента
  const rootClient = await prisma.client.findUnique({
    where: { id: rootClientId },
    select: {
      id: true,
      email: true,
      telegramId: true,
      telegramUsername: true,
      parentClientId: true,
    },
  });
  if (!rootClient) {
    return { ok: false, error: "Клиент не найден", status: 404 };
  }
  // Нельзя создавать доп. подписки из дочерней записи
  if (rootClient.parentClientId) {
    return { ok: false, error: "Доп. подписки доступны только для основного аккаунта", status: 400 };
  }

  // Проверяем лимит
  const existingCount = await prisma.client.count({
    where: { parentClientId: rootClientId },
  });
  if (existingCount >= config.maxAdditionalSubscriptions) {
    return {
      ok: false,
      error: `Максимум ${config.maxAdditionalSubscriptions} дополнительных подписок`,
      status: 400,
    };
  }

  // Определяем индекс
  const index = await getNextSubscriptionIndex(rootClientId);
  const username = secondaryRemnaUsername(rootClient, index);

  // Создаём пользователя в Remnawave (без telegramId/email — избегаем конфликтов уникальности)
  const trafficLimitBytes = tariff.trafficLimitBytes != null ? Number(tariff.trafficLimitBytes) : 0;
  const expireAt = new Date(Date.now() + tariff.durationDays * 24 * 60 * 60 * 1000).toISOString();

  const trafficResetMode = tariff.trafficResetMode || "no_reset";
  const trafficLimitStrategy =
    trafficResetMode === "monthly" ? "MONTH" : trafficResetMode === "monthly_rolling" ? "MONTH_ROLLING" : "NO_RESET";

  const createRes = await remnaCreateUser({
    username,
    trafficLimitBytes,
    trafficLimitStrategy,
    expireAt,
    hwidDeviceLimit: tariff.deviceLimit ?? undefined,
    activeInternalSquads: tariff.internalSquadUuids,
    // НЕ передаём telegramId и email — это вторичная подписка
  });

  const remnaUuid = extractRemnaUuid(createRes.data);
  if (!remnaUuid) {
    console.error("[gift] Remna createUser failed for secondary:", createRes.error, createRes.status);
    return { ok: false, error: "Ошибка создания VPN-пользователя", status: 502 };
  }

  // Создаём дочернюю запись Client
  const secondaryClient = await prisma.client.create({
    data: {
      parentClientId: rootClientId,
      subscriptionIndex: index,
      remnawaveUuid: remnaUuid,
      role: "CLIENT",
      // email, telegramId, passwordHash — null (secondary не имеет собственных credentials)
    },
  });

  return {
    ok: true,
    data: { secondaryClientId: secondaryClient.id, subscriptionIndex: index },
  };
}

/**
 * Список всех подписок клиента (основная + дополнительные).
 * Скрытые (giftStatus = GIFT_RESERVED) не включаются.
 */
export async function listClientSubscriptions(
  rootClientId: string,
): Promise<GiftResult<SecondaryClient[]>> {
  const secondaries = await prisma.client.findMany({
    where: {
      parentClientId: rootClientId,
      giftStatus: null, // не показываем зарезервированные под подарок
    },
    select: {
      id: true,
      remnawaveUuid: true,
      subscriptionIndex: true,
      giftStatus: true,
      parentClientId: true,
    },
    orderBy: { subscriptionIndex: "asc" },
  });
  return { ok: true, data: secondaries };
}

/**
 * Создаёт код подарка для конкретной дочерней подписки.
 * Помечает подписку как GIFT_RESERVED (скрывает из UI дарителя).
 */
export async function createGiftCode(
  rootClientId: string,
  secondaryClientId: string,
): Promise<GiftResult<{ code: string; expiresAt: Date }>> {
  const config = await getSystemConfig();
  if (!config.giftSubscriptionsEnabled) {
    return { ok: false, error: "Подарки отключены", status: 403 };
  }

  // Проверяем, что вторичная подписка принадлежит этому клиенту
  const secondary = await prisma.client.findUnique({
    where: { id: secondaryClientId },
    select: { id: true, parentClientId: true, giftStatus: true, remnawaveUuid: true },
  });
  if (!secondary || secondary.parentClientId !== rootClientId) {
    return { ok: false, error: "Подписка не найдена", status: 404 };
  }
  if (secondary.giftStatus === "GIFT_RESERVED") {
    return { ok: false, error: "Для этой подписки уже создан подарок", status: 409 };
  }

  // Проверяем, нет ли активного кода для этой подписки
  const existingCode = await prisma.giftCode.findFirst({
    where: {
      secondaryClientId,
      status: "ACTIVE",
    },
  });
  if (existingCode) {
    return { ok: false, error: "Активный код для этой подписки уже существует", status: 409 };
  }

  // Генерируем уникальный код
  let code = generateGiftCode();
  let attempts = 0;
  while (attempts < 10) {
    const exists = await prisma.giftCode.findUnique({ where: { code } });
    if (!exists) break;
    code = generateGiftCode();
    attempts++;
  }
  if (attempts >= 10) {
    return { ok: false, error: "Не удалось сгенерировать уникальный код", status: 500 };
  }

  const expiresAt = new Date(Date.now() + config.giftCodeExpiryHours * 60 * 60 * 1000);

  // Транзакция: создаём код + помечаем подписку как зарезервированную
  await prisma.$transaction([
    prisma.giftCode.create({
      data: {
        code,
        creatorId: rootClientId,
        secondaryClientId,
        status: "ACTIVE",
        expiresAt,
      },
    }),
    prisma.client.update({
      where: { id: secondaryClientId },
      data: { giftStatus: "GIFT_RESERVED" },
    }),
  ]);

  return { ok: true, data: { code, expiresAt } };
}

/**
 * Активирует подарок: переносит дочернюю подписку на получателя.
 * Транзакция: обновляем GiftCode + перепривязываем Client.
 */
export async function redeemGiftCode(
  recipientRootClientId: string,
  code: string,
): Promise<GiftResult<{ secondaryClientId: string; subscriptionIndex: number }>> {
  const config = await getSystemConfig();
  if (!config.giftSubscriptionsEnabled) {
    return { ok: false, error: "Подарки отключены", status: 403 };
  }

  // Находим код
  const giftCode = await prisma.giftCode.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      creator: { select: { id: true } },
    },
  });
  if (!giftCode) {
    return { ok: false, error: "Код не найден", status: 404 };
  }
  if (giftCode.status !== "ACTIVE") {
    const statusMsg: Record<string, string> = {
      REDEEMED: "Код уже использован",
      EXPIRED: "Код истёк",
      CANCELLED: "Код отменён",
    };
    return { ok: false, error: statusMsg[giftCode.status] ?? "Код недействителен", status: 400 };
  }
  if (giftCode.expiresAt < new Date()) {
    // Автоматически помечаем как expired
    await expireGiftCode(giftCode.id, giftCode.secondaryClientId);
    return { ok: false, error: "Код истёк", status: 400 };
  }

  // Нельзя подарить самому себе
  if (giftCode.creatorId === recipientRootClientId) {
    return { ok: false, error: "Нельзя использовать свой собственный подарочный код", status: 400 };
  }

  // Проверяем получателя
  const recipient = await prisma.client.findUnique({
    where: { id: recipientRootClientId },
    select: { id: true, parentClientId: true },
  });
  if (!recipient) {
    return { ok: false, error: "Получатель не найден", status: 404 };
  }
  if (recipient.parentClientId) {
    return { ok: false, error: "Получить подарок может только основной аккаунт", status: 400 };
  }

  // Проверяем лимит у получателя
  const recipientSubCount = await prisma.client.count({
    where: { parentClientId: recipientRootClientId },
  });
  if (recipientSubCount >= config.maxAdditionalSubscriptions) {
    return {
      ok: false,
      error: `У получателя уже максимум дополнительных подписок (${config.maxAdditionalSubscriptions})`,
      status: 400,
    };
  }

  // Определяем новый индекс у получателя
  const newIndex = await getNextSubscriptionIndex(recipientRootClientId);

  // Транзакция: активируем код + перепривязываем подписку
  await prisma.$transaction([
    prisma.giftCode.update({
      where: { id: giftCode.id },
      data: {
        status: "REDEEMED",
        redeemedById: recipientRootClientId,
        redeemedAt: new Date(),
      },
    }),
    prisma.client.update({
      where: { id: giftCode.secondaryClientId },
      data: {
        parentClientId: recipientRootClientId,
        subscriptionIndex: newIndex,
        giftStatus: null, // снимаем резерв, подписка снова видна
      },
    }),
  ]);

  return {
    ok: true,
    data: { secondaryClientId: giftCode.secondaryClientId, subscriptionIndex: newIndex },
  };
}

/**
 * Отменяет подарочный код: снимает резерв, возвращает подписку дарителю.
 */
export async function cancelGiftCode(
  rootClientId: string,
  codeOrId: string,
): Promise<GiftResult> {
  // Ищем по коду или id
  const giftCode = await prisma.giftCode.findFirst({
    where: {
      OR: [
        { code: codeOrId.toUpperCase() },
        { id: codeOrId },
      ],
      creatorId: rootClientId,
      status: "ACTIVE",
    },
  });
  if (!giftCode) {
    return { ok: false, error: "Активный код не найден", status: 404 };
  }

  await prisma.$transaction([
    prisma.giftCode.update({
      where: { id: giftCode.id },
      data: { status: "CANCELLED" },
    }),
    prisma.client.update({
      where: { id: giftCode.secondaryClientId },
      data: { giftStatus: null }, // снимаем резерв
    }),
  ]);

  return { ok: true, data: undefined };
}

/**
 * Помечает код как истёкший и снимает резерв с подписки.
 * Вызывается из cron-задачи или при попытке использования просроченного кода.
 */
async function expireGiftCode(giftCodeId: string, secondaryClientId: string): Promise<void> {
  await prisma.$transaction([
    prisma.giftCode.update({
      where: { id: giftCodeId },
      data: { status: "EXPIRED" },
    }),
    prisma.client.update({
      where: { id: secondaryClientId },
      data: { giftStatus: null },
    }),
  ]);
}

/**
 * Cron-задача: обрабатывает все просроченные активные коды.
 * Рекомендуется запускать раз в час.
 */
export async function expireOldGiftCodes(): Promise<number> {
  const expiredCodes = await prisma.giftCode.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: new Date() },
    },
    select: { id: true, secondaryClientId: true },
  });

  for (const gc of expiredCodes) {
    await expireGiftCode(gc.id, gc.secondaryClientId);
  }

  if (expiredCodes.length > 0) {
    console.log(`[gift] Expired ${expiredCodes.length} gift codes`);
  }

  return expiredCodes.length;
}

/**
 * Список подарочных кодов, созданных клиентом (для UI «Мои подарки»).
 */
export async function listGiftCodes(
  rootClientId: string,
): Promise<GiftResult<Array<{
  id: string;
  code: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  redeemedAt: Date | null;
  secondaryClientId: string;
}>>> {
  const codes = await prisma.giftCode.findMany({
    where: { creatorId: rootClientId },
    select: {
      id: true,
      code: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      redeemedAt: true,
      secondaryClientId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return { ok: true, data: codes };
}

/**
 * Получает Remnawave subscription URL для конкретной подписки (дочерней).
 */
export async function getSubscriptionUrl(
  secondaryClientId: string,
  rootClientId: string,
): Promise<GiftResult<{ uuid: string }>> {
  const secondary = await prisma.client.findUnique({
    where: { id: secondaryClientId },
    select: { parentClientId: true, remnawaveUuid: true, giftStatus: true },
  });

  if (!secondary || secondary.parentClientId !== rootClientId) {
    return { ok: false, error: "Подписка не найдена", status: 404 };
  }
  if (secondary.giftStatus === "GIFT_RESERVED") {
    return { ok: false, error: "Подписка зарезервирована как подарок", status: 400 };
  }
  if (!secondary.remnawaveUuid) {
    return { ok: false, error: "VPN-пользователь не создан", status: 400 };
  }

  return { ok: true, data: { uuid: secondary.remnawaveUuid } };
}
