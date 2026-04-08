# GIFT SYSTEM v2 — Полный промт задачи

## Контекст
Система подарочных подписок STEALTHNET 3.0. Пользователь покупает дополнительную VPN-подписку (через бота или сайт), после чего может:
- **Активировать себе** — добавить как вторую подписку на свой аккаунт (для другого пула серверов)
- **Подарить** — сгенерировать подарочный код, который получатель активирует у себя

---

## Проблема 1: Неактивные подписки на дашборде

### Что сейчас
Дашборд (`client-dashboard.tsx`) показывает ВСЕ secondary подписки — включая те, которые ещё не активированы (только что куплены, но не подключены). Пользователь видит подписку без данных / с пустым статусом.

### Что нужно
Неактивные подписки (у которых в Remnawave нет активного статуса или нет данных) **НЕ должны отображаться** на дашборде. Подписка появляется на дашборде ТОЛЬКО после активации (нажатия "Активировать себе").

### Где фиксить
- **Backend**: `backend/src/modules/client/client.routes.ts` — endpoint `GET /subscription/all` (строка 1722). Сейчас фильтрует только по `giftStatus: null`. Нужно дополнительно проверять статус в Remnawave — если подписка не ACTIVE, не включать в ответ.
- **Frontend (fallback)**: `frontend/src/pages/cabinet/client-dashboard.tsx` — при рендере `secondarySubscriptions` добавить фильтрацию по `subscription.status === "ACTIVE"`.

### Ключевые файлы
- `backend/src/modules/client/client.routes.ts:1722-1782` — endpoint `/subscription/all`
- `frontend/src/pages/cabinet/client-dashboard.tsx:176` — `setSecondarySubscriptions()`
- `frontend/src/pages/cabinet/client-dashboard.tsx:380-484` — рендер secondary subs (MiniApp)
- `frontend/src/pages/cabinet/client-dashboard.tsx:857-869` — рендер secondary subs (Desktop)

---

## Проблема 2: Одинаковые ссылки на подписки

### Что сейчас
Страница `/cabinet/subscribe` (`client-subscribe.tsx`) при загрузке вызывает `api.clientSubscription(token)` (строка 222), который **всегда возвращает ROOT подписку** текущего пользователя. Query-параметр `?uuid=` в URL **вообще не читается и не используется**.

Кнопка "Подключиться" для secondary подписок на дашборде генерирует ссылку `/cabinet/subscribe?uuid=${sec.remnawaveUuid}` — но параметр uuid игнорируется, поэтому все подписки показывают одну и ту же ссылку.

### Что нужно
Страница `/cabinet/subscribe` должна:
1. Читать query-параметр `uuid` из URL
2. Если `uuid` передан — загружать данные именно этой подписки (по UUID из Remnawave)
3. Если `uuid` НЕ передан — загружать root подписку как раньше (обратная совместимость)

### Где фиксить
- **Frontend**: `frontend/src/pages/cabinet/client-subscribe.tsx:218-233` — useEffect с загрузкой данных. Нужно:
  - Читать `uuid` из `useSearchParams()`
  - Если `uuid` есть — вызывать новый API-метод для получения подписки по UUID
  - Если нет — вызывать текущий `api.clientSubscription(token)` как сейчас
- **Backend**: Возможно потребуется новый endpoint `GET /client/subscription/:uuid` или расширение существующего, чтобы загружать данные конкретной подписки по Remnawave UUID.

### Ключевые файлы
- `frontend/src/pages/cabinet/client-subscribe.tsx:192-233` — компонент и загрузка данных
- `frontend/src/pages/cabinet/client-dashboard.tsx:475, 968` — кнопки "Подключиться" с uuid
- `backend/src/modules/client/client.routes.ts:1695-1716` — endpoint `GET /subscription`
- `frontend/src/lib/api.ts:974` — `clientSubscription()` метод

---

## Проблема 3: Кнопка "Активировать себе" — текущее поведение неправильное

### Что сейчас
`handleActivateForSelf()` в `client-gifts.tsx:171-183` просто перенаправляет на `${appUrl}/sub/${res.uuid}` — это ссылка на **Remnawave subscription page** (внешняя страница показа конфигов VPN). Это НЕ активация подписки, а просто переход на страницу, которая уже и так доступна.

В боте аналогично — `gift:connect:` (строка 2998-3013 в `index.ts`) просто отдаёт ту же ссылку `/sub/{uuid}`.

### Что нужно
"Активировать себе" должно:
1. Привязать secondary подписку к своему аккаунту (поменять `giftStatus` с резерва на `null` или на спец. статус "активна для себя")
2. После активации подписка появляется на дашборде как вторая активная подписка
3. Показать confirmation / success screen

### Где фиксить
- **Backend**: Новый endpoint `POST /client/gift/activate-self` — принимает `{ secondaryClientId }`, проверяет что подписка принадлежит клиенту, снимает гифт-резерв, возвращает данные подписки.
- **Frontend** (`client-gifts.tsx`): `handleActivateForSelf()` вызывает новый API, показывает success, обновляет данные.
- **Bot** (`index.ts`): handler `gift:connect:` вызывает тот же backend endpoint, потом показывает success + ссылку на подписку.

### Ключевые файлы
- `frontend/src/pages/cabinet/client-gifts.tsx:171-183` — handleActivateForSelf
- `bot/src/index.ts:2998-3013` — gift:connect: handler
- `backend/src/modules/gift/gift.service.ts` — добавить `activateForSelf()` метод
- `backend/src/modules/gift/gift.routes.ts` — добавить route

---

## Проблема 4: Подарочный код — полный flow для получателя

### Текущий flow (неполный)
1. Покупатель создаёт подарочный код (gift:give → createGiftCode)
2. Получатель вводит код в боте или на сайте (`gift:redeem` / `handleRedeem`)
3. `redeemGiftCode()` в `gift.service.ts:300-389` — переносит подписку получателю (меняет `parentClientId`, ставит `giftStatus: null`)
4. Подписка сразу появляется у получателя

### Что нужно (новый flow для получателя)
Когда получатель получает подарочный код, ему нужно предоставить **два варианта**:

#### Вариант А: "Активировать на существующий аккаунт"
- Получатель уже зарегистрирован в STEALTHNET
- При вводе кода подписка привязывается к его аккаунту (текущая логика `redeemGiftCode`)
- Подписка появляется на дашборде как вторая

#### Вариант Б: "Создать новый аккаунт"
- Получатель НЕ зарегистрирован в STEALTHNET
- Получатель переходит по ссылке → открывается страница с двумя опциями
- При выборе "Создать новый аккаунт" — проходит **полную регистрацию** через существующий onboarding wizard
- После регистрации подарочный код автоматически активируется на новом аккаунте

### Страница активации подарка (НОВАЯ)
Нужна новая страница `/gift/:code` (публичная, без авторизации):
1. По URL загружается информация о подарочном коде (валидность, тариф, срок)
2. Показываются **две кнопки**:
   - "✅ Активировать на существующий аккаунт" → редирект на `/cabinet/gifts` с предзаполненным кодом (или показ формы входа + автоактивация после логина)
   - "🆕 Создать новый аккаунт" → переход на регистрацию, после которой код автоактивируется

### Переиспользование Onboarding Wizard
Существующий wizard в `client-onboarding.tsx` имеет 4 шага:
- Welcome → Password → 2FA → Done

Для flow "Создать новый аккаунт" по подарочному коду:
- Адаптировать wizard: Welcome (с инфой о подарке) → Register (email/пароль) → 2FA (optional) → Done (код автоактивирован)
- Или создать отдельный wizard на базе той же архитектуры (Framer Motion slide animations, progress dots, ChevronRight стрелки)

### Ключевые файлы
- `frontend/src/pages/cabinet/client-onboarding.tsx` — существующий wizard (4 шага с анимациями, прогресс-точки, slide transitions)
- `frontend/src/pages/cabinet/client-register.tsx` — страница регистрации
- `frontend/src/contexts/client-auth.tsx` — auth context (registerByTelegram, isNewTelegramUser)
- `frontend/src/App.tsx:218-229` — route `/cabinet/onboarding`
- `backend/src/modules/gift/gift.service.ts:300-389` — redeemGiftCode()
- `backend/src/modules/gift/gift.routes.ts:170-187` — POST /redeem

---

## Архитектурные заметки

### Модель данных (Prisma)
```
Client {
  id                  String
  parentClientId      String?        // null = root, non-null = secondary
  subscriptionIndex   Int?           // 0 = root, 1+ = additional
  remnawaveUuid       String?        // UUID пользователя в Remnawave
  giftStatus          String?        // null = owned, "GIFT_RESERVED" = зарезервирована для подарка, "GIFTED" = отдана, "GIFT_CODE_ACTIVE" = код создан
  role                String         // "CLIENT" | "ADMIN"
}

GiftCode {
  id                  String
  code                String         // уникальный код (uppercase)
  creatorId           String         // кто создал
  secondaryClientId   String         // какая подписка привязана
  status              String         // "ACTIVE" | "REDEEMED" | "EXPIRED" | "CANCELLED"
  redeemedById        String?        // кто активировал
  redeemedAt          DateTime?
  expiresAt           DateTime
}
```

### API endpoints (существующие)
| Method | Path | Описание |
|--------|------|----------|
| POST | /client/gift/buy | Купить доп. подписку (создаёт secondary Client + Remnawave user) |
| POST | /client/gift/redeem | Активировать подарочный код (перепривязка secondary к получателю) |
| POST | /client/gift/create-code | Создать подарочный код для secondary подписки |
| GET | /client/gift/subscription-url/:id | Получить Remnawave UUID для secondary подписки |
| GET | /client/gift/subscriptions | Список secondary подписок пользователя |
| GET | /client/gift/codes | Список подарочных кодов пользователя |
| GET | /client/subscription | Данные ROOT подписки (Remnawave) |
| GET | /client/subscription/all | Все подписки (root + secondary с giftStatus: null) |

### API endpoints (НОВЫЕ, нужно создать)
| Method | Path | Описание |
|--------|------|----------|
| POST | /client/gift/activate-self | Активировать secondary подписку на себя (снять резерв, сделать видимой) |
| GET | /client/subscription/:uuid | Данные конкретной подписки по Remnawave UUID |
| GET | /public/gift/:code | Публичная инфа о подарочном коде (для страницы активации без авторизации) |

### Ссылки
- `/sub/{uuid}` — **Remnawave** subscription page (конфиги VPN, НЕ наш React). Используется для показа данных подключения.
- `/cabinet/subscribe?uuid={uuid}` — наша страница подключения. СЕЙЧАС ИГНОРИРУЕТ uuid param!
- `/cabinet/gifts` — страница управления подарками (покупка, коды, активация)
- `/cabinet/dashboard` — главный дашборд с подписками
- `/cabinet/onboarding` — wizard регистрации (welcome → password → 2FA → done)

---

## Проблема 5: Удаление подарочных подписок

### Что сейчас
Нет возможности удалить дополнительную подписку. Если пользователь купил подписку и хочет от неё избавиться — способа нет.

### Что нужно
Кнопка "Удалить" на странице подарков (и в боте) с полным удалением:

#### Frontend (сайт)
1. На странице `/cabinet/gifts` рядом с каждой secondary подпиской — кнопка 🗑 "Удалить"
2. При нажатии — confirmation dialog: "Подписка будет удалена безвозвратно. Продолжить?"
3. После подтверждения — вызов API, обновление списка, success toast

#### Bot
1. В списке подписок (`gift:subscriptions`) добавить кнопку "🗑 Удалить #N" для каждой подписки
2. При нажатии — confirmation message: "Вы уверены? Подписка будет удалена."
3. Две кнопки: "Да, удалить" / "Отмена"
4. После подтверждения — вызов API, success message

#### Backend логика удаления
1. Проверить что подписка принадлежит пользователю
2. Если есть активный GiftCode — отменить его (status → "CANCELLED")
3. Удалить пользователя в Remnawave: `remnaDeleteUser(remnawaveUuid)`
4. Удалить запись `SecondarySubscription` из БД (hard delete, т.к. Remnawave user тоже удаляется)
5. Вернуть success

#### Ограничения
- Нельзя удалить подписку с активным подарочным кодом (статус ACTIVE) — сначала отмени код
- ИЛИ: автоматически отменять код при удалении (выбрать подход)
- Нельзя удалить подписку, которая уже была подарена (giftStatus = "GIFTED") — она принадлежит другому пользователю

### Где фиксить
- **Backend**: Новый endpoint `DELETE /client/gift/subscription/:id` в `gift.routes.ts`
- **Backend**: Новый метод `deleteSubscription()` в `gift.service.ts`
- **Frontend**: `client-gifts.tsx` — кнопка удаления + confirmation dialog
- **Bot**: `index.ts` — handler `gift:delete:` + confirmation flow
- **Bot**: `keyboard.ts` — кнопка удаления в giftSubscriptionButtons

### API endpoints (НОВЫЕ)
| Method | Path | Описание |
|--------|------|----------|
| DELETE | /client/gift/subscription/:id | Удалить secondary подписку (+ Remnawave user) |

### Ключевые файлы
- `backend/src/modules/remna/remna.client.ts:84` — `remnaDeleteUser(uuid)` — уже существует!
- `backend/src/modules/gift/gift.service.ts` — добавить `deleteSubscription()`
- `backend/src/modules/gift/gift.routes.ts` — добавить DELETE route
- `frontend/src/pages/cabinet/client-gifts.tsx` — кнопка + dialog
- `bot/src/index.ts` — handler + confirmation
- `bot/src/keyboard.ts` — кнопка в списке

---

## Проблема 6: Архитектурный рефакторинг — отдельная таблица для доп. подписок

### Почему это нужно
Сейчас дополнительные подписки хранятся как записи в таблице `Client` (с `parentClientId != null`). Это создаёт проблемы:

1. **Загрязнение таблицы клиентов** — в админке "Клиенты" отображаются записи, которые не являются настоящими клиентами
2. **Лишние поля** — secondary подписки наследуют 30+ полей Client, которые им не нужны (email, passwordHash, telegramId, balance, referralCode, totp, google/apple auth, UTM-метки, yoomoney, etc.)
3. **Запутанные запросы** — везде нужно помнить про `WHERE parentClientId IS NULL` при работе с "настоящими" клиентами
4. **Нет отдельного управления** — админ не может отдельно видеть/управлять доп. подписками

### Текущая структура (проблемная)
```prisma
model Client {
  // 30+ полей, из которых secondary подписки используют только 5:
  id, parentClientId, subscriptionIndex, remnawaveUuid, giftStatus
  
  // Всё остальное — мёртвый вес для secondary подписок:
  email, passwordHash, role, referralCode, referrerId, balance,
  preferredLang, preferredCurrency, telegramId, telegramUsername,
  isBlocked, blockReason, referralPercent, trialUsed, yoomoneyAccessToken,
  utmSource/Medium/Campaign/Content/Term, totpSecret, totpEnabled,
  googleId, appleId, autoRenewEnabled/TariffId/RetryCount/NotifiedAt,
  yookassaPaymentMethodId/Title ...
}
```

### Новая структура (предлагаемая)

```prisma
// Новая таблица — чистая, только нужные поля
model SecondarySubscription {
  id                  String    @id @default(cuid())
  
  // Владелец (root-клиент)
  ownerId             String    @map("owner_id")
  
  // Remnawave интеграция
  remnawaveUuid       String?   @map("remnawave_uuid")
  subscriptionIndex   Int       @map("subscription_index")   // 1, 2, 3...
  
  // Тариф
  tariffId            String?   @map("tariff_id")
  
  // Статус подарка
  giftStatus          String?   @map("gift_status")           // null = owned | GIFT_RESERVED | GIFT_CODE_ACTIVE | GIFTED
  giftedToClientId    String?   @map("gifted_to_client_id")   // Если подарено — кому
  
  // Метаданные
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  
  // Связи
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

### Что меняется в существующих моделях

```prisma
// Client — УБИРАЕМ поля secondary подписок
model Client {
  // УДАЛИТЬ:
  // parentClientId      String?
  // subscriptionIndex   Int?
  // giftStatus          String?
  // parentClient        Client? @relation("SecondarySubscriptions", ...)
  // secondaryClients    Client[] @relation("SecondarySubscriptions")
  
  // ДОБАВИТЬ:
  ownedSubscriptions    SecondarySubscription[] @relation("OwnerSubscriptions")
  receivedSubscriptions SecondarySubscription[] @relation("ReceivedSubscriptions")
  
  // Остальное без изменений
}

// GiftCode — secondaryClientId → secondarySubscriptionId
model GiftCode {
  // ИЗМЕНИТЬ:
  secondarySubscriptionId  String  @map("secondary_subscription_id")  // было: secondaryClientId
  
  // ДОБАВИТЬ:
  secondarySubscription    SecondarySubscription @relation("GiftCodeSubscription", fields: [secondarySubscriptionId], references: [id], onDelete: Cascade)
  
  // УДАЛИТЬ старую связь через Client
}
```

### Преимущества новой архитектуры
1. **Чистая таблица Client** — только настоящие пользователи, никаких фантомных записей
2. **Админка автоматически чистая** — `/admin/clients` показывает только реальных клиентов
3. **Собственные поля** — можно добавлять специфичные для подписок поля (tariffId, giftedToClientId) без засорения Client
4. **Простые запросы** — `prisma.secondarySubscription.findMany({ where: { ownerId } })` вместо `prisma.client.findMany({ where: { parentClientId } })`
5. **Отдельная админ-вкладка** — натурально ложится на отдельную таблицу

### Миграция данных
Нужен Prisma migration + data migration script:

1. **Создать таблицу** `secondary_subscriptions` (Prisma migrate)
2. **Скопировать данные**: все Client записи с `parentClientId != null` → SecondarySubscription
   ```sql
   INSERT INTO secondary_subscriptions (id, owner_id, remnawave_uuid, subscription_index, gift_status, created_at, updated_at)
   SELECT id, parent_client_id, remnawave_uuid, subscription_index, gift_status, created_at, updated_at
   FROM clients WHERE parent_client_id IS NOT NULL;
   ```
3. **Обновить GiftCode**: `secondary_client_id` → `secondary_subscription_id` (значения те же, т.к. ID совпадают)
4. **Удалить старые записи**: `DELETE FROM clients WHERE parent_client_id IS NOT NULL`
5. **Удалить колонки** из `clients`: `parent_client_id`, `subscription_index`, `gift_status`

**ВАЖНО**: миграцию делать в одной транзакции с кратким даунтаймом. Проект небольшой, данных мало — это безопасно.

### Ключевые файлы для рефакторинга
- `backend/prisma/schema.prisma` — новая модель + изменения в Client и GiftCode
- `backend/src/modules/gift/gift.service.ts` — ВСЕ методы: `createAdditionalSubscription`, `redeemGiftCode`, `createGiftCode`, `cancelGiftCode`, `getSubscriptionUrl`, `listClientSubscriptions`, `deleteSubscription` — все переходят на `prisma.secondarySubscription`
- `backend/src/modules/gift/gift.routes.ts` — типы запросов/ответов
- `backend/src/modules/client/client.routes.ts` — endpoint `/subscription/all`, middleware `extractClientId`
- `frontend/src/pages/cabinet/client-dashboard.tsx` — типы данных для secondary subs
- `frontend/src/pages/cabinet/client-gifts.tsx` — типы данных
- `frontend/src/lib/api.ts` — типы ответов

---

## Проблема 7: Админ-панель — вкладка "Дополнительные подписки"

### Что сейчас
В админке (`/admin/clients`) отображаются ВСЕ записи из таблицы Client, включая secondary подписки. Отдельного управления доп. подписками нет.

### Что нужно
Новая страница `/admin/secondary-subscriptions` в категории "Подписки" (subscription) навигации.

### UI страницы (таблица)

| Колонка | Описание |
|---------|----------|
| # | subscriptionIndex |
| Владелец | Имя/email/telegramId root-клиента (ссылка на карточку клиента) |
| UUID | remnawaveUuid (ссылка на Remnawave) |
| Тариф | Название тарифа |
| Статус Remnawave | ACTIVE / EXPIRED / DISABLED (из Remnawave API) |
| Статус подарка | owned / reserved / code active / gifted |
| Получатель | Если подарено — кто получил |
| Создана | Дата создания |
| Действия | Удалить, Открыть в Remnawave |

### Фильтры
- По статусу подарка (all / owned / reserved / gifted)
- По владельцу (поиск)
- По статусу Remnawave (all / active / expired)

### Действия
- **Удалить** — с confirmation dialog. Удаляет Remnawave user + запись из БД
- **Открыть в Remnawave** — ссылка на Remnawave панель для этого пользователя

### Навигация
В `dashboard-layout.tsx` уже есть категория `"subscription"` (строка 23, 28). Добавить пункт:
```typescript
{ to: "/admin/secondary-subscriptions", label: "Доп. подписки", icon: Gift, section: "secondary-subscriptions", category: "subscription" },
```

### Фильтрация в /admin/clients
После миграции на новую таблицу, страница `/admin/clients` автоматически перестанет показывать secondary подписки, т.к. они будут в отдельной таблице.

**ДО миграции** (если делаем страницу раньше рефакторинга): в backend endpoint для получения клиентов добавить `WHERE parentClientId IS NULL`.

### Ключевые файлы
- `frontend/src/pages/admin-secondary-subscriptions.tsx` — НОВЫЙ файл (страница)
- `frontend/src/App.tsx` — добавить route `/admin/secondary-subscriptions`
- `frontend/src/components/layout/dashboard-layout.tsx:46-50` — добавить пункт навигации
- `backend/src/modules/admin/admin.routes.ts` — НОВЫЕ endpoints для списка/удаления доп. подписок
- `frontend/src/lib/api.ts` — НОВЫЕ методы API

### Backend endpoints (НОВЫЕ, для админки)
| Method | Path | Описание |
|--------|------|----------|
| GET | /admin/secondary-subscriptions | Список всех доп. подписок (пагинация, фильтры) |
| DELETE | /admin/secondary-subscriptions/:id | Удалить доп. подписку (admin action) |

---

## Архитектурные заметки (обновлённые)

### Модель данных — НОВАЯ (после рефакторинга)

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
  ownerId             String          // FK → Client (кто купил/владеет)
  remnawaveUuid       String?         // UUID в Remnawave
  subscriptionIndex   Int             // 1, 2, 3...
  tariffId            String?         // FK → Tariff
  giftStatus          String?         // null = owned | GIFT_RESERVED | GIFT_CODE_ACTIVE | GIFTED
  giftedToClientId    String?         // FK → Client (если подарено)
  createdAt           DateTime
  updatedAt           DateTime
}

// Обновлённая таблица
model GiftCode {
  id                      String
  code                    String
  creatorId               String          // FK → Client
  secondarySubscriptionId String          // FK → SecondarySubscription (было: secondaryClientId → Client)
  redeemedById            String?         // FK → Client
  status                  String          // ACTIVE | REDEEMED | EXPIRED | CANCELLED
  expiresAt               DateTime
  redeemedAt              DateTime?
  createdAt               DateTime
}

// НОВАЯ таблица — лог событий подарочной системы
model GiftHistory {
  id                      String
  clientId                String          // FK → Client (для кого запись)
  secondarySubscriptionId String?         // FK → SecondarySubscription (может быть удалена)
  eventType               String          // PURCHASED | ACTIVATED_SELF | CODE_CREATED | GIFT_SENT | GIFT_RECEIVED | CODE_CANCELLED | DELETED
  metadata                Json?           // Доп. данные: код, имя, тариф, цена
  createdAt               DateTime
}
```

### API endpoints — ПОЛНАЯ таблица

#### Существующие (требуют рефакторинга)
| Method | Path | Описание | Что меняется |
|--------|------|----------|--------------|
| POST | /client/gift/buy | Купить доп. подписку | Создаёт SecondarySubscription вместо Client |
| POST | /client/gift/redeem | Активировать подарочный код | Меняет ownerId в SecondarySubscription |
| POST | /client/gift/create-code | Создать подарочный код | Ссылается на SecondarySubscription |
| GET | /client/gift/subscription-url/:id | Получить Remnawave UUID | Ищет в SecondarySubscription |
| GET | /client/gift/subscriptions | Список доп. подписок | Запрос к SecondarySubscription |
| GET | /client/gift/codes | Список подарочных кодов | Без изменений (GiftCode FK обновлён) |
| GET | /client/subscription | Данные ROOT подписки | Без изменений |
| GET | /client/subscription/all | Все подписки | Запрос к SecondarySubscription |

#### Новые endpoints
| Method | Path | Описание |
|--------|------|----------|
| POST | /client/gift/activate-self | Активировать подписку на себя |
| DELETE | /client/gift/subscription/:id | Удалить подписку (клиент) |
| GET | /client/subscription/:uuid | Подписка по Remnawave UUID |
| GET | /client/gift/history | История подарочных событий (пагинация) |
| GET | /public/gift/:code | Публичная инфо о подарочном коде |
| GET | /admin/secondary-subscriptions | Список всех доп. подписок (админ) |
| DELETE | /admin/secondary-subscriptions/:id | Удалить подписку (админ) |

### Ссылки
- `/sub/{uuid}` — **Remnawave** subscription page (конфиги VPN, НЕ наш React). Используется для показа данных подключения.
- `/cabinet/subscribe?uuid={uuid}` — наша страница подключения. СЕЙЧАС ИГНОРИРУЕТ uuid param — ФИКСИМ.
- `/cabinet/gifts` — страница управления подарками (вкладки: **Подарки | История**)
- `/cabinet/dashboard` — главный дашборд
- `/cabinet/onboarding` — wizard регистрации
- `/gift/:code` — НОВАЯ публичная страница активации подарка
- `/admin/secondary-subscriptions` — НОВАЯ админская страница

---

## Проблема 8: Подарок = ВСЕГДА дополнительная подписка (SecondarySubscription)

### Принцип
Подарочная подписка **НИКОГДА** не становится основной. Во всех сценариях активации подарка — подписка добавляется как `SecondarySubscription`, привязанная к аккаунту получателя.

### Сценарии активации (все приводят к одному результату)

#### Сценарий А: "Активировать себе" (покупатель нажимает кнопку)
1. Покупатель нажимает "Активировать себе" на странице подарков
2. **Backend**: `SecondarySubscription.giftStatus` меняется с `GIFT_RESERVED` → `null` (owned)
3. **Подарок ИСЧЕЗАЕТ** с вкладки "Подарки" у покупателя
4. Подписка ПОЯВЛЯЕТСЯ на дашборде как дополнительная
5. Это НЕ создаёт нового пользователя — подписка просто "активируется" на текущем аккаунте

#### Сценарий Б: Получатель активирует через ссылку/код на СУЩЕСТВУЮЩИЙ аккаунт
1. Получатель переходит по ссылке `/gift/:code` или вводит код в боте/на сайте
2. Получатель выбирает "Активировать на существующий аккаунт" (или уже залогинен)
3. **Backend**: `SecondarySubscription.ownerId` меняется на ID получателя, `giftStatus` → `null`, `giftedToClientId` → ID получателя
4. **У отправителя**: подарок ИСЧЕЗАЕТ с вкладки "Подарки" (giftStatus уже не GIFT_CODE_ACTIVE)
5. **У получателя**: подписка ПОЯВЛЯЕТСЯ на дашборде как дополнительная

#### Сценарий В: Получатель активирует через ссылку/код с СОЗДАНИЕМ НОВОГО аккаунта
1. Получатель переходит по ссылке `/gift/:code`
2. Получатель выбирает "Создать новый аккаунт"
3. Проходит **полную регистрацию** (onboarding wizard: Welcome → Password → 2FA → Done)
4. После завершения регистрации — подарочный код автоматически активируется
5. **Backend**: создаётся полноценный `Client` (root-пользователь со всеми полями), затем `SecondarySubscription.ownerId` → новый Client ID, `giftStatus` → `null`
6. **У отправителя**: подарок ИСЧЕЗАЕТ с вкладки "Подарки"
7. **У нового пользователя**: подписка видна на дашборде как дополнительная

#### Сценарий Г: Получатель вводит код в боте
1. Друг присылает код → получатель вводит его в боте (команда "Ввести код" или `/redeem`)
2. **Backend**: аналогично Сценарию Б — подписка привязывается к аккаунту получателя как SecondarySubscription
3. **У отправителя**: подарок ИСЧЕЗАЕТ с вкладки "Подарки"
4. **У получателя**: подписка появляется на дашборде

### Ключевое правило: исчезновение из "Подарки"
Подарок покидает вкладку "Подарки" отправителя в ЛЮБОМ из случаев:
- Отправитель нажал "Активировать себе"
- Кто-то активировал код (через сайт или бота)
- Кто-то перешёл по ссылке и активировал

**Техническая реализация**: вкладка "Подарки" показывает только `SecondarySubscription` с `giftStatus IN ('GIFT_RESERVED', 'GIFT_CODE_ACTIVE')`. После любой активации `giftStatus` меняется — подарок автоматически исчезает из списка.

### Где фиксить
- **Backend**: `gift.service.ts` — методы `activateForSelf()`, `redeemGiftCode()` должны корректно менять `giftStatus` и `ownerId`
- **Frontend**: `client-gifts.tsx` — вкладка "Подарки" фильтрует по giftStatus
- **Bot**: `index.ts` — handler `gift:connect:` и `gift:redeem` — та же логика

---

## Проблема 9: Вкладка "История" в подарках

### Что нужно
Новая вкладка **"История"** на странице подарков (`/cabinet/gifts`) — лог всех событий, связанных с подарочными подписками. Отображается хронологически (новые сверху).

### Типы событий в истории

| Событие | Текст в истории | Иконка | Когда записывается |
|---------|----------------|--------|-------------------|
| Покупка подарочной подписки | "Подарочная подписка куплена" | 🛒 | При покупке (`/gift/buy`) |
| Активация на себя | "Подписка добавлена в профиль" | ✅ | При нажатии "Активировать себе" |
| Создание подарочного кода | "Подарочный код создан: `{CODE}`" | 🎁 | При создании кода (`/gift/create-code`) |
| Отправка подарка (код активирован получателем) | "Подарок отправлен получателю" | 📤 | Когда кто-то активировал код |
| Получение подарка | "Подарочная подписка получена" | 📥 | Когда ТЫ активировал чужой код |
| Отмена подарочного кода | "Подарочный код отменён" | ❌ | При отмене кода |
| Удаление подписки | "Подписка удалена" | 🗑️ | При удалении подписки |

### Архитектура

#### Новая модель в Prisma
```prisma
model GiftHistory {
  id                      String    @id @default(cuid())
  clientId                String    @map("client_id")          // Для какого пользователя эта запись
  secondarySubscriptionId String?   @map("secondary_subscription_id")  // К какой подписке относится (может быть удалена)
  eventType               String    @map("event_type")         // PURCHASED | ACTIVATED_SELF | CODE_CREATED | GIFT_SENT | GIFT_RECEIVED | CODE_CANCELLED | DELETED
  metadata                Json?     @map("metadata")           // Доп. данные: код, имя получателя, имя отправителя, тариф
  createdAt               DateTime  @default(now()) @map("created_at")

  client                  Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@index([createdAt])
  @@map("gift_history")
}
```

#### Поле `metadata` (JSON) — примеры
```json
// PURCHASED
{ "tariffName": "Стандарт 1 мес", "price": 299 }

// ACTIVATED_SELF
{ "tariffName": "Стандарт 1 мес" }

// CODE_CREATED
{ "code": "ABCD-1234", "tariffName": "Стандарт 1 мес" }

// GIFT_SENT
{ "code": "ABCD-1234", "recipientName": "Username получателя" }

// GIFT_RECEIVED
{ "code": "ABCD-1234", "senderName": "Username отправителя", "tariffName": "Стандарт 1 мес" }

// CODE_CANCELLED
{ "code": "ABCD-1234" }

// DELETED
{ "tariffName": "Стандарт 1 мес" }
```

#### Когда записывать историю (в каких методах)
- `gift.service.ts → createAdditionalSubscription()` → запись `PURCHASED` для покупателя
- `gift.service.ts → activateForSelf()` → запись `ACTIVATED_SELF` для покупателя
- `gift.service.ts → createGiftCode()` → запись `CODE_CREATED` для покупателя
- `gift.service.ts → redeemGiftCode()` → ДВЕ записи:
  - `GIFT_SENT` для отправителя (creatorId)
  - `GIFT_RECEIVED` для получателя (redeemedById)
- `gift.service.ts → cancelGiftCode()` → запись `CODE_CANCELLED` для покупателя
- `gift.service.ts → deleteSubscription()` → запись `DELETED` для владельца

### UI на фронтенде

#### Вкладка "История" на странице подарков
- Страница `/cabinet/gifts` получает дополнительную вкладку: **Подарки | История**
- Переключение между вкладками — tabs (shadcn Tabs)
- История отображается как timeline / список карточек:
  ```
  📥 Подарочная подписка получена
     Стандарт 1 мес · от @username
     2 часа назад

  📤 Подарок отправлен получателю
     Код: ABCD-1234 · получатель: @friend
     вчера

  🛒 Подарочная подписка куплена
     Стандарт 1 мес · 299 ₽
     3 дня назад
  ```
- Glassmorphism стиль карточек
- Пагинация или infinite scroll при большом количестве записей

### API endpoints
| Method | Path | Описание |
|--------|------|----------|
| GET | /client/gift/history | История подарочных событий пользователя (пагинация, сортировка по дате) |

### Ключевые файлы
- `backend/prisma/schema.prisma` — новая модель `GiftHistory`
- `backend/src/modules/gift/gift.service.ts` — добавить запись истории в каждый метод
- `backend/src/modules/gift/gift.routes.ts` — новый endpoint GET `/history`
- `frontend/src/pages/cabinet/client-gifts.tsx` — добавить вкладку "История" + UI
- `frontend/src/lib/api.ts` — новый метод `giftHistory()`

---

## Приоритет реализации

### Фаза 0 (архитектура — ПЕРВЫМ ДЕЛОМ)
1. Создать таблицу `SecondarySubscription` в Prisma schema
2. Создать таблицу `GiftHistory` в Prisma schema
3. Написать миграцию данных (Client → SecondarySubscription)
4. Обновить `GiftCode` FK: `secondaryClientId` → `secondarySubscriptionId`
5. Удалить `parentClientId`, `subscriptionIndex`, `giftStatus` из Client
6. Обновить ВСЕ методы в `gift.service.ts` на новую таблицу
7. Добавить запись `GiftHistory` во ВСЕ методы gift.service.ts (PURCHASED, ACTIVATED_SELF, CODE_CREATED, GIFT_SENT, GIFT_RECEIVED, CODE_CANCELLED, DELETED)
8. Обновить endpoints в `gift.routes.ts` и `client.routes.ts`
9. Обновить фронтенд типы и API-вызовы
10. Тестирование: покупка, активация, подарок, редим — всё должно работать как раньше

### Фаза 1 (критические баги + логика подарков)
11. Фильтрация неактивных подписок на дашборде
12. Фикс `/cabinet/subscribe` — чтение uuid query param
13. Правильная логика "Активировать себе" — подписка уходит из "Подарки" в допы на дашборде (backend + frontend + bot)
14. При активации кем-то другим (через код/ссылку) — подарок исчезает у отправителя из "Подарки"
15. Удаление подписок (backend + frontend + bot)
16. Подарок = ВСЕГДА SecondarySubscription (никогда не основная, во всех сценариях)

### Фаза 2 (админка + история)
17. Страница `/admin/secondary-subscriptions`
18. Фильтрация `/admin/clients` — убедиться что secondary не показываются (автоматически после Фазы 0)
19. Вкладка "История" на странице подарков — UI timeline + endpoint GET /client/gift/history
20. История в боте (опционально — команда или кнопка для просмотра последних событий)

### Фаза 3 (подарочный flow для получателя)
21. Публичная страница `/gift/:code` с двумя вариантами
22. Flow "Активировать на существующий аккаунт" → подписка добавляется как SecondarySubscription
23. Flow "Создать новый аккаунт" — полная регистрация (onboarding wizard) → затем подписка добавляется как SecondarySubscription
24. Ввод кода в боте → подписка добавляется как SecondarySubscription

---

## Проблема 10: Защита от брутфорса подарочных кодов

### Что нужно
Подарочные коды могут быть подобраны перебором если они короткие. Нужна защита:

1. **Формат кода**: минимум 12 символов, формат `XXXX-XXXX-XXXX` (A-Z0-9 = 36^12 комбинаций ≈ 4.7×10^18)
2. **Rate limiting**: макс 5 попыток ввода кода в минуту по IP на endpoints:
   - `POST /client/gift/redeem`
   - `GET /public/gift/:code`
3. **Логирование**: записывать неудачные попытки (IP, код, timestamp) для мониторинга

### Где фиксить
- `backend/src/modules/gift/gift.service.ts` — изменить генерацию кода (сейчас 8 символов → 12 символов с дефисами)
- `backend/src/modules/gift/gift.routes.ts` — добавить rate limiter middleware
- Middleware: можно использовать `express-rate-limit` или простой in-memory counter

---

## Проблема 11: Запрет активации собственного кода

### Что нужно
Пользователь НЕ должен иметь возможность ввести свой же подарочный код. Это бессмысленная операция (у него уже есть кнопка "Активировать себе").

### Проверка
В `redeemGiftCode()` добавить: `if (giftCode.creatorId === recipientClientId) throw "Нельзя активировать свой собственный код"`

### Где фиксить
- `backend/src/modules/gift/gift.service.ts` — метод `redeemGiftCode()`, добавить проверку после загрузки GiftCode
- Frontend / Bot: показать понятное сообщение об ошибке

---

## Проблема 12: Ленивая автоэкспирация подарочных кодов

### Что нужно
У подарочных кодов есть `expiresAt`, но нет механизма автоматической пометки истёкших. Используем **ленивую проверку**: при каждом обращении к коду проверяем `expiresAt < now()`.

### Логика
При любом запросе, который загружает GiftCode:
1. Загрузить код из БД
2. Если `status === "ACTIVE"` и `expiresAt < new Date()`:
   - Обновить `status` → `"EXPIRED"` в БД
   - Записать `GiftHistory` событие `CODE_EXPIRED` для создателя
   - Вернуть ошибку "Код истёк"
3. Иначе — продолжить нормальный flow

### Где применять
- `gift.service.ts → redeemGiftCode()` — перед активацией
- `gift.routes.ts → GET /public/gift/:code` — перед показом информации
- Опционально: `gift.service.ts → cancelGiftCode()` — для консистентности

### Новый тип события в GiftHistory
| Событие | Текст | Иконка | Когда |
|---------|-------|--------|-------|
| Код истёк | "Подарочный код истёк" | ⏰ | При ленивой проверке |

---

## Проблема 13: Персональное сообщение к подарку

### Что нужно
При создании подарочного кода — опциональное поле "Сообщение для получателя" (макс 200 символов). Примеры: "С днём рождения! 🎉", "Пользуйся VPN, бро!".

### Где хранить
В модели `GiftCode` добавить поле:
```prisma
giftMessage    String?   @map("gift_message")   // макс 200 символов
```

### Где отображать
1. **Страница `/gift/:code`** — сообщение от отправителя красиво оформлено (цитата, курсив)
2. **При активации в боте** — "Сообщение от отправителя: ..."
3. **В GiftHistory** — metadata `GIFT_RECEIVED` включает `message`
4. **В админке** — колонка "Сообщение" в таблице подарочных кодов

### Где фиксить
- `backend/prisma/schema.prisma` — поле `giftMessage` в GiftCode
- `backend/src/modules/gift/gift.service.ts → createGiftCode()` — принимать `message` параметр
- `backend/src/modules/gift/gift.routes.ts` — Zod schema для create-code с `message?: string`
- `frontend/src/pages/cabinet/client-gifts.tsx` — textarea при создании кода
- Bot: при создании кода предложить ввести сообщение (или пропустить)

---

## Проблема 14: Уведомления в боте (push-нотификации)

### Что нужно
Уведомлять пользователей о событиях подарочной системы через Telegram-бота.

### Типы уведомлений

| Событие | Кому | Текст | Когда |
|---------|------|-------|-------|
| Подарок активирован | Отправителю | "🎉 Ваш подарок был активирован пользователем @username!" | При `redeemGiftCode()` |
| Код скоро истечёт | Создателю | "⏰ Ваш подарочный код `{CODE}` истекает через 3 дня. Поторопитесь!" | За 3 дня до `expiresAt` (ленивая проверка или cron) |
| Подарок получен | Получателю | "🎁 Вам подарили VPN-подписку! Подписка уже на вашем аккаунте." | При `redeemGiftCode()` |

### Реализация уведомлений "код скоро истечёт"
Два варианта:
- **Ленивый**: при каждом заходе на страницу подарков проверять `expiresAt - 3 days < now()` и если уведомление ещё не отправлено — отправить. Хранить флаг `expiryNotifiedAt` в GiftCode.
- **Cron** (простой): раз в день проходить по `GiftCode WHERE status = 'ACTIVE' AND expiresAt BETWEEN now() AND now() + 3 days AND expiryNotifiedAt IS NULL` и слать уведомления.

**Рекомендация**: Cron проще и надёжнее для этого кейса (не зависит от захода на страницу).

### Где фиксить
- `backend/src/modules/gift/gift.service.ts → redeemGiftCode()` — после успешной активации отправить уведомление отправителю и получателю
- `backend/prisma/schema.prisma` — поле `expiryNotifiedAt DateTime?` в GiftCode
- `backend/src/modules/gift/gift-notifications.cron.ts` — НОВЫЙ файл, cron для напоминаний об истечении
- `bot/src/index.ts` — функция отправки уведомления по telegramId
- Нужна функция `sendBotNotification(telegramId, text)` — проверить есть ли уже такая в боте

### Ключевые файлы
- `bot/src/index.ts` — бот, отправка сообщений
- `backend/src/modules/gift/gift.service.ts` — вызов отправки
- `backend/prisma/schema.prisma` — `expiryNotifiedAt` в GiftCode

---

## Проблема 15: Красивая страница `/gift/:code` (подарочная распаковка)

### Что нужно
Не просто две кнопки, а полноценная "подарочная" страница с вау-эффектом.

### Дизайн-концепт
1. **Анимация распаковки**: при загрузке — Framer Motion анимация "открытия подарка" (коробка открывается, появляется содержимое)
2. **Конфетти-эффект**: при успешной загрузке страницы — canvas confetti (библиотека `canvas-confetti` или CSS анимация)
3. **Информация о подарке**:
   - Название тарифа (из Tariff)
   - Срок подписки (дни)
   - Что включено (трафик, устройства)
   - Персональное сообщение от отправителя (если есть) — в красивом блоке-цитате
4. **Две кнопки**:
   - "✅ Активировать на существующий аккаунт" → редирект на логин, потом автоактивация
   - "🆕 Создать новый аккаунт" → регистрация → автоактивация
5. **Если код истёк/использован**: показать красивую заглушку "Этот подарок уже использован" или "Срок действия истёк"
6. **Стиль**: Glassmorphism, тёмный фон, подарочная тематика (🎁 иконки, золотые акценты)

### Задача для visual-engineering worker
Эту страницу отдать дизайн-воркеру (`task(category="visual-engineering", load_skills=["frontend-ui-ux"])`) — она должна быть КРАСИВОЙ.

### Ключевые файлы
- `frontend/src/pages/gift-activate.tsx` — НОВЫЙ файл
- `frontend/src/App.tsx` — route `/gift/:code` (публичный, без auth)
- `backend/src/modules/gift/gift.routes.ts` — `GET /public/gift/:code`

---

## Проблема 16: Шаринг подарка в Telegram

### Что нужно
При нажатии "Подарить" в боте — вместо просто текста с кодом, отправлять красиво оформленное сообщение с inline-кнопкой.

### Формат сообщения
```
🎁 Вам подарили VPN-подписку STEALTHNET!

📦 Тариф: Стандарт 1 мес
⏰ Действует до: 15.04.2026

{Персональное сообщение от отправителя, если есть}

Нажмите кнопку ниже, чтобы активировать подарок:
```
+ Inline-кнопка: `[🎁 Активировать подарок]` → URL `https://{domain}/gift/{code}`

### Также: кнопка "Поделиться" (forward-friendly)
В боте добавить кнопку "📤 Поделиться" которая позволяет переслать это сообщение через Telegram share picker (`switch_inline_query` или `url` с `tg://msg_url`).

### Где фиксить
- `bot/src/index.ts` — handler `gift:give:` — формировать красивое сообщение
- `bot/src/keyboard.ts` — inline-кнопки для подарочного сообщения
- Backend: endpoint должен возвращать достаточно данных (тариф, срок, сообщение)

---

## Проблема 17: Реферальный бонус за подарки

### Что нужно
Когда получатель подарка **создаёт новый аккаунт** (Сценарий В из Проблемы 8), отправитель подарка получает реферальный бонус — как если бы он привёл нового пользователя по реферальной ссылке.

### Логика
1. При создании нового аккаунта через `/gift/:code` → установить `referrerId = giftCode.creatorId` у нового Client
2. Это автоматически подключит 3-уровневую реферальную систему:
   - При первой оплате нового пользователя → `distributeReferralRewards()` начислит бонус отправителю подарка
3. Отправитель появится в реферальной сети как "пригласивший"

### Существующая реферальная система (как работает)
- `referral.service.ts → distributeReferralRewards(paymentId)` — вызывается при оплате (`markPaymentPaid`)
- 3 уровня: Level 1 (30% default), Level 2 (10%), Level 3 (10%)
- Проценты настраиваются в админке (Настройки → Рефералы)
- Бонус зачисляется на `client.balance`
- Создаётся запись `ReferralCredit` для отчётов
- Проверки: реферер не заблокирован, % > 0
- Идемпотентность через `payment.referralDistributedAt`

### Как интегрировать
В flow "Создать новый аккаунт" через подарочный код:
1. После создания Client → установить `referrerId` = `giftCode.creatorId`
2. Всё — остальное работает автоматически через существующую реферальную систему

### Ограничение: только для НОВЫХ аккаунтов
- Если получатель активирует на **существующий** аккаунт — реферальный бонус НЕ начисляется (он уже зарегистрирован, у него может быть другой реферер)
- Только Сценарий В (новый аккаунт) даёт реферальный бонус

### Ключевые файлы
- `backend/src/modules/referral/referral.service.ts` — `distributeReferralRewards()` (уже существует)
- `backend/src/modules/payment/mark-paid.service.ts` — `markPaymentPaid()` вызывает реф. систему (уже работает)
- `backend/src/modules/gift/gift.service.ts → redeemGiftCode()` — при создании нового аккаунта установить `referrerId`
- `backend/prisma/schema.prisma` — поле `referrerId` в Client (уже есть)

---

## Проблема 18: Аналитика подарков в админке

### Что нужно
Блок "Подарки" на дашборде админки (`/admin/dashboard`) с ключевыми метриками.

### Метрики

| Метрика | Описание | Источник |
|---------|----------|----------|
| Всего куплено | Общее кол-во SecondarySubscription | `COUNT(SecondarySubscription)` |
| За последние 30 дней | Куплено за месяц | `COUNT WHERE createdAt > now() - 30d` |
| Активировано на себя | giftStatus = null AND giftedToClientId IS NULL | `COUNT WHERE ...` |
| Подарено | giftedToClientId IS NOT NULL | `COUNT WHERE ...` |
| Ожидают (коды активны) | giftStatus = GIFT_CODE_ACTIVE | `COUNT WHERE ...` |
| Истекло кодов | GiftCode.status = EXPIRED | `COUNT(GiftCode WHERE status='EXPIRED')` |
| Конверсия подарков | % от купленных → подаренных → активированных | Расчёт |
| Доход от подарков | Сумма платежей за доп. подписки | `SUM(Payment WHERE type='GIFT')` |

### UI
- Карточки с метриками (как существующие на дашборде)
- Мини-график: динамика покупок подарков за 30 дней

### Где фиксить
- `backend/src/modules/admin/admin.routes.ts` — новый endpoint `GET /admin/gift-analytics`
- `frontend/src/pages/dashboard.tsx` (admin) — блок с метриками подарков
- Стиль: аналогично существующим карточкам на дашборде

---

## Проблема 19: Создание подарочных кодов из админки

### Что нужно
Админ может создать подарочный код привязанный к любому тарифу — для промо-акций, конкурсов, поддержки. По сути "бесплатный подарок от сервиса".

### Логика
1. Админ выбирает тариф из списка
2. Backend создаёт SecondarySubscription (без ownerId? или с ownerId = admin?) + Remnawave user + GiftCode
3. Код можно скопировать и отправить кому угодно
4. При активации кода получателем — стандартный flow

### UI в админке
На странице `/admin/secondary-subscriptions` — кнопка "➕ Создать подарочный код":
- Выпадающий список тарифов
- Опционально: персональное сообщение
- Опционально: срок действия кода
- Кнопка "Создать" → показать код + кнопка "Скопировать"

### Особенности
- `SecondarySubscription.ownerId` = ID админа (или системный ID)
- В `GiftHistory` записать `ADMIN_CREATED` событие
- В таблице доп. подписок — пометка "Создано админом"

### Где фиксить
- `backend/src/modules/admin/admin.routes.ts` — `POST /admin/gift-codes/create`
- `frontend/src/pages/admin-secondary-subscriptions.tsx` — кнопка + модалка создания
- `backend/src/modules/gift/gift.service.ts` — метод `adminCreateGiftCode(tariffId, message?, expiryHours?)`

---

## Проблема 20: Перенос настроек подарков в отдельную вкладку админки

### Что сейчас
Настройки подарков находятся во вкладке "Общее" (tab "general") в файле `settings.tsx` (строки 1220-1276):
- `giftSubscriptionsEnabled` (Switch — вкл/выкл)
- `giftCodeExpiryHours` (Input — срок кода в часах, default 72)
- `maxAdditionalSubscriptions` (Input — макс доп. подписок, default 5)

Настройки хранятся в `SystemSetting` (key-value):
- `gift_subscriptions_enabled`
- `gift_code_expiry_hours`
- `max_additional_subscriptions`

### Что нужно
Создать новую вкладку **"Подарки"** (или "Доп. подписки") в настройках админки и перенести туда все gift-настройки. Также добавить новые настройки.

### Новые настройки (помимо существующих 3)
| Ключ | Тип | Default | Описание |
|------|-----|---------|----------|
| `gift_code_format_length` | number | 12 | Длина подарочного кода (без дефисов) |
| `gift_rate_limit_per_minute` | number | 5 | Макс попыток ввода кода в минуту по IP |
| `gift_expiry_notification_days` | number | 3 | За сколько дней до истечения отправлять уведомление |
| `gift_referral_enabled` | boolean | true | Начислять реферальный бонус за подарки (новые аккаунты) |
| `gift_message_max_length` | number | 200 | Макс длина персонального сообщения |

### Где фиксить
- `frontend/src/pages/settings.tsx`:
  - Добавить `TabsTrigger value="gifts"` (строки 744-815 — список триггеров)
  - Добавить `TabsContent value="gifts"` с формой
  - УДАЛИТЬ блок подарков из tab "general" (строки 1220-1276)
- `backend/src/scripts/seed-system-settings.ts` — default values для новых ключей
- `backend/src/modules/admin/admin.routes.ts` — schema + upsert для новых ключей
- `backend/src/modules/client/client.service.ts` — парсинг новых ключей в `getSystemConfig()`
- `frontend/src/lib/api.ts` — типы AdminSettings

---

## Проблема 21: Защита от дублирования подписок

### Что нужно
Если у пользователя уже есть активная SecondarySubscription с определённым тарифом — он не может добавить себе ещё одну с ТЕМ ЖЕ тарифом. Это предотвращает случайное дублирование.

### Логика проверки
При активации подписки (любой сценарий — "Активировать себе", redeem кода, redeem ссылки):
1. Получить `tariffId` у активируемой SecondarySubscription
2. Проверить: `SELECT COUNT(*) FROM SecondarySubscription WHERE ownerId = :recipientId AND tariffId = :tariffId AND giftStatus IS NULL`
3. Если > 0 → ошибка: "У вас уже есть активная подписка на этот тариф"

### Исключения
- **Гибкая подписка** (`flexibleSubscription`) — игнорируем, не сравниваем с ней
- **Основная подписка** (root) — НЕ проверяем против неё. Допы всегда могут дублировать основную (это другой пул серверов)
- **Если тариф = null** (админский подарок без тарифа) — проверку пропускаем

### Где фиксить
- `backend/src/modules/gift/gift.service.ts`:
  - `activateForSelf()` — проверка перед активацией
  - `redeemGiftCode()` — проверка перед привязкой
- Frontend/Bot: показать понятное сообщение "У вас уже есть подписка на этот тариф"

---

## Проблема 7 (ОБНОВЛЁННАЯ): Админ-панель — вкладка "Дополнительные подписки" (ДЕТАЛИЗИРОВАННАЯ)

### UI страницы — ПОЛНАЯ таблица со ВСЕМИ деталями

Страница `/admin/secondary-subscriptions` должна показывать ИСЧЕРПЫВАЮЩУЮ информацию по каждой подписке.

#### Колонки таблицы

| # | Колонка | Источник данных | Описание |
|---|---------|-----------------|----------|
| 1 | **ID** | `SecondarySubscription.id` | Короткий ID (первые 8 символов) |
| 2 | **Владелец** | `SecondarySubscription.owner` → Client | Ссылка: telegramUsername / email / telegramId. Клик → карточка клиента |
| 3 | **Индекс** | `SecondarySubscription.subscriptionIndex` | #1, #2, #3... |
| 4 | **Remnawave UUID** | `SecondarySubscription.remnawaveUuid` | UUID, кнопка "Скопировать", ссылка на Remnawave |
| 5 | **Тариф** | `SecondarySubscription.tariff` → Tariff.name | Название тарифа |
| 6 | **Статус Remnawave** | `remnaGetUser(uuid)` → response.status | ACTIVE 🟢 / EXPIRED 🔴 / DISABLED ⚫ / LIMITED 🟡 |
| 7 | **Дата истечения** | `remnaGetUser(uuid)` → response.expireAt | Формат: "15.04.2026" + "через 30 дней" / "истекла 5 дней назад" |
| 8 | **Трафик** | `remnaGetUser(uuid)` → response.usedTrafficBytes / trafficLimitBytes | "2.5 GB / 50 GB" или "∞" |
| 9 | **Устройства** | `remnaGetUser(uuid)` → response.hwidDeviceLimit | "3 / 5" (использовано / лимит) |
| 10 | **Статус подарка** | `SecondarySubscription.giftStatus` | Бейдж: 🟢 Своя / 🟡 Резерв / 🔵 Код создан / 🟣 Подарена |
| 11 | **Получатель** | `SecondarySubscription.giftedToClient` → Client | Если подарена — кому (ссылка на клиента) |
| 12 | **Подарочный код** | `GiftCode WHERE secondarySubscriptionId` | Код + статус (ACTIVE / REDEEMED / EXPIRED / CANCELLED) |
| 13 | **Сообщение** | `GiftCode.giftMessage` | Персональное сообщение (если есть) |
| 14 | **Создана** | `SecondarySubscription.createdAt` | Дата создания |
| 15 | **Обновлена** | `SecondarySubscription.updatedAt` | Дата последнего изменения |
| 16 | **Создано админом** | Флаг: ownerId = admin? | Бейдж "Админ" если создано через админку |
| 17 | **Действия** | — | Кнопки: Удалить 🗑️, Remnawave ↗️, История 📋 |

#### Подробная карточка (при клике на строку / кнопку "Подробнее")
Модалка или боковая панель с ПОЛНОЙ информацией:

**Блок "Подписка":**
- Все данные из таблицы, но развёрнуто
- Полный Remnawave UUID (не обрезанный)
- Дата создания + "X дней назад"

**Блок "Remnawave данные"** (из `remnaGetUser`):
- Статус (ACTIVE/EXPIRED/DISABLED/LIMITED)
- Дата истечения (expireAt) + countdown
- Использованный трафик / лимит
- Последний онлайн (onlineAt)
- Устройства (hwidDeviceLimit)
- Username в Remnawave

**Блок "Подарочная информация"** (если есть GiftCode):
- Код
- Статус кода
- Кто создал → кто активировал
- Дата создания кода → дата активации
- Персональное сообщение

**Блок "История":**
- Timeline событий из GiftHistory для этой подписки (фильтр по secondarySubscriptionId)

#### Фильтры (верх страницы)
| Фильтр | Тип | Опции |
|--------|-----|-------|
| Статус подарка | Select | Все / Своя / Резерв / Код создан / Подарена |
| Статус Remnawave | Select | Все / Active / Expired / Disabled |
| Владелец | Search (input) | Поиск по email / telegramUsername / telegramId |
| Создано админом | Checkbox | Только созданные админом |
| Период | DateRange | Дата создания от-до |

#### Массовые действия
- Выделить несколько строк (checkbox) → "Удалить выбранные" (с confirmation)

#### Пагинация
- Серверная пагинация (по 20 записей)
- Показать общее количество

### Backend endpoint — ДЕТАЛЬНЫЙ

`GET /admin/secondary-subscriptions`:
```typescript
// Query params:
{
  page?: number;          // default 1
  limit?: number;         // default 20
  giftStatus?: string;    // фильтр
  remnaStatus?: string;   // фильтр (потребует запрос к Remnawave)
  search?: string;        // поиск по владельцу
  adminCreated?: boolean; // фильтр
  dateFrom?: string;      // ISO date
  dateTo?: string;        // ISO date
  sortBy?: string;        // default "createdAt"
  sortDir?: "asc" | "desc"; // default "desc"
}

// Response:
{
  items: Array<{
    id: string;
    owner: { id, email, telegramUsername, telegramId };
    subscriptionIndex: number;
    remnawaveUuid: string | null;
    tariff: { id, name } | null;
    giftStatus: string | null;
    giftedToClient: { id, email, telegramUsername } | null;
    giftCode: { code, status, giftMessage, createdAt, redeemedAt } | null;
    remnaData: { status, expireAt, usedTrafficBytes, trafficLimitBytes, onlineAt, hwidDeviceLimit } | null;
    createdAt: string;
    updatedAt: string;
    isAdminCreated: boolean;
  }>;
  total: number;
  page: number;
  totalPages: number;
}
```

**Примечание по производительности**: запросы к Remnawave API (remnaGetUser) для каждой строки могут быть медленными. Варианты:
1. **Ленивая загрузка**: показывать таблицу без Remnawave данных, подгружать при раскрытии строки
2. **Batch**: если Remnawave API поддерживает batch — запросить всех разом
3. **Кэширование**: кэшировать Remnawave данные на 5 минут

### Ключевые файлы
- `frontend/src/pages/admin-secondary-subscriptions.tsx` — НОВЫЙ файл
- `frontend/src/App.tsx` — route
- `frontend/src/components/layout/dashboard-layout.tsx` — nav item
- `backend/src/modules/admin/admin.routes.ts` — endpoints
- `frontend/src/lib/api.ts` — API методы и типы

---

## Приоритет реализации (ФИНАЛЬНЫЙ)

### Фаза 0 (архитектура — ПЕРВЫМ ДЕЛОМ)
1. Создать таблицу `SecondarySubscription` в Prisma schema
2. Создать таблицу `GiftHistory` в Prisma schema
3. Добавить поле `giftMessage` в GiftCode
4. Добавить поле `expiryNotifiedAt` в GiftCode
5. Написать миграцию данных (Client → SecondarySubscription)
6. Обновить `GiftCode` FK: `secondaryClientId` → `secondarySubscriptionId`
7. Удалить `parentClientId`, `subscriptionIndex`, `giftStatus` из Client
8. Обновить ВСЕ методы в `gift.service.ts` на новую таблицу
9. Добавить запись `GiftHistory` во ВСЕ методы gift.service.ts
10. Обновить endpoints в `gift.routes.ts` и `client.routes.ts`
11. Обновить фронтенд типы и API-вызовы
12. Тестирование: покупка, активация, подарок, редим — всё должно работать

### Фаза 1 (критические баги + логика подарков)
13. Фильтрация неактивных подписок на дашборде
14. Фикс `/cabinet/subscribe` — чтение uuid query param
15. Правильная логика "Активировать себе" — подписка уходит из "Подарки" в допы на дашборде
16. При активации кем-то другим — подарок исчезает у отправителя
17. Удаление подписок (backend + frontend + bot)
18. Подарок = ВСЕГДА SecondarySubscription (все сценарии)
19. Защита от дублирования подписок (один тариф — одна допа)
20. Запрет активации собственного кода
21. Ленивая автоэкспирация кодов
22. Защита от брутфорса (rate limiting + длинные коды)

### Фаза 2 (админка + история + настройки)
23. Перенос настроек подарков в отдельную вкладку "Подарки" в админке + новые настройки
24. Страница `/admin/secondary-subscriptions` с ПОЛНОЙ детализацией (17 колонок + фильтры + карточка)
25. Фильтрация `/admin/clients` — secondary не показываются (автоматически после Фазы 0)
26. Вкладка "История" на странице подарков — UI timeline + endpoint
27. Аналитика подарков на дашборде админки
28. Создание подарочных кодов из админки

### Фаза 3 (подарочный flow для получателя + UX)
29. Публичная страница `/gift/:code` — КРАСИВАЯ (visual-engineering worker) с анимацией распаковки
30. Flow "Активировать на существующий аккаунт" → SecondarySubscription
31. Flow "Создать новый аккаунт" — онбординг → SecondarySubscription + реферальный бонус отправителю
32. Ввод кода в боте → SecondarySubscription
33. Персональное сообщение к подарку (UI создания + отображение)
34. Шаринг подарка в Telegram — красивое сообщение с inline-кнопкой
35. Push-уведомления в боте (подарок активирован, код истекает)
36. Cron для уведомлений об истечении кодов

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
