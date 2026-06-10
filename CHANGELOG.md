# CHANGELOG

## 5.0.0 — 2026-06-04

### Главное меню бота

- Порядок строк: `👋 Приветствие → 🛡 Имя сервиса → 💰 Баланс → 🔢 Подписки → 💎 Тариф`.
  Раньше имя сервиса и баланс «проваливались» под список подписок.
- Баланс выведен **жирным** и переименован в «💰 Ваш Баланс:» (миграция
  `20260604170000_balance_label_yours` для существующих БД).
- Приветствие «👋 Добро пожаловать» теперь **жирное**.
- **Удалена кнопка «🤖 Свой бот»** — остаток clone-bots (предлагала создать
  бот-клон). Убрана из кода (bot keyboard/i18n/handler, backend+frontend
  default buttons) и из сохранённого `bot_buttons` существующих БД (миграция
  `20260604180000_remove_own_bot_button`).

### Безопасность апгрейда

- **Pre-check дубликатов `telegram_id` в `docker-entrypoint.sh`** перед миграциями.
  v5 возвращает `@unique(telegram_id)`; если апгрейд идёт с multi-bot версии, где
  один TG-юзер мог быть в нескольких клонах (дубли) — entrypoint теперь отказывает
  **заранее** с понятным сообщением (как чистить), а не падает посреди миграции.
  Срабатывает только если есть `clients.bot_id` (т.е. это именно clone-bots-апгрейд).

### Багфиксы и UX

- **Авто-renew уведомления: `\n` теперь даёт перенос строки.** `renderTemplate`
  (`auto-renew-notifications.service.ts`) конвертирует литеральные `\n`/`\r\n`
  (которые админ вписывает в textarea руками) в реальные переносы. Реальные
  переносы из seed не затрагиваются.
- **Убрана кнопка «📖 Инструкции»** из раздела реферальной программы бота
  (оба referral-блока в `bot/src/index.ts`).
- **Текст экрана «⭕ Помощь» (`help_intro_text`) теперь редактируется из админки.**
  Бэкенд (allow-list, save-handler) и бот уже читали его из конфига — не хватало
  только поля ввода в Настройках (`settings.tsx`). Добавлена textarea рядом с
  другими bot-текстами.
- **Mini App: на карточке основной подписки не было кнопок** «Подключиться» и
  «Продлить» (были только у дополнительных подписок + в отдельной секции «Как
  подключиться» ниже). Добавлены прямо в карточку primary-подписки по образцу
  secondary (`client-dashboard.tsx`).

- **Прокси-серверы не сохранялись.** Ключ `tg_proxy_servers` отсутствовал в
  allow-list `getSystemConfig` (`client.service.ts`), поэтому список писался в БД,
  но при загрузке настроек всегда возвращался пустым → «пропадал». Добавлен в
  allow-list. Save-handler и parsing были корректны.
- **Убрана фейковая строка «Нагрузка на сервер: X%»** из главного меню бота
  (`bot/src/index.ts`) — это было `Math.random()`, не реальная метрика.
- **Урезан текст экрана «Бесплатный прокси для Telegram»** — убран длинный
  раздел «Как выключить прокси…», оставлено короткое описание. Seed обновлён +
  миграция `20260604160000_proxy_text_short` для существующих БД (трогает только
  немодифицированный дефолт).

### Чистка меток разработки

- Удалены 904 упоминания `WolfVPN`/`WolfPN` из комментариев-меток вида
  `// T-xxx (DD.MM.2026, WolfVPN): …` по всей кодовой базе (70 файлов).
  Сами пояснения к коду сохранены — убраны только тег-префикс и чужой бренд.
- Почищены 2 устаревших комментария про удалённое поле `botId`.

### Проверка тарифной системы × платёжки

- Подтверждено: новая система тарифов (price options, locations, trials,
  custom price, extra devices, unified subscriptions) корректно работает со
  всеми **8 платёжными провайдерами** (Platega, YooKassa, YooMoney, CryptoPay,
  Heleket, Lava, Lava.top, Overpay). Каждый передаёт `tariffId` /
  `tariffPriceOptionId` / `subscriptionId` / `deviceCount` в единый путь
  активации `activateTariffByPaymentId`. Ни один webhook не ссылается на
  удалённые поля `Payment.botId/baseAmount/botMarkup*`.

### Дебрендинг (WolfPN → нейтрально)

- Архив v5-base был собран из инсталляции WolfPN — почистили хардкод бренда:
  - `bot/src/index.ts`: реферальные тексты, share-тексты, support-link,
    тексты автосписания — «WolfPN» убран / заменён на нейтральные формулировки
    или динамический `config.serviceName` / `config.supportLink`.
  - `backend/src/scripts/seed-system-settings.ts`: дефолты proxy_help_text,
    gift_text.
  - `backend/src/modules/notification/telegram-notify.service.ts`,
    `backend/src/modules/admin/admin.routes.ts`: share-текст подарка.
  - `migrations/20260513130000_seed_auto_broadcast_rules`: 9 дефолтных правил
    рассылки — тексты и кнопки (была ссылка на `@Testv2wolfpnbot`).
  - **Новая миграция `20260604140000_v500_strip_wolfpn_branding`** — чистит уже
    засидленные WolfPN-тексты в существующих БД (auto_broadcast_rules,
    system_settings). Идемпотентно.

### Исправления при выпиле multi-bot

- `bot.middleware.optionalBot` восстановлен как настоящий express-middleware
  `(req, res, next)` — при выпиле он был ошибочно превращён в `(req) => Promise`,
  из-за чего `publicConfigRouter.use(optionalBot)` вешал ВСЕ `/api/public/*`
  запросы (504), и бот не стартовал (зависал в `waitForApi`).
- `docker-entrypoint.sh`: добавлен `psql_url()` (чистит Prisma-only query-params
  типа `connection_limit` перед передачей URL в psql), удалён мёртвый
  `rescue_clients_bot_id_pre_drift` и P3005-блок clone_bots.

### BREAKING

- **Удалена multi-bot / clone-bots функциональность.** В инсталляции теперь один бот,
  токен которого живёт в `process.env.BOT_TOKEN`. Раздел админки «Боты-клоны»,
  таблица `bots`, `bot_payouts`, поля `clients.bot_id`, `payments.bot_id` /
  `base_amount` / `bot_markup_percent` / `bot_markup_amount`,
  `telegram_auth_tokens.confirmed_bot_id` — удалены.

  **Миграция:** `20260604120000_drop_clone_bots` — на старых инсталляциях, где
  миграция `20260502160000_clone_bots` была применена, новая миграция:
    1. Проверяет что нет дубликатов `telegram_id` между разными ботами (если есть —
       миграция падает, нужно разрулить вручную).
    2. DROP колонок в payments / telegram_auth_tokens / clients.
    3. Восстанавливает `clients.@unique(telegram_id)` (как было до 4.x clone_bots).
    4. DROP TABLE bots, bot_payouts.

- **API.** Удалены endpoints `/api/admin/bots/*` (CRUD клонов) и `/api/internal/bots*`
  (список клонов и POST /me). Auth в `/api/bot-admin/*` теперь требует ровно `BOT_TOKEN`
  из env, а не «токен любого активного клона».

- **Бот.** Контейнер `bot` больше не опрашивает `/api/internal/bots` и не поднимает
  длинный polling на каждый клон. Стартует один Telegraf на `BOT_TOKEN`.
  Удалён env `BOT_POLL_ALL_CLONES` (был механизмом разделения нагрузки между
  несколькими контейнерами).

### Изменения в схеме (Prisma)

- Удалены модели: `Bot`, `BotPayout`.
- `Client`: убрано поле `botId` и relation `bot`, убран `@@unique([botId, telegramId])` /
  `@@index([botId])`, восстановлен `telegramId String? @unique`.
- `Payment`: убраны поля `botId`, `baseAmount`, `botMarkupPercent`, `botMarkupAmount`,
  relation `bot`, индекс `@@index([botId])`.
- `TelegramAuthToken`: убрано поле `confirmedBotId`.

### Поведенческие изменения

- **Реферальный бонус** теперь считается от `payment.amount` (раньше использовался
  `baseAmount` — цена без наценки клона). Для исторических платежей разницы нет:
  старая миграция backfill'ила `baseAmount = amount` для всех legacy-Payment.

- **Mini App initData** проверяется подписью токена `BOT_TOKEN` (раньше пробовали
  по каждому активному клону).

### Поднимая клиента на 5.0.0

1. Создать бэкап БД: `pg_dump -U $POSTGRES_USER -Fc $POSTGRES_DB > 5.0.0-pre.dump`.
2. Залить новую версию (zip / git pull).
3. Применить миграции: `docker compose run --rm api npx prisma migrate deploy`.
   - Если упадёт «Найдено N дубликатов telegram_id» — нужно разрулить дубликаты
     вручную (оставить самый свежий Client.created_at), затем повторить.
4. `docker compose build api frontend bot && docker compose up -d --force-recreate`.
5. Если в env был `BOT_POLL_ALL_CLONES` — можно удалить.
6. В админке раздела «Боты-клоны» больше не будет.
