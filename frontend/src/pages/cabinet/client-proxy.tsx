import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Calendar, CreditCard, Loader2, Copy, Check, ChevronDown, Wallet, Tag } from "lucide-react";
import { useClientAuth } from "@/contexts/client-auth";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCabinetMiniapp } from "@/pages/cabinet/cabinet-layout";
import { openPaymentInBrowser } from "@/lib/open-payment-url";

type ProxyTariff = { id: string; name: string; proxyCount: number; durationDays: number; price: number; currency: string };
type ProxyCategory = { id: string; name: string; sortOrder: number; tariffs: ProxyTariff[] };
type ProxySlot = {
  id: string;
  login: string;
  password: string;
  host: string;
  socksPort: number;
  httpPort: number;
  expiresAt: string;
  trafficLimitBytes: string | null;
  trafficUsedBytes: string;
  connectionLimit: number | null;
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency.toUpperCase() === "USD" ? "USD" : currency.toUpperCase() === "RUB" ? "RUB" : "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatBytes(bytes: string | null): string {
  if (!bytes) return "—";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ClientProxyPage() {
  const { state, refreshProfile } = useClientAuth();
  const token = state.token;
  const client = state.client;
  const [categories, setCategories] = useState<ProxyCategory[]>([]);
  const [slots, setSlots] = useState<ProxySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [plategaMethods, setPlategaMethods] = useState<{ id: number; label: string }[]>([]);
  const [yoomoneyEnabled, setYoomoneyEnabled] = useState(false);
  const [yookassaEnabled, setYookassaEnabled] = useState(false);
  const [cryptopayEnabled, setCryptopayEnabled] = useState(false);
  const [heleketEnabled, setHeleketEnabled] = useState(false);
  const [payModal, setPayModal] = useState<ProxyTariff | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("tariffs");

  const isMobileOrMiniapp = useCabinetMiniapp();
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    api.getPublicProxyTariffs().then((r) => {
      setCategories(r.items ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.getPublicConfig().then((c) => {
      setPlategaMethods(c.plategaMethods ?? []);
      setYoomoneyEnabled(Boolean(c.yoomoneyEnabled));
      setYookassaEnabled(Boolean(c.yookassaEnabled));
      setCryptopayEnabled(Boolean(c.cryptopayEnabled));
      setHeleketEnabled(Boolean(c.heleketEnabled));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) {
      setSlotsLoading(false);
      return;
    }
    setSlotsLoading(true);
    api.getProxySlots(token).then((r) => {
      setSlots(r.slots ?? []);
    }).catch(() => setSlots([])).finally(() => setSlotsLoading(false));
  }, [token]);

  useEffect(() => {
    if (isMobileOrMiniapp && categories.length > 0) {
      setExpandedCategoryId((prev) => (prev === null ? categories[0]!.id : prev));
    }
  }, [isMobileOrMiniapp, categories]);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  async function payByBalance(tariff: ProxyTariff) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.clientPayByBalance(token, { proxyTariffId: tariff.id });
      setPayModal(null);
      alert(res.message);
      await refreshProfile();
      const r = await api.getProxySlots(token);
      setSlots(r.slots ?? []);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка оплаты");
    } finally {
      setPayLoading(false);
    }
  }

  async function startYoomoneyPayment(tariff: ProxyTariff) {
    if (!token || tariff.currency.toUpperCase() !== "RUB") return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.yoomoneyCreateFormPayment(token, {
        amount: tariff.price,
        paymentType: "AC",
        proxyTariffId: tariff.id,
      });
      setPayModal(null);
      if (res.paymentUrl) openPaymentInBrowser(res.paymentUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPayLoading(false);
    }
  }

  async function startYookassaPayment(tariff: ProxyTariff) {
    if (!token || tariff.currency.toUpperCase() !== "RUB") return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.yookassaCreatePayment(token, {
        amount: tariff.price,
        currency: "RUB",
        proxyTariffId: tariff.id,
      });
      setPayModal(null);
      if (res.confirmationUrl) openPaymentInBrowser(res.confirmationUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPayLoading(false);
    }
  }

  async function startCryptopayPayment(tariff: ProxyTariff) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.cryptopayCreatePayment(token, {
        amount: tariff.price,
        currency: tariff.currency,
        proxyTariffId: tariff.id,
      });
      setPayModal(null);
      if (res.payUrl) openPaymentInBrowser(res.payUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPayLoading(false);
    }
  }

  async function startHeleketPayment(tariff: ProxyTariff) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.heleketCreatePayment(token, {
        amount: tariff.price,
        currency: tariff.currency,
        proxyTariffId: tariff.id,
      });
      setPayModal(null);
      if (res.payUrl) openPaymentInBrowser(res.payUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPayLoading(false);
    }
  }

  async function startPlategaPayment(tariff: ProxyTariff, methodId: number) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.clientCreatePlategaPayment(token, {
        amount: tariff.price,
        currency: tariff.currency,
        paymentMethod: methodId,
        description: tariff.name,
        proxyTariffId: tariff.id,
      });
      setPayModal(null);
      openPaymentInBrowser(res.paymentUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPayLoading(false);
    }
  }

  const flatTariffs = categories.flatMap((c) => c.tariffs.map((t) => ({ ...t, categoryName: c.name })));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Прокси</h1>
        <p className="text-muted-foreground text-lg">
          Покупка прокси и управление активными слотами.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl p-1 bg-muted/50 backdrop-blur-md">
          <TabsTrigger value="tariffs" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Globe className="h-4 w-4" /> Купить
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Мои прокси
            {slots.length > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-xs font-medium">
                {slots.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tariffs" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : flatTariffs.length === 0 ? (
            <Card className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
                <Globe className="h-12 w-12 opacity-20" />
                <p>Тарифы прокси пока не настроены. Обратитесь в поддержку.</p>
              </CardContent>
            </Card>
          ) : isMobileOrMiniapp ? (
            <div className="space-y-3">
              {categories.filter((c) => c.tariffs.length > 0).map((cat, catIndex) => (
                <Collapsible
                  key={cat.id}
                  open={expandedCategoryId === cat.id}
                  onOpenChange={(open) => setExpandedCategoryId(open ? cat.id : null)}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: catIndex * 0.03 }}
                    className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md shadow-sm overflow-hidden"
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/50 active:bg-muted transition-colors"
                      >
                        <span className="flex items-center gap-2 font-semibold">
                          <Globe className="h-4 w-4 text-primary shrink-0" />
                          {cat.name}
                        </span>
                        <ChevronDown
                          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${expandedCategoryId === cat.id ? "rotate-180" : ""}`}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-1 flex flex-col gap-3">
                        {cat.tariffs.map((t) => (
                          <Card key={t.id} className="rounded-2xl border border-border/50 bg-background/50 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300">
                            <CardContent className="flex flex-row items-center gap-4 py-4 px-4 min-h-0 min-w-0">
                              <div className="flex-1 min-w-0">
                                <p className="text-base font-semibold leading-tight truncate">{t.name}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">
                                    <Globe className="h-3.5 w-3.5 shrink-0" />
                                    {t.proxyCount} шт.
                                  </span>
                                  <span className="flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded-md font-medium">
                                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                                    {t.durationDays} дн.
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className="text-lg font-bold tabular-nums whitespace-nowrap text-primary">
                                  {formatMoney(t.price, t.currency)}
                                </span>
                                {token ? (
                                  <Button
                                    size="sm"
                                    className="h-8 px-4 rounded-xl shadow-md hover:scale-105 transition-transform"
                                    onClick={() => setPayModal(t)}
                                  >
                                    <CreditCard className="h-4 w-4 shrink-0 mr-1.5" />
                                    Оплатить
                                  </Button>
                                ) : null}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </motion.div>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className="space-y-10">
              {categories.filter((c) => c.tariffs.length > 0).map((cat, catIndex) => (
                <motion.section
                  key={cat.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: catIndex * 0.05 }}
                >
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary shrink-0" />
                    {cat.name}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.tariffs.map((t) => (
                      <Card key={t.id} className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1">
                        <CardContent className="flex-1 flex flex-col p-5 min-h-0 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <p className="text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">{t.name}</p>
                            <div className="p-2.5 bg-primary/10 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
                              <Globe className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm font-medium mt-auto mb-6">
                            <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                              {t.proxyCount} прокси
                            </span>
                            <span className="bg-muted px-2.5 py-1 rounded-lg">
                              {t.durationDays} дн.
                            </span>
                          </div>
                          <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-2">
                            <span className="text-xl font-bold tabular-nums truncate text-foreground">
                              {formatMoney(t.price, t.currency)}
                            </span>
                            {token ? (
                              <Button size="sm" className="h-10 px-5 rounded-xl shadow-md hover:scale-105 transition-transform shrink-0" onClick={() => setPayModal(t)}>
                                Оплатить
                              </Button>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.section>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my" className="mt-4">
          {slotsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : slots.length === 0 ? (
            <Card className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
                <Globe className="h-12 w-12 opacity-20" />
                <p>У вас пока нет активных прокси. Купите тариф во вкладке «Купить».</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {slots.map((slot) => {
                const socks5 = `socks5://${slot.login}:${slot.password}@${slot.host}:${slot.socksPort}`;
                const http = `http://${slot.login}:${slot.password}@${slot.host}:${slot.httpPort}`;
                const socks5Id = `socks5-${slot.id}`;
                const httpId = `http-${slot.id}`;
                return (
                  <Card key={slot.id} className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                            <Globe className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">Прокси {slot.id.slice(0, 8)}…</h3>
                            {slot.trafficLimitBytes && Number(slot.trafficLimitBytes) > 0 ? (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Трафик: {formatBytes(slot.trafficUsedBytes)} / {formatBytes(slot.trafficLimitBytes)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex flex-col items-end text-sm shrink-0">
                          <span className="text-xs text-muted-foreground">Действует до</span>
                          <span className="font-medium text-foreground">{formatDate(slot.expiresAt)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 min-w-0 bg-background/50 p-2 rounded-2xl border border-border/50">
                          <div className="pl-2 font-semibold text-xs text-muted-foreground w-14 shrink-0">SOCKS5</div>
                          <code className="flex-1 truncate text-xs font-mono select-all text-foreground">
                            {socks5}
                          </code>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="shrink-0 h-8 w-8 rounded-xl bg-background hover:bg-muted shadow-sm hover:scale-105 transition-transform"
                            onClick={() => copyToClipboard(socks5, socks5Id)}
                          >
                            {copied === socks5Id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2 min-w-0 bg-background/50 p-2 rounded-2xl border border-border/50">
                          <div className="pl-2 font-semibold text-xs text-muted-foreground w-14 shrink-0">HTTP</div>
                          <code className="flex-1 truncate text-xs font-mono select-all text-foreground">
                            {http}
                          </code>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="shrink-0 h-8 w-8 rounded-xl bg-background hover:bg-muted shadow-sm hover:scale-105 transition-transform"
                            onClick={() => copyToClipboard(http, httpId)}
                          >
                            {copied === httpId ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!payModal} onOpenChange={(open) => { if (!open && !payLoading) { setPayModal(null); setPayError(null); } }}>
        <DialogContent className="max-w-md p-6 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-3xl shadow-2xl" showCloseButton={!payLoading} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="mb-4 text-center sm:text-left">
            <DialogTitle className="text-2xl font-black tracking-tight text-foreground">Способ оплаты</DialogTitle>
            <DialogDescription className="text-base font-medium mt-2">
              {payModal ? (
                <div className="inline-flex items-center gap-2 bg-background/60 px-3 py-1.5 rounded-xl border border-border/50">
                  <span className="text-foreground font-semibold">{payModal.name}</span>
                  <span className="text-muted-foreground">—</span>
                  <span className="text-foreground font-black">{formatMoney(payModal.price, payModal.currency)}</span>
                </div>
              ) : ""}
            </DialogDescription>
          </DialogHeader>

          {payModal && (
            <div className="flex flex-col gap-3">
              {/* Оплата балансом */}
              {client && (() => {
                const hasBalance = client.balance >= payModal.price;
                return (
                  <Button
                    variant={hasBalance ? "default" : "secondary"}
                    className={`relative overflow-hidden justify-start gap-4 h-16 rounded-2xl px-5 transition-all duration-300 ${hasBalance ? "shadow-lg shadow-primary/20 hover:scale-[1.02] border border-primary/20" : "opacity-70 border border-border/50 bg-muted/50"}`}
                    disabled={payLoading || !hasBalance}
                    onClick={() => payByBalance(payModal)}
                  >
                    {hasBalance && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-1000" />
                    )}
                    <div className={`p-2 rounded-xl shrink-0 ${hasBalance ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wallet className="h-5 w-5" />}
                    </div>
                    <div className="flex flex-col items-start gap-0.5">
                      <span className={`text-base font-bold leading-none ${hasBalance ? "text-primary-foreground" : "text-muted-foreground"}`}>
                        Оплатить балансом
                      </span>
                      <span className={`text-xs font-semibold leading-none ${hasBalance ? "text-primary-foreground/80" : "text-muted-foreground/80"}`}>
                        На счету: {formatMoney(client.balance, payModal.currency)}
                      </span>
                    </div>
                  </Button>
                );
              })()}

              <div className="grid grid-cols-1 gap-2.5">
                {/* ЮMoney — только для тарифов в рублях */}
                {yoomoneyEnabled && payModal.currency.toUpperCase() === "RUB" && (
                  <Button
                    variant="outline"
                    className="justify-start gap-4 h-14 rounded-2xl px-5 bg-background/50 hover:bg-background/80 border-border/50 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                    disabled={payLoading}
                    onClick={() => startYoomoneyPayment(payModal)}
                  >
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <span className="text-base font-bold text-foreground">ЮMoney — карта</span>
                  </Button>
                )}

                {/* ЮKassa API — карта, СБП и др., только RUB */}
                {yookassaEnabled && payModal.currency.toUpperCase() === "RUB" && (
                  <Button
                    variant="outline"
                    className="justify-start gap-4 h-14 rounded-2xl px-5 bg-background/50 hover:bg-background/80 border-border/50 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                    disabled={payLoading}
                    onClick={() => startYookassaPayment(payModal)}
                  >
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <span className="text-base font-bold text-foreground">ЮKassa — карта / СБП</span>
                  </Button>
                )}

                {/* Crypto Pay (Crypto Bot) */}
                {cryptopayEnabled && (
                  <Button
                    variant="outline"
                    className="justify-start gap-4 h-14 rounded-2xl px-5 bg-background/50 hover:bg-background/80 border-border/50 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                    disabled={payLoading}
                    onClick={() => startCryptopayPayment(payModal)}
                  >
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <span className="text-base font-bold text-foreground">Crypto Bot</span>
                  </Button>
                )}

                {/* Heleket */}
                {heleketEnabled && (
                  <Button
                    variant="outline"
                    className="justify-start gap-4 h-14 rounded-2xl px-5 bg-background/50 hover:bg-background/80 border-border/50 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                    disabled={payLoading}
                    onClick={() => startHeleketPayment(payModal)}
                  >
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <span className="text-base font-bold text-foreground">Heleket</span>
                  </Button>
                )}

                {/* Platega */}
                {plategaMethods.map((m) => (
                  <Button
                    key={m.id}
                    variant="outline"
                    className="justify-start gap-4 h-14 rounded-2xl px-5 bg-background/50 hover:bg-background/80 border-border/50 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                    disabled={payLoading}
                    onClick={() => startPlategaPayment(payModal, m.id)}
                  >
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                    </div>
                    <span className="text-base font-bold text-foreground">{m.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
          {payError && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <p className="text-sm font-bold text-destructive text-center">{payError}</p>
            </motion.div>
          )}
          <DialogFooter className="mt-4 sm:justify-center border-t border-border/50 pt-4">
            <Button variant="ghost" className="h-12 rounded-xl px-8 font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full sm:w-auto transition-colors" onClick={() => { setPayModal(null); setPayError(null); }} disabled={payLoading}>
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
