# Фаза 0 — Архитектурный рефакторинг

> Создание новых таблиц, миграция данных, обновление всего backend/frontend/bot на новую структуру.
> Обзор и модели данных: `00-overview.md`

---

## 0.1 Prisma Schema Changes

### Новая модель SecondarySubscription

```prisma
model SecondarySubscription {
  id                  String    @id @default(cuid())
  ownerId             String    @map("owner_id")
  remnawaveUuid       String?   @map("remnawave_uuid")
  subscriptionIndex   Int       @map("subscription_index")
  tariffId            String?   @map("tariff_id")
  giftStatus          String?   @map("gift_status")
  giftedToClientId    String?   @map("gifted_to_client_id")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  
  owner               Client    @relation("OwnerSubscriptions", fields: [ownerId], references: [id], onDelete: Cascade)
  giftedToClient      Client?   @relation("ReceivedSubscriptions", fields: [giftedToClientId], references: [id], onDelete: SetNull)
  tariff              Tariff?   @relation(fields: [tariffId], references: [id], onDelete: SetNull)
  giftCodes           GiftCode[] @relation("GiftCodeSubscription")
  
  @@unique([ownerId, subscriptionIndex])
  @@index([ownerId])
  @@index([remnawaveUuid])
  @@index([giftStatus])
  @@map("secondary_subscriptions")
}
```

### Новая модель GiftHistory

```prisma
model GiftHistory {
  id                      String    @id @default(cuid())
  clientId                String    @map("client_id")
  secondarySubscriptionId String?   @map("secondary_subscription_id")
  eventType               String    @map("event_type")
  metadata                Json?
  createdAt               DateTime  @default(now()) @map("created_at")
  
  client                  Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  
  @@index([clientId])
  @@index([secondarySubscriptionId])
  @@index([createdAt])
  @@map("gift_history")
}
```

### Изменения в Client
- **УДАЛИТЬ**: `parentClientId`, `subscriptionIndex`, `giftStatus`, `parentClient`/`secondaryClients` relations, `@@unique([parentClientId, subscriptionIndex])`, `@@index([parentClientId])`
- **ДОБАВИТЬ**: `ownedSubscriptions SecondarySubscription[] @relation("OwnerSubscriptions")`, `receivedSubscriptions SecondarySubscription[] @relation("ReceivedSubscriptions")`, `giftHistory GiftHistory[]`

### Изменения в GiftCode
- **ПЕРЕИМЕНОВАТЬ**: `secondaryClientId` -> `secondarySubscriptionId`
- **ДОБАВИТЬ**: `giftMessage String?`, `expiryNotifiedAt DateTime?`
- **ОБНОВИТЬ**: relation -> `SecondarySubscription @relation("GiftCodeSubscription")`

### Изменения в Tariff
- **ДОБАВИТЬ**: `secondarySubscriptions SecondarySubscription[]`

---

## 0.2 Data Migration (SQL)

```sql
-- 1. Prisma создает таблицы secondary_subscriptions и gift_history

-- 2. Миграция данных Client -> SecondarySubscription
INSERT INTO secondary_subscriptions (id, owner_id, remnawave_uuid, subscription_index, gift_status, created_at, updated_at)
SELECT id, parent_client_id, remnawave_uuid, subscription_index, gift_status, created_at, updated_at
FROM clients WHERE parent_client_id IS NOT NULL;

-- 3. Обновить GiftCode FK
ALTER TABLE gift_codes RENAME COLUMN secondary_client_id TO secondary_subscription_id;

-- 4. Удалить старые Client записи
DELETE FROM clients WHERE parent_client_id IS NOT NULL;

-- 5. Prisma удалит старые колонки из clients
```

**ВАЖНО**: миграцию делать в одной транзакции с кратким даунтаймом. Данных мало — безопасно.

---

## 0.3 Backend — gift.service.ts рефакторинг

Файл: `backend/src/modules/gift/gift.service.ts` (522 строки) — ВСЕ методы переписываются.

### Текущие методы (все нужен rewrite)
| Метод | Что меняется |
|-------|-------------|
| `generateGiftCode()` | 8 символов -> 12 символов XXXX-XXXX-XXXX |
| `getNextSubscriptionIndex(parentClientId)` | `prisma.client` -> `prisma.secondarySubscription` |
| `secondaryRemnaUsername(rootClient, index)` | Без изменений (генерация username) |
| `createAdditionalSubscription(rootClientId, tariff)` | Создает SecondarySubscription + Remnawave user |
| `listClientSubscriptions(rootClientId)` | `prisma.secondarySubscription.findMany({ where: { ownerId } })` |
| `createGiftCode(rootClientId, secondaryClientId)` | FK -> `secondarySubscriptionId`, принимает `message` |
| `redeemGiftCode(recipientRootClientId, code)` | Меняет `ownerId` + `giftedToClientId` в SecondarySubscription |
| `cancelGiftCode(rootClientId, codeOrId)` | Обновляет SecondarySubscription |
| `expireGiftCode(giftCodeId, secondaryClientId)` | Обновляет SecondarySubscription |
| `expireOldGiftCodes()` | Запрос к SecondarySubscription |
| `listGiftCodes(rootClientId)` | FK обновлен |
| `getSubscriptionUrl(secondaryClientId, rootClientId)` | Ищет в SecondarySubscription |

### Новые методы
| Метод | Описание |
|-------|----------|
| `activateForSelf(ownerId, subscriptionId)` | Снять GIFT_RESERVED -> null, подписка появляется на дашборде |
| `deleteSubscription(ownerId, subscriptionId)` | Отменить GiftCode + remnaDeleteUser + hard delete |

---

## 0.4 Backend — Routes рефакторинг

### gift.routes.ts
- Все endpoints: обновить FK field names (`secondaryClientId` -> `secondarySubscriptionId`)
- Добавить: `POST /activate-self`, `DELETE /subscription/:id`

### client.routes.ts
- Endpoint `GET /subscription/all` (строка 1722) -> запрос к `prisma.secondarySubscription` вместо `prisma.client`

---

## 0.5 GiftHistory logging

В каждый метод gift.service.ts добавить запись в GiftHistory:

| Метод | Событие | metadata |
|-------|---------|----------|
| `createAdditionalSubscription()` | `PURCHASED` | `{ tariffName, price }` |
| `activateForSelf()` | `ACTIVATED_SELF` | `{ tariffName }` |
| `createGiftCode()` | `CODE_CREATED` | `{ code, tariffName }` |
| `redeemGiftCode()` | `GIFT_SENT` (отправителю) + `GIFT_RECEIVED` (получателю) | `{ code, recipientName }` / `{ code, senderName, tariffName }` |
| `cancelGiftCode()` | `CODE_CANCELLED` | `{ code }` |
| `expireGiftCode()` | `CODE_EXPIRED` | `{ code }` |
| `deleteSubscription()` | `DELETED` | `{ tariffName }` |

---

## 0.6 Frontend types update

### api.ts
- Обновить типы ответов: `SecondarySubscription` вместо Client-like shape
- Поля: `id`, `ownerId`, `remnawaveUuid`, `subscriptionIndex`, `tariffId`, `giftStatus`, `giftedToClientId`

### client-dashboard.tsx
- State `secondarySubscriptions` -> типизировать как `SecondarySubscription[]`

### client-gifts.tsx
- Все типы обновить на новую структуру

---

## 0.7 Bot update

### index.ts
- Все callback handlers (`gift:buy`, `gift_tariff:ID`, `gift:subscriptions`, `gift:connect:ID`, `gift:give:ID`, `gift:redeem`, `gift:codes`, `gift:cancel_code:ID`)
- Обновить поля: `secondaryClientId` -> `secondarySubscriptionId`, `subscriptionIndex`, `parentClientId` -> `ownerId`

### keyboard.ts
- 6 функций: обновить field names

### api.ts
- 7 методов: обновить URL paths и response types

---

## 0.8 Build + Test

```bash
npm run build  # backend
npm run build  # frontend  
npm run build  # bot
```

---

## Ключевые файлы (полный список)

| Файл | Что делать |
|------|-----------|
| `backend/prisma/schema.prisma` | Новые модели + изменения (УЖЕ СДЕЛАНО) |
| `backend/src/modules/gift/gift.service.ts` | ПОЛНЫЙ REWRITE |
| `backend/src/modules/gift/gift.routes.ts` | Обновить endpoints + FK fields |
| `backend/src/modules/client/client.routes.ts` | `/subscription/all` -> SecondarySubscription |
| `frontend/src/lib/api.ts` | Типы ответов |
| `frontend/src/pages/cabinet/client-dashboard.tsx` | Типы secondary subs |
| `frontend/src/pages/cabinet/client-gifts.tsx` | Типы + поля |
| `bot/src/index.ts` | Callback handlers |
| `bot/src/keyboard.ts` | Keyboards |
| `bot/src/api.ts` | API calls |
