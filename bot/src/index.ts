/**
 * STEALTHNET 3.0 — Telegram-бот
 * Полный функционал кабинета: главная, тарифы, профиль, пополнение, триал, реферальная ссылка, VPN.
 * Цветные кнопки: style primary / success / danger (Telegram Bot API).
 */

import "dotenv/config";
import { Bot, InputFile } from "grammy";
import * as api from "./api.js";
import {
  mainMenu,
  backToMenu,
  supportSubMenu,
  topUpPresets,
  tariffPayButtons,
  tariffsOfCategoryButtons,
  tariffPaymentMethodButtons,
  proxyTariffPayButtons,
  proxyTariffsOfCategoryButtons,
  proxyCategoryButtons,
  proxyPaymentMethodButtons,
  singboxTariffPayButtons,
  singboxTariffsOfCategoryButtons,
  singboxPaymentMethodButtons,
  topupPaymentMethodButtons,
  payUrlMarkup,
  profileButtons,
  extraOptionsButtons,
  optionPaymentMethodButtons,
  langButtons,
  currencyButtons,
  trialConfirmButton,
  openSubscribePageMarkup,
  type InlineMarkup,
  type InnerEmojiIds,
} from "./keyboard.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("Set BOT_TOKEN in .env");
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

let BOT_USERNAME = "";

// ——— Принудительная подписка на канал ———

type SubscriptionCheckState = "subscribed" | "not_subscribed" | "cannot_verify";

type ForceChannelTarget = {
  chatId: string | null;
  joinUrl: string | null;
};

function parseForceChannelTarget(channelInput: string): ForceChannelTarget {
  const raw = channelInput.trim();
  if (!raw) return { chatId: null, joinUrl: null };

  const looksLikeUrl = /^https?:\/\//i.test(raw) || /^t\.me\//i.test(raw);
  if (looksLikeUrl) {
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const u = new URL(candidate);
      const hostOk = u.hostname === "t.me" || u.hostname.endsWith(".t.me");
      const path = u.pathname.replace(/^\/+|\/+$/g, "");
      if (hostOk && path) {
        if (path.startsWith("c/")) {
          const idPart = path.slice(2).split("/")[0];
          if (/^\d+$/.test(idPart)) {
            return { chatId: `-100${idPart}`, joinUrl: candidate };
          }
        }
        if (path.startsWith("+") || path.startsWith("joinchat/")) {
          return { chatId: null, joinUrl: candidate };
        }
        const uname = path.split("/")[0];
        if (/^[a-zA-Z0-9_]{5,}$/.test(uname)) {
          return { chatId: `@${uname}`, joinUrl: `https://t.me/${uname}` };
        }
      }
    } catch {
      // fallthrough
    }
  }

  if (raw.startsWith("@")) {
    const uname = raw.slice(1);
    if (/^[a-zA-Z0-9_]{5,}$/.test(uname)) {
      return { chatId: `@${uname}`, joinUrl: `https://t.me/${uname}` };
    }
  }

  if (/^[a-zA-Z0-9_]{5,}$/.test(raw)) {
    return { chatId: `@${raw}`, joinUrl: `https://t.me/${raw}` };
  }

  if (/^-?\d+$/.test(raw)) {
    const joinUrl = raw.startsWith("-100") ? `https://t.me/c/${raw.slice(4)}` : null;
    return { chatId: raw, joinUrl };
  }

  return { chatId: null, joinUrl: null };
}

/** Проверяет, подписан ли пользователь на указанный канал/группу. */
async function checkUserSubscription(userId: number, channelInput: string): Promise<{ state: SubscriptionCheckState; target: ForceChannelTarget; error?: string }> {
  const target = parseForceChannelTarget(channelInput);
  if (!target.chatId) {
    return { state: "cannot_verify", target, error: "invalid_channel_id" };
  }
  try {
    const member = await bot.api.getChatMember(target.chatId, userId);
    const subscribed = ["member", "administrator", "creator", "restricted"].includes(member.status);
    return { state: subscribed ? "subscribed" : "not_subscribed", target };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn("getChatMember error:", msg, { channelInput, parsedChatId: target.chatId });
    return { state: "cannot_verify", target, error: msg };
  }
}

/** Генерирует клавиатуру «Подписаться + Проверить подписку» */
function subscribeKeyboard(channelInput: string): InlineMarkup {
  const target = parseForceChannelTarget(channelInput);
  const rows: InlineMarkup["inline_keyboard"] = [];
  if (target.joinUrl) {
    rows.push([{ text: "📢 Подписаться на канал", url: target.joinUrl }]);
  }
  rows.push([{ text: "✅ Я подписался", callback_data: "check_subscribe" }]);
  return { inline_keyboard: rows };
}

/**
 * Проверяет подписку и, если не подписан, отправляет/редактирует сообщение.
 * Возвращает true если НЕ подписан (нужно прервать обработку).
 */
async function enforceSubscription(
  ctx: {
    from?: { id: number };
    reply: (text: string, opts?: { reply_markup?: InlineMarkup }) => Promise<unknown>;
  },
  config: Awaited<ReturnType<typeof api.getPublicConfig>>,
): Promise<boolean> {
  if (!config?.forceSubscribeEnabled) return false;
  const channelId = config.forceSubscribeChannelId?.trim();
  if (!channelId) return false;
  const userId = ctx.from?.id;
  if (!userId) return false;
  const result = await checkUserSubscription(userId, channelId);
  if (result.state === "subscribed") return false;
  const msg = config.forceSubscribeMessage?.trim() || "Для использования бота подпишитесь на наш канал:";
  if (result.state === "cannot_verify") {
    await ctx.reply(
      `⚠️ ${msg}\n\nПроверка подписки сейчас недоступна. Сообщите администратору: бот должен быть администратором канала, а в настройках должен быть указан корректный ID или @username.`,
      { reply_markup: subscribeKeyboard(channelId) }
    );
    return true;
  }
  await ctx.reply(`⚠️ ${msg}`, { reply_markup: subscribeKeyboard(channelId) });
  return true;
}

type TariffItem = { id: string; name: string; price: number; currency: string };
type TariffCategory = { id: string; name: string; emoji?: string; emojiKey?: string | null; tariffs: TariffItem[] };

// Токены по telegram_id (в памяти; для продакшена лучше Redis/БД)
const tokenStore = new Map<number, string>();

function getToken(userId: number): string | undefined {
  return tokenStore.get(userId);
}

function setToken(userId: number, token: string): void {
  tokenStore.set(userId, token);
}

// Пользователи, ожидающие ввода промокода
const awaitingPromoCode = new Set<number>();

/** Достаём subscriptionUrl из ответа Remna */
function getSubscriptionUrl(sub: unknown): string | null {
  if (!sub || typeof sub !== "object") return null;
  const o = sub as Record<string, unknown>;
  const resp = o.response ?? o.data;
  if (resp && typeof resp === "object") {
    const r = resp as Record<string, unknown>;
    const url = r.subscriptionUrl ?? r.subscription_url;
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  if (typeof o.subscriptionUrl === "string" && o.subscriptionUrl.trim()) return o.subscriptionUrl.trim();
  return null;
}

/** Достаём объект пользователя из ответа Remna (response или data или сам объект) */
function getSubUser(sub: unknown): Record<string, unknown> | null {
  if (!sub || typeof sub !== "object") return null;
  const o = sub as Record<string, unknown>;
  const resp = o.response ?? o.data ?? o;
  const r = typeof resp === "object" && resp !== null ? (resp as Record<string, unknown>) : null;
  if (r && (r.user != null || r.expireAt != null || r.subscriptionUrl != null)) {
    const user = r.user;
    return (typeof user === "object" && user !== null ? user : r) as Record<string, unknown>;
  }
  return r;
}

function bytesToGb(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(2);
}

/** Прогресс-бар из символов (0..1), длина barLen */
function progressBar(pct: number, barLen: number): string {
  const filled = Math.round(Math.max(0, Math.min(1, pct)) * barLen);
  return "█".repeat(filled) + "░".repeat(barLen - filled);
}

const DEFAULT_MENU_TEXTS: Record<string, string> = {
  welcomeTitlePrefix: "🛡 ",
  welcomeGreeting: "👋 Добро пожаловать в ",
  balancePrefix: "💰 Баланс: ",
  tariffPrefix: "💎 Ваш тариф : ",
  subscriptionPrefix: "📊 Статус подписки — ",
  statusInactive: "🔴 Истекла",
  statusActive: "🟡 Активна",
  statusExpired: "🔴 Истекла",
  statusLimited: "🟡 Ограничена",
  statusDisabled: "🔴 Отключена",
  expirePrefix: "📅 до ",
  daysLeftPrefix: "⏰ осталось ",
  devicesLabel: "📱 Устройств: ",
  devicesAvailable: " доступно",
  trafficPrefix: "📈 Трафик — ",
  linkLabel: "🔗 Ссылка подключения:",
  chooseAction: "Выберите действие:",
};

function t(texts: Record<string, string> | null | undefined, key: string): string {
  return (texts?.[key] ?? DEFAULT_MENU_TEXTS[key]) || "";
}

type CustomEmojiEntity = { type: "custom_emoji"; offset: number; length: number; custom_emoji_id: string };

/** Длина первого символа в UTF-16 (для entity) */
function firstCharLengthUtf16(s: string): number {
  if (!s.length) return 0;
  const cp = s.codePointAt(0);
  return cp != null && cp > 0xffff ? 2 : 1;
}

const DEFAULT_EMOJI_UNICODE: Record<string, string> = {
  PACKAGE: "📦", TARIFFS: "📦", CARD: "💳", LINK: "🔗", PUZZLE: "👤", PROFILE: "👤",
  TRIAL: "🎁", SERVERS: "🌐", CONNECT: "🌐",
};

/** Заголовок с эмодзи: если в botEmojis есть tgEmojiId для ключа — добавляем entity (премиум-эмодзи в тексте). */
function titleWithEmoji(
  emojiKey: string,
  rest: string,
  botEmojis?: Record<string, { unicode?: string; tgEmojiId?: string }> | null
): { text: string; entities: CustomEmojiEntity[] } {
  const entry = botEmojis?.[emojiKey];
  const unicode = entry?.unicode?.trim() || DEFAULT_EMOJI_UNICODE[emojiKey] || "•";
  const space = rest.startsWith("\n") ? "" : " ";
  const text = unicode + space + rest;
  const entities: CustomEmojiEntity[] = [];
  if (entry?.tgEmojiId) {
    const len = firstCharLengthUtf16(unicode);
    if (len > 0) entities.push({ type: "custom_emoji", offset: 0, length: len, custom_emoji_id: entry.tgEmojiId });
  }
  return { text, entities };
}

/** Полный текст главного меню + entities для премиум-эмодзи в тексте (владелец бота должен иметь Telegram Premium). */
function buildMainMenuText(opts: {
  serviceName: string;
  balance: number;
  currency: string;
  subscription: unknown;
  /** Отображаемое имя тарифа с бэкенда: Триал, название с сайта или «Тариф не выбран» */
  tariffDisplayName?: string | null;
  menuTexts?: Record<string, string> | null;
  menuTextCustomEmojiIds?: Record<string, string> | null;
}): { text: string; entities: CustomEmojiEntity[] } {
  const { serviceName, balance, currency, subscription, tariffDisplayName, menuTexts, menuTextCustomEmojiIds } = opts;
  const name = serviceName.trim() || "Кабинет";
  const balanceStr = formatMoney(balance, currency);
  const lines: string[] = [];
  const lineStartKeys: (string | null)[] = [];

  lines.push(t(menuTexts, "welcomeGreeting"));
  lineStartKeys.push("welcomeGreeting");
  lines.push(t(menuTexts, "welcomeTitlePrefix") + name);
  lineStartKeys.push("welcomeTitlePrefix");
  lines.push(t(menuTexts, "balancePrefix") + balanceStr);
  lineStartKeys.push("balancePrefix");

  const user = getSubUser(subscription);
  const url = getSubscriptionUrl(subscription);
  const tariffName = (tariffDisplayName && tariffDisplayName.trim()) || "Тариф не выбран";
  lines.push(t(menuTexts, "tariffPrefix") + tariffName);
  lineStartKeys.push("tariffPrefix");

  if (!user && !url) {
    lines.push(t(menuTexts, "subscriptionPrefix") + t(menuTexts, "statusInactive"));
    lineStartKeys.push("subscriptionPrefix");
    lines.push(t(menuTexts, "trafficPrefix") + " 0.00 GB");
    lineStartKeys.push("trafficPrefix");
    lines.push(t(menuTexts, "chooseAction"));
    lineStartKeys.push("chooseAction");
  } else {
    const expireAt = user?.expireAt ?? user?.expirationDate ?? user?.expire_at;
    let expireDate: Date | null = null;
    if (expireAt != null) {
      const d = typeof expireAt === "number" ? new Date(expireAt * 1000) : new Date(String(expireAt));
      if (!Number.isNaN(d.getTime())) expireDate = d;
    }
    const status = (user?.status ?? user?.userStatus ?? "ACTIVE") as string;
    const statusLabel =
      status === "ACTIVE" ? t(menuTexts, "statusActive")
      : status === "EXPIRED" ? t(menuTexts, "statusExpired")
      : status === "LIMITED" ? t(menuTexts, "statusLimited")
      : status === "DISABLED" ? t(menuTexts, "statusDisabled")
      : `🟡 ${status}`;
    const expireStr = expireDate
      ? expireDate.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "—";
    const daysLeft =
      expireDate && expireDate > new Date()
        ? Math.max(0, Math.ceil((expireDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
        : null;

    lines.push(t(menuTexts, "subscriptionPrefix") + statusLabel);
    lineStartKeys.push("subscriptionPrefix");
    lines.push(t(menuTexts, "expirePrefix") + expireStr);
    lineStartKeys.push("expirePrefix");
    if (daysLeft != null) {
      lines.push(t(menuTexts, "daysLeftPrefix") + `${daysLeft} ${daysLeft === 1 ? "день" : daysLeft < 5 ? "дня" : "дней"}`);
      lineStartKeys.push("daysLeftPrefix");
    }
    const deviceLimit = user?.hwidDeviceLimit ?? user?.deviceLimit ?? user?.device_limit;
    const devicesUsed = user?.devicesUsed ?? user?.devices_used;
    if (deviceLimit != null && typeof deviceLimit === "number") {
      const available = devicesUsed != null ? Math.max(0, deviceLimit - Number(devicesUsed)) : deviceLimit;
      lines.push(t(menuTexts, "devicesLabel") + available + t(menuTexts, "devicesAvailable"));
      lineStartKeys.push("devicesLabel");
    }
    const trafficUsedBytes =
      (user?.userTraffic as { usedTrafficBytes?: number } | undefined)?.usedTrafficBytes ??
      user?.trafficUsedBytes ??
      user?.usedTrafficBytes ??
      user?.traffic_used_bytes;
    const trafficLimitBytes = user?.trafficLimitBytes ?? user?.traffic_limit_bytes;
    const usedNum = typeof trafficUsedBytes === "string" ? parseFloat(trafficUsedBytes) : Number(trafficUsedBytes);
    const limitNum = typeof trafficLimitBytes === "string" ? parseFloat(trafficLimitBytes) : Number(trafficLimitBytes);
    if (Number.isFinite(usedNum) && Number.isFinite(limitNum) && limitNum > 0) {
      const pct = usedNum / limitNum;
      const usedGb = bytesToGb(usedNum);
      const limitGb = bytesToGb(limitNum);
      const pctInt = Math.round(Math.min(100, pct * 100));
      lines.push(t(menuTexts, "trafficPrefix") + `🟢 ${progressBar(pct, 14)} ${pctInt}% (${usedGb} / ${limitGb} GB)`);
    } else if (Number.isFinite(usedNum)) {
      lines.push(t(menuTexts, "trafficPrefix") + ` ${bytesToGb(usedNum)} GB`);
    } else {
      lines.push(t(menuTexts, "trafficPrefix") + " 0.00 GB");
    }
    lineStartKeys.push("trafficPrefix");
    if (url) {
      lines.push(t(menuTexts, "linkLabel"), url);
      lineStartKeys.push("linkLabel", null);
    }
    lines.push(t(menuTexts, "chooseAction"));
    lineStartKeys.push("chooseAction");
  }

  const text = lines.join("\n");
  const entities: CustomEmojiEntity[] = [];
  if (menuTextCustomEmojiIds && Object.keys(menuTextCustomEmojiIds).length > 0) {
    let offset = 0;
    for (let i = 0; i < lines.length; i++) {
      const key = lineStartKeys[i];
      if (key && menuTextCustomEmojiIds[key]) {
        const line = lines[i]!;
        const firstLen = firstCharLengthUtf16(line);
        if (firstLen > 0) entities.push({ type: "custom_emoji", offset, length: firstLen, custom_emoji_id: menuTextCustomEmojiIds[key]! });
      }
      offset += lines[i]!.length + 1;
    }
  }
  return { text, entities };
}

const TELEGRAM_CAPTION_MAX = 1024;

/** Логотип из настроек: data URL или обычный URL — в InputFile или URL для sendPhoto */
function logoToPhotoSource(logo: string | null | undefined): InputFile | string | null {
  if (!logo || !logo.trim()) return null;
  const s = logo.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const base64Match = /^data:image\/[a-z]+;base64,(.+)$/i.exec(s);
  if (base64Match) {
    try {
      const buf = Buffer.from(base64Match[1]!, "base64");
      if (buf.length > 0) return new InputFile(buf, "logo.png");
    } catch {
      return null;
    }
  }
  try {
    const buf = Buffer.from(s, "base64");
    if (buf.length > 0) return new InputFile(buf, "logo.png");
  } catch {
    // ignore
  }
  return null;
}

/** Редактировать сообщение: текст и клавиатура (если с фото — caption + caption_entities, иначе text + entities) */
async function editMessageContent(ctx: {
  editMessageCaption: (opts: { caption: string; caption_entities?: CustomEmojiEntity[]; reply_markup?: InlineMarkup }) => Promise<unknown>;
  editMessageText: (text: string, opts?: { entities?: CustomEmojiEntity[]; reply_markup?: InlineMarkup }) => Promise<unknown>;
  callbackQuery?: { message?: { photo?: unknown[] } };
}, text: string, reply_markup: InlineMarkup, entities?: CustomEmojiEntity[]): Promise<unknown> {
  const msg = ctx.callbackQuery?.message;
  const hasPhoto = msg && typeof msg === "object" && "photo" in msg && Array.isArray((msg as { photo: unknown[] }).photo) && (msg as { photo: unknown[] }).photo.length > 0;
  const caption = text.length > TELEGRAM_CAPTION_MAX ? text.slice(0, TELEGRAM_CAPTION_MAX - 3) + "..." : text;
  const truncatedEntities = text.length > TELEGRAM_CAPTION_MAX && entities ? entities.filter((e) => e.offset + e.length <= TELEGRAM_CAPTION_MAX - 3) : entities;
  if (hasPhoto) return ctx.editMessageCaption({ caption, caption_entities: truncatedEntities?.length ? truncatedEntities : undefined, reply_markup });
  return ctx.editMessageText(text, { entities: entities?.length ? entities : undefined, reply_markup });
}

function formatMoney(amount: number, currency: string): string {
  const c = currency.toUpperCase();
  const sym = c === "RUB" ? "₽" : c === "USD" ? "$" : "₴";
  return `${amount} ${sym}`;
}

/** Парсинг start-параметра: ref_CODE, c_SOURCE_CAMPAIGN или c_SOURCE_MEDIUM_CAMPAIGN, можно комбинировать ref_ABC_c_facebook_summer */
function parseStartPayload(payload: string): { refCode?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  const out: { refCode?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string } = {};
  const cIdx = payload.indexOf("_c_");
  const refPart = cIdx >= 0 ? payload.slice(0, cIdx) : payload;
  const campaignPart = cIdx >= 0 ? payload.slice(cIdx + 3) : "";
  if (refPart && /^ref_?/i.test(refPart)) {
    const code = refPart.replace(/^ref_?/i, "").trim();
    if (code) out.refCode = code;
  }
  if (campaignPart) {
    const parts = campaignPart.split("_").filter(Boolean);
    if (parts.length >= 2) {
      out.utm_source = parts[0];
      out.utm_campaign = parts.length === 2 ? parts[1] : parts[parts.length - 1];
      if (parts.length >= 3) out.utm_medium = parts.slice(1, -1).join("_");
    }
  }
  return out;
}

// ——— /start с реферальным кодом (например /start ref_ABC123) или промо (/start promo_XXXX) или кампания (/start c_facebook_summer)
bot.command("start", async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  const telegramId = String(from.id);
  const telegramUsername = from.username ?? undefined;
  const payload = ctx.match?.trim() || "";

  // Определяем тип deeplink
  const isPromo = /^promo_/i.test(payload);
  const promoCode = isPromo ? payload.replace(/^promo_/i, "") : undefined;
  const parsed = parseStartPayload(payload);
  const refCode = !isPromo ? (parsed.refCode ?? (payload.replace(/^ref_?/i, "").trim() || undefined)) : undefined;

  try {
    const config = await api.getPublicConfig();
    const name = config?.serviceName?.trim() || "Кабинет";

    const auth = await api.registerByTelegram({
      telegramId,
      telegramUsername,
      preferredLang: "ru",
      preferredCurrency: config?.defaultCurrency ?? "usd",
      referralCode: refCode,
      utm_source: parsed.utm_source,
      utm_medium: parsed.utm_medium,
      utm_campaign: parsed.utm_campaign,
    });

    setToken(from.id, auth.token);
    const client = auth.client;

    // Если это промо-ссылка — активируем промокод
    if (promoCode) {
      try {
        const result = await api.activatePromo(auth.token, promoCode);
        await ctx.reply(`✅ ${result.message}\n\nНажмите /start чтобы открыть меню.`);
        return;
      } catch (promoErr: unknown) {
        const promoMsg = promoErr instanceof Error ? promoErr.message : "Ошибка активации промокода";
        await ctx.reply(`❌ ${promoMsg}\n\nНажмите /start чтобы открыть меню.`);
        return;
      }
    }

    // Проверка подписки на канал
    if (await enforceSubscription(ctx, config)) return;

    const [subRes, proxyRes, singboxRes] = await Promise.all([
      api.getSubscription(auth.token).catch(() => ({ subscription: null })),
      api.getPublicProxyTariffs().catch(() => ({ items: [] })),
      api.getPublicSingboxTariffs().catch(() => ({ items: [] })),
    ]);
    const vpnUrl = getSubscriptionUrl(subRes.subscription);
    const showTrial = Boolean(config?.trialEnabled && !client.trialUsed);
    const showProxy = proxyRes.items?.some((c: { tariffs: unknown[] }) => c.tariffs?.length > 0) ?? false;
    const showSingbox = singboxRes.items?.some((c: { tariffs: unknown[] }) => c.tariffs?.length > 0) ?? false;
    const appUrl = config?.publicAppUrl?.replace(/\/$/, "") ?? null;

    const { text, entities } = buildMainMenuText({
      serviceName: name,
      balance: client.balance,
      currency: client.preferredCurrency,
      subscription: subRes.subscription,
      tariffDisplayName: (subRes as { tariffDisplayName?: string | null }).tariffDisplayName ?? null,
      menuTexts: config?.resolvedBotMenuTexts ?? config?.botMenuTexts ?? null,
      menuTextCustomEmojiIds: config?.menuTextCustomEmojiIds ?? null,
    });
    const caption = text.length > TELEGRAM_CAPTION_MAX ? text.slice(0, TELEGRAM_CAPTION_MAX - 3) + "..." : text;
    const captionEntities = text.length > TELEGRAM_CAPTION_MAX && entities.length ? entities.filter((e) => e.offset + e.length <= TELEGRAM_CAPTION_MAX - 3) : entities;
    const hasSupportLinks = !!(config?.supportLink || config?.agreementLink || config?.offerLink || config?.instructionsLink);
    const markup = mainMenu({
      showTrial,
      showVpn: Boolean(vpnUrl),
      showProxy,
      showSingbox,
      appUrl,
      botButtons: config?.botButtons ?? null,
      botBackLabel: config?.botBackLabel ?? null,
      hasSupportLinks,
      showExtraOptions: config?.sellOptionsEnabled === true && (config?.sellOptions?.length ?? 0) > 0,
    });

    const photoSource = logoToPhotoSource(config?.logoBot ?? config?.logo);
    if (photoSource) {
      await ctx.replyWithPhoto(photoSource, { caption, caption_entities: captionEntities.length ? captionEntities : undefined, reply_markup: markup });
    } else {
      await ctx.reply(text, { entities: entities.length ? entities : undefined, reply_markup: markup });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ошибка входа";
    await ctx.reply(`❌ ${msg}`);
  }
});

// ——— /link КОД — привязка Telegram к аккаунту (код из кабинета на сайте)
bot.command("link", async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  const code = (ctx.match?.trim() || "").replace(/\s+/g, " ");
  if (!code) {
    await ctx.reply("Отправьте код из кабинета на сайте.\nПример: /link 123456");
    return;
  }
  try {
    await api.linkTelegramFromBot(code, from.id, from.username ?? undefined);
    await ctx.reply("✅ Telegram успешно привязан к вашему аккаунту. Теперь вы можете входить через бота.");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ошибка привязки";
    await ctx.reply(`❌ ${msg}`);
  }
});

// ——— Callback: меню и действия
bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from?.id;
  if (!userId) return;
  await ctx.answerCallbackQuery().catch(() => {});

  const token = getToken(userId);
  if (!token) {
    await ctx.reply("Сессия истекла. Отправьте /start");
    return;
  }

  try {
    const config = await api.getPublicConfig();

    // Обработка кнопки «Я подписался»
    if (data === "check_subscribe") {
      const channelId = config?.forceSubscribeChannelId?.trim();
      if (channelId && config?.forceSubscribeEnabled) {
        const result = await checkUserSubscription(userId, channelId);
        if (result.state === "cannot_verify") {
          await ctx.answerCallbackQuery({
            text: "⚠️ Сейчас не удаётся проверить подписку. Сообщите администратору.",
            show_alert: true,
          }).catch(() => {});
          await editMessageContent(
            ctx,
            `⚠️ Проверка подписки временно недоступна.\n\nПроверьте настройки: бот должен быть админом в канале, а ID/@username канала должен быть указан корректно.`,
            subscribeKeyboard(channelId)
          );
          return;
        }
        if (result.state !== "subscribed") {
          await ctx.answerCallbackQuery({ text: "❌ Вы ещё не подписались на канал", show_alert: true }).catch(() => {});
          return;
        }
      }
      // Подписан — показываем основное меню через /start
      await ctx.answerCallbackQuery({ text: "✅ Подписка подтверждена!" }).catch(() => {});
      await ctx.reply("Отлично! Отправьте /start чтобы открыть меню.");
      return;
    }

    // Проверка подписки на канал для всех действий
    if (config?.forceSubscribeEnabled && config.forceSubscribeChannelId?.trim()) {
      const channelId = config.forceSubscribeChannelId.trim();
      const result = await checkUserSubscription(userId, channelId);
      if (result.state !== "subscribed") {
        const msg = config.forceSubscribeMessage?.trim() || "Для использования бота подпишитесь на наш канал:";
        const details = result.state === "cannot_verify"
          ? "\n\nПроверка подписки сейчас недоступна. Сообщите администратору."
          : "";
        await editMessageContent(ctx, `⚠️ ${msg}${details}`, subscribeKeyboard(channelId));
        return;
      }
    }

    const appUrl = config?.publicAppUrl?.replace(/\/$/, "") ?? null;
    const rawStyles = config?.botInnerButtonStyles;
    const innerStyles = {
      tariffPay: rawStyles?.tariffPay !== undefined ? rawStyles.tariffPay : "success",
      topup: rawStyles?.topup !== undefined ? rawStyles.topup : "primary",
      back: rawStyles?.back !== undefined ? rawStyles.back : "danger",
      profile: rawStyles?.profile !== undefined ? rawStyles.profile : "primary",
      trialConfirm: rawStyles?.trialConfirm !== undefined ? rawStyles.trialConfirm : "success",
      lang: rawStyles?.lang !== undefined ? rawStyles.lang : "primary",
      currency: rawStyles?.currency !== undefined ? rawStyles.currency : "primary",
    };
    const botEmojis = config?.botEmojis;
    const innerEmojiIds: InnerEmojiIds | undefined = botEmojis
      ? {
          back: botEmojis.BACK?.tgEmojiId,
          card: botEmojis.CARD?.tgEmojiId,
          tariff: botEmojis.PACKAGE?.tgEmojiId || botEmojis.TARIFFS?.tgEmojiId,
          trial: botEmojis.TRIAL?.tgEmojiId,
          profile: botEmojis.PUZZLE?.tgEmojiId || botEmojis.PROFILE?.tgEmojiId,
          connect: botEmojis.SERVERS?.tgEmojiId || botEmojis.CONNECT?.tgEmojiId,
        }
      : undefined;

    if (data === "menu:main") {
      const [client, subRes, proxyRes, singboxRes] = await Promise.all([
        api.getMe(token),
        api.getSubscription(token).catch(() => ({ subscription: null })),
        api.getPublicProxyTariffs().catch(() => ({ items: [] })),
        api.getPublicSingboxTariffs().catch(() => ({ items: [] })),
      ]);
      const vpnUrl = getSubscriptionUrl(subRes.subscription);
      const showTrial = Boolean(config?.trialEnabled && !client.trialUsed);
      const showProxy = proxyRes.items?.some((c: { tariffs: unknown[] }) => c.tariffs?.length > 0) ?? false;
      const showSingbox = singboxRes.items?.some((c: { tariffs: unknown[] }) => c.tariffs?.length > 0) ?? false;
      const name = config?.serviceName?.trim() || "Кабинет";
      const { text, entities } = buildMainMenuText({
        serviceName: name,
        balance: client.balance,
        currency: client.preferredCurrency,
        subscription: subRes.subscription,
        tariffDisplayName: (subRes as { tariffDisplayName?: string | null }).tariffDisplayName ?? null,
        menuTexts: config?.resolvedBotMenuTexts ?? config?.botMenuTexts ?? null,
        menuTextCustomEmojiIds: config?.menuTextCustomEmojiIds ?? null,
      });
      const hasSupportLinks = !!(config?.supportLink || config?.agreementLink || config?.offerLink || config?.instructionsLink);
      await editMessageContent(ctx, text, mainMenu({
        showTrial,
        showVpn: Boolean(vpnUrl),
        showProxy,
        showSingbox,
        appUrl,
        botButtons: config?.botButtons ?? null,
        botBackLabel: config?.botBackLabel ?? null,
        hasSupportLinks,
        showExtraOptions: config?.sellOptionsEnabled === true && (config?.sellOptions?.length ?? 0) > 0,
      }), entities);
      return;
    }

    if (data === "menu:support") {
      const hasAny = config?.supportLink || config?.agreementLink || config?.offerLink || config?.instructionsLink;
      if (!hasAny) {
        await editMessageContent(ctx, "Раздел поддержки не настроен.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      await editMessageContent(
        ctx,
        "🆘 Поддержка\n\nВыберите раздел:",
        supportSubMenu(
          {
            support: config?.supportLink,
            agreement: config?.agreementLink,
            offer: config?.offerLink,
            instructions: config?.instructionsLink,
          },
          config?.botBackLabel ?? null,
          innerStyles?.back,
          innerEmojiIds
        )
      );
      return;
    }

    if (data === "menu:tariffs") {
      const { items } = await api.getPublicTariffs();
      if (!items?.length) {
        await editMessageContent(ctx, "Тарифы пока не настроены.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (items.length > 1) {
        const { text, entities } = titleWithEmoji("PACKAGE", "Тарифы\n\nВыберите категорию:", config?.botEmojis);
        await editMessageContent(ctx, text, tariffPayButtons(items, config?.botBackLabel ?? null, innerStyles, innerEmojiIds), entities);
        return;
      }
      const cat = items[0]!;
      const head = (cat.emoji && cat.emoji.trim() ? cat.emoji + " " : "") + cat.name;
      const tariffLines = cat.tariffs.map((t: TariffItem) => `• ${t.name} — ${t.price} ${t.currency}`).join("\n");
      const { text, entities } = titleWithEmoji("PACKAGE", `Тарифы\n\n${head}\n${tariffLines}\n\nВыберите тариф для оплаты:`, config?.botEmojis);
      await editMessageContent(ctx, text, tariffPayButtons(items, config?.botBackLabel ?? null, innerStyles, innerEmojiIds), entities);
      return;
    }

    if (data.startsWith("cat_tariffs:")) {
      const categoryId = data.slice("cat_tariffs:".length);
      const { items } = await api.getPublicTariffs();
      const category = items?.find((c: TariffCategory) => c.id === categoryId);
      if (!category?.tariffs?.length) {
        await editMessageContent(ctx, "Категория не найдена.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const head = (category.emoji && category.emoji.trim() ? category.emoji + " " : "") + category.name;
      const tariffLines = category.tariffs.map((t: TariffItem) => `• ${t.name} — ${t.price} ${t.currency}`).join("\n");
      const { text, entities } = titleWithEmoji("PACKAGE", `${head}\n\n${tariffLines}\n\nВыберите тариф для оплаты:`, config?.botEmojis);
      await editMessageContent(ctx, text, tariffsOfCategoryButtons(category, config?.botBackLabel ?? null, innerStyles, "menu:tariffs", innerEmojiIds), entities);
      return;
    }

    if (data === "menu:proxy") {
      const { items } = await api.getPublicProxyTariffs();
      if (!items?.length || items.every((c: { tariffs: unknown[] }) => !c.tariffs?.length)) {
        await editMessageContent(ctx, "Тарифы прокси пока не настроены.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const cats = items.filter((c: { tariffs: unknown[] }) => c.tariffs?.length > 0);
      if (cats.length === 1 && cats[0]!.tariffs.length <= 5) {
        const head = cats[0]!.name;
        const lines = cats[0]!.tariffs.map((t: { name: string; price: number; currency: string }) => `• ${t.name} — ${t.price} ${t.currency}`).join("\n");
        await editMessageContent(ctx, `🌐 Прокси\n\n${head}\n${lines}\n\nВыберите тариф:`, proxyTariffPayButtons(cats, config?.botBackLabel ?? null, innerStyles, innerEmojiIds));
      } else {
        await editMessageContent(ctx, "🌐 Прокси\n\nВыберите категорию:", proxyTariffPayButtons(cats, config?.botBackLabel ?? null, innerStyles, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("cat_proxy:")) {
      const categoryId = data.slice("cat_proxy:".length);
      const { items } = await api.getPublicProxyTariffs();
      const category = items?.find((c: { id: string }) => c.id === categoryId);
      if (!category?.tariffs?.length) {
        await editMessageContent(ctx, "Категория не найдена.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const head = category.name;
      const lines = category.tariffs.map((t: { name: string; price: number; currency: string }) => `• ${t.name} — ${t.price} ${t.currency}`).join("\n");
      await editMessageContent(ctx, `🌐 ${head}\n\n${lines}\n\nВыберите тариф:`, proxyTariffsOfCategoryButtons(category, config?.botBackLabel ?? null, innerStyles, "menu:proxy", innerEmojiIds));
      return;
    }

    if (data === "menu:singbox") {
      const { items } = await api.getPublicSingboxTariffs();
      if (!items?.length || items.every((c: { tariffs: unknown[] }) => !c.tariffs?.length)) {
        await editMessageContent(ctx, "Тарифы доступов пока не настроены.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const cats = items.filter((c: { tariffs: unknown[] }) => c.tariffs?.length > 0);
      if (cats.length === 1 && cats[0]!.tariffs.length <= 5) {
        const head = cats[0]!.name;
        const lines = cats[0]!.tariffs.map((t: { name: string; price: number; currency: string }) => `• ${t.name} — ${t.price} ${t.currency}`).join("\n");
        await editMessageContent(ctx, `🔑 Доступы\n\n${head}\n${lines}\n\nВыберите тариф:`, singboxTariffPayButtons(cats, config?.botBackLabel ?? null, innerStyles, innerEmojiIds));
      } else {
        await editMessageContent(ctx, "🔑 Доступы\n\nВыберите категорию:", singboxTariffPayButtons(cats, config?.botBackLabel ?? null, innerStyles, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("cat_singbox:")) {
      const categoryId = data.slice("cat_singbox:".length);
      const { items } = await api.getPublicSingboxTariffs();
      const category = items?.find((c: { id: string }) => c.id === categoryId);
      if (!category?.tariffs?.length) {
        await editMessageContent(ctx, "Категория не найдена.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const head = category.name;
      const lines = category.tariffs.map((t: { name: string; price: number; currency: string }) => `• ${t.name} — ${t.price} ${t.currency}`).join("\n");
      await editMessageContent(ctx, `🔑 ${head}\n\n${lines}\n\nВыберите тариф:`, singboxTariffsOfCategoryButtons(category, config?.botBackLabel ?? null, innerStyles, "menu:singbox", innerEmojiIds));
      return;
    }

    if (data === "menu:my_singbox") {
      const slotsRes = await api.getSingboxSlots(token);
      const slots = slotsRes.slots ?? [];
      if (slots.length === 0) {
        await editMessageContent(ctx, "У вас пока нет активных доступов. Купите тариф в разделе «Доступы».", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const lines = slots.map((s: { subscriptionLink: string; expiresAt: string; protocol: string }) => {
        const exp = new Date(s.expiresAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
        return `${s.protocol} — до ${exp}\n${s.subscriptionLink}`;
      }).join("\n\n");
      const msg = `📋 Мои доступы (${slots.length})\n\nСкопируйте ссылку в приложение (v2rayN, Nekoray и др.):\n\n${lines}`;
      await editMessageContent(ctx, msg.slice(0, 4096), backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      return;
    }

    if (data === "menu:my_proxy") {
      const { slots } = await api.getProxySlots(token);
      if (!slots?.length) {
        await editMessageContent(ctx, "📋 Мои прокси\n\nУ вас пока нет активных прокси. Купите тариф в разделе «Прокси».", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      let text = "📋 Мои прокси\n\n";
      for (const s of slots) {
        text += `• SOCKS5: \`socks5://${s.login}:${s.password}@${s.host}:${s.socksPort}\`\n`;
        text += `• HTTP: \`http://${s.login}:${s.password}@${s.host}:${s.httpPort}\`\n`;
        text += `  До: ${new Date(s.expiresAt).toLocaleString("ru-RU")}\n\n`;
      }
      text += "Скопируйте строку в настройки прокси приложения.";
      await editMessageContent(ctx, text.slice(0, 4096), backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      return;
    }

    if (data.startsWith("pay_proxy_balance:")) {
      const proxyTariffId = data.slice("pay_proxy_balance:".length);
      try {
        const result = await api.payByBalance(token, { proxyTariffId });
        await editMessageContent(ctx, `✅ ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка оплаты";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_proxy_yoomoney:")) {
      const proxyTariffId = data.slice("pay_proxy_yoomoney:".length);
      const { items } = await api.getPublicProxyTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === proxyTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Тариф не найден.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYoomoneyPayment(token, { amount: tariff.price, paymentType: "AC", proxyTariffId });
        await editMessageContent(ctx, `Оплата: ${tariff.name} — ${formatMoney(tariff.price, tariff.currency)}\n\nНажмите для оплаты через ЮMoney:`, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка создания платежа";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_proxy_yookassa:")) {
      const proxyTariffId = data.slice("pay_proxy_yookassa:".length);
      const { items } = await api.getPublicProxyTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === proxyTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Тариф не найден.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (tariff.currency.toUpperCase() !== "RUB") {
        await editMessageContent(ctx, "ЮKassa принимает только рубли (RUB).", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYookassaPayment(token, { amount: tariff.price, currency: "RUB", proxyTariffId });
        await editMessageContent(ctx, `Оплата: ${tariff.name} — ${formatMoney(tariff.price, tariff.currency)}\n\nНажмите для оплаты через ЮKassa:`, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка создания платежа";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_proxy:")) {
      const rest = data.slice("pay_proxy:".length);
      const parts = rest.split(":");
      const proxyTariffId = parts[0];
      const methodIdFromBtn = parts.length >= 2 ? Number(parts[1]) : null;
      const { items } = await api.getPublicProxyTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === proxyTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Тариф не найден.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const methods = config?.plategaMethods ?? [];
      const client = await api.getMe(token);
      const balanceLabel = client.balance >= tariff.price ? `💰 Оплатить балансом (${formatMoney(client.balance, client.preferredCurrency)})` : null;
      if (methodIdFromBtn != null && Number.isFinite(methodIdFromBtn)) {
        try {
          const payment = await api.createPlategaPayment(token, {
            amount: tariff.price,
            currency: tariff.currency,
            paymentMethod: methodIdFromBtn,
            description: `Прокси: ${tariff.name}`,
            proxyTariffId: tariff.id,
          });
          await editMessageContent(ctx, `Оплата: ${tariff.name} — ${formatMoney(tariff.price, tariff.currency)}\n\nНажмите для оплаты:`, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Ошибка";
          await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        }
        return;
      }
      const markup = proxyPaymentMethodButtons(
        proxyTariffId,
        methods,
        config?.botBackLabel ?? null,
        innerStyles?.back,
        innerEmojiIds,
        balanceLabel,
        !!config?.yoomoneyEnabled,
        !!config?.yookassaEnabled,
        tariff.currency,
      );
      await editMessageContent(ctx, `Оплата: ${tariff.name} — ${formatMoney(tariff.price, tariff.currency)}\n\nВыберите способ оплаты:`, markup);
      return;
    }

    if (data.startsWith("pay_singbox_balance:")) {
      const singboxTariffId = data.slice("pay_singbox_balance:".length);
      try {
        const result = await api.payByBalance(token, { singboxTariffId });
        await editMessageContent(ctx, `✅ ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка оплаты";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_singbox_yoomoney:")) {
      const singboxTariffId = data.slice("pay_singbox_yoomoney:".length);
      const { items } = await api.getPublicSingboxTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === singboxTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Тариф не найден.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYoomoneyPayment(token, { amount: tariff.price, paymentType: "AC", singboxTariffId });
        await editMessageContent(ctx, `Оплата: ${tariff.name} — ${formatMoney(tariff.price, tariff.currency)}\n\nНажмите для оплаты через ЮMoney:`, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка создания платежа";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_singbox_yookassa:")) {
      const singboxTariffId = data.slice("pay_singbox_yookassa:".length);
      const { items } = await api.getPublicSingboxTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === singboxTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Тариф не найден.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (tariff.currency.toUpperCase() !== "RUB") {
        await editMessageContent(ctx, "ЮKassa принимает только рубли (RUB).", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYookassaPayment(token, { amount: tariff.price, currency: "RUB", singboxTariffId });
        await editMessageContent(ctx, `Оплата: ${tariff.name} — ${formatMoney(tariff.price, tariff.currency)}\n\nНажмите для оплаты через ЮKassa:`, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка создания платежа";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_singbox:")) {
      const rest = data.slice("pay_singbox:".length);
      const parts = rest.split(":");
      const singboxTariffId = parts[0];
      const methodIdFromBtn = parts.length >= 2 ? Number(parts[1]) : null;
      const { items } = await api.getPublicSingboxTariffs();
      const tariff = items?.flatMap((c: { tariffs: { id: string; name: string; price: number; currency: string }[] }) => c.tariffs).find((t: { id: string }) => t.id === singboxTariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Тариф не найден.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const methods = config?.plategaMethods ?? [];
      const client = await api.getMe(token);
      const balanceLabel = client.balance >= tariff.price ? `💰 Оплатить балансом (${formatMoney(client.balance, client.preferredCurrency)})` : null;
      if (methodIdFromBtn != null && Number.isFinite(methodIdFromBtn)) {
        try {
          const payment = await api.createPlategaPayment(token, {
            amount: tariff.price,
            currency: tariff.currency,
            paymentMethod: methodIdFromBtn,
            description: `Доступы: ${tariff.name}`,
            singboxTariffId: tariff.id,
          });
          await editMessageContent(ctx, `Оплата: ${tariff.name} — ${formatMoney(tariff.price, tariff.currency)}\n\nНажмите для оплаты:`, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Ошибка";
          await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        }
        return;
      }
      const markup = singboxPaymentMethodButtons(
        singboxTariffId,
        methods,
        config?.botBackLabel ?? null,
        innerStyles?.back,
        innerEmojiIds,
        balanceLabel,
        !!config?.yoomoneyEnabled,
        !!config?.yookassaEnabled,
        tariff.currency,
      );
      await editMessageContent(ctx, `Оплата: ${tariff.name} — ${formatMoney(tariff.price, tariff.currency)}\n\nВыберите способ оплаты:`, markup);
      return;
    }

    if (data.startsWith("pay_tariff_balance:")) {
      const tariffId = data.slice("pay_tariff_balance:".length);
      try {
        const result = await api.payByBalance(token, { tariffId });
        await editMessageContent(ctx, `✅ ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка оплаты";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_tariff_yoomoney:")) {
      const tariffId = data.slice("pay_tariff_yoomoney:".length);
      const { items } = await api.getPublicTariffs();
      const tariff = items?.flatMap((c: TariffCategory) => c.tariffs).find((t: TariffItem) => t.id === tariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Тариф не найден.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYoomoneyPayment(token, {
          amount: tariff.price,
          paymentType: "AC",
          tariffId: tariff.id,
        });
        const yooTitle = titleWithEmoji("CARD", `Оплата: ${tariff.name} — ${formatMoney(tariff.price, tariff.currency)}\n\nНажмите кнопку ниже для оплаты через ЮMoney:`, config?.botEmojis);
        await editMessageContent(ctx, yooTitle.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTitle.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка создания платежа ЮMoney";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_tariff_yookassa:")) {
      const tariffId = data.slice("pay_tariff_yookassa:".length);
      const { items } = await api.getPublicTariffs();
      const tariff = items?.flatMap((c: TariffCategory) => c.tariffs).find((t: TariffItem) => t.id === tariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Тариф не найден.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (tariff.currency.toUpperCase() !== "RUB") {
        await editMessageContent(ctx, "ЮKassa принимает только рубли (RUB).", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYookassaPayment(token, {
          amount: tariff.price,
          currency: "RUB",
          tariffId: tariff.id,
        });
        const yooTitle = titleWithEmoji("CARD", `Оплата: ${tariff.name} — ${formatMoney(tariff.price, tariff.currency)}\n\nНажмите кнопку ниже для оплаты через ЮKassa:`, config?.botEmojis);
        await editMessageContent(ctx, yooTitle.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTitle.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка создания платежа ЮKassa";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data === "menu:extra_options") {
      const options = config?.sellOptions ?? [];
      if (!options.length) {
        await editMessageContent(ctx, "Доп. опции пока не доступны. Оформите подписку в разделе «Тарифы».", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const { text, entities } = titleWithEmoji("PACKAGE", "Доп. опции\n\nТрафик, устройства или серверы — докупка к подписке. Выберите опцию:", config?.botEmojis);
      await editMessageContent(ctx, text, extraOptionsButtons(options, config?.botBackLabel ?? null, innerStyles, innerEmojiIds), entities);
      return;
    }

    if (data.startsWith("pay_option_balance:")) {
      const parts = data.split(":");
      const kind = (parts[1] ?? "") as "traffic" | "devices" | "servers";
      const productId = parts.length > 2 ? parts.slice(2).join(":") : "";
      const options = config?.sellOptions ?? [];
      const option = options.find((o) => o.kind === kind && o.id === productId);
      if (!option) {
        await editMessageContent(ctx, "Опция не найдена.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const result = await api.payOptionByBalance(token, { kind: option.kind, productId: option.id });
        await editMessageContent(ctx, `✅ ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка оплаты";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_option_yookassa:")) {
      const parts = data.split(":");
      const kind = (parts[1] ?? "") as "traffic" | "devices" | "servers";
      const productId = parts.length > 2 ? parts.slice(2).join(":") : "";
      const options = config?.sellOptions ?? [];
      const option = options.find((o) => o.kind === kind && o.id === productId);
      if (!option) {
        await editMessageContent(ctx, "Опция не найдена.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYookassaPayment(token, {
          extraOption: { kind: option.kind, productId: option.id },
        });
        const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} ГБ` : option.kind === "devices" ? `+${option.deviceCount} устр.` : "Сервер");
        const yooTitle = titleWithEmoji("CARD", `Оплата: ${optName} — ${formatMoney(option.price, option.currency)}\n\nНажмите кнопку ниже для оплаты через ЮKassa:`, config?.botEmojis);
        await editMessageContent(ctx, yooTitle.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTitle.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка создания платежа";
        const isAuthError = /401|unauthorized|истек|авториз|токен/i.test(msg);
        const text = isAuthError ? "❌ Сессия истекла. Отправьте /start и попробуйте снова." : `❌ ${msg}`;
        await editMessageContent(ctx, text, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_option_yoomoney:")) {
      const parts = data.split(":");
      const kind = (parts[1] ?? "") as "traffic" | "devices" | "servers";
      const productId = parts.length > 2 ? parts.slice(2).join(":") : "";
      const options = config?.sellOptions ?? [];
      const option = options.find((o) => o.kind === kind && o.id === productId);
      if (!option) {
        await editMessageContent(ctx, "Опция не найдена.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createYoomoneyPayment(token, {
          amount: option.price,
          paymentType: "AC",
          extraOption: { kind: option.kind, productId: option.id },
        });
        const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} ГБ` : option.kind === "devices" ? `+${option.deviceCount} устр.` : "Сервер");
        const yooTitle = titleWithEmoji("CARD", `Оплата: ${optName} — ${formatMoney(option.price, option.currency)}\n\nНажмите кнопку ниже для оплаты через ЮMoney:`, config?.botEmojis);
        await editMessageContent(ctx, yooTitle.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTitle.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка создания платежа ЮMoney";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_option_platega:")) {
      const parts = data.split(":");
      const kind = (parts[1] ?? "") as "traffic" | "devices" | "servers";
      const productId = parts.length > 3 ? parts.slice(2, -1).join(":") : parts[2] ?? "";
      const methodId = parts.length >= 4 ? Number(parts[parts.length - 1]) : Number(parts[2]);
      const options = config?.sellOptions ?? [];
      const option = options.find((o) => o.kind === kind && o.id === productId);
      if (!option) {
        await editMessageContent(ctx, "Опция не найдена.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (!Number.isFinite(methodId)) {
        await editMessageContent(ctx, "Неверный способ оплаты.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      try {
        const payment = await api.createPlategaPayment(token, {
          amount: option.price,
          currency: option.currency,
          paymentMethod: methodId,
          description: option.name || `${option.kind} ${option.id}`,
          extraOption: { kind: option.kind, productId: option.id },
        });
        const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} ГБ` : option.kind === "devices" ? `+${option.deviceCount} устр.` : "Сервер");
        const payTitle = titleWithEmoji("CARD", `Оплата: ${optName} — ${formatMoney(option.price, option.currency)}\n\nНажмите кнопку ниже для оплаты:`, config?.botEmojis);
        await editMessageContent(ctx, payTitle.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), payTitle.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка создания платежа";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("pay_option:")) {
      const parts = data.split(":");
      const kind = (parts[1] ?? "") as "traffic" | "devices" | "servers";
      const productId = parts.length > 2 ? parts.slice(2).join(":") : "";
      const options = config?.sellOptions ?? [];
      const option = options.find((o) => o.kind === kind && o.id === productId);
      if (!option) {
        await editMessageContent(ctx, "Опция не найдена. Обновите меню (/start) и попробуйте снова.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      if (option.currency.toUpperCase() !== "RUB") {
        await editMessageContent(ctx, "Оплата в боте доступна только в рублях (RUB).", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      const optName = option.name || (option.kind === "traffic" ? `+${option.trafficGb} ГБ` : option.kind === "devices" ? `+${option.deviceCount} устр.` : "Сервер");
      const choiceText = titleWithEmoji("CARD", `Оплата: ${optName} — ${formatMoney(option.price, option.currency)}\n\nВыберите способ оплаты:`, config?.botEmojis);
      const markup = optionPaymentMethodButtons(
        option,
        client.balance,
        config?.botBackLabel ?? null,
        innerStyles,
        innerEmojiIds,
        config?.plategaMethods ?? [],
        !!config?.yoomoneyEnabled,
        !!config?.yookassaEnabled
      );
      await editMessageContent(ctx, choiceText.text, markup, choiceText.entities);
      return;
    }

    if (data.startsWith("pay_tariff:")) {
      const rest = data.slice("pay_tariff:".length);
      const parts = rest.split(":");
      const tariffId = parts[0];
      const methodIdFromBtn = parts.length >= 2 ? Number(parts[1]) : null;
      const { items } = await api.getPublicTariffs();
      const tariff = items?.flatMap((c: TariffCategory) => c.tariffs).find((t: TariffItem) => t.id === tariffId);
      if (!tariff) {
        await editMessageContent(ctx, "Тариф не найден.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const methods = config?.plategaMethods ?? [];
      const client = await api.getMe(token);
      const balanceLabel = client.balance >= tariff.price ? `💰 Оплатить балансом (${formatMoney(client.balance, client.preferredCurrency)})` : null;

      if (methodIdFromBtn != null && Number.isFinite(methodIdFromBtn)) {
        const payment = await api.createPlategaPayment(token, {
          amount: tariff.price,
          currency: tariff.currency,
          paymentMethod: methodIdFromBtn,
          description: `Тариф: ${tariff.name}`,
          tariffId: tariff.id,
        });
        const pay1 = titleWithEmoji("CARD", `Оплата: ${tariff.name} — ${formatMoney(tariff.price, tariff.currency)}\n\nНажмите кнопку ниже для оплаты:`, config?.botEmojis);
        await editMessageContent(ctx, pay1.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), pay1.entities);
        return;
      }
      // Показываем способы оплаты (всегда, чтобы была кнопка баланса)
      const pay2 = titleWithEmoji("CARD", `Оплата: ${tariff.name} — ${formatMoney(tariff.price, tariff.currency)}\n\nВыберите способ оплаты:`, config?.botEmojis);
      await editMessageContent(ctx, pay2.text, tariffPaymentMethodButtons(tariffId, methods, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds, balanceLabel, !!config?.yoomoneyEnabled, !!config?.yookassaEnabled, tariff.currency), pay2.entities);
      return;
    }

    if (data === "menu:profile") {
      const client = await api.getMe(token);
      const langs = config?.activeLanguages?.length ? config.activeLanguages : ["ru", "en"];
      const currencies = config?.activeCurrencies?.length ? config.activeCurrencies : ["usd", "rub"];
      const { text, entities } = titleWithEmoji(
        "PROFILE",
        `Профиль\n\nБаланс: ${formatMoney(client.balance, client.preferredCurrency)}\nЯзык: ${client.preferredLang}\nВалюта: ${client.preferredCurrency}\n\nИзменить:`,
        config?.botEmojis
      );
      await editMessageContent(ctx, text, profileButtons(config?.botBackLabel ?? null, innerStyles, innerEmojiIds), entities);
      return;
    }

    if (data === "profile:lang") {
      const langs = config?.activeLanguages?.length ? config.activeLanguages : ["ru", "en"];
      await editMessageContent(ctx, "Выберите язык:", langButtons(langs, innerStyles, innerEmojiIds));
      return;
    }

    if (data.startsWith("set_lang:")) {
      const lang = data.slice("set_lang:".length);
      await api.updateProfile(token, { preferredLang: lang });
      await editMessageContent(ctx, `Язык изменён на ${lang.toUpperCase()}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      return;
    }

    if (data === "profile:currency") {
      const currencies = config?.activeCurrencies?.length ? config.activeCurrencies : ["usd", "rub"];
      await editMessageContent(ctx, "Выберите валюту:", currencyButtons(currencies, innerStyles, innerEmojiIds));
      return;
    }

    if (data.startsWith("set_currency:")) {
      const currency = data.slice("set_currency:".length);
      await api.updateProfile(token, { preferredCurrency: currency });
      await editMessageContent(ctx, `Валюта изменена на ${currency.toUpperCase()}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      return;
    }

    if (data === "menu:topup") {
      const client = await api.getMe(token);
      const methods = config?.plategaMethods ?? [];
      const yooEnabled = !!config?.yoomoneyEnabled;
      const yookassaEnabledTopup = !!config?.yookassaEnabled;
      if (!methods.length && !yooEnabled && !yookassaEnabledTopup) {
        await editMessageContent(ctx, "Пополнение временно недоступно.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const topupTitle = titleWithEmoji("CARD", "Пополнить баланс\n\nВыберите сумму или введите свою (числом):", config?.botEmojis);
      await editMessageContent(ctx, topupTitle.text, topUpPresets(client.preferredCurrency, config?.botBackLabel ?? null, innerStyles, innerEmojiIds), topupTitle.entities);
      return;
    }

    if (data.startsWith("topup_yoomoney:")) {
      const amountStr = data.slice("topup_yoomoney:".length);
      const amount = Number(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) {
        await editMessageContent(ctx, "Неверная сумма.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      try {
        const payment = await api.createYoomoneyPayment(token, {
          amount,
          paymentType: "AC",
        });
        const yooTopup = titleWithEmoji("CARD", `Пополнение на ${formatMoney(amount, client.preferredCurrency)}\n\nНажмите кнопку ниже для оплаты через ЮMoney:`, config?.botEmojis);
        await editMessageContent(ctx, yooTopup.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTopup.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка создания платежа ЮMoney";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("topup_yookassa:")) {
      const amountStr = data.slice("topup_yookassa:".length);
      const amount = Number(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) {
        await editMessageContent(ctx, "Неверная сумма.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      try {
        const payment = await api.createYookassaPayment(token, { amount, currency: "RUB" });
        const yooTopup = titleWithEmoji("CARD", `Пополнение на ${formatMoney(amount, "RUB")}\n\nНажмите кнопку ниже для оплаты через ЮKassa:`, config?.botEmojis);
        await editMessageContent(ctx, yooTopup.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTopup.entities);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Ошибка создания платежа ЮKassa";
        await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      }
      return;
    }

    if (data.startsWith("topup:")) {
      const rest = data.slice("topup:".length);
      const parts = rest.split(":");
      const amountStr = parts[0];
      const amount = Number(amountStr);
      const methodIdFromBtn = parts.length >= 2 ? Number(parts[1]) : null;
      if (!Number.isFinite(amount) || amount <= 0) {
        await editMessageContent(ctx, "Неверная сумма.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const client = await api.getMe(token);
      const methods = config?.plategaMethods ?? [];
      if (methodIdFromBtn != null && Number.isFinite(methodIdFromBtn)) {
        const payment = await api.createPlategaPayment(token, {
          amount,
          currency: client.preferredCurrency,
          paymentMethod: methodIdFromBtn,
          description: "Пополнение баланса",
        });
        const topupPay1 = titleWithEmoji("CARD", `Пополнение на ${formatMoney(amount, client.preferredCurrency)}\n\nНажмите кнопку ниже для оплаты:`, config?.botEmojis);
        await editMessageContent(ctx, topupPay1.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), topupPay1.entities);
        return;
      }
      const yooEnabled = !!config?.yoomoneyEnabled;
      const yookassaEnabled = !!config?.yookassaEnabled;
      if (methods.length > 1 || (methods.length >= 1 && (yooEnabled || yookassaEnabled)) || (methods.length === 0 && (yooEnabled && yookassaEnabled))) {
        const topupPay2 = titleWithEmoji("CARD", `Пополнение на ${formatMoney(amount, client.preferredCurrency)}\n\nВыберите способ оплаты:`, config?.botEmojis);
        await editMessageContent(ctx, topupPay2.text, topupPaymentMethodButtons(amountStr, methods, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds, yooEnabled, yookassaEnabled), topupPay2.entities);
        return;
      }
      // Если ЮMoney единственный способ (нет platega, нет ЮKassa) — сразу создаём платёж ЮMoney
      if (methods.length === 0 && yooEnabled && !yookassaEnabled) {
        try {
          const payment = await api.createYoomoneyPayment(token, { amount, paymentType: "AC" });
          const yooTopup = titleWithEmoji("CARD", `Пополнение на ${formatMoney(amount, client.preferredCurrency)}\n\nНажмите кнопку ниже для оплаты через ЮMoney:`, config?.botEmojis);
          await editMessageContent(ctx, yooTopup.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTopup.entities);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Ошибка создания платежа ЮMoney";
          await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        }
        return;
      }
      // Если только ЮKassa — сразу создаём платёж ЮKassa
      if (methods.length === 0 && yookassaEnabled) {
        try {
          const payment = await api.createYookassaPayment(token, { amount, currency: "RUB" });
          const yooTopup = titleWithEmoji("CARD", `Пополнение на ${formatMoney(amount, "RUB")}\n\nНажмите кнопку ниже для оплаты через ЮKassa:`, config?.botEmojis);
          await editMessageContent(ctx, yooTopup.text, payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), yooTopup.entities);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Ошибка создания платежа ЮKassa";
          await editMessageContent(ctx, `❌ ${msg}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        }
        return;
      }
      const methodId = methods[0]?.id ?? 2;
      const payment = await api.createPlategaPayment(token, {
        amount,
        currency: client.preferredCurrency,
        paymentMethod: methodId,
        description: "Пополнение баланса",
      });
      const topupPay3 = titleWithEmoji("CARD", `Пополнение на ${formatMoney(amount, client.preferredCurrency)}\n\nНажмите кнопку ниже для оплаты:`, config?.botEmojis);
      await editMessageContent(ctx, topupPay3.text, payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), topupPay3.entities);
      return;
    }

    if (data === "menu:referral") {
      const client = await api.getMe(token);
      if (!client.referralCode) {
        await editMessageContent(ctx, "Реферальная ссылка недоступна.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const linkSite = appUrl ? `${appUrl}/cabinet/register?ref=${encodeURIComponent(client.referralCode)}` : null;
      const linkBot = `https://t.me/${BOT_USERNAME || "bot"}?start=ref_${client.referralCode}`;
      const p1 = (client.referralPercent != null && client.referralPercent > 0) ? client.referralPercent : (config?.defaultReferralPercent ?? 0);
      const p2 = config?.referralPercentLevel2 ?? 0;
      const p3 = config?.referralPercentLevel3 ?? 0;
      let rest = "Реферальная программа\n\nПоделитесь ссылкой с друзьями и получайте процент от их пополнений!\n\n";
      rest += "Как это работает:\n";
      rest += `• 1 уровень — ${p1}% от пополнений тех, кто перешёл по вашей ссылке.\n`;
      rest += `• 2 уровень — ${p2}% от пополнений рефералов ваших рефералов.\n`;
      rest += `• 3 уровень — ${p3}% от пополнений рефералов второго уровня.\n`;
      rest += "\nНачисления зачисляются на ваш баланс и могут быть использованы для оплаты тарифов.";
      rest += "\n\nВаши ссылки:";
      if (linkSite) rest += "\n\nСайт:\n" + linkSite;
      rest += "\n\nБот:\n" + linkBot;
      const { text: refText, entities: refEntities } = titleWithEmoji("LINK", rest, config?.botEmojis);
      await editMessageContent(ctx, refText, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), refEntities);
      return;
    }

    if (data === "menu:promocode") {
      awaitingPromoCode.add(userId);
      await editMessageContent(
        ctx,
        "🎟️ Введите промокод\n\nОтправьте промокод сообщением в этот чат.",
        backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds),
      );
      return;
    }

    if (data === "menu:trial") {
      const days = config?.trialDays ?? 0;
      const trialTitle = titleWithEmoji("TRIAL", `Попробовать бесплатно\n\n${days > 0 ? `${days} дней триала.` : "Триал без оплаты."}\n\nАктивировать?`, config?.botEmojis);
      await editMessageContent(ctx, trialTitle.text, trialConfirmButton(innerStyles, innerEmojiIds), trialTitle.entities);
      return;
    }

    if (data === "trial:confirm") {
      const result = await api.activateTrial(token);
      await editMessageContent(ctx, `✅ ${result.message}`, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
      return;
    }

    if (data === "menu:vpn") {
      const subRes = await api.getSubscription(token);
      const vpnUrl = getSubscriptionUrl(subRes.subscription);
      if (!vpnUrl) {
        await editMessageContent(ctx, "Ссылка на VPN недоступна. Оформите подписку.", backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds));
        return;
      }
      const appUrl = config?.publicAppUrl?.replace(/\/$/, "") ?? null;
      if (appUrl) {
        const vpnTitle = titleWithEmoji("SERVERS", "Подключиться к VPN\n\nНажмите кнопку ниже — откроется страница с приложениями и кнопкой «Добавить подписку» (как в кабинете).", config?.botEmojis);
        await editMessageContent(ctx, vpnTitle.text, openSubscribePageMarkup(appUrl, config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), vpnTitle.entities);
      } else {
        const vpnTitle2 = titleWithEmoji("SERVERS", `Подключиться к VPN\n\nОткройте ссылку в приложении VPN:\n${vpnUrl}`, config?.botEmojis);
        await editMessageContent(ctx, vpnTitle2.text, backToMenu(config?.botBackLabel ?? null, innerStyles?.back, innerEmojiIds), vpnTitle2.entities);
      }
      return;
    }

    await ctx.answerCallbackQuery({ text: "Неизвестное действие" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    await ctx.reply(`❌ ${msg}`).catch(() => {});
  }
});

// Сообщения с текстом — промокод или число для пополнения
bot.on("message:text", async (ctx) => {
  if (ctx.message.text?.startsWith("/")) return;
  const userId = ctx.from?.id;
  if (!userId) return;
  const token = getToken(userId);
  if (!token) return;
  const publicConfig = await api.getPublicConfig().catch(() => null);
  if (await enforceSubscription(ctx, publicConfig)) return;

  // Если пользователь ожидает ввод промокода
  if (awaitingPromoCode.has(userId)) {
    awaitingPromoCode.delete(userId);
    const code = ctx.message.text.trim();
    if (!code) {
      await ctx.reply("❌ Промокод не может быть пустым.");
      return;
    }
    try {
      // Сначала проверяем
      const checkResult = await api.checkPromoCode(token, code);
      if (checkResult.type === "FREE_DAYS") {
        // Активируем сразу
        const activateResult = await api.activatePromoCode(token, code);
        await ctx.reply(`✅ ${activateResult.message}\n\nНажмите /start чтобы открыть меню.`);
      } else if (checkResult.type === "DISCOUNT") {
        const desc = checkResult.discountPercent
          ? `скидка ${checkResult.discountPercent}%`
          : checkResult.discountFixed
            ? `скидка ${checkResult.discountFixed}`
            : "скидка";
        await ctx.reply(`✅ Промокод «${checkResult.name}» принят! ${desc}.\n\nСкидка будет применена при оплате тарифа. Используйте этот промокод при оплате.`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ошибка активации промокода";
      await ctx.reply(`❌ ${msg}`);
    }
    return;
  }

  const num = Number(ctx.message.text.replace(/,/, "."));
  if (!Number.isFinite(num) || num < 1 || num > 1000000) return;

  try {
    const config = publicConfig ?? await api.getPublicConfig();
    const methods = config?.plategaMethods ?? [];
    const yooEnabled = !!config?.yoomoneyEnabled;
    const yookassaEnabledMsg = !!config?.yookassaEnabled;
    if (!methods.length && !yooEnabled && !yookassaEnabledMsg) {
      await ctx.reply("Пополнение временно недоступно.");
      return;
    }
    const client = await api.getMe(token);
    const rawStyles = config?.botInnerButtonStyles;
    const backStyle = rawStyles?.back !== undefined ? rawStyles.back : "danger";
    const botEmojis = config?.botEmojis;
    const msgEmojiIds: InnerEmojiIds | undefined = botEmojis
      ? {
          back: botEmojis.BACK?.tgEmojiId,
          card: botEmojis.CARD?.tgEmojiId,
          tariff: botEmojis.PACKAGE?.tgEmojiId || botEmojis.TARIFFS?.tgEmojiId,
          trial: botEmojis.TRIAL?.tgEmojiId,
          profile: botEmojis.PUZZLE?.tgEmojiId || botEmojis.PROFILE?.tgEmojiId,
          connect: botEmojis.SERVERS?.tgEmojiId || botEmojis.CONNECT?.tgEmojiId,
        }
      : undefined;
    if (methods.length > 1 || (methods.length >= 1 && (yooEnabled || yookassaEnabledMsg)) || (methods.length === 0 && yooEnabled && yookassaEnabledMsg)) {
      const topupMsg1 = titleWithEmoji("CARD", `Пополнение на ${formatMoney(num, client.preferredCurrency)}\n\nВыберите способ оплаты:`, config?.botEmojis);
      await ctx.reply(topupMsg1.text, {
        entities: topupMsg1.entities.length ? topupMsg1.entities : undefined,
        reply_markup: topupPaymentMethodButtons(String(num), methods, config?.botBackLabel ?? null, backStyle, msgEmojiIds, yooEnabled, yookassaEnabledMsg),
      });
      return;
    }
    // Если только ЮMoney (нет platega, нет ЮKassa) — сразу создаём
    if (methods.length === 0 && yooEnabled) {
      const payment = await api.createYoomoneyPayment(token, { amount: num, paymentType: "AC" });
      const topupMsgYoo = titleWithEmoji("CARD", `Пополнение на ${formatMoney(num, client.preferredCurrency)}\n\nНажмите кнопку ниже для оплаты через ЮMoney:`, config?.botEmojis);
      await ctx.reply(topupMsgYoo.text, {
        entities: topupMsgYoo.entities.length ? topupMsgYoo.entities : undefined,
        reply_markup: payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, backStyle, msgEmojiIds),
      });
      return;
    }
    // Если только ЮKassa
    if (methods.length === 0 && yookassaEnabledMsg) {
      const payment = await api.createYookassaPayment(token, { amount: num, currency: "RUB" });
      const topupMsgYoo = titleWithEmoji("CARD", `Пополнение на ${formatMoney(num, "RUB")}\n\nНажмите кнопку ниже для оплаты через ЮKassa:`, config?.botEmojis);
      await ctx.reply(topupMsgYoo.text, {
        entities: topupMsgYoo.entities.length ? topupMsgYoo.entities : undefined,
        reply_markup: payUrlMarkup(payment.confirmationUrl, config?.botBackLabel ?? null, backStyle, msgEmojiIds),
      });
      return;
    }
    const payment = await api.createPlategaPayment(token, {
      amount: num,
      currency: client.preferredCurrency,
      paymentMethod: methods[0].id,
      description: "Пополнение баланса",
    });
    const topupMsg2 = titleWithEmoji("CARD", `Пополнение на ${formatMoney(num, client.preferredCurrency)}\n\nНажмите кнопку ниже для оплаты:`, config?.botEmojis);
    await ctx.reply(topupMsg2.text, {
      entities: topupMsg2.entities.length ? topupMsg2.entities : undefined,
      reply_markup: payUrlMarkup(payment.paymentUrl, config?.botBackLabel ?? null, backStyle, msgEmojiIds),
    });
  } catch {
    // не число или ошибка — игнорируем
  }
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start({
  onStart: async (info) => {
    BOT_USERNAME = info.username || "";
    console.log(`Bot @${BOT_USERNAME} started`);
  },
});
