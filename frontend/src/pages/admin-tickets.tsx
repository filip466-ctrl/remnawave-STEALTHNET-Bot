import { useEffect, useState, type ChangeEvent } from "react";
import { useAuth } from "@/contexts/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  MessageSquare, Loader2, Send, ArrowLeft, Lock, Unlock,
  CircleDot, CircleCheck, RefreshCw, MessagesSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TicketListItem = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; email: string | null; telegramUsername: string | null };
};
type TicketMessage = { id: string; authorType: string; content: string; createdAt: string };

export function AdminTicketsPage() {
  const { state } = useAuth();
  const token = state.accessToken ?? "";

  const [list, setList] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    id: string;
    subject: string;
    status: string;
    client: { id: string; email: string | null; telegramUsername: string | null };
    messages: TicketMessage[];
    createdAt: string;
    updatedAt: string;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  const loadList = () => {
    if (!token) return;
    const status = filter === "open" || filter === "closed" ? filter : undefined;
    api
      .getAdminTickets(token, status)
      .then((r) => {
        setList(r.items);
        setLoading(false);
      })
      .catch(() => {
        setList([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    loadList();
    const intervalId = window.setInterval(loadList, 10000);
    return () => {
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filter]);

  useEffect(() => {
    if (!detailId || !token) {
      setDetail(null);
      return;
    }
    const loadDetail = () => {
      setDetailLoading(true);
      api
        .getAdminTicket(token, detailId)
        .then(setDetail)
        .catch(() => setDetail(null))
        .finally(() => setDetailLoading(false));
    };
    loadDetail();
    const intervalId = window.setInterval(loadDetail, 10000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [detailId, token]);

  const sendReply = () => {
    if (!token || !detailId || !replyText.trim()) return;
    setReplySending(true);
    api
      .postAdminTicketMessage(token, detailId, { content: replyText.trim() })
      .then((msg) => {
        setDetail((d) => (d ? { ...d, messages: [...d.messages, msg] } : d));
        setReplyText("");
      })
      .finally(() => setReplySending(false));
  };

  const toggleStatus = () => {
    if (!token || !detail) return;
    const next = detail.status === "open" ? "closed" : "open";
    api.patchAdminTicket(token, detail.id, { status: next }).then(() => {
      setDetail((d) => (d ? { ...d, status: next } : d));
      setList((prev) => prev.map((t) => (t.id === detail.id ? { ...t, status: next } : t)));
    });
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return s;
    }
  };

  /* ── Detail view ── */
  if (detailId && detail) {
    const isOpen = detail.status === "open";
    const clientLabel = detail.client.email ?? (detail.client.telegramUsername ? `@${detail.client.telegramUsername}` : detail.client.id);
    return (
      <div className="space-y-5 px-4 sm:px-6 md:px-8 pt-6 pb-10 relative">
        <div className="fixed -z-10 bg-primary/15 blur-[120px] top-[-50px] left-[-50px] w-[300px] h-[300px] rounded-full pointer-events-none" />
        <div className="fixed -z-10 bg-purple-500/10 blur-[100px] top-[20%] right-[-50px] w-[250px] h-[250px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-background/40 backdrop-blur-3xl border border-white/10 p-5 rounded-[2rem] shadow-2xl"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => { setDetailId(null); setDetail(null); }} className="rounded-full hover:bg-white/10 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center shadow-inner border border-white/10 shrink-0">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 truncate">
                {detail.subject}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {clientLabel} · обновлён {formatDate(detail.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border backdrop-blur-md",
              isOpen
                ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20"
                : "bg-muted/40 text-muted-foreground border-white/10"
            )}>
              {isOpen ? <CircleDot className="h-3.5 w-3.5" /> : <CircleCheck className="h-3.5 w-3.5" />}
              {isOpen ? "Открыт" : "Закрыт"}
            </span>
            <Button variant="outline" size="sm" onClick={toggleStatus} className="gap-1.5">
              {isOpen ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {isOpen ? "Закрыть" : "Открыть"}
            </Button>
          </div>
        </motion.div>

        <Card className="bg-background/60 backdrop-blur-3xl border-white/10 rounded-[2rem] shadow-xl p-5 sm:p-6 space-y-4">
          <div className="space-y-3">
            {detail.messages.map((m, i) => {
              const isSupport = m.authorType === "support";
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm border backdrop-blur-md",
                    isSupport
                      ? "bg-primary/10 border-primary/20 ml-0 sm:ml-8"
                      : "bg-foreground/[0.03] dark:bg-white/[0.02] border-white/10 mr-0 sm:mr-8"
                  )}
                >
                  <div className="flex justify-between gap-2 text-[11px] mb-1.5">
                    <span className={cn("font-semibold", isSupport ? "text-primary" : "text-muted-foreground")}>
                      {isSupport ? "Поддержка" : "Клиент"}
                    </span>
                    <span className="text-muted-foreground/80">{formatDate(m.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </motion.div>
              );
            })}
          </div>
          {isOpen && (
            <div className="flex flex-col gap-2 pt-3 border-t border-white/10">
              <Label htmlFor="admin-reply" className="text-xs text-muted-foreground">Ответ поддержки</Label>
              <Textarea
                id="admin-reply"
                placeholder="Введите ответ…"
                value={replyText}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value)}
                rows={3}
                className="resize-none rounded-xl bg-foreground/[0.03] dark:bg-white/[0.02] border-white/10 focus-visible:ring-primary/50"
              />
              <div className="flex justify-end">
                <Button onClick={sendReply} disabled={replySending || !replyText.trim()} size="sm" className="gap-2">
                  {replySending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Отправить
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (detailId && detailLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <Button variant="ghost" size="sm" onClick={() => setDetailId(null)}>К списку</Button>
      </div>
    );
  }

  /* ── List view ── */
  const openCount = list.filter((t) => t.status === "open").length;

  return (
    <div className="space-y-5 px-4 sm:px-6 md:px-8 pt-6 pb-10 relative">
      <div className="fixed -z-10 bg-primary/15 blur-[120px] top-[-50px] left-[-50px] w-[300px] h-[300px] rounded-full pointer-events-none" />
      <div className="fixed -z-10 bg-purple-500/10 blur-[100px] top-[20%] right-[-50px] w-[250px] h-[250px] rounded-full pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between bg-background/40 backdrop-blur-3xl border border-white/10 p-6 rounded-[2rem] shadow-2xl"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center shadow-inner border border-white/10">
            <MessagesSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Тикеты
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary border border-primary/20 backdrop-blur-md">
                Всего: {list.length}
              </span>
              {openCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 px-2.5 py-0.5 text-[11px] font-medium border border-emerald-500/20 backdrop-blur-md">
                  <CircleDot className="h-3 w-3" /> Открытых: {openCount}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={loadList} disabled={loading} className="rounded-full hover:bg-white/10">
          <RefreshCw className={cn("h-4 w-4 text-muted-foreground", loading && "animate-spin text-primary")} />
        </Button>
      </motion.div>

      {/* Filters */}
      <Card className="bg-background/60 backdrop-blur-3xl border-white/10 rounded-[2rem] p-4 shadow-xl">
        <div className="flex items-center gap-2 bg-foreground/[0.03] dark:bg-white/[0.02] p-1 rounded-xl border border-white/5 w-fit">
          {(["all", "open", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                filter === f
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {f === "all" ? "Все" : f === "open" ? "Открытые" : "Закрытые"}
            </button>
          ))}
        </div>
      </Card>

      {/* List */}
      {loading ? (
        <Card className="bg-background/60 backdrop-blur-3xl border-white/10 rounded-[2rem] py-16 shadow-xl flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Загружаем тикеты...</p>
        </Card>
      ) : list.length === 0 ? (
        <Card className="bg-background/60 backdrop-blur-3xl border-white/10 rounded-[2rem] py-16 shadow-xl flex flex-col items-center text-center gap-3">
          <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Нет тикетов</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((t, i) => {
            const isOpen = t.status === "open";
            const clientLabel = t.client.email ?? (t.client.telegramUsername ? `@${t.client.telegramUsername}` : t.client.id);
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025 }}
                whileHover={{ y: -2 }}
              >
                <Card
                  onClick={() => setDetailId(t.id)}
                  className={cn(
                    "relative overflow-hidden cursor-pointer bg-background/60 backdrop-blur-3xl border-white/10 rounded-2xl p-4 shadow-lg hover:shadow-xl hover:border-white/20 transition-all duration-300",
                  )}
                >
                  {/* Left accent bar */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-gradient-to-b",
                    isOpen ? "from-emerald-500 to-emerald-500/30" : "from-muted-foreground/40 to-transparent"
                  )} />
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border",
                      isOpen
                        ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-muted/40 text-muted-foreground border-white/10"
                    )}>
                      {isOpen ? <CircleDot className="h-4 w-4" /> : <CircleCheck className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{t.subject}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                        <span className="truncate max-w-[200px]">{clientLabel}</span>
                        <span>·</span>
                        <span>{formatDate(t.updatedAt)}</span>
                      </div>
                    </div>
                    <span className="text-muted-foreground/40 shrink-0">→</span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
