# Фаза 2 — Админка + история + настройки

> 6 задач. После Фазы 1 (баги).
> Обзор и модели данных: `00-overview.md`

---

## Задача 23: Перенос настроек подарков в отдельную вкладку

### Что сейчас
Настройки подарков во вкладке "Общее" (tab "general") в `settings.tsx` (строки 1220-1276):
- `giftSubscriptionsEnabled` (Switch)
- `giftCodeExpiryHours` (Input, default 72)
- `maxAdditionalSubscriptions` (Input, default 5)

Хранятся в `SystemSetting` (key-value): `gift_subscriptions_enabled`, `gift_code_expiry_hours`, `max_additional_subscriptions`

### Что нужно
Новая вкладка **"Подарки"** в настройках + новые настройки:

| Ключ | Тип | Default | Описание |
|------|-----|---------|----------|
| `gift_code_format_length` | number | 12 | Длина кода (без дефисов) |
| `gift_rate_limit_per_minute` | number | 5 | Макс попыток ввода/мин по IP |
| `gift_expiry_notification_days` | number | 3 | За сколько дней уведомлять |
| `gift_referral_enabled` | boolean | true | Реферальный бонус за подарки |
| `gift_message_max_length` | number | 200 | Макс длина сообщения |

### Где фиксить
- `frontend/src/pages/settings.tsx` — добавить `TabsTrigger/TabsContent value="gifts"`, УДАЛИТЬ блок из "general" (1220-1276)
- `backend/src/scripts/seed-system-settings.ts` — defaults для новых ключей
- `backend/src/modules/admin/admin.routes.ts` — schema + upsert
- `backend/src/modules/client/client.service.ts` — парсинг в `getSystemConfig()`
- `frontend/src/lib/api.ts` — типы AdminSettings

---

## Задача 24: Страница `/admin/secondary-subscriptions` (ПОЛНАЯ ДЕТАЛИЗАЦИЯ)

### Таблица — 17 колонок

| # | Колонка | Источник | Описание |
|---|---------|----------|----------|
| 1 | **ID** | `SecondarySubscription.id` | Первые 8 символов |
| 2 | **Владелец** | `owner -> Client` | telegramUsername / email / telegramId (ссылка) |
| 3 | **Индекс** | `subscriptionIndex` | #1, #2, #3... |
| 4 | **Remnawave UUID** | `remnawaveUuid` | UUID + кнопка "Скопировать" + ссылка |
| 5 | **Тариф** | `tariff -> Tariff.name` | Название |
| 6 | **Статус Remnawave** | `remnaGetUser(uuid).status` | ACTIVE / EXPIRED / DISABLED / LIMITED |
| 7 | **Дата истечения** | `remnaGetUser(uuid).expireAt` | "15.04.2026" + "через 30 дней" |
| 8 | **Трафик** | `remnaGetUser(uuid)` | "2.5 GB / 50 GB" |
| 9 | **Устройства** | `remnaGetUser(uuid).hwidDeviceLimit` | "3 / 5" |
| 10 | **Статус подарка** | `giftStatus` | Бейдж цветной |
| 11 | **Получатель** | `giftedToClient -> Client` | Если подарена (ссылка) |
| 12 | **Подарочный код** | `GiftCode` | Код + статус |
| 13 | **Сообщение** | `GiftCode.giftMessage` | Персональное сообщение |
| 14 | **Создана** | `createdAt` | Дата |
| 15 | **Обновлена** | `updatedAt` | Дата |
| 16 | **Создано админом** | ownerId = admin? | Бейдж |
| 17 | **Действия** | — | Удалить, Remnawave, История |

### Подробная карточка (при клике)
Модалка с блоками: Подписка, Remnawave данные, Подарочная информация, История (timeline из GiftHistory)

### Фильтры
| Фильтр | Тип | Опции |
|--------|-----|-------|
| Статус подарка | Select | Все / Своя / Резерв / Код создан / Подарена |
| Статус Remnawave | Select | Все / Active / Expired / Disabled |
| Владелец | Search | По email / telegramUsername / telegramId |
| Создано админом | Checkbox | Только админские |
| Период | DateRange | Дата от-до |

### Массовые действия
- Checkbox + "Удалить выбранные" (confirmation)

### Пагинация
- Серверная, по 20 записей

### Backend endpoint

`GET /admin/secondary-subscriptions`:
```typescript
// Query: page, limit, giftStatus, remnaStatus, search, adminCreated, dateFrom, dateTo, sortBy, sortDir
// Response: { items: [...], total, page, totalPages }
```

### Производительность Remnawave запросов
Варианты: ленивая загрузка (подгружать при раскрытии), batch, кэширование 5 мин.

### Навигация
В `dashboard-layout.tsx` добавить:
```typescript
{ to: "/admin/secondary-subscriptions", label: "Доп. подписки", icon: Gift, section: "secondary-subscriptions", category: "subscription" }
```

### Ключевые файлы
- `frontend/src/pages/admin-secondary-subscriptions.tsx` — НОВЫЙ
- `frontend/src/App.tsx` — route
- `frontend/src/components/layout/dashboard-layout.tsx` — nav
- `backend/src/modules/admin/admin.routes.ts` — endpoints
- `frontend/src/lib/api.ts` — API + типы

---

## Задача 25: Фильтрация `/admin/clients`

После Фазы 0 это **автоматически** — secondary подписки в отдельной таблице, не в Client. Ничего делать не нужно.

---

## Задача 26: Вкладка "История" на странице подарков

### UI
Страница `/cabinet/gifts` получает вкладку: **Подарки | История** (shadcn Tabs)

### Типы событий

| Событие | Текст | Иконка |
|---------|-------|--------|
| PURCHASED | "Подарочная подписка куплена" | 🛒 |
| ACTIVATED_SELF | "Подписка добавлена в профиль" | ✅ |
| CODE_CREATED | "Подарочный код создан: `{CODE}`" | 🎁 |
| GIFT_SENT | "Подарок отправлен получателю" | 📤 |
| GIFT_RECEIVED | "Подарочная подписка получена" | 📥 |
| CODE_CANCELLED | "Подарочный код отменен" | ❌ |
| CODE_EXPIRED | "Подарочный код истек" | ⏰ |
| DELETED | "Подписка удалена" | 🗑️ |

### Формат отображения (timeline/карточки)
```
📥 Подарочная подписка получена
   Стандарт 1 мес · от @username
   2 часа назад

📤 Подарок отправлен получателю
   Код: ABCD-1234 · получатель: @friend
   вчера
```
Glassmorphism стиль, пагинация/infinite scroll.

### API
`GET /client/gift/history` — пагинация, сортировка по дате desc

### Ключевые файлы
- `frontend/src/pages/cabinet/client-gifts.tsx` — вкладка "История"
- `backend/src/modules/gift/gift.routes.ts` — endpoint
- `frontend/src/lib/api.ts` — метод `giftHistory()`

---

## Задача 27: Аналитика подарков на дашборде админки

### Метрики

| Метрика | Источник |
|---------|----------|
| Всего куплено | `COUNT(SecondarySubscription)` |
| За 30 дней | `COUNT WHERE createdAt > now() - 30d` |
| Активировано на себя | `giftStatus = null AND giftedToClientId IS NULL` |
| Подарено | `giftedToClientId IS NOT NULL` |
| Ожидают (коды активны) | `giftStatus = GIFT_CODE_ACTIVE` |
| Истекло кодов | `GiftCode.status = EXPIRED` |
| Конверсия | % купленных -> подаренных -> активированных |
| Доход от подарков | `SUM(Payment WHERE type='GIFT')` |

### UI
Карточки + мини-график (динамика за 30 дней). Стиль как существующие карточки.

### Ключевые файлы
- `backend/src/modules/admin/admin.routes.ts` — `GET /admin/gift-analytics`
- `frontend/src/pages/dashboard.tsx` (admin) — блок метрик

---

## Задача 28: Создание подарочных кодов из админки

### Логика
1. Админ выбирает тариф
2. Backend: SecondarySubscription (ownerId = admin) + Remnawave user + GiftCode
3. Код можно скопировать

### UI
На `/admin/secondary-subscriptions` — кнопка "+ Создать подарочный код":
- Выпадающий список тарифов
- Опционально: персональное сообщение
- Опционально: срок действия
- "Создать" -> показать код + "Скопировать"

### Особенности
- `SecondarySubscription.ownerId` = ID админа
- GiftHistory: `ADMIN_CREATED`
- В таблице: пометка "Создано админом"

### Ключевые файлы
- `backend/src/modules/admin/admin.routes.ts` — `POST /admin/gift-codes/create`
- `backend/src/modules/gift/gift.service.ts` — `adminCreateGiftCode()`
- `frontend/src/pages/admin-secondary-subscriptions.tsx`
