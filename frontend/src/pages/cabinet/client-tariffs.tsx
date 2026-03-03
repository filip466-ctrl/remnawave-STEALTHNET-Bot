import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, Calendar, Wifi, Smartphone, CreditCard, Loader2, Gift, Tag, Check, Wallet, ChevronDown } from "lucide-react";
import { useClientAuth } from "@/contexts/client-auth";
import { api } from "@/lib/api";
import type { PublicTariffCategory } from "@/lib/api";
import { formatRuDays } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCabinetMiniapp } from "@/pages/cabinet/cabinet-layout";
import { openPaymentInBrowser } from "@/lib/open-payment-url";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency.toUpperCase() === "USD" ? "USD" : currency.toUpperCase() === "RUB" ? "RUB" : "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

type TariffForPay = { id: string; name: string; price: number; currency: string };

export function ClientTariffsPage() {
  const { state, refreshProfile } = useClientAuth();
  const token = state.token;
  const client = state.client;
  const [tariffs, setTariffs] = useState<PublicTariffCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [plategaMethods, setPlategaMethods] = useState<{ id: number; label: string }[]>([]);
  const [yoomoneyEnabled, setYoomoneyEnabled] = useState(false);
  const [yookassaEnabled, setYookassaEnabled] = useState(false);
  const [cryptopayEnabled, setCryptopayEnabled] = useState(false);
  const [heleketEnabled, setHeleketEnabled] = useState(false);
  const [trialConfig, setTrialConfig] = useState<{ trialEnabled: boolean; trialDays: number }>({ trialEnabled: false, trialDays: 0 });
  const [payModal, setPayModal] = useState<{ tariff: TariffForPay } | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialError, setTrialError] = useState<string | null>(null);

  // Промокод
  const [promoInput, setPromoInput] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoResult, setPromoResult] = useState<{ type: string; discountPercent?: number | null; discountFixed?: number | null; name: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const showTrial = trialConfig.trialEnabled && !client?.trialUsed;

  const isMobileOrMiniapp = useCabinetMiniapp();
  // В мини-аппе/мобиле один и тот же вид: карточка категории + список тарифов (и для 1, и для нескольких категорий)
  const useCategoryCardLayout = isMobileOrMiniapp;
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // По умолчанию открыта первая категория (мобильная/мини-апп)
  useEffect(() => {
    if (useCategoryCardLayout && tariffs.length > 0) {
      setExpandedCategoryId((prev) => (prev === null ? tariffs[0].id : prev));
    }
  }, [useCategoryCardLayout, tariffs]);

  useEffect(() => {
    api.getPublicTariffs().then((r) => {
      setTariffs(r.items ?? []);
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
      setTrialConfig({ trialEnabled: !!c.trialEnabled, trialDays: c.trialDays ?? 0 });
    }).catch(() => {});
  }, []);

  async function activateTrial() {
    if (!token) return;
    setTrialError(null);
    setTrialLoading(true);
    try {
      await api.clientActivateTrial(token);
      await refreshProfile();
    } catch (e) {
      setTrialError(e instanceof Error ? e.message : "Ошибка активации триала");
    } finally {
      setTrialLoading(false);
    }
  }

  async function checkPromo() {
    if (!token || !promoInput.trim()) return;
    setPromoChecking(true);
    setPromoError(null);
    setPromoResult(null);
    try {
      const res = await api.clientCheckPromoCode(token, promoInput.trim());
      if (res.type === "DISCOUNT") {
        setPromoResult(res);
      } else {
        // FREE_DAYS — активируем сразу
        const activateRes = await api.clientActivatePromoCode(token, promoInput.trim());
        setPromoError(null);
        setPromoResult(null);
        setPromoInput("");
        setPayModal(null);
        alert(activateRes.message);
        await refreshProfile();
        return;
      }
    } catch (e) {
      setPromoError(e instanceof Error ? e.message : "Ошибка");
      setPromoResult(null);
    } finally {
      setPromoChecking(false);
    }
  }

  function getDiscountedPrice(price: number): number {
    if (!promoResult) return price;
    let final = price;
    if (promoResult.discountPercent && promoResult.discountPercent > 0) {
      final -= final * promoResult.discountPercent / 100;
    }
    if (promoResult.discountFixed && promoResult.discountFixed > 0) {
      final -= promoResult.discountFixed;
    }
    return Math.max(0, Math.round(final * 100) / 100);
  }

  async function startPayment(tariff: TariffForPay, methodId: number) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const finalPrice = promoResult ? getDiscountedPrice(tariff.price) : tariff.price;
      const res = await api.clientCreatePlategaPayment(token, {
        amount: finalPrice,
        currency: tariff.currency,
        paymentMethod: methodId,
        description: tariff.name,
        tariffId: tariff.id,
        promoCode: promoResult ? promoInput.trim() : undefined,
      });
      setPayModal(null);
      setPromoInput("");
      setPromoResult(null);
      openPaymentInBrowser(res.paymentUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setPayLoading(false);
    }
  }

  async function payByBalance(tariff: TariffForPay) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const res = await api.clientPayByBalance(token, {
        tariffId: tariff.id,
        promoCode: promoResult ? promoInput.trim() : undefined,
      });
      setPayModal(null);
      setPromoInput("");
      setPromoResult(null);
      alert(res.message);
      await refreshProfile();
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка оплаты");
    } finally {
      setPayLoading(false);
    }
  }

  /** Оплата тарифа ЮMoney (картой). Только для тарифов в рублях. */
  async function startYoomoneyPayment(tariff: TariffForPay) {
    if (!token) return;
    if (tariff.currency.toUpperCase() !== "RUB") {
      setPayError("ЮMoney принимает только рубли. Выберите тариф в RUB или оплатите картой Platega.");
      return;
    }
    setPayError(null);
    setPayLoading(true);
    try {
      const amount = promoResult ? getDiscountedPrice(tariff.price) : tariff.price;
      const res = await api.yoomoneyCreateFormPayment(token, {
        amount,
        paymentType: "AC",
        tariffId: tariff.id,
      });
      setPayModal(null);
      setPromoInput("");
      setPromoResult(null);
      if (res.paymentUrl) openPaymentInBrowser(res.paymentUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setPayLoading(false);
    }
  }

  /** Оплата тарифа ЮKassa API (карта, СБП и др.). Только RUB. */
  async function startYookassaPayment(tariff: TariffForPay) {
    if (!token) return;
    if (tariff.currency.toUpperCase() !== "RUB") {
      setPayError("ЮKassa принимает только рубли (RUB).");
      return;
    }
    setPayError(null);
    setPayLoading(true);
    try {
      const amount = promoResult ? getDiscountedPrice(tariff.price) : tariff.price;
      const res = await api.yookassaCreatePayment(token, {
        amount,
        currency: "RUB",
        tariffId: tariff.id,
        promoCode: promoResult ? promoInput.trim() : undefined,
      });
      setPayModal(null);
      setPromoInput("");
      setPromoResult(null);
      if (res.confirmationUrl) openPaymentInBrowser(res.confirmationUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setPayLoading(false);
    }
  }

  async function startCryptopayPayment(tariff: TariffForPay) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const amount = promoResult ? getDiscountedPrice(tariff.price) : tariff.price;
      const res = await api.cryptopayCreatePayment(token, {
        amount,
        currency: tariff.currency,
        tariffId: tariff.id,
        promoCode: promoResult ? promoInput.trim() : undefined,
      });
      setPayModal(null);
      setPromoInput("");
      setPromoResult(null);
      if (res.payUrl) openPaymentInBrowser(res.payUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setPayLoading(false);
    }
  }

  async function startHeleketPayment(tariff: TariffForPay) {
    if (!token) return;
    setPayError(null);
    setPayLoading(true);
    try {
      const amount = promoResult ? getDiscountedPrice(tariff.price) : tariff.price;
      const res = await api.heleketCreatePayment(token, {
        amount,
        currency: tariff.currency,
        tariffId: tariff.id,
        promoCode: promoResult ? promoInput.trim() : undefined,
      });
      setPayModal(null);
      setPromoInput("");
      setPromoResult(null);
      if (res.payUrl) openPaymentInBrowser(res.payUrl);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Ошибка создания платежа");
    } finally {
      setPayLoading(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Тарифы</h1>
        <p className="text-muted-foreground text-[15px] font-medium max-w-2xl">
          Выберите подходящий тариф и оплатите.
        </p>
      </div>

      {showTrial && (
        <Card className="rounded-3xl border border-green-500/30 bg-green-500/5 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/20 text-green-500 shadow-inner shrink-0">
                <Gift className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-lg text-foreground">Попробовать бесплатно</p>
                <p className="text-sm text-muted-foreground font-medium">
                  {trialConfig.trialDays > 0
                    ? `${formatRuDays(trialConfig.trialDays)} триала без оплаты`
                    : "Триал без оплаты"}
                </p>
              </div>
            </div>
            <Button
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-lg h-12 rounded-xl text-md hover:scale-[1.02] transition-transform duration-300 shrink-0 gap-2"
              onClick={activateTrial}
              disabled={trialLoading}
            >
              {trialLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
              Активировать триал
            </Button>
          </CardContent>
          {trialError && <p className="text-sm text-destructive px-6 pb-4 font-medium">{trialError}</p>}
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        </div>
      ) : tariffs.length === 0 ? (
        <Card className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
            <Package className="h-12 w-12 opacity-20" />
            <p className="text-base font-medium text-center">Тарифы пока не опубликованы.<br/>Обратитесь в поддержку.</p>
          </CardContent>
        </Card>
      ) : useCategoryCardLayout ? (
        <div className="space-y-1">
          {tariffs.map((cat, catIndex) => (
            <Collapsible
              key={cat.id}
              open={expandedCategoryId === cat.id}
              onOpenChange={(open) => setExpandedCategoryId(open ? cat.id : null)}
            >
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: catIndex * 0.03 }}
                className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-lg overflow-hidden transition-all duration-300"
              >
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/20 active:bg-muted/30 transition-colors"
                  >
                    <span className="flex items-center gap-3 font-bold text-[16px] text-foreground">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary shadow-inner shrink-0">
                        <Package className="h-4 w-4" />
                      </div>
                      {cat.name}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 ${expandedCategoryId === cat.id ? "rotate-180" : ""}`}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-4 pt-1 flex flex-col gap-3">
                    {cat.tariffs.map((t) => (
                      <Card key={t.id} className="rounded-2xl border border-border/50 bg-background/50 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300">
                        <CardContent className="flex flex-row items-center gap-4 py-4 px-4 min-h-0 min-w-0">
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <p className="text-[15px] font-bold leading-tight truncate text-foreground">{t.name}</p>
                            {t.description?.trim() ? (
                              <p className="text-xs text-muted-foreground font-medium line-clamp-2">{t.description}</p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                                <Calendar className="h-3 w-3 text-primary" />
                                {t.durationDays} дн.
                              </span>
                              <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                                <Wifi className="h-3 w-3 text-primary" />
                                {t.trafficLimitBytes != null && t.trafficLimitBytes > 0 ? `${(t.trafficLimitBytes / 1024 / 1024 / 1024).toFixed(1)} ГБ` : "∞"}
                              </span>
                              <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                                <Smartphone className="h-3 w-3 text-primary" />
                                {t.deviceLimit != null && t.deviceLimit > 0 ? `${t.deviceLimit}` : "∞"}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-center gap-2.5 shrink-0 min-w-[90px]">
                            <span className="text-lg font-bold tabular-nums whitespace-nowrap text-foreground" title={formatMoney(t.price, t.currency)}>
                              {formatMoney(t.price, t.currency)}
                            </span>
                            {token ? (
                              <Button
                                size="sm"
                                className="w-full h-9 rounded-xl shadow-md text-xs font-semibold gap-1.5 hover:scale-105 transition-transform"
                                onClick={() => setPayModal({ tariff: { id: t.id, name: t.name, price: t.price, currency: t.currency } })}
                              >
                                <CreditCard className="h-3.5 w-3.5 shrink-0" />
                                Оплатить
                              </Button>
                            ) : (
                              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">В боте</span>
                            )}
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
        <div className="space-y-8">
          {tariffs.map((cat, catIndex) => (
            <motion.section
              key={cat.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: catIndex * 0.05 }}
            >
              <h2 className="text-xl font-bold mb-4 flex items-center gap-3 text-foreground">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary shadow-inner shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                {cat.name}
              </h2>
              <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cat.tariffs.map((t) => (
                  <Card key={t.id} className="rounded-3xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1">
                    <CardContent className="flex-1 flex flex-col p-5 min-h-0 min-w-0">
                      <div className="mb-4">
                        <p className="text-lg font-bold leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">{t.name}</p>
                        {t.description?.trim() ? (
                          <p className="text-sm text-muted-foreground font-medium mt-1.5 line-clamp-2">{t.description}</p>
                        ) : null}
                      </div>
                      
                      <div className="flex flex-col gap-2.5 mt-auto mb-5 text-sm font-semibold text-muted-foreground">
                        <div className="flex items-center gap-3 bg-background/50 px-3 py-2 rounded-xl border border-border/50">
                          <div className="bg-primary/20 p-1.5 rounded-lg text-primary">
                            <Calendar className="h-4 w-4 shrink-0" />
                          </div>
                          <span>{t.durationDays} дней</span>
                        </div>
                        <div className="flex items-center gap-3 bg-background/50 px-3 py-2 rounded-xl border border-border/50">
                          <div className="bg-primary/20 p-1.5 rounded-lg text-primary">
                            <Wifi className="h-4 w-4 shrink-0" />
                          </div>
                          <span>
                            {t.trafficLimitBytes != null && t.trafficLimitBytes > 0
                              ? `${(t.trafficLimitBytes / 1024 / 1024 / 1024).toFixed(1)} ГБ`
                              : "Безлимитный трафик"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 bg-background/50 px-3 py-2 rounded-xl border border-border/50">
                          <div className="bg-primary/20 p-1.5 rounded-lg text-primary">
                            <Smartphone className="h-4 w-4 shrink-0" />
                          </div>
                          <span>{t.deviceLimit != null && t.deviceLimit > 0 ? `${t.deviceLimit}` : "∞"} устройств</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border/50 mt-auto flex flex-col gap-3 min-w-0">
                        <span className="text-2xl font-black tabular-nums truncate min-w-0 text-foreground text-center" title={formatMoney(t.price, t.currency)}>
                          {formatMoney(t.price, t.currency)}
                        </span>
                        {token ? (
                          <Button
                            size="lg"
                            className="w-full h-12 rounded-xl shadow-md text-[15px] font-bold gap-2 hover:scale-[1.02] transition-transform"
                            onClick={() => setPayModal({ tariff: { id: t.id, name: t.name, price: t.price, currency: t.currency } })}
                          >
                            <CreditCard className="h-5 w-5 shrink-0" />
                            Оплатить
                          </Button>
                        ) : (
                          <div className="w-full h-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center">
                            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">В боте</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.section>
          ))}
        </div>
      )}

      <Dialog open={!!payModal} onOpenChange={(open) => { if (!open && !payLoading) { setPayModal(null); setPromoInput(""); setPromoResult(null); setPromoError(null); } }}>
        <DialogContent className="max-w-md p-6 rounded-3xl border border-border/50 bg-card/60 backdrop-blur-3xl shadow-2xl" showCloseButton={!payLoading} onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader className="mb-4 text-center sm:text-left">
            <DialogTitle className="text-2xl font-black tracking-tight text-foreground">Способ оплаты</DialogTitle>
            <DialogDescription className="text-base font-medium mt-2">
              {payModal ? (
                promoResult ? (
                  <div className="inline-flex items-center gap-2 bg-background/60 px-3 py-1.5 rounded-xl border border-border/50">
                    <span className="text-foreground font-semibold">{payModal.tariff.name}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="line-through text-muted-foreground/70 decoration-2">{formatMoney(payModal.tariff.price, payModal.tariff.currency)}</span>
                    <span className="text-green-500 font-black px-2 py-0.5 bg-green-500/10 rounded-lg">
                      {formatMoney(getDiscountedPrice(payModal.tariff.price), payModal.tariff.currency)}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 bg-background/60 px-3 py-1.5 rounded-xl border border-border/50">
                    <span className="text-foreground font-semibold">{payModal.tariff.name}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="text-foreground font-black">{formatMoney(payModal.tariff.price, payModal.tariff.currency)}</span>
                  </div>
                )
              ) : ""}
            </DialogDescription>
          </DialogHeader>

          {/* Промокод */}
          <div className="bg-background/40 border border-border/50 rounded-2xl p-4 space-y-3 mb-4 transition-all duration-300 focus-within:border-primary/50 focus-within:bg-background/60 hover:border-primary/30">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Tag className="h-4 w-4 text-primary" />
              </div>
              Промокод
            </div>
            <div className="flex gap-2">
              <Input
                value={promoInput}
                onChange={(e) => { setPromoInput(e.target.value); if (promoResult) { setPromoResult(null); setPromoError(null); } }}
                placeholder="Введите промокод"
                className="font-mono text-sm font-medium bg-background border-border/50 h-12 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50 shadow-sm"
                disabled={payLoading || promoChecking}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={checkPromo}
                disabled={!promoInput.trim() || payLoading || promoChecking}
                className="shrink-0 h-12 px-5 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all hover:scale-105 active:scale-95 border-0"
              >
                {promoChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Применить"}
              </Button>
            </div>
            {promoResult && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-bold text-green-600">
                    {promoResult.name}: скидка {promoResult.discountPercent ? `${promoResult.discountPercent}%` : ""}{promoResult.discountFixed ? ` ${promoResult.discountFixed}` : ""}
                  </span>
                </div>
              </motion.div>
            )}
            {promoError && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <span className="text-sm font-bold text-destructive">
                    {promoError}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {/* Оплата балансом */}
            {payModal && client && (() => {
              const price = promoResult ? getDiscountedPrice(payModal.tariff.price) : payModal.tariff.price;
              const hasBalance = client.balance >= price;
              return (
                <Button
                  variant={hasBalance ? "default" : "secondary"}
                  className={`relative overflow-hidden justify-start gap-4 h-16 rounded-2xl px-5 transition-all duration-300 ${hasBalance ? "shadow-lg shadow-primary/20 hover:scale-[1.02] border border-primary/20" : "opacity-70 border border-border/50 bg-muted/50"}`}
                  disabled={payLoading || !hasBalance}
                  onClick={() => payByBalance(payModal.tariff)}
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
                      На счету: {formatMoney(client.balance, payModal.tariff.currency)}
                    </span>
                  </div>
                </Button>
              );
            })()}

            <div className="grid grid-cols-1 gap-2.5">
              {/* ЮMoney — только для тарифов в рублях */}
              {payModal && yoomoneyEnabled && payModal.tariff.currency.toUpperCase() === "RUB" && (
                <Button
                  variant="outline"
                  className="justify-start gap-4 h-14 rounded-2xl px-5 bg-background/50 hover:bg-background/80 border-border/50 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                  disabled={payLoading}
                  onClick={() => startYoomoneyPayment(payModal.tariff)}
                >
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    {payLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                  </div>
                  <span className="text-base font-bold text-foreground">ЮMoney — карта</span>
                </Button>
              )}

              {/* ЮKassa API — карта, СБП и др., только RUB */}
              {payModal && yookassaEnabled && payModal.tariff.currency.toUpperCase() === "RUB" && (
                <Button
                  variant="outline"
                  className="justify-start gap-4 h-14 rounded-2xl px-5 bg-background/50 hover:bg-background/80 border-border/50 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                  disabled={payLoading}
                  onClick={() => startYookassaPayment(payModal.tariff)}
                >
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    {payLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                  </div>
                  <span className="text-base font-bold text-foreground">ЮKassa — карта / СБП</span>
                </Button>
              )}

              {/* Crypto Pay (Crypto Bot) */}
              {payModal && cryptopayEnabled && (
                <Button
                  variant="outline"
                  className="justify-start gap-4 h-14 rounded-2xl px-5 bg-background/50 hover:bg-background/80 border-border/50 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                  disabled={payLoading}
                  onClick={() => startCryptopayPayment(payModal.tariff)}
                >
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    {payLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                  </div>
                  <span className="text-base font-bold text-foreground">Crypto Bot</span>
                </Button>
              )}

              {/* Heleket */}
              {payModal && heleketEnabled && (
                <Button
                  variant="outline"
                  className="justify-start gap-4 h-14 rounded-2xl px-5 bg-background/50 hover:bg-background/80 border-border/50 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                  disabled={payLoading}
                  onClick={() => startHeleketPayment(payModal.tariff)}
                >
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    {payLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                  </div>
                  <span className="text-base font-bold text-foreground">Heleket</span>
                </Button>
              )}

              {/* Platega */}
              {payModal && plategaMethods.map((m) => (
                <Button
                  key={m.id}
                  variant="outline"
                  className="justify-start gap-4 h-14 rounded-2xl px-5 bg-background/50 hover:bg-background/80 border-border/50 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
                  disabled={payLoading}
                  onClick={() => startPayment(payModal.tariff, m.id)}
                >
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    {payLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
                  </div>
                  <span className="text-base font-bold text-foreground">{m.label}</span>
                </Button>
              ))}
            </div>
          </div>
          {payError && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
              <p className="text-sm font-bold text-destructive text-center">{payError}</p>
            </motion.div>
          )}
          <DialogFooter className="mt-4 sm:justify-center border-t border-border/50 pt-4">
            <Button variant="ghost" className="h-12 rounded-xl px-8 font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full sm:w-auto transition-colors" onClick={() => { setPayModal(null); setPromoInput(""); setPromoResult(null); setPromoError(null); }} disabled={payLoading}>
              Отмена
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
