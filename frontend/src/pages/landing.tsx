import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api, type PublicConfig, type PublicTariffCategory } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Apple,
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  Globe,
  LayoutDashboard,
  Lock,
  Monitor,
  Rocket,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Terminal,
  Zap,
} from "lucide-react";

const FEATURES_STRIP = [
  { icon: Shield, label: "Защита", sub: "AES-256 шифрование" },
  { icon: Lock, label: "Zero-Log", sub: "История не сохраняется" },
  { icon: Star, label: "Оплата", sub: "Анонимно и безопасно" },
  { icon: Zap, label: "Серверы", sub: "Собственная инфраструктура" },
  { icon: Smartphone, label: "Установка", sub: "За 30 секунд" },
];

const BENEFITS = [
  {
    icon: Zap,
    title: "Всегда онлайн",
    desc: "Работает стабильно даже в перегруженных сетях. Быстрый доступ с мобильного и десктопа без возни с настройками.",
  },
  {
    icon: Globe,
    title: "РФ-сервисы за границей",
    desc: "Смотри, звони, работай и плати без лишних плясок — маршруты уже продуманы под реальные сценарии.",
  },
  {
    icon: Shield,
    title: "Без посредников",
    desc: "Своя инфраструктура, аккуратная маршрутизация и понятный личный кабинет вместо хаоса из сторонних сервисов.",
  },
  {
    icon: Lock,
    title: "Чистая приватность",
    desc: "Шифрование, маскировка и аккуратная архитектура без ощущения, что ты подключаешь что-то сомнительное.",
  },
  {
    icon: LayoutDashboard,
    title: "Управление в одном месте",
    desc: "Telegram-бот, кабинет, тарифы, продление, инструкции и поддержка — всё собрано в единую систему.",
  },
  {
    icon: Sparkles,
    title: "Красиво и понятно",
    desc: "Нормальный продуктовый опыт: от первого экрана до покупки всё выглядит премиально и читается без боли.",
  },
];

const DEVICES = [
  { name: "Windows", icon: Monitor },
  { name: "macOS", icon: Apple },
  { name: "iPhone / iPad", icon: Smartphone },
  { name: "Android", icon: Smartphone },
  { name: "Linux", icon: Terminal },
];

const FAQ_ITEMS = [
  {
    q: "Что такое VPN и зачем он нужен?",
    a: "VPN шифрует трафик, помогает обходить блокировки и даёт стабильный доступ к нужным сервисам дома, в поездках и за рубежом.",
  },
  {
    q: "Ведётся ли логирование подключений?",
    a: "Нет. Сервис ориентирован на zero-log подход: без хранения истории активности и лишней привязки действий к личности.",
  },
  {
    q: "Сколько устройств можно подключить?",
    a: "Зависит от выбранного тарифа. Лимиты, срок и условия отображаются в кабинете и могут гибко настраиваться в админке.",
  },
  {
    q: "Как быстро начать?",
    a: "Регистрируешься, выбираешь тариф, оплачиваешь удобным способом и сразу получаешь доступ к инструкциям и подключению в кабинете.",
  },
];

const JOURNEY_STEPS = [
  {
    icon: Sparkles,
    title: "Выбираешь сценарий",
    desc: "Лендинг показывает живой контент из админки: тексты, тарифы, способы оплаты и оффер без ручных костылей.",
  },
  {
    icon: CreditCard,
    title: "Оплачиваешь как удобно",
    desc: "Карта, СБП, кошелёк, крипта — клиент видит только актуальные доступные методы и сразу попадает в нормальный поток оплаты.",
  },
  {
    icon: Rocket,
    title: "Подключаешься без боли",
    desc: "После оплаты всё продолжает жить в продукте: кабинет, инструкции, deep link-и, бот и поддержка уже ждут внутри.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55, ease: "easeOut" },
};

function formatMonthlyPrice(price: number, durationDays: number): string | null {
  if (durationDays < 30) return null;
  return (price / (durationDays / 30)).toFixed(0);
}

function getPaymentLabels(config: PublicConfig): string[] {
  const labels = new Set<string>();

  if (config.plategaMethods?.length) {
    for (const method of config.plategaMethods) {
      labels.add(method.label);
    }
  }

  if (config.yookassaEnabled) labels.add("Карта / СБП");
  if (config.yoomoneyEnabled) labels.add("ЮMoney");
  if (config.cryptopayEnabled) labels.add("Крипта");
  if (config.heleketEnabled) labels.add("Heleket");

  return Array.from(labels).slice(0, 4);
}

export function LandingPage({ config }: { config: PublicConfig }) {
  const lc = config.landingConfig;
  const [tariffs, setTariffs] = useState<{ items: PublicTariffCategory[] } | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    if (!lc?.showTariffs) {
      setTariffs(null);
      return;
    }

    api
      .getPublicTariffs()
      .then((response) => setTariffs(response))
      .catch(() => setTariffs({ items: [] }));
  }, [lc?.showTariffs]);

  const title = lc?.heroTitle || config.serviceName || "STEALTHNET";
  const subtitle =
    lc?.heroSubtitle ||
    "Telegram, YouTube, видеозвонки и доступ к любым сервисам в одной подписке. Без ограничений, мусора и скрытых платежей.";
  const ctaText = lc?.heroCtaText || "Начать сейчас";
  const heroBadge = lc?.heroBadge ?? "Приватность, скорость и доступ";
  const heroHint = lc?.heroHint ?? "Регистрация за минуту · Оплата картой, СБП, кошельком и криптой";
  const featuresList = lc?.features?.length
    ? lc.features.map((feature, index) => ({
      icon: FEATURES_STRIP[index]?.icon ?? Shield,
      label: feature.label,
      sub: feature.sub,
    }))
    : FEATURES_STRIP;
  const benefitsTitle = lc?.benefitsTitle ?? "Почему STEALTHNET ощущается как продукт, а не костыль";
  const benefitsSubtitle =
    lc?.benefitsSubtitle ??
    "Всё, что нужно для спокойного доступа, нормальной скорости и уверенного пользовательского опыта, уже собрано в одном месте.";
  const benefitsList = lc?.benefits?.length
    ? lc.benefits.map((benefit, index) => ({
      icon: BENEFITS[index]?.icon ?? Sparkles,
      title: benefit.title,
      desc: benefit.desc,
    }))
    : BENEFITS;
  const tariffsTitle = lc?.tariffsTitle ?? "Тарифы без неприятных сюрпризов";
  const tariffsSubtitle = lc?.tariffsSubtitle ?? "Платишь за понятный доступ, а не за хаос из скрытых ограничений.";
  const devicesTitle = lc?.devicesTitle ?? "Работает на всех твоих устройствах";
  const devicesSubtitle =
    lc?.devicesSubtitle ?? "Один аккаунт, один кабинет и одинаково приятный опыт на ноутбуке, телефоне и планшете.";
  const faqTitle = lc?.faqTitle ?? "Частые вопросы";
  const faqList = lc?.faq?.length ? lc.faq : FAQ_ITEMS;

  const paymentLabels = getPaymentLabels(config);
  const totalTariffs = tariffs?.items.reduce((sum, category) => sum + category.tariffs.length, 0) ?? 0;
  const lowestTariff = useMemo(() => {
    if (!tariffs?.items.length) return null;

    const allTariffs = tariffs.items.flatMap((category) =>
      category.tariffs.map((tariff) => ({ tariff, category })),
    );

    if (!allTariffs.length) return null;

    return allTariffs.reduce((min, current) => (current.tariff.price < min.tariff.price ? current : min));
  }, [tariffs]);

  const heroStats = [
    { value: `${DEVICES.length}+`, label: "платформ" },
    { value: lc?.showTariffs ? `${totalTariffs || "∞"}` : "24/7", label: lc?.showTariffs ? "тарифов онлайн" : "доступ" },
    { value: paymentLabels.length ? `${paymentLabels.length}+` : "4", label: "способа оплаты" },
  ];
  const navItems = [
    { label: "Преимущества", href: "#benefits" },
    { label: "Тарифы", href: lc?.showTariffs ? "#tariffs" : "#devices" },
    { label: "Устройства", href: "#devices" },
    { label: "FAQ", href: "#faq" },
  ];

  if (!lc) return null;

  return (
    <div className="relative min-h-svh overflow-x-clip bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_28%),radial-gradient(circle_at_85%_20%,_rgba(59,130,246,0.14),_transparent_24%),linear-gradient(180deg,_rgba(248,250,252,0.98)_0%,_rgba(240,253,250,0.95)_35%,_rgba(255,255,255,1)_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_transparent_24%),radial-gradient(circle_at_85%_20%,_rgba(59,130,246,0.18),_transparent_22%),linear-gradient(180deg,_rgba(2,6,23,1)_0%,_rgba(4,14,33,0.98)_45%,_rgba(3,7,18,1)_100%)] dark:text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-12rem] top-20 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/20" />
        <div className="absolute right-[-10rem] top-40 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl dark:bg-cyan-500/15" />
        <div className="absolute bottom-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-500/10" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/50 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/45">
        <div className="container mx-auto flex h-18 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            {config.logo ? (
              <img src={config.logo} alt={config.serviceName || title} className="h-10 w-10 rounded-2xl object-cover shadow-lg ring-1 ring-white/30" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-500/25">
                <Shield className="h-5 w-5" />
              </div>
            )}
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">premium access</p>
              <p className="text-lg font-black tracking-[0.14em] text-slate-950 dark:text-white">{config.serviceName || title}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-white/30 bg-white/45 px-2 py-1 backdrop-blur-xl lg:flex dark:border-white/10 dark:bg-white/6">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" className="rounded-full px-4 text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/10" asChild>
              <Link to="/cabinet/login">Вход</Link>
            </Button>
            <Button
              className="rounded-full border border-emerald-300/60 bg-gradient-to-r from-emerald-500 to-teal-500 px-5 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400"
              asChild
            >
              <Link to="/cabinet/register">{ctaText}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="container mx-auto px-4 pb-10 pt-10 md:pb-16 md:pt-14 lg:pb-24 lg:pt-18">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <motion.div {...fadeUp} className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-slate-600 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/12 dark:bg-white/8 dark:text-slate-300">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                {heroBadge}
              </div>

              <h1 className="max-w-5xl text-5xl font-black leading-[0.9] tracking-[-0.06em] text-slate-950 md:text-6xl lg:text-[5.4rem] dark:text-white">
                Тихий доступ,
                <span className="block bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                  который выглядит дорого.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300 md:text-xl">
                <span className="font-semibold text-slate-900 dark:text-white">{title}</span>
                {" — "}
                {subtitle}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="group h-14 rounded-full border border-emerald-300/60 bg-gradient-to-r from-emerald-500 to-teal-500 px-7 text-base font-semibold text-white shadow-[0_18px_50px_rgba(16,185,129,0.28)] hover:from-emerald-400 hover:to-teal-400"
                  asChild
                >
                  <Link to="/cabinet/register">
                    {ctaText}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-full border-white/40 bg-white/70 px-7 text-base text-slate-900 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl hover:bg-white dark:border-white/15 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"
                  asChild
                >
                  <Link to="/cabinet/login">Войти в кабинет</Link>
                </Button>
              </div>

              <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">{heroHint}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                {paymentLabels.length > 0 ? (
                  paymentLabels.map((label) => (
                    <div
                      key={label}
                      className="rounded-full border border-white/35 bg-white/65 px-4 py-2 text-sm text-slate-700 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/7 dark:text-slate-200"
                    >
                      {label}
                    </div>
                  ))
                ) : (
                  <div className="rounded-full border border-white/35 bg-white/65 px-4 py-2 text-sm text-slate-700 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/7 dark:text-slate-200">
                    Карта, СБП, крипта и быстрый старт
                  </div>
                )}
              </div>

              <div className="mt-8 grid gap-3 md:max-w-2xl md:grid-cols-3">
                {JOURNEY_STEPS.map(({ icon: Icon, title: stepTitle }, index) => (
                  <motion.div
                    key={stepTitle}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: index * 0.08 }}
                    className="rounded-[24px] border border-white/35 bg-white/55 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/6"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 text-emerald-600 dark:text-emerald-300">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">0{index + 1}. {stepTitle}</p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {heroStats.map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: 0.08 * index }}
                    className="rounded-[28px] border border-white/40 bg-white/60 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/6"
                  >
                    <div className="text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">{item.value}</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.6, ease: "easeOut", delay: 0.08 }} className="relative">
              <div className="absolute -left-6 top-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/25" />
              <div className="absolute -right-8 bottom-8 h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl dark:bg-cyan-500/20" />

              <div className="relative overflow-hidden rounded-[32px] border border-white/35 bg-white/62 p-6 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/7 md:p-7">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-emerald-300/70" />

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">private network</p>
                    <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">
                      Один доступ — все нужные сервисы под рукой
                    </h2>
                  </div>
                  <div className="rounded-2xl border border-emerald-300/40 bg-emerald-500/12 p-3 text-emerald-600 dark:border-emerald-400/25 dark:bg-emerald-400/12 dark:text-emerald-300">
                    <Shield className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  {featuresList.slice(0, 4).map(({ icon: Icon, label, sub }, index) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: 18 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.08 * index }}
                      className="flex items-center gap-4 rounded-3xl border border-white/45 bg-white/68 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/35"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-cyan-400/25 text-emerald-600 dark:text-emerald-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{sub}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[28px] border border-white/40 bg-slate-950 px-5 py-5 text-white shadow-xl shadow-slate-950/15 dark:border-white/12 dark:bg-slate-900/90">
                    <p className="text-xs uppercase tracking-[0.28em] text-emerald-300/80">от</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-4xl font-black tracking-[-0.05em]">
                        {lowestTariff ? lowestTariff.tariff.price : "∞"}
                      </span>
                      <span className="text-sm text-slate-300">
                        {lowestTariff ? lowestTariff.tariff.currency.toUpperCase() : "privacy"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300/90">
                      {lowestTariff
                        ? `${lowestTariff.tariff.name} · ${lowestTariff.tariff.durationDays} дней доступа`
                        : "Тарифы и условия подтягиваются из админки автоматически"}
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-white/40 bg-white/72 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/6">
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">быстрый старт</p>
                    <ul className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <li className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 text-emerald-500" />Регистрация и вход через кабинет без лишней бюрократии</li>
                      <li className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 text-emerald-500" />Моментальное получение тарифов, способов оплаты и инструкций</li>
                      <li className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 text-emerald-500" />Поддержка, оферта и контакты доступны прямо на лендинге</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 rounded-[28px] border border-white/40 bg-gradient-to-r from-emerald-500/12 via-cyan-500/10 to-sky-500/12 p-5 backdrop-blur-xl dark:border-white/10">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">ощущение продукта</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-white">Не просто VPN, а аккуратно собранный сервис с человеческим UX</p>
                    </div>
                    <Button className="h-12 rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100" asChild>
                      <Link to={lc.showTariffs ? "#tariffs" : "/cabinet/register"}>{lc.showTariffs ? "Смотреть тарифы" : "Начать"}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-8 md:pb-12">
          <motion.div {...fadeUp} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {featuresList.map(({ icon: Icon, label, sub }, index) => (
              <div
                key={label}
                className="group rounded-[30px] border border-white/35 bg-white/60 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur-2xl transition-transform duration-300 hover:-translate-y-1 dark:border-white/10 dark:bg-white/6"
                style={{ transitionDelay: `${index * 40}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-cyan-400/25 text-emerald-600 dark:text-emerald-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </section>

        <section id="benefits" className="container mx-auto px-4 py-14 md:py-20">
          <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600 backdrop-blur-xl dark:border-white/10 dark:bg-white/7 dark:text-slate-300">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              Почему мы
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl dark:text-white">
              {benefitsTitle}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-500 dark:text-slate-400 md:text-lg">
              {benefitsSubtitle}
            </p>
          </motion.div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {benefitsList.map(({ icon: Icon, title: itemTitle, desc }, index) => (
              <motion.div
                key={itemTitle}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
              >
                <Card className="h-full rounded-[30px] border-white/35 bg-white/62 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/6">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-cyan-400/25 text-emerald-600 dark:text-emerald-300">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="rounded-full border border-emerald-300/35 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-300">
                        0{index + 1}
                      </div>
                    </div>
                    <CardTitle className="pt-4 text-xl text-slate-950 dark:text-white">{itemTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">{desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {lc.showTariffs && (
          <section id="tariffs" className="container mx-auto px-4 py-14 md:py-20">
            <motion.div
              {...fadeUp}
              className="overflow-hidden rounded-[36px] border border-white/35 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(6,78,59,0.90))] px-6 py-8 text-white shadow-[0_30px_120px_rgba(15,23,42,0.22)] md:px-8 md:py-10"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.32em] text-emerald-200/75">pricing</p>
                  <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] md:text-5xl">{tariffsTitle}</h2>
                  <p className="mt-4 text-sm leading-7 text-slate-200 md:text-base">{tariffsSubtitle}</p>
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-emerald-100 backdrop-blur-xl">
                  {tariffs === null ? "Загружаем тарифы…" : `${tariffs.items.length} категорий · ${totalTariffs} вариантов`}
                </div>
              </div>

              {tariffs === null ? (
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="h-56 animate-pulse rounded-[28px] border border-white/10 bg-white/8" />
                  ))}
                </div>
              ) : tariffs.items.length > 0 ? (
                <div className="mt-8 space-y-6">
                  {tariffs.items.map((category, categoryIndex) => (
                    <motion.div
                      key={category.id}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.15 }}
                      transition={{ duration: 0.45, delay: categoryIndex * 0.06 }}
                      className="rounded-[30px] border border-white/12 bg-white/7 p-5 backdrop-blur-xl md:p-6"
                    >
                      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-xl">
                            {category.emoji || "✨"}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">{category.name}</h3>
                            <p className="text-sm text-slate-300">Подбирай вариант под свой сценарий — от базового доступа до долгого спокойного использования.</p>
                          </div>
                        </div>
                        <div className="text-sm text-slate-300">{category.tariffs.length} тарифов в категории</div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-3">
                        {category.tariffs.map((tariff) => {
                          const monthlyPrice = formatMonthlyPrice(tariff.price, tariff.durationDays);
                          return (
                            <div
                              key={tariff.id}
                              className="group flex h-full flex-col rounded-[28px] border border-white/12 bg-white/10 p-5 shadow-lg shadow-black/10 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/12"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-lg font-semibold text-white">{tariff.name}</p>
                                  {tariff.description ? (
                                    <p className="mt-2 text-sm leading-6 text-slate-300">{tariff.description}</p>
                                  ) : (
                                    <p className="mt-2 text-sm leading-6 text-slate-400">Чистый доступ без лишних ограничений и путаницы.</p>
                                  )}
                                </div>
                                <div className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-200">
                                  {tariff.durationDays} дн.
                                </div>
                              </div>

                              <div className="mt-6">
                                <div className="flex items-end gap-2">
                                  <span className="text-4xl font-black tracking-[-0.05em] text-white">{tariff.price}</span>
                                  <span className="pb-1 text-sm uppercase text-slate-300">{tariff.currency}</span>
                                </div>
                                {monthlyPrice && (
                                  <p className="mt-2 text-sm text-emerald-200/90">≈ {monthlyPrice} {tariff.currency.toUpperCase()}/мес</p>
                                )}
                              </div>

                              <div className="mt-6 space-y-3 text-sm text-slate-300">
                                <div className="flex items-center gap-3"><Check className="h-4 w-4 text-emerald-300" />Подключение через личный кабинет</div>
                                <div className="flex items-center gap-3"><Check className="h-4 w-4 text-emerald-300" />Поддержка и инструкции внутри сервиса</div>
                                <div className="flex items-center gap-3"><Check className="h-4 w-4 text-emerald-300" />Автоматическая активация после оплаты</div>
                              </div>

                              <Button className="mt-6 h-12 rounded-full bg-white text-slate-950 hover:bg-emerald-50" asChild>
                                <Link to="/cabinet/register">Выбрать тариф</Link>
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="mt-8 rounded-[30px] border border-white/12 bg-white/7 p-8 text-center text-slate-300 backdrop-blur-xl">
                  Тарифы пока не опубликованы, но лендинг уже готов — контент подтянется автоматически из админки.
                </div>
              )}
            </motion.div>
          </section>
        )}

        <section id="devices" className="container mx-auto px-4 py-14 md:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <motion.div {...fadeUp} className="rounded-[32px] border border-white/35 bg-white/60 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl md:p-8 dark:border-white/10 dark:bg-white/6">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">devices</p>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl dark:text-white">{devicesTitle}</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400 md:text-base">{devicesSubtitle}</p>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {DEVICES.map(({ name, icon: Icon }) => (
                  <div
                    key={name}
                    className="rounded-[24px] border border-white/35 bg-white/72 p-4 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/30"
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-cyan-400/25 text-emerald-600 dark:text-emerald-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">{name}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }} className="rounded-[32px] border border-white/35 bg-slate-950/95 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] md:p-8 dark:border-white/10">
              <p className="text-xs uppercase tracking-[0.32em] text-emerald-300/80">how it feels</p>
              <h3 className="mt-4 text-3xl font-black tracking-[-0.04em] md:text-4xl">Нормальный премиум-опыт без технической боли</h3>
              <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300 md:text-base">
                <p>Один вход, одна подписка и понятные шаги: зарегистрировался, оплатил, подключил нужное устройство и забыл про хаос.</p>
                <p>Лендинг не врёт и не живёт отдельно от продукта — он показывает то, что реально настроено в админке прямо сейчас.</p>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[26px] border border-white/10 bg-white/7 p-5">
                  <p className="text-sm text-slate-400">Telegram / кабинет</p>
                  <p className="mt-2 text-xl font-semibold text-white">Один сценарий покупки и подключения</p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-white/7 p-5">
                  <p className="text-sm text-slate-400">Поддержка / инструкции</p>
                  <p className="mt-2 text-xl font-semibold text-white">Всё под рукой, без поиска по чатам</p>
                </div>
              </div>

              <Button className="mt-8 h-13 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 text-white hover:from-emerald-400 hover:to-teal-400" asChild>
                <Link to="/cabinet/register">Открыть кабинет и подключиться</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-6 md:py-10">
          <motion.div
            {...fadeUp}
            className="overflow-hidden rounded-[36px] border border-white/35 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(240,253,250,0.78),rgba(236,254,255,0.82))] p-6 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.88),rgba(5,46,37,0.84),rgba(8,47,73,0.86))] md:p-8"
          >
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-emerald-200/75">flow</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl dark:text-white">
                  От первого касания до подключения — один цельный сценарий
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">
                  Это больше не просто красивая обложка. Лендинг ведёт в кабинет, кабинет ведёт к тарифам, тарифы ведут к подключению — и вся цепочка ощущается цельной.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {JOURNEY_STEPS.map(({ icon: Icon, title: stepTitle, desc }, index) => (
                  <div
                    key={stepTitle}
                    className="rounded-[28px] border border-white/40 bg-white/62 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/6"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-cyan-400/25 text-emerald-600 dark:text-emerald-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">0{index + 1}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{stepTitle}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        <section id="faq" className="container mx-auto grid gap-8 px-4 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_360px]">
          <motion.div {...fadeUp} className="rounded-[32px] border border-white/35 bg-white/60 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl md:p-8 dark:border-white/10 dark:bg-white/6">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">faq</p>
            <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl dark:text-white">{faqTitle}</h2>

            <div className="mt-8 space-y-3">
              {faqList.map(({ q, a }) => (
                <Collapsible key={q} open={openFaq === q} onOpenChange={(open) => setOpenFaq(open ? q : null)}>
                  <Card className="overflow-hidden rounded-[26px] border-white/35 bg-white/72 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/30">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-base font-semibold text-slate-900 transition-colors hover:bg-emerald-50/60 dark:text-white dark:hover:bg-white/6"
                      >
                        <span>{q}</span>
                        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${openFaq === q ? "rotate-180" : ""}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-white/40 px-5 pb-5 pt-4 text-sm leading-7 text-slate-600 dark:border-white/10 dark:text-slate-400">
                        {a}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </motion.div>

          <motion.aside {...fadeUp} transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }} className="space-y-5">
            <div className="rounded-[32px] border border-white/35 bg-white/60 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/6">
              <p className="text-xs uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">контакты</p>
              <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950 dark:text-white">Нужна помощь или детали?</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">
                Все ссылки и тексты здесь тоже управляются из админки, так что лендинг остаётся живой частью продукта, а не отдельной картинкой.
              </p>

              {lc.contacts ? (
                <div
                  className="prose prose-sm mt-5 max-w-none text-slate-600 dark:prose-invert dark:text-slate-300"
                  dangerouslySetInnerHTML={{ __html: lc.contacts.replace(/\n/g, "<br />") }}
                />
              ) : (
                <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Контакты пока не заполнены в админке.</p>
              )}
            </div>

            <div className="rounded-[32px] border border-white/35 bg-slate-950/95 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] dark:border-white/10">
              <p className="text-xs uppercase tracking-[0.32em] text-emerald-300/80">legal</p>
              <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">Документы и прозрачность</h3>

              <div className="mt-6 flex flex-col gap-3">
                {lc.offerLink && (
                  <a
                    href={lc.offerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/12 bg-white/7 px-4 py-3 text-sm text-slate-100 transition-colors hover:bg-white/12"
                  >
                    Оферта
                  </a>
                )}
                {lc.privacyLink && (
                  <a
                    href={lc.privacyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/12 bg-white/7 px-4 py-3 text-sm text-slate-100 transition-colors hover:bg-white/12"
                  >
                    Политика конфиденциальности
                  </a>
                )}
                {!lc.offerLink && !lc.privacyLink && (
                  <p className="text-sm text-slate-400">Юридические ссылки ещё не заполнены, но место под них уже готово.</p>
                )}
              </div>
            </div>
          </motion.aside>
        </section>

        <section className="container mx-auto px-4 pb-16 pt-2 md:pb-24">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden rounded-[38px] border border-white/35 bg-[linear-gradient(135deg,rgba(2,6,23,0.98),rgba(6,78,59,0.92),rgba(8,47,73,0.94))] px-6 py-8 text-white shadow-[0_30px_120px_rgba(15,23,42,0.22)] md:px-10 md:py-10"
          >
            <div className="absolute -right-16 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute left-10 top-0 h-28 w-28 rounded-full bg-cyan-400/12 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.34em] text-emerald-200/75">ready to connect</p>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] md:text-5xl">
                  Если честно — теперь это уже не “лендинг”, а витрина продукта.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
                  Весь контент продолжает жить в админке, а визуально страница наконец ощущается как сервис, за который не стыдно брать деньги.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Button className="h-13 rounded-full bg-white px-6 text-slate-950 hover:bg-emerald-50" asChild>
                  <Link to="/cabinet/register">{ctaText}</Link>
                </Button>
                <Button variant="outline" className="h-13 rounded-full border-white/20 bg-white/8 px-6 text-white hover:bg-white/12" asChild>
                  <Link to="/cabinet/login">У меня уже есть аккаунт</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/25 bg-white/40 px-4 py-8 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/35">
        <div className="container mx-auto flex flex-col gap-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{config.serviceName || title}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {lc.footerText ? (
                <span dangerouslySetInnerHTML={{ __html: lc.footerText.replace(/\n/g, "<br />") }} />
              ) : (
                `© ${new Date().getFullYear()} ${config.serviceName || title}. Все права защищены.`
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-end">
            <Button variant="ghost" className="rounded-full text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/10" asChild>
              <Link to="/cabinet/login">Вход</Link>
            </Button>
            <Button className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400" asChild>
              <Link to="/cabinet/register">{ctaText}</Link>
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
