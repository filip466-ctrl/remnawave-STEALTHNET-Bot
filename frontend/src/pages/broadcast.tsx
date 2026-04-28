import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { api, type BroadcastResult, type BroadcastProgress, type BroadcastHistoryItem } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Send, Paperclip, X, MousePointerClick, Mail, MessageSquare, Loader2, AlertTriangle, CheckCircle2, History as HistoryIcon, Eye, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_ATTACHMENT_MB = 20;

const BUTTON_ACTIONS = [
  { value: "", label: "Без кнопки" },
  { value: "menu:tariffs", label: "📦 Тарифы" },
  { value: "menu:topup", label: "💳 Пополнить баланс" },
  { value: "menu:profile", label: "👤 Профиль" },
  { value: "menu:trial", label: "🎁 Бесплатный триал" },
  { value: "menu:referral", label: "🔗 Реферальная программа" },
  { value: "menu:promocode", label: "🎟️ Промокод" },
  { value: "menu:support", label: "🆘 Поддержка" },
  { value: "menu:vpn", label: "📋 VPN подключение" },
  { value: "menu:devices", label: "📱 Устройства" },
  { value: "menu:extra_options", label: "➕ Доп. опции" },
  { value: "menu:main", label: "📋 Главное меню" },
  { value: "webapp:/cabinet", label: "🌐 Web кабинет" },
  { value: "webapp:/cabinet/subscribe", label: "🌐 Страница подключения" },
  { value: "webapp:/cabinet/tickets", label: "🌐 Тикеты" },
  { value: "__custom_url__", label: "🔗 Своя ссылка (URL)" },
];

export function BroadcastPage() {
  const { state } = useAuth();
  const token = state.accessToken ?? "";
  const [broadcastRecipients, setBroadcastRecipients] = useState<{ withTelegram: number; withEmail: number } | null>(null);
  const [broadcastChannel, setBroadcastChannel] = useState<"telegram" | "email" | "both">("telegram");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastAttachment, setBroadcastAttachment] = useState<File | null>(null);
  const [broadcastButtonText, setBroadcastButtonText] = useState("");
  const [broadcastButtonAction, setBroadcastButtonAction] = useState("");
  const [broadcastButtonCustomUrl, setBroadcastButtonCustomUrl] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null);
  const [broadcastProgress, setBroadcastProgress] = useState<BroadcastProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (token) {
      api.broadcastRecipientsCount(token).then(setBroadcastRecipients).catch(() => setBroadcastRecipients(null));
    }
  }, [token]);

  async function handleBroadcastSend(e: React.FormEvent) {
    e.preventDefault();
    const text = broadcastMessage.trim();
    if (!text) return;
    if (broadcastAttachment && broadcastAttachment.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      setBroadcastResult({
        ok: false,
        sentTelegram: 0,
        sentEmail: 0,
        failedTelegram: 0,
        failedEmail: 0,
        errors: [`Файл не должен превышать ${MAX_ATTACHMENT_MB} МБ`],
      });
      return;
    }
    setBroadcastLoading(true);
    setBroadcastResult(null);
    setBroadcastProgress(null);
    try {
      const resolvedAction = broadcastButtonAction === "__custom_url__" ? broadcastButtonCustomUrl.trim() : broadcastButtonAction;
      // Фронтенд больше не ждёт окончания рассылки в одном HTTP-запросе
      // (для больших аудиторий упирались в таймаут) — бэкенд ставит задачу
      // в фон и отдаёт jobId, а дальше опрашиваем статус до завершения.
      const { jobId } = await api.broadcast(
        token,
        {
          channel: broadcastChannel,
          subject: broadcastSubject.trim() || undefined,
          message: text,
          buttonText: broadcastButtonText.trim() || undefined,
          buttonUrl: resolvedAction || undefined,
        },
        broadcastAttachment ?? undefined
      );
      const finalResult = await pollBroadcastJob(jobId);
      setBroadcastResult(finalResult);
      if (finalResult.ok) {
        setBroadcastMessage("");
        setBroadcastSubject("");
        setBroadcastAttachment(null);
        setBroadcastButtonText("");
        setBroadcastButtonAction("");
        setBroadcastButtonCustomUrl("");
        api.broadcastRecipientsCount(token).then(setBroadcastRecipients).catch(() => {});
      }
    } catch (err) {
      setBroadcastResult({
        ok: false,
        sentTelegram: 0,
        sentEmail: 0,
        failedTelegram: 0,
        failedEmail: 0,
        errors: [err instanceof Error ? err.message : "Ошибка отправки"],
      });
    } finally {
      setBroadcastLoading(false);
      setBroadcastProgress(null);
    }
  }

  async function pollBroadcastJob(jobId: string): Promise<BroadcastResult> {
    // Опрашиваем до получения статуса completed/error. Ставим мягкий таймаут
    // на 30 минут — для очень больших рассылок (60мс × тысячи TG + 200мс × email).
    const deadline = Date.now() + 30 * 60 * 1000;
    while (Date.now() < deadline) {
      try {
        const s = await api.broadcastStatus(token, jobId);
        if (s.progress) setBroadcastProgress(s.progress);
        if (s.status === "completed" && s.result) return s.result;
        if (s.status === "error") {
          return {
            ok: false,
            sentTelegram: s.progress?.sentTelegram ?? 0,
            sentEmail: s.progress?.sentEmail ?? 0,
            failedTelegram: s.progress?.failedTelegram ?? 0,
            failedEmail: s.progress?.failedEmail ?? 0,
            errors: [s.error || "Ошибка рассылки"],
          };
        }
      } catch {
        // сеть моргнула — повторим
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    return {
      ok: false,
      sentTelegram: 0,
      sentEmail: 0,
      failedTelegram: 0,
      failedEmail: 0,
      errors: ["Превышен таймаут опроса статуса. Рассылка, возможно, всё ещё идёт — проверьте позже."],
    };
  }

  return (
    <div className="space-y-5 px-4 sm:px-6 md:px-8 pt-6 pb-10 relative">
      <div className="fixed -z-10 bg-primary/15 blur-[120px] top-[-50px] left-[-50px] w-[300px] h-[300px] rounded-full pointer-events-none" />
      <div className="fixed -z-10 bg-purple-500/10 blur-[100px] top-[20%] right-[-50px] w-[250px] h-[250px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between bg-background/40 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-2xl"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center shadow-inner border border-white/10">
            <Send className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Рассылка
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Сообщения клиентам в Telegram и/или на email</p>
          </div>
        </div>
        {broadcastRecipients && (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <MessageSquare className="h-3.5 w-3.5" />
              Telegram: {broadcastRecipients.withTelegram}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Mail className="h-3.5 w-3.5" />
              Email: {broadcastRecipients.withEmail}
            </span>
          </div>
        )}
      </motion.div>

      <Tabs defaultValue="compose" className="w-full">
        <TabsList className="bg-background/40 backdrop-blur-3xl border border-white/10 rounded-2xl p-1">
          <TabsTrigger value="compose" className="rounded-xl">
            <Send className="h-4 w-4 mr-2" /> Отправить
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl">
            <HistoryIcon className="h-4 w-4 mr-2" /> История
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
      <Card className="bg-background/60 backdrop-blur-3xl border-white/10 rounded-[2rem] p-5 sm:p-6 shadow-xl">
        <form onSubmit={handleBroadcastSend} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Канал отправки</Label>
            <div className="flex items-center gap-1 bg-foreground/[0.03] dark:bg-white/[0.02] p-1 rounded-xl border border-white/5 w-fit">
              {(
                [
                  { value: "telegram", label: "Telegram", icon: MessageSquare },
                  { value: "email", label: "Email", icon: Mail },
                  { value: "both", label: "Telegram + Email", icon: Send },
                ] as const
              ).map((c) => {
                const Icon = c.icon;
                const isActive = broadcastChannel === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setBroadcastChannel(c.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-all flex items-center gap-1.5",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {(broadcastChannel === "email" || broadcastChannel === "both") && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Тема письма (для email)</Label>
              <Input
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                placeholder="Сообщение от сервиса"
                maxLength={500}
                className="max-w-md rounded-xl bg-foreground/[0.03] dark:bg-white/[0.02] border-white/10 focus-visible:ring-primary/50"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Текст сообщения (до 4096 символов)</Label>
            <textarea
              className="flex min-h-[140px] w-full rounded-xl border border-white/10 bg-foreground/[0.03] dark:bg-white/[0.02] px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Введите текст рассылки. Для Telegram поддерживается HTML."
              maxLength={4096}
              required
            />
            <p className="text-[11px] text-muted-foreground">{broadcastMessage.length} / 4096</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Изображение или файл (до {MAX_ATTACHMENT_MB} МБ)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(e) => setBroadcastAttachment(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
                Выбрать файл
              </Button>
              {broadcastAttachment && (
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium">
                  {broadcastAttachment.name}
                  <button
                    type="button"
                    className="text-primary/70 hover:text-primary"
                    onClick={() => setBroadcastAttachment(null)}
                    aria-label="Удалить вложение"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              В Telegram: фото — как фото с подписью, документы — как файлы. В email — вложение.
            </p>
          </div>

          {(broadcastChannel === "telegram" || broadcastChannel === "both") && (
            <div className="rounded-2xl border border-white/10 bg-foreground/[0.03] dark:bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MousePointerClick className="h-4 w-4 text-primary" />
                Кнопка под сообщением (только Telegram)
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Действие кнопки</Label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-white/10 bg-background/60 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    value={broadcastButtonAction}
                    onChange={(e) => setBroadcastButtonAction(e.target.value)}
                  >
                    {BUTTON_ACTIONS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>
                {broadcastButtonAction && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Текст кнопки</Label>
                    <Input
                      value={broadcastButtonText}
                      onChange={(e) => setBroadcastButtonText(e.target.value)}
                      placeholder="Открыть тарифы"
                      maxLength={64}
                      className="h-10 rounded-xl bg-background/60 border-white/10 focus-visible:ring-primary/50"
                    />
                  </div>
                )}
              </div>
              {broadcastButtonAction === "__custom_url__" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Ссылка (URL)</Label>
                  <Input
                    value={broadcastButtonCustomUrl}
                    onChange={(e) => setBroadcastButtonCustomUrl(e.target.value)}
                    placeholder="https://example.com/tariffs"
                    maxLength={500}
                    className="h-10 rounded-xl bg-background/60 border-white/10 focus-visible:ring-primary/50"
                  />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Под сообщением появится inline-кнопка с выбранным действием.
              </p>
            </div>
          )}

          <Button type="submit" disabled={broadcastLoading || !broadcastMessage.trim()} className="gap-2 rounded-xl">
            {broadcastLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {broadcastLoading ? "Рассылка идёт…" : "Отправить рассылку"}
          </Button>

          {broadcastLoading && broadcastProgress && !broadcastResult && (
            <BroadcastProgressPanel progress={broadcastProgress} />
          )}

          {broadcastResult && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "rounded-2xl border p-4 text-sm backdrop-blur-md",
                broadcastResult.ok
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400"
              )}
            >
              <div className="flex items-start gap-2">
                {broadcastResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                <div className="flex-1">
                  {broadcastResult.ok ? (
                    <p>Отправлено: Telegram <strong>{broadcastResult.sentTelegram}</strong>, Email <strong>{broadcastResult.sentEmail}</strong></p>
                  ) : (
                    <>
                      <p>Telegram: отправлено {broadcastResult.sentTelegram}, ошибок {broadcastResult.failedTelegram}. Email: отправлено {broadcastResult.sentEmail}, ошибок {broadcastResult.failedEmail}.</p>
                      {broadcastResult.errors.length > 0 && (
                        <ul className="mt-2 list-disc pl-4 text-foreground/70">
                          {broadcastResult.errors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {broadcastResult.errors.length > 5 && <li>…и ещё {broadcastResult.errors.length - 5}</li>}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </form>
      </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <BroadcastHistoryPanel token={token} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BroadcastProgressPanel({ progress }: { progress: BroadcastProgress }) {
  const tgDone = progress.sentTelegram + progress.failedTelegram;
  const emailDone = progress.sentEmail + progress.failedEmail;
  const tgPct = progress.totalTelegram > 0 ? Math.min(100, Math.round((tgDone / progress.totalTelegram) * 100)) : 0;
  const emailPct = progress.totalEmail > 0 ? Math.min(100, Math.round((emailDone / progress.totalEmail) * 100)) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm backdrop-blur-md space-y-3"
    >
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <p className="font-medium">
          Рассылка идёт{progress.currentChannel === "telegram" ? " — Telegram" : progress.currentChannel === "email" ? " — Email" : ""}…
        </p>
      </div>
      {progress.totalTelegram > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Telegram</span>
            <span>
              <strong className="text-foreground">{tgDone}</strong> / {progress.totalTelegram}
              {progress.failedTelegram > 0 && <span className="ml-2 text-amber-500">ошибок {progress.failedTelegram}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${tgPct}%` }}
            />
          </div>
        </div>
      )}
      {progress.totalEmail > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Email</span>
            <span>
              <strong className="text-foreground">{emailDone}</strong> / {progress.totalEmail}
              {progress.failedEmail > 0 && <span className="ml-2 text-amber-500">ошибок {progress.failedEmail}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${emailPct}%` }}
            />
          </div>
        </div>
      )}
      {progress.totalTelegram === 0 && progress.totalEmail === 0 && (
        <p className="text-xs text-muted-foreground">Подготавливаем получателей…</p>
      )}
    </motion.div>
  );
}

function statusBadge(status: BroadcastHistoryItem["status"]): { text: string; cls: string } {
  if (status === "completed") return { text: "Готово", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" };
  if (status === "running") return { text: "Идёт…", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" };
  return { text: "Ошибка", cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" };
}

function channelLabel(c: BroadcastHistoryItem["channel"]): string {
  if (c === "telegram") return "Telegram";
  if (c === "email") return "Email";
  return "TG + Email";
}

function BroadcastHistoryPanel({ token }: { token: string }) {
  const [items, setItems] = useState<BroadcastHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<BroadcastHistoryItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.getBroadcastHistory(token, 100, 0);
      setItems(r.items);
      setTotal(r.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card className="bg-background/60 backdrop-blur-3xl border-white/10 rounded-[2rem] p-5 sm:p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">История рассылок</h2>
          <p className="text-xs text-muted-foreground">Всего записей: {total}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Обновить
        </Button>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Загрузка…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Рассылок ещё не было</p>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/40">
                <th className="text-left py-2 px-3 font-medium">Дата</th>
                <th className="text-left py-2 px-3 font-medium">Канал</th>
                <th className="text-left py-2 px-3 font-medium">Статус</th>
                <th className="text-left py-2 px-3 font-medium">Telegram</th>
                <th className="text-left py-2 px-3 font-medium">Email</th>
                <th className="text-left py-2 px-3 font-medium">Текст</th>
                <th className="text-right py-2 px-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const b = statusBadge(it.status);
                const tgLine = it.totalTelegram > 0 ? `${it.sentTelegram}/${it.totalTelegram}${it.failedTelegram ? ` (${it.failedTelegram} fail)` : ""}` : "—";
                const emailLine = it.totalEmail > 0 ? `${it.sentEmail}/${it.totalEmail}${it.failedEmail ? ` (${it.failedEmail} fail)` : ""}` : "—";
                const preview = it.message.length > 60 ? it.message.slice(0, 60) + "…" : it.message;
                return (
                  <tr key={it.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="py-2 px-3 text-xs whitespace-nowrap">{new Date(it.startedAt).toLocaleString("ru-RU")}</td>
                    <td className="py-2 px-3 text-xs">{channelLabel(it.channel)}</td>
                    <td className="py-2 px-3">
                      <span className={cn("inline-flex px-2 py-0.5 rounded-md text-xs font-medium border", b.cls)}>{b.text}</span>
                    </td>
                    <td className="py-2 px-3 text-xs font-mono">{tgLine}</td>
                    <td className="py-2 px-3 text-xs font-mono">{emailLine}</td>
                    <td className="py-2 px-3 text-xs max-w-[300px] truncate text-foreground/80">{preview}</td>
                    <td className="py-2 px-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDetail(it)} className="h-7 px-2">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Рассылка от {detail && new Date(detail.startedAt).toLocaleString("ru-RU")}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border bg-muted/20">
                  <p className="text-[10px] uppercase text-muted-foreground">Канал</p>
                  <p className="font-medium">{channelLabel(detail.channel)}</p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/20">
                  <p className="text-[10px] uppercase text-muted-foreground">Статус</p>
                  <p className="font-medium">{statusBadge(detail.status).text}</p>
                </div>
                {detail.totalTelegram > 0 && (
                  <div className="p-3 rounded-lg border bg-muted/20">
                    <p className="text-[10px] uppercase text-muted-foreground">Telegram</p>
                    <p className="font-mono">{detail.sentTelegram} / {detail.totalTelegram}{detail.failedTelegram ? ` · ${detail.failedTelegram} fail` : ""}</p>
                  </div>
                )}
                {detail.totalEmail > 0 && (
                  <div className="p-3 rounded-lg border bg-muted/20">
                    <p className="text-[10px] uppercase text-muted-foreground">Email</p>
                    <p className="font-mono">{detail.sentEmail} / {detail.totalEmail}{detail.failedEmail ? ` · ${detail.failedEmail} fail` : ""}</p>
                  </div>
                )}
              </div>

              {detail.subject && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Тема (email)</p>
                  <p className="text-sm">{detail.subject}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase text-muted-foreground mb-1">Сообщение</p>
                <pre className="whitespace-pre-wrap break-words text-sm p-3 rounded-lg border bg-muted/20 max-h-72 overflow-y-auto">{detail.message}</pre>
              </div>

              {(detail.buttonText || detail.buttonUrl) && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Кнопка</p>
                  <p className="text-xs"><span className="font-medium">{detail.buttonText}</span> → <code className="text-muted-foreground">{detail.buttonUrl}</code></p>
                </div>
              )}

              {detail.attachmentName && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Вложение</p>
                  <p className="text-xs">{detail.attachmentName}</p>
                </div>
              )}

              {detail.error && (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                  Фатальная ошибка: {detail.error}
                </div>
              )}

              {detail.errors && detail.errors.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">Ошибки доставки ({detail.errors.length})</p>
                  <pre className="whitespace-pre-wrap text-xs p-3 rounded-lg border bg-red-500/5 border-red-500/20 max-h-48 overflow-y-auto text-red-600 dark:text-red-400">{detail.errors.join("\n")}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
