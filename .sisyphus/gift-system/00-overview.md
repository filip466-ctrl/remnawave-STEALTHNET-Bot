# GIFT SYSTEM v2 — Обзор и архитектура

> Читай этот файл ПЕРВЫМ. Он содержит контекст, модели данных, API таблицу и стек.
> Детали по фазам — в отдельных файлах (`01-phase0-*.md` ... `04-phase3-*.md`).

## Контекст

Система подарочных подписок STEALTHNET 3.0. Пользователь покупает дополнительную VPN-подписку (через бота или сайт), после чего может:
- **Активировать себе** — добавить как вторую подписку на свой аккаунт (для другого пула серверов)
- **Подарить** — сгенерировать подарочный код, который получатель активирует у себя

---

## Модель данных — НОВАЯ (после рефакторинга)

```prisma
// Чистая таблица — только реальные клиенты
model Client {
  id                  String
  email               String?
  passwordHash        String?
  role                String          // "CLIENT" | "ADMIN"
  remnawaveUuid       String?         // UUID основной подписки
  telegramId          String?
  balance             Float
  // ... остальные поля без изменений
  
  // Связи с доп. подписками (НОВЫЕ)
  ownedSubscriptions    SecondarySubscription[]  @relation("OwnerSubscriptions")
  receivedSubscriptions SecondarySubscription[]  @relation("ReceivedSubscriptions")
}

// НОВАЯ таблица
model SecondarySubscription {
  id                  String
  ownerId             String          // FK -> Client (кто купил/владеет)
  remnawaveUuid       String?         // UUID в Remnawave
  subscriptionIndex   Int             // 1, 2, 3...
  tariffId            String?         // FK -> Tariff
  giftStatus          String?         // null = owned | GIFT_RESERVED | GIFT_CODE_ACTIVE | GIFTED
  giftedToClientId    String?         // FK -> Client (если подарено)
  createdAt           DateTime
  updatedAt           DateTime
}

// Обновленная таблица
model GiftCode {
  id                      String
  code                    String
  creatorId               String          // FK -> Client
  secondarySubscriptionId String          // FK -> SecondarySubscription (было: secondaryClientId -> Client)
  redeemedById            String?         // FK -> Client
  status                  String          // ACTIVE | REDEEMED | EXPIRED | CANCELLED
  expiresAt               DateTime
  redeemedAt              DateTime?
  giftMessage             String?         // Персональное сообщение (макс 200 символов)
  expiryNotifiedAt        DateTime?       // Когда отправлено уведомление об истечении
  createdAt               DateTime
}

// НОВАЯ таблица — лог событий подарочной системы
model GiftHistory {
  id                      String
  clientId                String          // FK -> Client (для кого запись)
  secondarySubscriptionId String?         // FK -> SecondarySubscription (может быть удалена)
  eventType               String          // PURCHASED | ACTIVATED_SELF | CODE_CREATED | GIFT_SENT | GIFT_RECEIVED | CODE_CANCELLED | CODE_EXPIRED | DELETED
  metadata                Json?           // Доп. данные: код, имя, тариф, цена
  createdAt               DateTime
}
```

---

## API endpoints — ПОЛНАЯ таблица

### Существующие (требуют рефакторинга)
| Method | Path | Описание | Что меняется |
|--------|------|----------|--------------|
| POST | /client/gift/buy | Купить доп. подписку | Создает SecondarySubscription вместо Client |
| POST | /client/gift/redeem | Активировать подарочный код | Меняет ownerId в SecondarySubscription |
| POST | /client/gift/create-code | Создать подарочный код | Ссылается на SecondarySubscription |
| GET | /client/gift/subscription-url/:id | Получить Remnawave UUID | Ищет в SecondarySubscription |
| GET | /client/gift/subscriptions | Список доп. подписок | Запрос к SecondarySubscription |
| GET | /client/gift/codes | Список подарочных кодов | Без изменений (GiftCode FK обновлен) |
| GET | /client/subscription | Данные ROOT подписки | Без изменений |
| GET | /client/subscription/all | Все подписки | Запрос к SecondarySubscription |

### Новые endpoints
| Method | Path | Описание |
|--------|------|----------|
| POST | /client/gift/activate-self | Активировать подписку на себя |
| DELETE | /client/gift/subscription/:id | Удалить подписку (клиент) |
| GET | /client/subscription/:uuid | Подписка по Remnawave UUID |
| GET | /client/gift/history | История подарочных событий (пагинация) |
| GET | /public/gift/:code | Публичная инфо о подарочном коде |
| GET | /admin/secondary-subscriptions | Список всех доп. подписок (админ) |
| DELETE | /admin/secondary-subscriptions/:id | Удалить подписку (админ) |
| GET | /admin/gift-analytics | Аналитика подарков |
| POST | /admin/gift-codes/create | Создание кода из админки |

---

## Ключевые ссылки (URL)

- `/sub/{uuid}` — **Remnawave** subscription page (конфиги VPN, НЕ наш React)
- `/cabinet/subscribe?uuid={uuid}` — наша страница подключения. СЕЙЧАС ИГНОРИРУЕТ uuid param — ФИКСИМ
- `/cabinet/gifts` — страница управления подарками (вкладки: **Подарки | История**)
- `/cabinet/dashboard` — главный дашборд
- `/cabinet/onboarding` — wizard регистрации
- `/gift/:code` — НОВАЯ публичная страница активации подарка
- `/admin/secondary-subscriptions` — НОВАЯ админская страница

---

## Ключевые решения

- SecondarySubscription — отдельная таблица (не Client)
- GiftHistory — лог всех событий
- Lazy auto-expiration для кодов (не cron) — кроме уведомлений (cron)
- Gift = ВСЕГДА SecondarySubscription (никогда не основная)
- Дубли проверяются только среди SecondarySubscription (не root, не flexible)
- Подарочные коды: 12 символов XXXX-XXXX-XXXX
- Rate limiting: 5 попыток/мин по IP
- Referral: set `referrerId = giftCode.creatorId` при создании нового аккаунта через подарок

---

## Стек и стиль

- TypeScript strict mode, никакого `any`
- React 18 + React Router v6 (useSearchParams, useParams)
- Tailwind v4 (новый синтаксис)
- shadcn/ui компоненты из `src/components/ui/`
- Framer Motion для анимаций
- Glassmorphism стиль: `bg-white/10`, `backdrop-blur`, `border-white/20`
- Backend: Express, Prisma ORM, Zod validation
- Remnawave API: `remna.client.ts` — `remnaCreateUser`, `remnaGetUser`, `remnaDeleteUser`

---

## Файлы спецификаций по фазам

| Файл | Содержание |
|------|-----------|
| `01-phase0-architecture.md` | Фаза 0: Prisma schema, миграция, рефакторинг gift.service/routes, frontend/bot обновление |
| `02-phase1-bugfixes.md` | Фаза 1: Критические баги (дашборд, subscribe page, activate-self, удаление, дубли, rate-limit) |
| `03-phase2-admin.md` | Фаза 2: Админка (настройки подарков, secondary-subscriptions page, история, аналитика, admin codes) |
| `04-phase3-recipient.md` | Фаза 3: Flow получателя (gift page, existing/new account, bot, сообщения, шаринг, уведомления) |
| `05-priority.md` | Финальный приоритет: все 36 задач по фазам |
