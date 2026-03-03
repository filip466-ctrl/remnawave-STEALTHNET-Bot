import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Calendar, CreditCard, Loader2, Copy, Check, ChevronDown, Wallet, Globe } from "lucide-react";
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

type SingboxTariff = { id: string; name: string; slotCount: number; durationDays: number; trafficLimitBytes: string | null; price: number; currency: string };
type SingboxCategory = { id: string; name: string; sortOrder: number; tariffs: SingboxTariff[] };
type SingboxSlot = {
  id: string;
  subscriptionLink: string;
  expiresAt: string;
  trafficLimitBytes: string | null;
  trafficUsedBytes: string;
  protocol: string;
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

export function ClientSingboxPage() {
  const { state, refreshProfile } = useClientAuth();
  const token = state.token;
  const client = state.client;
  const [categories, setCategories] = useState<SingboxCategory[]>([]);
  const [slots, setSlots] = useState<SingboxSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [plategaMethods, setPlategaMethods] = useState<{ id: number; label: string }[]>([]);
  const [yoomoneyEnabled, setYoomoneyEnabled] = useState(false);
  const [yookassaEnabled, setYookassaEnabled] = useState(false);
  const [cryptopayEnabled, setCryptopayEnabled] = useState(false);
  const [heleketEnabled, setHeleketEnabled] = useState(false);
  const [payModal, setPayModal] = useState<SingboxTariff | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("tariffs");

  const isMobileOrMiniapp = useCabinetMiniapp();
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    api.getPublicSingboxTariffs().then((r) => {
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
    api.getSingboxSlots(token).then((r) => {
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

  async function payByBalance(tariff: SingboxTariff) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.clientPayByBalance(token, { singboxTariffId: tariff.id });
      setPayModal(null);
      alert(res.message);
      await refreshProfile();
      const r = await api.getSingboxSlots(token);
      setSlots(r.slots ?? []);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка оплаты");
    } finally {
      setPayLoading(false);
    }
  }

  async function startYoomoneyPayment(tariff: SingboxTariff) {
    if (!token || tariff.currency.toUpperCase() !== "RUB") return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.yoomoneyCreateFormPayment(token, {
        amount: tariff.price,
        paymentType: "AC",
        singboxTariffId: tariff.id,
      });
      setPayModal(null);
      if (res.paymentUrl) openPaymentInBrowser(res.paymentUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPayLoading(false);
    }
  }

  async function startYookassaPayment(tariff: SingboxTariff) {
    if (!token || tariff.currency.toUpperCase() !== "RUB") return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.yookassaCreatePayment(token, {
        amount: tariff.price,
        currency: "RUB",
        singboxTariffId: tariff.id,
      });
      setPayModal(null);
      if (res.confirmationUrl) openPaymentInBrowser(res.confirmationUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPayLoading(false);
    }
  }

  async function startCryptopayPayment(tariff: SingboxTariff) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.cryptopayCreatePayment(token, {
        amount: tariff.price,
        currency: tariff.currency,
        singboxTariffId: tariff.id,
      });
      setPayModal(null);
      if (res.payUrl) openPaymentInBrowser(res.payUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPayLoading(false);
    }
  }

  async function startHeleketPayment(tariff: SingboxTariff) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.heleketCreatePayment(token, {
        amount: tariff.price,
        currency: tariff.currency,
        singboxTariffId: tariff.id,
      });
      setPayModal(null);
      if (res.payUrl) openPaymentInBrowser(res.payUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setPayLoading(false);
    }
  }

  async function startPlategaPayment(tariff: SingboxTariff, methodId: number) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.clientCreatePlategaPayment(token, {
        amount: tariff.price,
        currency: tariff.currency,
        paymentMethod: methodId,
        description: tariff.name,
        singboxTariffId: tariff.id,
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
        <h1 className="text-3xl font-bold tracking-tight">Доступы</h1>
        <p className="text-muted-foreground text-lg">
          VLESS / Trojan / Hysteria2 / Shadowsocks. Купите тариф и скопируйте ссылку в приложение.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl p-1 bg-muted/50 backdrop-blur-md">
          <TabsTrigger value="tariffs" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <KeyRound className="h-4 w-4" /> Купить
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Мои доступы
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
                <KeyRound className="h-12 w-12 opacity-20" />
                <p>Тарифы доступов пока не настроены. Обратитесь в поддержку.</p>
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
                          <KeyRound className="h-4 w-4 text-primary shrink-0" />
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
                                    <KeyRound className="h-3.5 w-3.5 shrink-0" />
                                    {t.slotCount} шт.
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
                    <KeyRound className="h-5 w-5 text-primary shrink-0" />
                    {cat.name}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.tariffs.map((t) => (
                      <Card key={t.id} className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1">
                        <CardContent className="flex-1 flex flex-col p-5 min-h-0 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <p className="text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">{t.name}</p>
                            <div className="p-2.5 bg-primary/10 rounded-2xl shrink-0 group-hover:scale-110 transition-transform">
                              <KeyRound className="h-5 w-5 text-primary" />
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm font-medium mt-auto mb-6">
                            <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                              {t.slotCount} слотов
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
                <KeyRound className="h-12 w-12 opacity-20" />
                <p>У вас пока нет активных доступов. Купите тариф во вкладке «Купить».</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {slots.map((slot) => (
                <Card key={slot.id} className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                          <KeyRound className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{slot.protocol} · {slot.id.slice(-8)}</h3>
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
                        <div className="pl-2 font-semibold text-xs text-muted-foreground shrink-0">URL</div>
                        <code className="flex-1 truncate text-xs font-mono select-all text-foreground">
                          {slot.subscriptionLink}
                        </code>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="shrink-0 h-8 w-8 rounded-xl bg-background hover:bg-muted shadow-sm hover:scale-105 transition-transform"
                          onClick={() => copyToClipboard(slot.subscriptionLink, slot.id)}
                        >
                          {copied === slot.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground px-1">
                        Скопируйте ссылку в приложение (v2rayN, Nekoray, Shadowrocket и др.).
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!payModal} onOpenChange={(open) => { if (!open && !payLoading) { setPayModal(null); setPayError(null); } }}>
        <DialogContent className="max-w-md p-6 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-3xl shadow-2xl" showCloseButton={!payLoading} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="mb-4 text-center sm:text-left">
            <DialogTitle className="text-2xl font-bold flex items-center justify-center sm:justify-start gap-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              Оплата доступа
            </DialogTitle>
            <DialogDescription className="text-base font-medium mt-2">
              {payModal ? (
                <div className="flex flex-col gap-2 mt-4 bg-background/50 p-4 rounded-2xl border border-border/50 text-left relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex justify-between items-center relative z-10">
                    <span className="text-muted-foreground">Тариф:</span>
                    <span className="font-semibold text-foreground text-right ml-2">{payModal.name}</span>
                  </div>
                  <div className="h-px w-full bg-border/50 my-1 relative z-10" />
                  <div className="flex justify-between items-center relative z-10">
                    <span className="text-muted-foreground">К оплате:</span>
                    <span className="font-bold text-xl text-primary">{formatMoney(payModal.price, payModal.currency)}</span>
                  </div>
                </div>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {payError && (
            <div className="p-3 mb-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center font-medium animate-in fade-in slide-in-from-top-2">
              {payError}
            </div>
          )}

          {payModal && (
            <div className="flex flex-col gap-3">
              {client && (() => {
                const hasBalance = client.balance >= payModal.price;
                return (
                  <Button
                    size="lg"
                    onClick={() => payByBalance(payModal)}
                    disabled={payLoading || !hasBalance}
                    className="w-full gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-xl h-14 bg-gradient-to-r from-primary to-primary/80 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                    {payLoading ? <Loader2 className="h-5 w-5 animate-spin relative z-10" /> : <Wallet className="h-5 w-5 relative z-10" />}
                    <span className="text-base font-semibold relative z-10">Оплатить с баланса</span>
                    <span className="opacity-90 font-medium ml-1 bg-black/10 px-2 py-0.5 rounded-md relative z-10">
                      {formatMoney(client.balance, payModal.currency)}
                    </span>
                  </Button>
                );
              })()}

              <div className="grid grid-cols-1 gap-2.5">
                {yoomoneyEnabled && payModal.currency.toUpperCase() === "RUB" && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => startYoomoneyPayment(payModal)}
                    disabled={payLoading}
                    className="w-full gap-3 hover:bg-background/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-xl h-14 border-border/50 group justify-start px-6"
                  >
                    <div className="p-1.5 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin text-purple-500" /> : <CreditCard className="h-5 w-5 text-purple-500" />}
                    </div>
                    <span className="text-base font-medium">ЮMoney</span>
                  </Button>
                )}

                {yookassaEnabled && payModal.currency.toUpperCase() === "RUB" && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => startYookassaPayment(payModal)}
                    disabled={payLoading}
                    className="w-full gap-3 hover:bg-background/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-xl h-14 border-border/50 group justify-start px-6"
                  >
                    <div className="p-1.5 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin text-blue-500" /> : <CreditCard className="h-5 w-5 text-blue-500" />}
                    </div>
                    <span className="text-base font-medium">ЮKassa</span>
                  </Button>
                )}

                {cryptopayEnabled && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => startCryptopayPayment(payModal)}
                    disabled={payLoading}
                    className="w-full gap-3 hover:bg-background/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-xl h-14 border-border/50 group justify-start px-6"
                  >
                    <div className="p-1.5 rounded-lg bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin text-yellow-500" /> : <Globe className="h-5 w-5 text-yellow-500" />}
                    </div>
                    <span className="text-base font-medium">Crypto Bot</span>
                  </Button>
                )}

                {heleketEnabled && (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => startHeleketPayment(payModal)}
                    disabled={payLoading}
                    className="w-full gap-3 hover:bg-background/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-xl h-14 border-border/50 group justify-start px-6"
                  >
                    <div className="p-1.5 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin text-orange-500" /> : <Globe className="h-5 w-5 text-orange-500" />}
                    </div>
                    <span className="text-base font-medium">Heleket</span>
                  </Button>
                )}

                {plategaMethods.map((m) => (
                  <Button
                    key={m.id}
                    size="lg"
                    variant="outline"
                    onClick={() => startPlategaPayment(payModal, m.id)}
                    disabled={payLoading}
                    className="w-full gap-3 hover:bg-background/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 rounded-xl h-14 border-border/50 group justify-start px-6"
                  >
                    <div className="p-1.5 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                      {payLoading ? <Loader2 className="h-5 w-5 animate-spin text-green-500" /> : <CreditCard className="h-5 w-5 text-green-500" />}
                    </div>
                    <span className="text-base font-medium">{m.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 sm:justify-center border-t border-border/50 pt-4">
             <Button variant="ghost" onClick={() => { setPayModal(null); setPayError(null); }} disabled={payLoading} className="rounded-xl hover:bg-background/50 hover:text-foreground text-muted-foreground transition-colors">
               Отмена
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
