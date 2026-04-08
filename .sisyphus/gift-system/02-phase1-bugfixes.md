# Фаза 1 — Критические баги + логика подарков

> 10 задач. После Фазы 0 (архитектура).
> Обзор и модели данных: `00-overview.md`

---

## Задача 13: Фильтрация неактивных подписок на дашборде

### Что сейчас
Дашборд (`client-dashboard.tsx`) показывает ВСЕ secondary подписки — включая те, которые еще не активированы (только что куплены, но не подключены).

### Что нужно
Неактивные подписки (без активного статуса в Remnawave) **НЕ должны отображаться** на дашборде. Подписка появляется ТОЛЬКО после активации ("Активировать себе").

### Где фиксить
- **Backend**: `client.routes.ts` — endpoint `GET /subscription/all` (строка 1722). Дополнительно проверять статус в Remnawave — если не ACTIVE, не включать.
- **Frontend (fallback)**: `client-dashboard.tsx` — при рендере `secondarySubscriptions` фильтрация по `subscription.status === "ACTIVE"`.

### Ключевые файлы
- `backend/src/modules/client/client.routes.ts:1722-1782`
- `frontend/src/pages/cabinet/client-dashboard.tsx:176, 380-484, 857-869`

---

## Задача 14: Фикс `/cabinet/subscribe` — uuid query param

### Что сейчас
`client-subscribe.tsx` при загрузке вызывает `api.clientSubscription(token)` — **всегда ROOT подписку**. `?uuid=` параметр **игнорируется**.

### Что нужно
1. Читать `uuid` из `useSearchParams()`
2. Если `uuid` передан — загружать данные этой подписки по UUID из Remnawave
3. Если нет — загружать root подписку (обратная совместимость)

### Где фиксить
- **Frontend**: `client-subscribe.tsx:218-233` — useEffect
- **Backend**: Новый endpoint `GET /client/subscription/:uuid`

### Ключевые файлы
- `frontend/src/pages/cabinet/client-subscribe.tsx:192-233`
- `frontend/src/pages/cabinet/client-dashboard.tsx:475, 968` — кнопки "Подключиться"
- `backend/src/modules/client/client.routes.ts:1695-1716`
- `frontend/src/lib/api.ts:974`

---

## Задача 15: "Активировать себе" — правильная логика

### Что сейчас
`handleActivateForSelf()` просто перенаправляет на `${appUrl}/sub/${res.uuid}` — это НЕ активация.

### Что нужно
1. Привязать secondary подписку (giftStatus: `GIFT_RESERVED` -> `null`)
2. Подписка появляется на дашборде
3. Success screen

### Где фиксить
- **Backend**: Новый endpoint `POST /client/gift/activate-self` + метод `activateForSelf()`
- **Frontend**: `client-gifts.tsx:171-183` — вызывать новый API
- **Bot**: `index.ts:2998-3013` — handler `gift:connect:`

### Ключевые файлы
- `frontend/src/pages/cabinet/client-gifts.tsx:171-183`
- `bot/src/index.ts:2998-3013`
- `backend/src/modules/gift/gift.service.ts`
- `backend/src/modules/gift/gift.routes.ts`

---

## Задача 16: Подарок исчезает у отправителя при активации

### Правило
Вкладка "Подарки" показывает только `SecondarySubscription` с `giftStatus IN ('GIFT_RESERVED', 'GIFT_CODE_ACTIVE')`. После любой активации `giftStatus` меняется — подарок автоматически исчезает.

### Сценарии
- Отправитель нажал "Активировать себе" -> giftStatus = null
- Кто-то активировал код -> giftStatus = null, ownerId меняется
- Кто-то перешел по ссылке -> аналогично

### Где фиксить
- `gift.service.ts` — `activateForSelf()`, `redeemGiftCode()` корректно меняют giftStatus
- `client-gifts.tsx` — фильтрация по giftStatus
- `bot/index.ts` — handlers

---

## Задача 17: Удаление подписок

### Что нужно
Кнопка "Удалить" с полным удалением:

#### Backend логика
1. Проверить принадлежность
2. Отменить активный GiftCode (status -> CANCELLED)
3. `remnaDeleteUser(remnawaveUuid)`
4. Hard delete SecondarySubscription
5. Записать GiftHistory DELETED

#### Ограничения
- Нельзя удалить подаренную подписку (giftStatus = "GIFTED")

#### Frontend (сайт)
- Кнопка на `/cabinet/gifts` + confirmation dialog + success toast

#### Bot
- Кнопка "Удалить #N" + confirmation + API + success

### API
| Method | Path | Описание |
|--------|------|----------|
| DELETE | /client/gift/subscription/:id | Удалить secondary подписку |

### Ключевые файлы
- `backend/src/modules/remna/remna.client.ts:84` — `remnaDeleteUser(uuid)` (уже есть!)
- `backend/src/modules/gift/gift.service.ts` — `deleteSubscription()`
- `backend/src/modules/gift/gift.routes.ts` — DELETE route
- `frontend/src/pages/cabinet/client-gifts.tsx`
- `bot/src/index.ts`, `bot/src/keyboard.ts`

---

## Задача 18: Подарок = ВСЕГДА SecondarySubscription

### Принцип
Подарочная подписка **НИКОГДА** не становится основной. Все сценарии активации -> SecondarySubscription.

### 4 сценария (все -> один результат)
- **А**: "Активировать себе" -> giftStatus: GIFT_RESERVED -> null
- **Б**: Получатель (существующий аккаунт) -> ownerId меняется, giftStatus -> null
- **В**: Получатель (новый аккаунт) -> регистрация + ownerId -> новый Client ID
- **Г**: Получатель вводит код в боте -> аналогично Б

---

## Задача 19: Защита от дублирования подписок

### Логика
При активации: проверить `COUNT(*) FROM SecondarySubscription WHERE ownerId = :recipientId AND tariffId = :tariffId AND giftStatus IS NULL`. Если > 0 -> ошибка.

### Исключения
- Гибкая подписка (flexibleSubscription) — игнорируем
- Основная подписка (root) — НЕ проверяем
- tariffId = null (админский подарок) — пропускаем проверку

### Где фиксить
- `gift.service.ts` -> `activateForSelf()`, `redeemGiftCode()`
- Frontend/Bot: понятное сообщение об ошибке

---

## Задача 20: Запрет активации собственного кода

### Проверка
В `redeemGiftCode()`: `if (giftCode.creatorId === recipientClientId) throw "Нельзя активировать свой собственный код"`

### Где фиксить
- `backend/src/modules/gift/gift.service.ts` -> `redeemGiftCode()`
- Frontend/Bot: сообщение об ошибке

---

## Задача 21: Ленивая автоэкспирация кодов

### Логика
При любом обращении к GiftCode:
1. Загрузить из БД
2. Если `status === "ACTIVE"` и `expiresAt < new Date()`:
   - Обновить status -> `"EXPIRED"`
   - Записать GiftHistory `CODE_EXPIRED`
   - Вернуть ошибку "Код истек"

### Где применять
- `redeemGiftCode()` — перед активацией
- `GET /public/gift/:code` — перед показом
- `cancelGiftCode()` — для консистентности

---

## Задача 22: Защита от брутфорса

### Формат кода
12 символов, `XXXX-XXXX-XXXX` (A-Z0-9 = 36^12 ~ 4.7x10^18 комбинаций)

### Rate limiting
Макс 5 попыток/мин по IP на:
- `POST /client/gift/redeem`
- `GET /public/gift/:code`

### Реализация
- `express-rate-limit` или простой in-memory counter
- Логирование неудачных попыток

### Где фиксить
- `gift.service.ts` — генерация кода (8 -> 12 символов)
- `gift.routes.ts` — rate limiter middleware
