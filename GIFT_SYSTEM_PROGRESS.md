# Gift System v2 — Прогресс реализации

> Этот файл служит напоминалкой о том, что уже сделано, чтобы при сжатии контекста
> агент мог быстро восстановить состояние.

## Спецификации (разбиты по фазам)

| Файл | Содержание | Когда читать |
|------|-----------|-------------|
| `.sisyphus/gift-system/00-overview.md` | Контекст, модели данных, API, стек, ключевые решения | Всегда первым |
| `.sisyphus/gift-system/01-phase0-architecture.md` | Фаза 0: Schema, миграция, service/routes/frontend/bot rewrite | При работе над Фазой 0 |
| `.sisyphus/gift-system/02-phase1-bugfixes.md` | Фаза 1: 10 задач — баги дашборда, subscribe, activate-self, удаление, дубли, rate-limit | При работе над Фазой 1 |
| `.sisyphus/gift-system/03-phase2-admin.md` | Фаза 2: 6 задач — настройки, admin secondary-subs page, история, аналитика, admin codes | При работе над Фазой 2 |
| `.sisyphus/gift-system/04-phase3-recipient.md` | Фаза 3: 8 задач — gift page, existing/new account flow, бот, сообщения, шаринг, уведомления | При работе над Фазой 3 |
| `.sisyphus/gift-system/05-priority.md` | Все 36 задач компактно по фазам | Для быстрого обзора |

> **Старый монолитный файл** `GIFT_SYSTEM_PROMPT.md` — сохранен как архив. Используй файлы выше.

---

## Фаза 0 — Архитектура ✅ DONE

### 0.1 Prisma Schema Changes ✅ DONE
- [x] Создать модель `SecondarySubscription`
- [x] Создать модель `GiftHistory`
- [x] Добавить поле `giftMessage` в `GiftCode`
- [x] Добавить поле `expiryNotifiedAt` в `GiftCode`
- [x] Обновить `GiftCode` FK: `secondaryClientId` -> `secondarySubscriptionId`
- [x] Удалить из `Client`: `parentClientId`, `subscriptionIndex`, `giftStatus` + связи
- [x] Добавить к `Client`: `ownedSubscriptions`, `receivedSubscriptions`, `giftHistory`

### 0.2 Data Migration ✅ DONE
- [x] SQL миграция создана: `backend/prisma/migrations/20260408000000_gift_system_v2/migration.sql`
- [x] Custom SQL: INSERT INTO secondary_subscriptions FROM clients
- [x] Обновить GiftCode FK column
- [x] Удалить старые Client записи
- [x] **НЕ ПРИМЕНЕНА НА ПРОДЕ** — всё локально

### 0.3 Backend — gift.service.ts рефактор ✅ DONE (полный v2 rewrite, ~830 строк)
- [x] `createAdditionalSubscription()` -> prisma.secondarySubscription
- [x] `listClientSubscriptions()` -> prisma.secondarySubscription
- [x] `listAllClientSubscriptions()` -> NEW
- [x] `createGiftCode()` -> prisma.secondarySubscription + giftMessage
- [x] `redeemGiftCode()` -> prisma.secondarySubscription + duplicate check + lazy expiration
- [x] `cancelGiftCode()` -> prisma.secondarySubscription
- [x] `expireGiftCode()` -> prisma.secondarySubscription
- [x] `expireOldGiftCodes()` -> prisma.secondarySubscription
- [x] `listGiftCodes()` -> обновить FK
- [x] `getSubscriptionUrl()` -> prisma.secondarySubscription
- [x] Новый `activateForSelf()` метод
- [x] Новый `deleteSubscription()` метод
- [x] Новый `getGiftHistory()` метод
- [x] Новый `getPublicGiftCodeInfo()` метод

### 0.4 Backend — Routes рефактор ✅ DONE
- [x] `gift.routes.ts` — полностью переписан (public + authed routers)
- [x] `client.routes.ts` — `/subscription/all` -> SecondarySubscription query
- [x] `app.ts` — giftPublicRouter mount + rate limiter (5 req/min per IP)

### 0.5 GiftHistory logging ✅ DONE
- [x] PURCHASED в `createAdditionalSubscription()`
- [x] ACTIVATED_SELF в `activateForSelf()`
- [x] CODE_CREATED в `createGiftCode()`
- [x] GIFT_SENT + GIFT_RECEIVED в `redeemGiftCode()`
- [x] CODE_CANCELLED в `cancelGiftCode()`
- [x] CODE_EXPIRED в `expireGiftCode()`
- [x] DELETED в `deleteSubscription()`

### 0.6 Frontend types update ✅ DONE
- [x] `api.ts` — все gift методы + типы обновлены
- [x] `client-gifts.tsx` — типы, хендлеры, статусы обновлены
- [x] `client-dashboard.tsx` — уже совместим (без изменений)

### 0.7 Bot update ✅ DONE
- [x] `api.ts` — все FK renames (secondaryClientId → secondarySubscriptionId) + giftMessage
- [x] `keyboard.ts` — giftStatus GIFT_CODE_ACTIVE → GIFT_RESERVED, убран OWNED check
- [x] `index.ts` — callback handlers FK renames

### 0.8 Build + Type-check ✅ DONE
- [x] Backend — 0 новых ошибок (3 предсуществующие: maxmind, undici, socks-proxy-agent)
- [x] Frontend — 0 ошибок
- [x] Bot — 0 новых ошибок (2 предсуществующие: undici, socks-proxy-agent)

---

## Фаза 1 — Критические баги + логика подарков ✅ DONE
> Спека: `.sisyphus/gift-system/02-phase1-bugfixes.md`

- [x] 13. Фильтрация неактивных подписок на дашборде — ✅ уже в Phase 0 (giftStatus: null filter)
- [x] 14. Фикс `/cabinet/subscribe` — uuid query param → новый endpoint `GET /subscription/by-uuid/:uuid`, frontend reads `useSearchParams`
- [x] 15. "Активировать себе" — бот `gift:connect:` вызывает `activateForSelf` + показывает URL; фронтенд уже вызывает `giftActivateForSelf`
- [x] 16. Подарок исчезает у отправителя при активации — ✅ уже в Phase 0 (giftStatus changes)
- [x] 17. Удаление подписок — бот: `deleteGiftSubscription` API + кнопка "🗑 Удалить #N" + handler; backend/frontend ✅ из Phase 0
- [x] 18. Подарок = ВСЕГДА SecondarySubscription — ✅ архитектурно обеспечено
- [x] 19. Защита от дублирования подписок — ✅ в redeemGiftCode() (tariffId check)
- [x] 20. Запрет активации собственного кода — ✅ в redeemGiftCode() (creatorId check)
- [x] 21. Ленивая автоэкспирация кодов — ✅ в redeemGiftCode() + expireOldGiftCodes()
- [x] 22. Защита от брутфорса — ✅ giftPublicLimiter (5 req/min) + auth на redeem

---

## Фаза 2 — Админка + история + настройки ✅ DONE
> Спека: `.sisyphus/gift-system/03-phase2-admin.md`

- [x] 23. Перенос настроек подарков в отдельную вкладку — ✅ 5 новых ключей в SystemConfig, вкладка "Подарки" в settings.tsx
- [x] 24. Страница `/admin/secondary-subscriptions` — ✅ таблица, фильтры, детальный модал, bulk delete, создание подарков
- [x] 25. Фильтрация `/admin/clients` — ✅ автоматически (SecondarySubscription в отдельной таблице)
- [x] 26. Вкладка "История" на странице подарков — ✅ timeline UI с типизированными событиями
- [x] 27. Аналитика подарков на дашборде — ✅ 4 StatCard с метриками (создано/активировано/ожидает/истекло)
- [x] 28. Создание подарочных кодов из админки — ✅ POST /admin/gift-codes/create + диалог с поиском клиентов

---

## Фаза 3 — Подарочный flow + UX ✅ DONE
> Спека: `.sisyphus/gift-system/04-phase3-recipient.md`

- [x] 29. Страница `/gift/:code` — ✅ glassmorphism page (visual-engineering), framer-motion, два CTA, auto-redeem
- [x] 30. Flow "Активировать на существующий аккаунт" — ✅ localStorage pending gift + auto-redeem useEffect в dashboard + баннер
- [x] 31. Flow "Создать новый аккаунт" + referral — ✅ redirect /cabinet/register + auto-redeem + referrerId в redeemGiftCode()
- [x] 32. Ввод кода в боте -> SecondarySubscription — ✅ awaitingGiftCode handler + api.redeemGiftCode()
- [x] 33. Персональное сообщение к подарку — ✅ giftMessage в боте, gift page, admin modal
- [x] 34. Шаринг подарка в Telegram — ✅ кнопки "Поделиться" + "Ссылка на подарок" в gift:give: handler
- [x] 35. Push-уведомления — ✅ telegram-notify.ts утилита + уведомления в redeemGiftCode() и боте
- [x] 36. Cron для уведомлений об истечении — ✅ второй cron job + expiryNotifiedAt field + configurable days

---

## ✅ ВСЕ 4 ФАЗЫ ЗАВЕРШЕНЫ — Build Clean

**Финальная проверка** (2026-04-08):
- Frontend: ✅ 0 ошибок
- Backend: ✅ 0 новых ошибок (3 предсуществующие: maxmind, undici, socks-proxy-agent)
- Bot: ✅ 0 новых ошибок (2 предсуществующие: undici, socks-proxy-agent)

**Готово к деплою:** Все 36 задач реализованы, билд чистый. Ждём команду пользователя на push + deploy.

---

## Ключевые решения
- SecondarySubscription — отдельная таблица (не Client)
- GiftHistory — лог всех событий
- Lazy auto-expiration для кодов (не cron)
- Gift = ВСЕГДА SecondarySubscription (никогда не основная)
- Дубли проверяются только среди SecondarySubscription (не root, не flexible)
- Подарочные коды: 12 символов XXXX-XXXX-XXXX
- Rate limiting: 5 попыток/мин по IP
