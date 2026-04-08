import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Package, Copy, Check, Loader2, Plus, X, Calendar, Clock, Send, Link as LinkIcon, CheckCircle2, Play, ShoppingCart, Mail, XCircle, Trash, History } from "lucide-react";
import { useClientAuth } from "@/contexts/client-auth";
import { useCabinetConfig } from "@/contexts/cabinet-config";
import { api, type PublicTariff, type PublicTariffCategory } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function formatMoney(amount: number, currency: string = "usd") {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currency.toUpperCase() === "USD" ? "USD" : currency.toUpperCase() === "RUB" ? "RUB" : "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "вчера";
  if (days < 7) return `${days} дн назад`;
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const HISTORY_EVENT_MAP: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  PURCHASED: { icon: <ShoppingCart className="w-4 h-4" />, label: "Подписка куплена", color: "bg-blue-500/15 text-blue-500" },
  ACTIVATED_SELF: { icon: <CheckCircle2 className="w-4 h-4" />, label: "Добавлена в профиль", color: "bg-green-500/15 text-green-500" },
  CODE_CREATED: { icon: <Gift className="w-4 h-4" />, label: "Подарочный код создан", color: "bg-purple-500/15 text-purple-500" },
  GIFT_SENT: { icon: <Send className="w-4 h-4" />, label: "Подарок отправлен", color: "bg-indigo-500/15 text-indigo-500" },
  GIFT_RECEIVED: { icon: <Mail className="w-4 h-4" />, label: "Подарок получен", color: "bg-emerald-500/15 text-emerald-500" },
  CODE_CANCELLED: { icon: <XCircle className="w-4 h-4" />, label: "Код отменён", color: "bg-red-500/15 text-red-500" },
  CODE_EXPIRED: { icon: <Clock className="w-4 h-4" />, label: "Код истёк", color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" },
  DELETED: { icon: <Trash className="w-4 h-4" />, label: "Подписка удалена", color: "bg-red-500/15 text-red-500" },
};

export function ClientGiftsPage() {
  const { state, refreshProfile } = useClientAuth();
  const config = useCabinetConfig();
  const token = state.token ?? null;
  const client = state.client;
  const currency = (client?.preferredCurrency ?? "usd").toLowerCase();

  // Data states
  const [subscriptions, setSubscriptions] = useState<Array<{ id: string; ownerId: string; remnawaveUuid: string | null; subscriptionIndex: number; tariffId: string | null; giftStatus: string | null; giftedToClientId: string | null; createdAt: string; updatedAt: string }>>([]);
  const [codes, setCodes] = useState<Array<{ id: string; code: string; status: string; expiresAt: string; createdAt: string; redeemedAt: string | null; giftMessage: string | null; secondarySubscriptionId: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<string>("subscriptions");

  // Buy Dialog State
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [tariffs, setTariffs] = useState<PublicTariff[]>([]);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  // Redeem state
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  // Interaction states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // History states
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; eventType: string; metadata: unknown; createdAt: string; secondarySubscriptionId: string | null }>>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const [subsRes, codesRes] = await Promise.all([
        api.giftListAllSubscriptions(token),
        api.giftListCodes(token),
      ]);
      setSubscriptions(subsRes.subscriptions || []);
      setCodes(codesRes.codes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchHistory = useCallback(async (page: number = 1) => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const res = await api.giftGetHistory(token, page, 10);
      setHistoryItems(res.items);
      setHistoryTotal(res.total);
      setHistoryPage(res.page);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory(historyPage);
    }
  }, [activeTab, historyPage, fetchHistory]);

  const loadTariffs = async () => {
    if (tariffs.length > 0) return;
    try {
      const res = await api.getPublicTariffs();
      const flat = (res?.items ?? []).flatMap((cat: PublicTariffCategory) => cat.tariffs);
      setTariffs(flat);
    } catch {
      // ignore
    }
  };

  const handleOpenBuy = () => {
    loadTariffs();
    setBuyError(null);
    setBuyDialogOpen(true);
  };

  const handleBuy = async (tariffId: string) => {
    if (!token) return;
    setBuyLoading(true);
    setBuyError(null);
    try {
      await api.giftBuySubscription(token, tariffId);
      await fetchData();
      refreshProfile().catch(() => {});
      setBuyDialogOpen(false);
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : "Ошибка покупки");
    } finally {
      setBuyLoading(false);
    }
  };

  const handleCreateCode = async (subscriptionId: string) => {
    if (!token) return;
    setActionLoading(`create-${subscriptionId}`);
    try {
      await api.giftCreateCode(token, subscriptionId);
      await fetchData();
      setActiveTab("codes");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка создания кода");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelCode = async (codeId: string) => {
    if (!token) return;
    if (!window.confirm("Точно отменить этот подарочный код?")) return;
    setActionLoading(`cancel-${codeId}`);
    try {
      await api.giftCancelCode(token, codeId);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка отмены кода");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !redeemCode.trim()) return;
    setRedeemLoading(true);
    setRedeemError(null);
    setRedeemSuccess(null);
    try {
      await api.giftRedeemCode(token, redeemCode.trim());
      setRedeemSuccess("Код успешно активирован!");
      setRedeemCode("");
      await fetchData();
      refreshProfile().catch(() => {});
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : "Ошибка активации");
    } finally {
      setRedeemLoading(false);
    }
  };

  const handleGetUrl = async (subscription: { id: string; giftStatus: string | null }) => {
    const subscriptionId = subscription.id;
    setActionLoading(`url-${subscriptionId}`);
    try {
      const activeCode = codes.find(
        (c) => c.secondarySubscriptionId === subscriptionId && c.status === "ACTIVE"
      );
      if (!activeCode) {
        if (subscription.giftStatus === "GIFTED") {
          alert("Эта подписка уже подарена. Ссылка недоступна.");
        } else {
          alert("Сначала создайте подарочный код кнопкой «Подарить», затем появится ссылка.");
        }
        return;
      }
      const appUrl =
        config?.publicAppUrl?.replace(/\/$/, "") ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const link = `${appUrl}/gift/${activeCode.code}`;
      await navigator.clipboard.writeText(link);
      setCopiedId(`url-${subscriptionId}`);
      setTimeout(() => setCopiedId(null), 2000);
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivateForSelf = async (subscriptionId: string) => {
    if (!token) return;
    setActionLoading(`activate-${subscriptionId}`);
    try {
      await api.giftActivateForSelf(token, subscriptionId);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка активации");
    } finally {
      setActionLoading(null);
    }
  };

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(`code-${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const maxSubs = config?.maxAdditionalSubscriptions ?? 5;
  const currentSubs = subscriptions.length;
  const canBuyMore = currentSubs < maxSubs;

  if (loading && subscriptions.length === 0 && codes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="min-w-0"
      >
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Подарки</h1>
        <p className="text-muted-foreground text-sm mt-1 truncate">
          Дарите VPN своим друзьям или близким
        </p>
      </motion.div>

      {error && (
        <div className="rounded-lg bg-destructive/15 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg bg-muted/40 p-1 border border-border/50 rounded-xl mb-6">
          <TabsTrigger value="subscriptions" className="rounded-lg text-xs sm:text-sm">Подписки</TabsTrigger>
          <TabsTrigger value="codes" className="rounded-lg text-xs sm:text-sm">Подарить</TabsTrigger>
          <TabsTrigger value="redeem" className="rounded-lg text-xs sm:text-sm">Получить</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-xs sm:text-sm">История</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-muted-foreground">
              У вас {currentSubs} из {maxSubs} доп. подписок
            </p>
            {canBuyMore && (
              <Button onClick={handleOpenBuy} size="sm" className="rounded-xl shadow-md gap-2" variant="secondary">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Купить ещё</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {subscriptions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="col-span-full p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-border/50 flex flex-col items-center justify-center text-center gap-3 bg-muted/20"
                >
                  <Package className="w-8 h-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">У вас пока нет дополнительных подписок.</p>
                  {canBuyMore && (
                    <Button onClick={handleOpenBuy} variant="outline" className="mt-2 rounded-xl">
                      Приобрести
                    </Button>
                  )}
                </motion.div>
              ) : (
                subscriptions.map((sub, i) => {
                  const isGifted = sub.giftStatus === "GIFTED";
                  const isReserved = sub.giftStatus === "GIFT_RESERVED";
                  return (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="flex flex-col p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-muted/40 border border-border/50 dark:bg-white/5 dark:border-white/5 transition-colors hover:bg-muted/60 dark:hover:bg-white/10"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/10 shadow-inner">
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground truncate">Подписка #{sub.subscriptionIndex}</h3>
                          <p className="text-xs text-muted-foreground">
                            {isGifted ? "Подарена (активна)" : isReserved ? "Код создан (ожидает)" : "Доступна"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-auto">
                        <div className="flex gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="flex-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-all border-none shadow-none"
                            onClick={() => handleGetUrl(sub)}
                            disabled={actionLoading === `url-${sub.id}`}
                          >
                            {actionLoading === `url-${sub.id}` ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : copiedId === `url-${sub.id}` ? <Check className="w-4 h-4 mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                            {copiedId === `url-${sub.id}` ? "Скопировано" : "Ссылка"}
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="flex-1 rounded-xl shadow-md gap-2"
                            onClick={() => handleCreateCode(sub.id)}
                            disabled={isGifted || isReserved || actionLoading === `create-${sub.id}`}
                          >
                            {actionLoading === `create-${sub.id}` ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gift className="w-4 h-4 mr-2" />}
                            <span className="truncate">{isGifted ? "Подарено" : isReserved ? "Код создан" : "Подарить"}</span>
                          </Button>
                        </div>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-all border-none shadow-none font-semibold"
                          onClick={() => handleActivateForSelf(sub.id)}
                          disabled={isGifted || actionLoading === `activate-${sub.id}`}
                        >
                          {actionLoading === `activate-${sub.id}` ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                          Активировать себе
                        </Button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {codes.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-border/50 flex flex-col items-center justify-center text-center gap-3 bg-muted/20"
                >
                  <Gift className="w-8 h-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Вы пока не создали ни одного подарочного кода.</p>
                </motion.div>
              ) : (
                codes.map((c, i) => {
                  const isActive = c.status === "ACTIVE";
                  const isRedeemed = c.status === "REDEEMED";
                  
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="relative p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] bg-muted/40 border border-border/50 dark:bg-white/5 dark:border-white/5 overflow-hidden flex flex-col sm:flex-row gap-4 items-start sm:items-center"
                    >
                      <div className="flex-1 min-w-0 w-full space-y-2">
                        <div className="flex items-center justify-between sm:justify-start gap-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${isActive ? 'bg-green-500/10 text-green-500' : isRedeemed ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                            {isActive ? "Активен" : isRedeemed ? "Активирован" : "Отменён"}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {new Date(c.createdAt).toLocaleDateString("ru-RU")}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <code className="text-lg sm:text-xl font-mono font-bold tracking-wider text-foreground bg-background/50 px-3 py-1.5 rounded-xl border border-border/50">{c.code}</code>
                          {isActive && (
                            <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 rounded-xl hover:bg-black/5 dark:hover:bg-white/10" onClick={() => copyCode(c.code, c.id)}>
                              {copiedId === `code-${c.id}` ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                            </Button>
                          )}
                        </div>
                      </div>

                      {isActive && (
                        <div className="w-full sm:w-auto mt-2 sm:mt-0">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="w-full sm:w-auto rounded-xl shadow-sm bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-none"
                            onClick={() => handleCancelCode(c.id)}
                            disabled={actionLoading === `cancel-${c.id}`}
                          >
                            {actionLoading === `cancel-${c.id}` ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                            Отменить
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="redeem" className="space-y-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] bg-muted/40 border border-border/50 dark:bg-white/5 dark:border-white/5 relative overflow-hidden max-w-xl mx-auto mt-8"
          >
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-[60px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-inner border border-primary/20">
                <Gift className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Активация подарка</h2>
              <p className="text-sm text-muted-foreground mt-1">
                У вас есть подарочный код? Введите его ниже, чтобы получить подписку.
              </p>
            </div>

            <form onSubmit={handleRedeem} className="relative z-10 space-y-4">
              <div className="relative">
                <Input 
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  placeholder="CODE-XXXX-XXXX"
                  className="h-14 text-center font-mono text-lg tracking-widest rounded-2xl border-primary/20 bg-background/50 focus-visible:ring-primary/30 uppercase"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-12 rounded-2xl shadow-lg shadow-primary/20 font-bold" 
                disabled={redeemLoading || !redeemCode.trim()}
              >
                {redeemLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                Активировать
              </Button>
            </form>

            <AnimatePresence>
              {redeemError && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4">
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium text-center">
                    {redeemError}
                  </div>
                </motion.div>
              )}
              {redeemSuccess && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4">
                  <div className="p-3 rounded-xl bg-green-500/10 text-green-500 text-sm font-medium text-center flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {redeemSuccess}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {historyLoading && historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Загрузка истории…</p>
            </div>
          ) : historyItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] border border-dashed border-border/50 flex flex-col items-center justify-center text-center gap-3 bg-muted/20"
            >
              <History className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">История пуста</p>
            </motion.div>
          ) : (
            <>
              <div className="space-y-3 pl-4 border-l-2 border-border/30 dark:border-white/10 ml-3">
                <AnimatePresence mode="popLayout">
                  {historyItems.map((item, i) => {
                    const ev = HISTORY_EVENT_MAP[item.eventType] ?? { icon: <Clock className="w-4 h-4" />, label: item.eventType, color: "bg-muted text-muted-foreground" };
                    const meta = item.metadata as Record<string, string> | null;
                    const timeAgo = formatTimeAgo(item.createdAt);

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.25, delay: i * 0.04 }}
                        className="relative -ml-[21px] flex items-start gap-3 group"
                      >
                        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm border border-border/50 dark:border-white/10 ${ev.color}`}>
                          {ev.icon}
                        </div>
                        <div className="flex-1 p-3 sm:p-4 rounded-xl bg-muted/40 border border-border/50 dark:bg-white/5 dark:border-white/5 transition-colors group-hover:bg-muted/60 dark:group-hover:bg-white/10">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">{ev.label}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo}</span>
                          </div>
                          {meta && Object.keys(meta).length > 0 && (
                            <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                              {meta.code && <span className="font-mono bg-background/50 px-1.5 py-0.5 rounded border border-border/30">{meta.code}</span>}
                              {meta.tariffName && <span className="ml-1">{meta.tariffName}</span>}
                              {meta.recipientUsername && <span className="ml-1">→ @{meta.recipientUsername}</span>}
                              {meta.senderUsername && <span className="ml-1">от @{meta.senderUsername}</span>}
                              {meta.giftMessage && (
                                <p className="italic opacity-70 mt-1 border-l-2 border-primary/30 pl-2">"{meta.giftMessage}"</p>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {historyTotal > 10 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl bg-muted/30 border-border/50"
                    disabled={historyPage <= 1 || historyLoading}
                    onClick={() => setHistoryPage((p) => p - 1)}
                  >
                    ← Назад
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {historyPage} / {Math.ceil(historyTotal / 10)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl bg-muted/30 border-border/50"
                    disabled={historyPage >= Math.ceil(historyTotal / 10) || historyLoading}
                    onClick={() => setHistoryPage((p) => p + 1)}
                  >
                    Вперед →
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Buy Dialog */}
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent className="max-w-md rounded-[2rem] sm:rounded-[2.5rem] p-0 overflow-hidden bg-background/80 backdrop-blur-3xl border-white/10" showCloseButton={false}>
          <div className="p-6 sm:p-8 space-y-6">
            <DialogHeader className="text-center sm:text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-2 shadow-inner border border-primary/20">
                <Plus className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold">Купить подписку в подарок</DialogTitle>
              <DialogDescription className="text-center">
                Выберите тариф для дополнительной подписки. Она будет оплачена с вашего баланса.
              </DialogDescription>
            </DialogHeader>

            {buyError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
                {buyError}
              </div>
            )}

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {tariffs.length === 0 ? (
                <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : (
                tariffs.map((t) => (
                  <div key={t.id} className="flex flex-col p-4 rounded-2xl border border-border/50 bg-background/50 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-foreground truncate">{t.name}</div>
                      <div className="font-bold text-primary shrink-0 ml-2">{formatMoney(t.price, currency)}</div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {t.durationDays} дн.</span>
                    </div>
                    <Button 
                      onClick={() => handleBuy(t.id)} 
                      disabled={buyLoading || (client?.balance ?? 0) < t.price}
                      className="w-full rounded-xl font-semibold shadow-md"
                    >
                      {buyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {(client?.balance ?? 0) < t.price ? "Недостаточно средств" : `Купить за ${formatMoney(t.price, currency)}`}
                    </Button>
                  </div>
                ))
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-col gap-2 pt-2 border-t border-white/10 mt-6">
              <div className="flex justify-between items-center w-full px-2 mb-2 text-sm">
                <span className="text-muted-foreground">Ваш баланс:</span>
                <span className="font-bold text-foreground">{formatMoney(client?.balance ?? 0, currency)}</span>
              </div>
              <Button variant="ghost" onClick={() => setBuyDialogOpen(false)} className="w-full rounded-xl">
                Отмена
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}