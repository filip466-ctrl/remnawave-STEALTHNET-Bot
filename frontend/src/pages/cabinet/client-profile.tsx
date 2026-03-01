import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Wallet, Copy, Check, CreditCard, Loader2, Link2, Mail } from "lucide-react";
import { useClientAuth } from "@/contexts/client-auth";
import { useCabinetMiniapp } from "@/pages/cabinet/cabinet-layout";
import { openPaymentInBrowser } from "@/lib/open-payment-url";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { ClientPayment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GlassSelect } from "@/components/ui/glass-select";

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("ru-RU");
  } catch {
    return s;
  }
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency.toUpperCase() === "USD" ? "USD" : currency.toUpperCase() === "RUB" ? "RUB" : "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPaymentStatus(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "Оплачен";
  if (s === "pending") return "Не оплачено";
  if (s === "failed") return "Не прошёл";
  if (s === "refunded") return "Возврат";
  return status || "—";
}

export function ClientProfilePage() {
  const { state, refreshProfile } = useClientAuth();
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [preferredLang, setPreferredLang] = useState(state.client?.preferredLang ?? "ru");
  const [preferredCurrency, setPreferredCurrency] = useState(state.client?.preferredCurrency ?? "usd");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<"site" | "bot" | null>(null);
  const [plategaMethods, setPlategaMethods] = useState<{ id: number; label: string }[]>([]);
  const [yoomoneyEnabled, setYoomoneyEnabled] = useState(false);
  const [yookassaEnabled, setYookassaEnabled] = useState(false);
  const [activeLanguages, setActiveLanguages] = useState<string[]>([]);
  const [activeCurrencies, setActiveCurrencies] = useState<string[]>([]);
  const [publicAppUrl, setPublicAppUrl] = useState<string | null>(null);
  const [telegramBotUsername, setTelegramBotUsername] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [linkTelegramCode, setLinkTelegramCode] = useState<string | null>(null);
  const [linkTelegramLoading, setLinkTelegramLoading] = useState(false);
  const [linkEmailValue, setLinkEmailValue] = useState("");
  const [linkEmailLoading, setLinkEmailLoading] = useState(false);
  const [linkEmailSent, setLinkEmailSent] = useState(false);
  const [linkEmailError, setLinkEmailError] = useState<string | null>(null);
  const [paymentsHistoryOpen, setPaymentsHistoryOpen] = useState(false);

  const client = state.client;
  const token = state.token;
  const currency = (client?.preferredCurrency ?? "usd").toLowerCase();

  useEffect(() => {
    if (token) {
      refreshProfile().catch(() => {});
    }
  }, [token, refreshProfile]);

  useEffect(() => {
    if (token) {
      api.clientPayments(token).then((r) => setPayments(r.items ?? [])).catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    api.getPublicConfig().then((c) => {
      setPlategaMethods(c.plategaMethods ?? []);
      setYoomoneyEnabled(Boolean(c.yoomoneyEnabled));
      setYookassaEnabled(Boolean(c.yookassaEnabled));
      setActiveLanguages(c.activeLanguages?.length ? c.activeLanguages : ["ru", "en"]);
      setActiveCurrencies(c.activeCurrencies?.length ? c.activeCurrencies : ["usd", "rub"]);
      setPublicAppUrl(c.publicAppUrl ?? null);
      setTelegramBotUsername(c.telegramBotUsername ?? null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (params.get("yoomoney") === "connected" || params.get("yoomoney_form") === "success" || params.get("yookassa") === "success") {
      refreshProfile().catch(() => {});
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refreshProfile]);

  async function startTopUp(methodId: number) {
    if (!token || !client) return;
    const amount = Number(topUpAmount?.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setTopUpError("Укажите сумму");
      return;
    }
    setTopUpError(null);
    setTopUpLoading(true);
    try {
      const res = await api.clientCreatePlategaPayment(token, {
        amount,
        currency,
        paymentMethod: methodId,
        description: "Пополнение баланса",
      });
      setTopUpModalOpen(false);
      openPaymentInBrowser(res.paymentUrl);
    } catch (e) {
      setTopUpError(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setTopUpLoading(false);
    }
  }

  async function startTopUpYoomoneyForm(paymentType: "PC" | "AC") {
    if (!token || !client) return;
    const amount = Number(topUpAmount?.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setTopUpError("Укажите сумму (в рублях)");
      return;
    }
    setTopUpError(null);
    setTopUpLoading(true);
    try {
      const res = await api.yoomoneyCreateFormPayment(token, { amount, paymentType });
      setTopUpModalOpen(false);
      if (res.paymentUrl) {
        openPaymentInBrowser(res.paymentUrl);
      } else if (res.form) {
        const f = res.form;
        const yoomoneyUrl = `https://yoomoney.ru/quickpay/confirm.xml?quickpay-form=shop&receiver=${encodeURIComponent(f.receiver)}&sum=${f.sum}&label=${encodeURIComponent(f.label)}&paymentType=${f.paymentType}&successURL=${encodeURIComponent(f.successURL)}`;
        openPaymentInBrowser(yoomoneyUrl);
      }
    } catch (e) {
      setTopUpError(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setTopUpLoading(false);
    }
  }

  async function startTopUpYookassa() {
    if (!token || !client) return;
    const amount = Number(topUpAmount?.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setTopUpError("Укажите сумму (в рублях)");
      return;
    }
    setTopUpError(null);
    setTopUpLoading(true);
    try {
      const res = await api.yookassaCreatePayment(token, { amount, currency: "RUB" });
      setTopUpModalOpen(false);
      if (res.confirmationUrl) openPaymentInBrowser(res.confirmationUrl);
    } catch (e) {
      setTopUpError(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setTopUpLoading(false);
    }
  }

  useEffect(() => {
    if (state.client) {
      const lang = state.client.preferredLang;
      const curr = state.client.preferredCurrency;
      setPreferredLang(activeLanguages.includes(lang) ? lang : (activeLanguages[0] ?? lang));
      setPreferredCurrency(activeCurrencies.includes(curr) ? curr : (activeCurrencies[0] ?? curr));
    }
  }, [state.client?.preferredLang, state.client?.preferredCurrency, activeLanguages, activeCurrencies]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.clientUpdateProfile(token, { preferredLang, preferredCurrency });
      await refreshProfile();
      setMessage("Настройки сохранены");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function requestLinkTelegramCode() {
    if (!token) return;
    setLinkTelegramLoading(true);
    setLinkTelegramCode(null);
    try {
      const res = await api.clientLinkTelegramRequest(token);
      setLinkTelegramCode(res.code);
    } catch {
      setLinkTelegramCode(null);
    } finally {
      setLinkTelegramLoading(false);
    }
  }

  async function linkTelegramFromMiniapp() {
    if (!token) return;
    const initData = (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData;
    if (!initData?.trim()) return;
    setLinkTelegramLoading(true);
    try {
      const res = await api.clientLinkTelegram(token, { initData });
      if (res.client) {
        refreshProfile();
        setLinkTelegramCode(null);
      }
    } finally {
      setLinkTelegramLoading(false);
    }
  }

  async function sendLinkEmailRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !linkEmailValue.trim()) return;
    setLinkEmailError(null);
    setLinkEmailSent(false);
    setLinkEmailLoading(true);
    try {
      await api.clientLinkEmailRequest(token, { email: linkEmailValue.trim() });
      setLinkEmailSent(true);
      setLinkEmailValue("");
    } catch (err) {
      setLinkEmailError(err instanceof Error ? err.message : "Ошибка отправки");
    } finally {
      setLinkEmailLoading(false);
    }
  }

  const baseUrl = publicAppUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  const referralLinkSite =
    client?.referralCode && baseUrl
      ? `${String(baseUrl).replace(/\/$/, "")}/cabinet/register?ref=${encodeURIComponent(client.referralCode)}`
      : "";
  const referralLinkBot =
    client?.referralCode && telegramBotUsername
      ? `https://t.me/${telegramBotUsername.replace(/^@/, "")}?start=ref_${client.referralCode}`
      : "";
  const hasReferralLinks = Boolean(referralLinkSite || referralLinkBot);
  function copyReferral(which: "site" | "bot") {
    const url = which === "site" ? referralLinkSite : referralLinkBot;
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedRef(which);
      setTimeout(() => setCopiedRef(null), 2000);
    }
  }

  if (!client) return null;

  const langs = activeLanguages.length ? activeLanguages : ["ru", "en"];
  const currencies = activeCurrencies.length ? activeCurrencies : ["usd", "rub"];

  const isMiniapp = useCabinetMiniapp();
  const cardClass = isMiniapp ? "min-w-0 overflow-hidden" : "";

  return (
    <div className="space-y-6 w-full min-w-0 pb-10">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Профиль</h1>
        <p className="text-muted-foreground text-sm mt-1 truncate">Личные данные и настройки</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`grid gap-6 ${isMiniapp ? "grid-cols-1" : "lg:grid-cols-2"} min-w-0`}
      >
        <Card className={cardClass}>
          <CardHeader className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base min-w-0 truncate">
              <User className="h-5 w-5 text-primary shrink-0" />
              Данные
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 min-w-0 overflow-hidden">
            {client.email != null && client.email !== "" && (
              <div className="min-w-0 overflow-hidden">
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium truncate break-all" title={client.email}>{client.email}</p>
              </div>
            )}
            <div className="min-w-0 overflow-hidden">
              <Label className="text-muted-foreground">Telegram</Label>
              <p className="font-medium truncate">
                {client.telegramUsername ? `@${client.telegramUsername}` : "—"}
                {client.telegramId ? ` · ID ${client.telegramId}` : ""}
              </p>
              {!client.telegramId && (
                <div className="mt-2 space-y-2">
                  {isMiniapp ? (
                    <Button variant="outline" size="sm" className="gap-2" disabled={linkTelegramLoading} onClick={linkTelegramFromMiniapp}>
                      {linkTelegramLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                      Привязать текущий Telegram
                    </Button>
                  ) : (
                    <>
                      {!linkTelegramCode ? (
                        <Button variant="outline" size="sm" className="gap-2" disabled={linkTelegramLoading} onClick={requestLinkTelegramCode}>
                          {linkTelegramLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                          Получить код для привязки
                        </Button>
                      ) : (
                        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm space-y-1">
                          <p className="font-mono text-lg font-semibold">{linkTelegramCode}</p>
                          <p className="text-muted-foreground text-xs">
                            Откройте @{telegramBotUsername || "бота"} и отправьте команду <code className="bg-muted px-1 rounded">/link {linkTelegramCode}</code>. Код действует 10 минут.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            {(!client.email || client.email === "") && (
              <div className="min-w-0 overflow-hidden space-y-2">
                <Label className="text-muted-foreground">Привязать почту</Label>
                {linkEmailSent ? (
                  <p className="text-sm text-green-600">Письмо с ссылкой отправлено. Перейдите по ссылке из письма.</p>
                ) : (
                  <form onSubmit={sendLinkEmailRequest} className="flex flex-wrap items-end gap-2">
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={linkEmailValue}
                      onChange={(e) => setLinkEmailValue(e.target.value)}
                      className="flex-1 min-w-[180px]"
                      disabled={linkEmailLoading}
                    />
                    <Button type="submit" size="sm" className="gap-2" disabled={linkEmailLoading || !linkEmailValue.trim()}>
                      {linkEmailLoading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Mail className="h-4 w-4 shrink-0" />}
                      Отправить ссылку
                    </Button>
                  </form>
                )}
                {linkEmailError && <p className="text-sm text-destructive">{linkEmailError}</p>}
              </div>
            )}
            <div className="min-w-0 overflow-hidden">
              <Label className="text-muted-foreground">Баланс</Label>
              <p className="font-medium truncate">{formatMoney(client.balance, client.preferredCurrency)}</p>
            </div>
            {hasReferralLinks && (
              <div className="min-w-0 overflow-hidden space-y-3">
                <Label className="text-muted-foreground">Реферальные ссылки</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Поделитесь с друзьями — при регистрации по ссылке вы получите бонус</p>
                {referralLinkSite && (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground shrink-0 w-12">Сайт</span>
                    <code className="rounded bg-muted px-2 py-1 text-sm font-mono flex-1 min-w-0 truncate block" title={referralLinkSite}>
                      {referralLinkSite}
                    </code>
                    <Button variant="ghost" size="sm" onClick={() => copyReferral("site")} className="shrink-0" title="Копировать">
                      {copiedRef === "site" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
                {referralLinkBot && (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-muted-foreground shrink-0 w-12">Бот</span>
                    <code className="rounded bg-muted px-2 py-1 text-sm font-mono flex-1 min-w-0 truncate block" title={referralLinkBot}>
                      {referralLinkBot}
                    </code>
                    <Button variant="ghost" size="sm" onClick={() => copyReferral("bot")} className="shrink-0" title="Копировать">
                      {copiedRef === "bot" ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="min-w-0">
            <CardTitle className="text-base truncate">Настройки</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            <form onSubmit={saveProfile} className="space-y-4 min-w-0">
              <div className="space-y-2 min-w-0">
                <Label>Язык</Label>
                <GlassSelect
                  value={preferredLang}
                  onChange={(v) => setPreferredLang(v)}
                  options={langs.map((l) => ({ value: l, label: l === "ru" ? "Русский" : l === "en" ? "English" : l.toUpperCase() }))}
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Валюта</Label>
                <GlassSelect
                  value={preferredCurrency}
                  onChange={(v) => setPreferredCurrency(v)}
                  options={currencies.map((c) => ({ value: c, label: c.toUpperCase() }))}
                />
              </div>
              {message && (
                <p className={`text-sm truncate ${message === "Настройки сохранены" ? "text-green-600" : "text-destructive"}`}>
                  {message}
                </p>
              )}
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                {saving ? "Сохранение…" : "Сохранить"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={`grid gap-6 ${isMiniapp ? "grid-cols-1" : "lg:grid-cols-2"} min-w-0`}
      >
        {(plategaMethods.length > 0 || yoomoneyEnabled || yookassaEnabled) && (
          <div id="topup" className="relative flex flex-col rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
            <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/10 dark:border-white/5 bg-background/40 backdrop-blur-2xl">
              <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-primary/20 blur-[80px] pointer-events-none" />
            </div>
            
            <div className="relative p-6 sm:p-8 flex flex-col h-full">
              <div className="flex items-center gap-4 mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner shrink-0">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">Пополнить баланс</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Оплата откроется в новой вкладке</p>
                </div>
              </div>

              <div className="space-y-6 mt-auto">
                <div className="relative flex h-32 w-full items-center justify-center rounded-3xl border border-border/50 bg-background/50 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
                  <Input
                    type="number"
                    min={1}
                    step={0.01}
                    placeholder="0"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="absolute inset-0 h-full w-full border-0 bg-transparent px-20 text-center text-5xl sm:text-6xl font-extrabold tracking-tighter shadow-none focus-visible:ring-0"
                    style={{ WebkitAppearance: "none", MozAppearance: "textfield" }}
                  />
                  <span className="pointer-events-none absolute right-[12%] top-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-bold text-muted-foreground uppercase opacity-80">
                    {currency}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[100, 300, 500, 1000].map((n) => {
                    const isActive = topUpAmount === String(n);
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setTopUpAmount(String(n))}
                        className={cn(
                          "flex items-center justify-center rounded-2xl py-3 text-sm font-bold transition-all duration-300",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                            : "bg-muted/60 text-foreground hover:bg-muted hover:scale-105"
                        )}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>

                {topUpError && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-sm font-medium text-destructive">
                    {topUpError}
                  </div>
                )}

                <Button
                  className="group relative w-full overflow-hidden rounded-2xl py-7 text-lg font-bold shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-primary/25"
                  onClick={() => {
                    const amount = Number(topUpAmount?.replace(",", "."));
                    if (!Number.isFinite(amount) || amount < 1) {
                      setTopUpError("Минимальная сумма пополнения — 1");
                      return;
                    }
                    setTopUpError(null);
                    setTopUpModalOpen(true);
                  }}
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full transition-transform duration-300 group-hover:translate-y-0" />
                  <span className="relative flex items-center justify-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Оплатить {topUpAmount ? `${topUpAmount} ${currency.toUpperCase()}` : ""}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="relative flex flex-col rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)] min-h-[400px]">
          <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/10 dark:border-white/5 bg-background/40 backdrop-blur-2xl">
            <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
          </div>
          
          <div className="relative p-6 sm:p-8 flex flex-col h-full min-w-0">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner shrink-0">
                  <Wallet className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold tracking-tight text-foreground truncate">История платежей</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">Последние 3 транзакции</p>
                </div>
              </div>
              {payments.length > 3 && (
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => setPaymentsHistoryOpen(true)}>
                  Вся история ({payments.length})
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar min-w-0 -mx-2 px-2">
              {payments.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center opacity-70">
                  <Wallet className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Платежей пока нет</p>
                </div>
              ) : (
                <ul className="space-y-3 min-w-0">
                  {payments.slice(0, 3).map((p) => (
                    <li
                      key={p.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 dark:bg-black/10 dark:hover:bg-black/20 p-4 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/50 text-muted-foreground shadow-sm">
                          <Check className={cn("h-4 w-4", p.status?.toLowerCase() === "paid" && "text-green-500")} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate" title={p.orderId}>{p.orderId}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(p.paidAt ?? p.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center shrink-0">
                        <span className="font-bold tracking-tight">{formatMoney(p.amount, p.currency)}</span>
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          p.status?.toLowerCase() === "paid" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                        )}>
                          {formatPaymentStatus(p.status)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <Dialog open={paymentsHistoryOpen} onOpenChange={setPaymentsHistoryOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col" showCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Вся история платежей
            </DialogTitle>
            <DialogDescription>
              {payments.length} {payments.length === 1 ? "транзакция" : payments.length < 5 ? "транзакции" : "транзакций"}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 -mx-1 px-1 space-y-2 py-2">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Платежей пока нет</p>
            ) : (
              payments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
                      <Check className={cn("h-3.5 w-3.5", p.status?.toLowerCase() === "paid" && "text-green-500")} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" title={p.orderId}>{p.orderId}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.paidAt ?? p.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 shrink-0">
                    <span className="font-semibold text-sm">{formatMoney(p.amount, p.currency)}</span>
                    <span className={cn(
                      "text-[10px] font-medium uppercase px-2 py-0.5 rounded-full",
                      p.status?.toLowerCase() === "paid" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"
                    )}>
                      {formatPaymentStatus(p.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentsHistoryOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={topUpModalOpen} onOpenChange={(open) => !topUpLoading && setTopUpModalOpen(open)}>
        <DialogContent className="max-w-sm" showCloseButton={!topUpLoading} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Способ оплаты</DialogTitle>
            <DialogDescription>
              Пополнение на {topUpAmount ? `${Number(topUpAmount.replace(",", "."))} ${currency.toUpperCase()}` : "—"}
              {(yoomoneyEnabled || yookassaEnabled) && " (ЮMoney и ЮKassa — только рубли)"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {yoomoneyEnabled && (
              <Button
                variant="outline"
                className="justify-start border-white/15 bg-white/5 backdrop-blur-sm hover:bg-white/15 transition-all duration-200"
                disabled={topUpLoading}
                onClick={() => startTopUpYoomoneyForm("AC")}
              >
                {topUpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" /> : <CreditCard className="h-4 w-4 mr-2 shrink-0 text-primary" />}
                ЮMoney — оплата картой
              </Button>
            )}
            {yookassaEnabled && (
              <Button
                variant="outline"
                className="justify-start border-white/15 bg-white/5 backdrop-blur-sm hover:bg-white/15 transition-all duration-200"
                disabled={topUpLoading}
                onClick={() => startTopUpYookassa()}
              >
                {topUpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" /> : <CreditCard className="h-4 w-4 mr-2 shrink-0 text-primary" />}
                ЮKassa — карта / СБП
              </Button>
            )}
            {plategaMethods.map((m) => (
              <Button
                key={m.id}
                variant="outline"
                className="justify-start border-white/15 bg-white/5 backdrop-blur-sm hover:bg-white/15 transition-all duration-200"
                disabled={topUpLoading}
                onClick={() => startTopUp(m.id)}
              >
                {topUpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2 shrink-0" /> : <CreditCard className="h-4 w-4 mr-2 shrink-0 text-primary" />}
                {m.label}
              </Button>
            ))}
          </div>
          {topUpError && <p className="text-sm text-destructive">{topUpError}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTopUpModalOpen(false)} disabled={topUpLoading}>
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
