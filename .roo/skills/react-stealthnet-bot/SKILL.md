---
name: react-stealthnet-bot
description: "Навык для создания и редактирования React-компонентов и страниц в проекте STEALTHNET 3.0. Применяй этот навык при любой работе с фронтендом: новые страницы кабинета/админки, компоненты UI, стилизация, исправление TypeScript ошибок."
---

# STEALTHNET Frontend — Навык разработки React-компонентов

## Структура проекта (frontend)

```
frontend/src/
├── pages/
│   ├── cabinet/          # Клиентский кабинет (client-*)
│   │   ├── cabinet-layout.tsx   # Главный layout с MobileShell и навигацией
│   │   ├── client-dashboard.tsx
│   │   ├── client-tariffs.tsx
│   │   ├── client-tickets.tsx
│   │   └── ...
│   └── *.tsx             # Страницы админки (dashboard, clients, tariffs...)
├── components/
│   ├── ui/               # shadcn/ui компоненты (button, card, input, dialog...)
│   ├── layout/           # dashboard-layout.tsx (layout для админки)
│   └── animated-background.tsx
├── contexts/
│   ├── theme.tsx         # Тема (light/dark + accent palette: blue, violet, rose...)
│   ├── client-auth.tsx   # Авторизация клиента
│   ├── auth.tsx          # Авторизация админа
│   └── cabinet-config.tsx
├── lib/
│   ├── api.ts            # Все API-вызовы и TypeScript типы (ClientProfile, etc.)
│   ├── utils.ts          # cn() — объединение Tailwind классов
│   └── i18n.ts           # formatRuDays() и другие i18n утилиты
└── hooks/
    └── use-is-miniapp.ts # Определение Telegram Mini App
```

---

## Технологический стек

| Технология | Версия | Использование |
|---|---|---|
| React | 18 | Функциональные компоненты + хуки |
| TypeScript | строгий | Все файлы `.tsx` |
| Tailwind CSS | v3 | Утилитарные классы |
| shadcn/ui | latest | `Card`, `Button`, `Input`, `Dialog`, `Tabs`, `Switch`... |
| framer-motion | latest | Анимации появления страниц и элементов |
| lucide-react | latest | Иконки |
| react-router-dom | v6 | Роутинг (`Link`, `useLocation`, `Outlet`) |
| clsx + tailwind-merge | latest | `cn()` из `@/lib/utils` |

---

## Правила написания кода

### 1. Импорты (строгий порядок)
```tsx
// 1. React хуки
import { useEffect, useState, useCallback } from "react";

// 2. React Router
import { Link, useLocation } from "react-router-dom";

// 3. Framer Motion (если нужна анимация)
import { motion } from "framer-motion";

// 4. Иконки lucide-react
import { Package, Loader2, ArrowLeft } from "lucide-react";

// 5. Контексты проекта (@/contexts/...)
import { useClientAuth } from "@/contexts/client-auth";
import { useCabinetConfig } from "@/contexts/cabinet-config";

// 6. API и типы (@/lib/api)
import { api } from "@/lib/api";
import type { ClientProfile, ClientPayment } from "@/lib/api";

// 7. UI-компоненты (@/components/ui/...)
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// 8. Утилиты
import { cn } from "@/lib/utils";
import { formatRuDays } from "@/lib/i18n";
```

### 2. Структура компонента страницы кабинета
```tsx
export function ClientExamplePage() {
  const { state } = useClientAuth();
  const token = state.token ?? null;
  const { config } = useCabinetConfig();

  const [data, setData] = useState<SomeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getSomething(token)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">{error}</div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* содержимое */}
    </div>
  );
}
```

### 3. Glassmorphism стиль (активно используется в кабинете)
```tsx
// Glassmorphism карточка
<div className={cn(
  "rounded-2xl border border-white/10",
  "bg-white/5 backdrop-blur-md",
  "shadow-xl shadow-black/10",
  className
)}>

// Glassmorphism модалка / поповер
<div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl">

// Glassmorphism кнопка
<button className="rounded-xl bg-white/10 hover:bg-white/20 transition-colors px-4 py-2">
```

### 4. Анимации (Framer Motion)
```tsx
// Стандартное появление страницы
<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>

// Появление элементов списка с задержкой
<motion.div
  initial={{ opacity: 0, x: -12 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: index * 0.05 }}
>

// Модалка/поповер
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.15 }}
>
```

### 5. Состояния загрузки и ошибок
```tsx
// Спиннер загрузки (Loader2 из lucide-react)
<Loader2 className="h-5 w-5 animate-spin text-primary" />

// Сообщение об ошибке
<div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
  {error}
</div>

// Пустое состояние
<div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
  <InboxIcon className="h-10 w-10 opacity-40" />
  <p className="text-sm">Нет данных</p>
</div>
```

### 6. Типизация
```tsx
// Локальные типы объявлять в начале файла
type TicketItem = {
  id: string;
  subject: string;
  status: "open" | "closed";
  createdAt: string;
};

// Пропсы компонента
interface CardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
}

// Типы из API берём из @/lib/api
import type { ClientProfile, ClientPayment, ClientReferralStats } from "@/lib/api";
```

---

## Важные паттерны проекта

### API-вызовы
```tsx
// api.ts экспортирует объект api с методами
const { state } = useClientAuth();
const token = state.token ?? null;

// Всегда проверяй token перед вызовом
if (!token) return;
api.getProfile(token).then(...).catch(...);
```

### Тема (ThemeContext)
```tsx
import { useTheme } from "@/contexts/theme";
const { config, resolvedMode } = useTheme();
// resolvedMode === "light" | "dark"
// config.accent — активный акцент (blue, violet, rose...)
```

### Определение Mini App
```tsx
import { useCabinetMiniapp } from "@/pages/cabinet/cabinet-layout";
const isMiniapp = useCabinetMiniapp();
// Используй для условного рендера в Telegram WebApp
```

### cn() утилита — всегда используй для className
```tsx
import { cn } from "@/lib/utils";

<div className={cn(
  "base-classes",
  condition && "conditional-class",
  className  // всегда принимай className пропс для переопределения
)} />
```

### Форматирование дат и чисел
```tsx
import { formatRuDays } from "@/lib/i18n";

// Даты
new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

// Деньги
new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(amount);

// Байты → ГБ/МБ
if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + " ГБ";
```

---

## Антипаттерны (НЕ делать)

- ❌ **Не использовать неиспользуемые импорты** — `tsc` упадёт при docker build
- ❌ **Не использовать `any`** — используй `unknown` и сужай тип
- ❌ **Не забывать проверку `token`** перед API-вызовами
- ❌ **Не использовать inline styles** — только Tailwind классы
- ❌ **Не делать `default export` страниц** — только named export (`export function ClientXxxPage()`)
- ❌ **Не использовать хардкоженные цвета** — только Tailwind CSS переменные (`text-primary`, `bg-card`, `border-border`)

---

## Пример: Минимальная новая страница кабинета

```tsx
// frontend/src/pages/cabinet/client-example.tsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Package } from "lucide-react";
import { useClientAuth } from "@/contexts/client-auth";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ClientExamplePage() {
  const { state } = useClientAuth();
  const token = state.token ?? null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    // api.someMethod(token).then(...).finally(() => setLoading(false));
    setLoading(false);
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 p-4"
    >
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            Пример страницы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Содержимое страницы</p>
          <Button className="mt-4" variant="default">
            Действие
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
```

---

## Деплой изменений на сервер

```bash
# После коммита в локальный форк:
git add .
git commit -m "feat(ui): описание изменения"
git push

# Деплой на сервер (95.85.235.60):
# Через SSH MCP или ssh -i keys/id_rsa_stealthnet root@95.85.235.60
cd /opt/remnawave-STEALTHNET-Bot && git pull && docker compose up --force-recreate --build -d
```

> ⚠️ Сервер тянет из upstream (`STEALTHNET-APP`), а наш fork (`filip466-ctrl`) — отдельно.
> Для деплоя наших изменений нужно обновить remote на сервере или смерджить в upstream.
