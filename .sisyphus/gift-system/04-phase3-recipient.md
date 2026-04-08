# Фаза 3 — Подарочный flow для получателя + UX

> 8 задач. После Фазы 2 (админка).
> Обзор и модели данных: `00-overview.md`

---

## Задача 29: Публичная страница `/gift/:code` (КРАСИВАЯ)

> Делегировать `task(category="visual-engineering", load_skills=["frontend-ui-ux"])`

### Дизайн-концепт
1. **Анимация распаковки**: Framer Motion — коробка открывается, содержимое появляется
2. **Конфетти**: `canvas-confetti` или CSS анимация при загрузке
3. **Информация о подарке**: тариф, срок, трафик, устройства, персональное сообщение (блок-цитата)
4. **Две кнопки**:
   - "✅ Активировать на существующий аккаунт" -> логин -> автоактивация
   - "🆕 Создать новый аккаунт" -> регистрация -> автоактивация
5. **Если код истек/использован**: красивая заглушка
6. **Стиль**: Glassmorphism, темный фон, подарочная тематика (🎁, золотые акценты)

### Ключевые файлы
- `frontend/src/pages/gift-activate.tsx` — НОВЫЙ
- `frontend/src/App.tsx` — route `/gift/:code` (публичный, без auth)
- `backend/src/modules/gift/gift.routes.ts` — `GET /public/gift/:code`

---

## Задача 30: Flow "Активировать на существующий аккаунт"

### Flow
1. Получатель на `/gift/:code` нажимает "Активировать на существующий"
2. Если не залогинен -> редирект на `/cabinet/gifts?code={code}` (через login)
3. Если залогинен -> `POST /client/gift/redeem` с кодом
4. Подписка привязывается как SecondarySubscription
5. Success screen

### Проверки
- Код валиден (не истек, не использован)
- Получатель != создатель (задача 20)
- Нет дубликата тарифа (задача 19)
- Подписка добавляется как SecondarySubscription (задача 18)

---

## Задача 31: Flow "Создать новый аккаунт" + referral

### Flow
1. Получатель на `/gift/:code` нажимает "Создать новый аккаунт"
2. Переход на регистрацию (onboarding wizard адаптированный):
   - Welcome (с инфой о подарке) -> Register (email/пароль) -> 2FA (optional) -> Done (код автоактивирован)
3. После регистрации -> `POST /client/gift/redeem` автоматически
4. **Referral**: установить `referrerId = giftCode.creatorId` у нового Client

### Переиспользование Onboarding Wizard
Существующий `client-onboarding.tsx` (4 шага, Framer Motion slide animations, progress dots):
- Адаптировать или создать отдельный wizard на базе той же архитектуры

### Referral интеграция
- `referral.service.ts -> distributeReferralRewards(paymentId)` — вызывается при оплате через `markPaymentPaid()`
- 3 уровня: L1 30%, L2 10%, L3 10% (настраиваемо)
- Просто set `referrerId` — остальное работает автоматически
- **Только для НОВЫХ аккаунтов** (не для существующих)

### Ключевые файлы
- `frontend/src/pages/cabinet/client-onboarding.tsx` — существующий wizard
- `frontend/src/pages/cabinet/client-register.tsx`
- `frontend/src/contexts/client-auth.tsx` — auth context
- `backend/src/modules/referral/referral.service.ts`
- `backend/prisma/schema.prisma` — `referrerId` в Client (уже есть)

---

## Задача 32: Ввод кода в боте -> SecondarySubscription

### Flow
1. Друг присылает код
2. Получатель вводит в боте (команда "Ввести код" / `/redeem`)
3. Backend: подписка привязывается как SecondarySubscription
4. У отправителя подарок исчезает из "Подарки"
5. У получателя подписка появляется на дашборде

### Где фиксить
- `bot/src/index.ts` — handler `gift:redeem` + text in `awaitingGiftCode`
- `bot/src/api.ts` — `redeemGiftCode()`

---

## Задача 33: Персональное сообщение к подарку

### Поле
`GiftCode.giftMessage` (String?, макс 200 символов)

### Где отображать
1. Страница `/gift/:code` — красиво оформленная цитата
2. При активации в боте — "Сообщение от отправителя: ..."
3. В GiftHistory metadata `GIFT_RECEIVED` — поле `message`
4. В админке — колонка "Сообщение"

### Где фиксить
- `gift.service.ts -> createGiftCode()` — принимать `message`
- `gift.routes.ts` — Zod schema с `message?: string`
- `client-gifts.tsx` — textarea при создании кода
- Bot: предложить ввести сообщение (или пропустить)

---

## Задача 34: Шаринг подарка в Telegram

### Формат сообщения
```
🎁 Вам подарили VPN-подписку STEALTHNET!

📦 Тариф: Стандарт 1 мес
⏰ Действует до: 15.04.2026

{Персональное сообщение, если есть}

Нажмите кнопку ниже, чтобы активировать подарок:
```
+ Inline-кнопка: `[🎁 Активировать подарок]` -> URL `https://{domain}/gift/{code}`

### Кнопка "Поделиться"
Forward-friendly через Telegram share picker (`switch_inline_query` или `tg://msg_url`)

### Где фиксить
- `bot/src/index.ts` — handler `gift:give:` — формирование сообщения
- `bot/src/keyboard.ts` — inline-кнопки
- Backend: endpoint возвращает тариф, срок, сообщение

---

## Задача 35: Push-уведомления в боте

### Типы уведомлений

| Событие | Кому | Текст |
|---------|------|-------|
| Подарок активирован | Отправителю | "🎉 Ваш подарок был активирован пользователем @username!" |
| Код скоро истечет | Создателю | "⏰ Ваш подарочный код `{CODE}` истекает через 3 дня." |
| Подарок получен | Получателю | "🎁 Вам подарили VPN-подписку! Подписка уже на вашем аккаунте." |

### Реализация
- При `redeemGiftCode()` — уведомление отправителю и получателю
- Cron (задача 36) — уведомление об истечении
- Нужна функция `sendBotNotification(telegramId, text)`

### Где фиксить
- `backend/src/modules/gift/gift.service.ts -> redeemGiftCode()`
- `bot/src/index.ts` — функция отправки

---

## Задача 36: Cron для уведомлений об истечении кодов

### Логика
Раз в день: `GiftCode WHERE status = 'ACTIVE' AND expiresAt BETWEEN now() AND now() + 3 days AND expiryNotifiedAt IS NULL`
-> Отправить уведомление через бота -> Обновить `expiryNotifiedAt`

### Поле
`GiftCode.expiryNotifiedAt DateTime?` — когда отправлено уведомление

### Ключевые файлы
- `backend/src/modules/gift/gift-notifications.cron.ts` — НОВЫЙ
- `backend/prisma/schema.prisma` — `expiryNotifiedAt` (уже добавлено)
- `bot/src/index.ts` — функция отправки

---

## Ключевые файлы Фазы 3 (сводка)

| Файл | Статус |
|------|--------|
| `frontend/src/pages/gift-activate.tsx` | НОВЫЙ — страница `/gift/:code` |
| `frontend/src/pages/cabinet/client-onboarding.tsx` | Адаптировать для gift flow |
| `frontend/src/pages/cabinet/client-gifts.tsx` | Textarea сообщения |
| `frontend/src/App.tsx` | Route `/gift/:code` |
| `backend/src/modules/gift/gift.service.ts` | redeemGiftCode() уведомления |
| `backend/src/modules/gift/gift.routes.ts` | `GET /public/gift/:code` |
| `backend/src/modules/gift/gift-notifications.cron.ts` | НОВЫЙ — cron |
| `bot/src/index.ts` | Шаринг, уведомления, redeem |
| `bot/src/keyboard.ts` | Inline-кнопки для шаринга |
