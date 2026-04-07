/**
 * Роуты дополнительных подписок и подарков.
 *
 * Все эндпоинты защищены requireClientAuth (монтируется в app.ts).
 * Клиент ID берётся из req.clientId (проставляется middleware).
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  createAdditionalSubscription,
  listClientSubscriptions,
  createGiftCode,
  redeemGiftCode,
  cancelGiftCode,
  listGiftCodes,
  getSubscriptionUrl,
} from "./gift.service.js";
import { requireClientAuth } from "../client/client.middleware.js";
import { prisma } from "../../db.js";
import { randomUUID } from "crypto";

export const giftRouter = Router();

// Все эндпоинты требуют авторизации клиента
giftRouter.use(requireClientAuth);

// ─── Типизация req ───────────────────────────────────────────────────────────

type AuthedReq = Request & { clientId: string };

// ─── Validation Schemas ──────────────────────────────────────────────────────

const buySchema = z.object({
  tariffId: z.string().min(1, "tariffId обязателен"),
});

const createCodeSchema = z.object({
  secondaryClientId: z.string().min(1, "secondaryClientId обязателен"),
});

const redeemSchema = z.object({
  code: z.string().min(1, "Код обязателен").max(20),
});

// ─── POST /buy — Покупка дополнительной подписки (оплата балансом) ────────────

giftRouter.post("/buy", async (req: Request, res: Response) => {
  const clientId = (req as AuthedReq).clientId;

  const body = buySchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ message: "Некорректные данные", errors: body.error.flatten() });
  }

  // Получаем тариф
  const tariff = await prisma.tariff.findUnique({
    where: { id: body.data.tariffId },
    select: {
      id: true,
      price: true,
      currency: true,
      durationDays: true,
      trafficLimitBytes: true,
      deviceLimit: true,
      internalSquadUuids: true,
      trafficResetMode: true,
    },
  });

  if (!tariff) {
    return res.status(404).json({ message: "Тариф не найден" });
  }

  // Проверяем баланс
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { balance: true },
  });
  if (!client) {
    return res.status(404).json({ message: "Клиент не найден" });
  }

  const price = Number(tariff.price);
  if (client.balance < price) {
    return res.status(400).json({ message: "Недостаточно средств на балансе" });
  }

  // Списываем баланс
  await prisma.client.update({
    where: { id: clientId },
    data: { balance: { decrement: price } },
  });

  // Создаём дополнительную подписку
  const result = await createAdditionalSubscription(clientId, {
    durationDays: tariff.durationDays,
    trafficLimitBytes: tariff.trafficLimitBytes,
    deviceLimit: tariff.deviceLimit,
    internalSquadUuids: tariff.internalSquadUuids,
    trafficResetMode: tariff.trafficResetMode ?? undefined,
  });

  if (!result.ok) {
    // Возвращаем баланс при ошибке
    await prisma.client.update({
      where: { id: clientId },
      data: { balance: { increment: price } },
    });
    return res.status(result.status).json({ message: result.error });
  }

  // Создаём запись Payment для истории
  await prisma.payment.create({
    data: {
      clientId,
      orderId: randomUUID(),
      tariffId: tariff.id,
      amount: tariff.price,
      currency: tariff.currency.toUpperCase(),
      status: "COMPLETED",
      provider: "BALANCE",
      paidAt: new Date(),
    },
  });

  return res.json({
    message: "Дополнительная подписка создана",
    ...result.data,
  });
});

// ─── GET /subscriptions — Список подписок клиента ────────────────────────────

giftRouter.get("/subscriptions", async (req: Request, res: Response) => {
  const clientId = (req as AuthedReq).clientId;

  const result = await listClientSubscriptions(clientId);
  if (!result.ok) {
    return res.status(result.status).json({ message: result.error });
  }

  return res.json({ subscriptions: result.data });
});

// ─── POST /create-code — Создать подарочный код ──────────────────────────────

giftRouter.post("/create-code", async (req: Request, res: Response) => {
  const clientId = (req as AuthedReq).clientId;

  const body = createCodeSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ message: "Некорректные данные", errors: body.error.flatten() });
  }

  const result = await createGiftCode(clientId, body.data.secondaryClientId);
  if (!result.ok) {
    return res.status(result.status).json({ message: result.error });
  }

  return res.json({
    message: "Подарочный код создан",
    code: result.data.code,
    expiresAt: result.data.expiresAt,
  });
});

// ─── POST /redeem — Активировать подарочный код ──────────────────────────────

giftRouter.post("/redeem", async (req: Request, res: Response) => {
  const clientId = (req as AuthedReq).clientId;

  const body = redeemSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ message: "Некорректные данные", errors: body.error.flatten() });
  }

  const result = await redeemGiftCode(clientId, body.data.code);
  if (!result.ok) {
    return res.status(result.status).json({ message: result.error });
  }

  return res.json({
    message: "Подарок активирован!",
    ...result.data,
  });
});

// ─── DELETE /cancel/:codeOrId — Отменить подарочный код ──────────────────────

giftRouter.delete("/cancel/:codeOrId", async (req: Request, res: Response) => {
  const clientId = (req as AuthedReq).clientId;
  const { codeOrId } = req.params;

  const result = await cancelGiftCode(clientId, codeOrId);
  if (!result.ok) {
    return res.status(result.status).json({ message: result.error });
  }

  return res.json({ message: "Подарочный код отменён" });
});

// ─── GET /codes — Список подарочных кодов клиента ────────────────────────────

giftRouter.get("/codes", async (req: Request, res: Response) => {
  const clientId = (req as AuthedReq).clientId;

  const result = await listGiftCodes(clientId);
  if (!result.ok) {
    return res.status(result.status).json({ message: result.error });
  }

  return res.json({ codes: result.data });
});

// ─── GET /subscription-url/:id — URL подписки (Remnawave UUID) ───────────────

giftRouter.get("/subscription-url/:id", async (req: Request, res: Response) => {
  const clientId = (req as AuthedReq).clientId;
  const secondaryClientId = req.params.id;

  const result = await getSubscriptionUrl(secondaryClientId, clientId);
  if (!result.ok) {
    return res.status(result.status).json({ message: result.error });
  }

  return res.json({ uuid: result.data.uuid });
});
