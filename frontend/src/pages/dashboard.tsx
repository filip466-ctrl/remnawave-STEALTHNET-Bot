import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  TrendingUp,
  Server,
  DollarSign,
  UserPlus,
  Activity,
  Loader2,
  Power,
  PowerOff,
  RotateCw,
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  Globe,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { DashboardStats, RemnaNode, RemnaNodesResponse, ServerStats } from "@/lib/api";
import { useAuth } from "@/contexts/auth";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

/* ── Animation variants ── */

const cardVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

/* ── Utility functions (preserved) ── */

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return "—";
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + " GB";
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB";
  return bytes + " B";
}

function formatNodeCpuRam(cpuCount: number | null | undefined, totalRam: string | null | undefined): string {
  const cpu = cpuCount != null ? String(cpuCount) : "—";
  const ram = totalRam?.trim() || "—";
  return `${cpu} / ${ram}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}д ${hours}ч ${mins}м`;
  if (hours > 0) return `${hours}ч ${mins}м`;
  return `${mins}м`;
}

function formatGb(bytes: number): string {
  return (bytes / 1024 ** 3).toFixed(1) + " GB";
}

function usageColor(percent: number): string {
  if (percent >= 90) return "text-red-500";
  if (percent >= 70) return "text-amber-500";
  return "text-emerald-500";
}

function canAccessRemnaNodes(role: string, allowedSections: string[] | undefined): boolean {
  if (role === "ADMIN") return true;
  return Array.isArray(allowedSections) && allowedSections.includes("remna-nodes");
}

/* ── Ring gauge color helpers ── */

function ringStrokeColor(percent: number): string {
  if (percent >= 90) return "#ef4444";
  if (percent >= 70) return "#f59e0b";
  return "#22c55e";
}

function ringBgClass(percent: number): string {
  if (percent >= 90) return "bg-red-500/10";
  if (percent >= 70) return "bg-amber-500/10";
  return "bg-emerald-500/10";
}

/* ── CountUp Hook ── */

function useCountUp(target: number, duration = 1500): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    startRef.current = null;
    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

/* ── CountUp component for formatted money ── */

function CountUpMoney({ value, currency }: { value: number; currency: string }) {
  const animated = useCountUp(value);
  return <>{formatMoney(animated, currency)}</>;
}

function CountUpNumber({ value }: { value: number }) {
  const animated = useCountUp(value);
  return <>{animated.toLocaleString()}</>;
}

/* ── Animated Ring Gauge ── */

function RingGauge({
  percent,
  size = 120,
  strokeWidth = 10,
  label,
  detail,
  icon: Icon,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeColor = ringStrokeColor(percent);
  const bgClass = ringBgClass(percent);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative rounded-2xl p-4 ${bgClass} transition-colors duration-500`}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-muted-foreground/10"
            strokeWidth={strokeWidth}
          />
          {/* Animated arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - (circumference * percent) / 100 }}
            transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={`text-2xl font-bold tabular-nums ${usageColor(percent)}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            {percent}%
          </motion.span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </div>
      <p className="text-xs text-muted-foreground text-center max-w-[140px] truncate" title={detail}>
        {detail}
      </p>
    </div>
  );
}

/* ── Sparkline Mini Chart ── */

function Sparkline({
  data,
  color,
  height = 48,
  width = 120,
}: {
  data: { v: number }[];
  color: string;
  height?: number;
  width?: number;
}) {
  const gradientId = `spark-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={true}
          animationDuration={1200}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Pulsing Status Dot ── */

function StatusDot({ isConnected, isConnecting, isDisabled }: { isConnected: boolean; isConnecting: boolean; isDisabled: boolean }) {
  if (isDisabled) {
    return (
      <span className="relative flex h-3 w-3">
        <span className="h-3 w-3 rounded-full bg-gray-400" />
      </span>
    );
  }
  if (isConnecting) {
    return (
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-50" style={{ animationDuration: "2s" }} />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
      </span>
    );
  }
  if (isConnected) {
    return (
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
      </span>
    );
  }
  return (
    <span className="relative flex h-3 w-3">
      <span className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
    </span>
  );
}

/* ── Section Header ── */

function SectionHeader({
  icon: Icon,
  iconBg,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`flex items-center justify-center h-10 w-10 rounded-xl ${iconBg}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

/* ── Stat Card with icon background ── */

function StatCard({
  index,
  icon: Icon,
  iconBg,
  title,
  value,
  subtitle,
  sparkData,
  sparkColor,
}: {
  index: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  title: string;
  value: React.ReactNode;
  subtitle: string;
  sparkData?: { v: number }[];
  sparkColor?: string;
}) {
  return (
    <motion.div custom={index} variants={cardVariants} initial="hidden" animate="visible">
      <Card className="group hover:shadow-lg hover:shadow-black/5 transition-all duration-300 hover:scale-[1.02]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className={`flex items-center justify-center h-8 w-8 rounded-lg ${iconBg}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-2xl font-bold tabular-nums">{value}</div>
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            </div>
            {sparkData && sparkColor && (
              <div className="opacity-70 group-hover:opacity-100 transition-opacity">
                <Sparkline data={sparkData} color={sparkColor} height={40} width={80} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Traffic Progress Bar ── */

function TrafficBar({ used, limit }: { used: number | null | undefined; limit: number | null | undefined }) {
  if (limit == null || limit === 0) {
    return <span className="text-xs tabular-nums text-muted-foreground">{formatBytes(used)}</span>;
  }
  const usedVal = used ?? 0;
  const percent = Math.min((usedVal / limit) * 100, 100);
  const barColor =
    percent >= 90 ? "from-red-500 to-red-400" : percent >= 70 ? "from-amber-500 to-amber-400" : "from-emerald-500 to-teal-400";
  return (
    <div className="space-y-1 min-w-[100px]">
      <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
        />
      </div>
      <p className="text-xs tabular-nums text-muted-foreground">
        {formatBytes(usedVal)} / {formatBytes(limit)}
      </p>
    </div>
  );
}

/* ── Mini Bar for analytics ── */

function MiniBar({ value, maxValue, color }: { value: number; maxValue: number; color: string }) {
  const percent = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden mt-1.5">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 1, ease: "easeOut", delay: 0.8 }}
      />
    </div>
  );
}

/* ── Build sparkline dataset from 4 data points ── */

function buildSparkData(today: number, d7: number, d30: number, total: number): { v: number }[] {
  const base = total - d30;
  return [
    { v: Math.max(base, 0) },
    { v: Math.max(total - d30 + (d30 - d7) * 0.3, 0) },
    { v: Math.max(d30 - d7, 0) + Math.max(base, 0) },
    { v: Math.max(total - d7, 0) },
    { v: Math.max(d7 - today, 0) + Math.max(total - d7, 0) },
    { v: total },
  ];
}

/* ═══════════════════════════════════════════════════════════════ */
/*                      MAIN COMPONENT                            */
/* ═══════════════════════════════════════════════════════════════ */

export function DashboardPage() {
  const { state } = useAuth();
  const token = state.accessToken ?? null;
  const admin = state.admin;
  const hasRemnaNodesAccess = admin ? canAccessRemnaNodes(admin.role, admin.allowedSections) : false;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [nodes, setNodes] = useState<RemnaNode[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState<string>("USD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodeActionUuid, setNodeActionUuid] = useState<string | null>(null);

  const refetchNodes = useCallback(async () => {
    if (!token || !hasRemnaNodesAccess) return;
    const data = (await api.getRemnaNodes(token).catch(() => ({ response: [] }))) as RemnaNodesResponse;
    setNodes(Array.isArray(data?.response) ? data.response : []);
  }, [token, hasRemnaNodesAccess]);

  const handleNodeAction = useCallback(
    async (nodeUuid: string, action: "enable" | "disable" | "restart") => {
      if (!token || !hasRemnaNodesAccess) return;
      setNodeActionUuid(nodeUuid);
      try {
        if (action === "enable") await api.remnaNodeEnable(token, nodeUuid);
        else if (action === "disable") await api.remnaNodeDisable(token, nodeUuid);
        else await api.remnaNodeRestart(token, nodeUuid);
        await refetchNodes();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка действия с нодой");
      } finally {
        setNodeActionUuid(null);
      }
    },
    [token, hasRemnaNodesAccess, refetchNodes]
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const statsP = api.getDashboardStats(token!);
        const nodesP = hasRemnaNodesAccess
          ? api.getRemnaNodes(token!).catch(() => ({ response: [] }))
          : Promise.resolve(null);
        const settingsP = api.getSettings(token!).catch(() => null);
        const serverP = api.getServerStats(token!).catch(() => null);
        const [statsRes, nodesRes, settingsRes, serverRes] = await Promise.all([statsP, nodesP, settingsP, serverP]);
        if (cancelled) return;
        setStats(statsRes);
        setServerStats(serverRes);
        if (nodesRes != null) {
          const data = nodesRes as RemnaNodesResponse;
          setNodes(Array.isArray(data?.response) ? data.response : []);
        } else {
          setNodes([]);
        }
        const curr = settingsRes?.defaultCurrency;
        setDefaultCurrency(curr ? String(curr).toUpperCase() : "USD");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token, hasRemnaNodesAccess]);

  /* ── Loading state ── */
  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /* ── Sparkline datasets ── */
  const salesSparkTotal = stats
    ? buildSparkData(stats.sales.todayAmount, stats.sales.last7DaysAmount, stats.sales.last30DaysAmount, stats.sales.totalAmount)
    : [];
  const salesSparkToday = stats ? [{ v: 0 }, { v: stats.sales.todayAmount * 0.3 }, { v: stats.sales.todayAmount * 0.7 }, { v: stats.sales.todayAmount }] : [];
  const salesSpark7d = stats
    ? buildSparkData(stats.sales.todayAmount, stats.sales.todayAmount, stats.sales.last7DaysAmount, stats.sales.last7DaysAmount)
    : [];
  const salesSpark30d = stats
    ? buildSparkData(stats.sales.todayAmount, stats.sales.last7DaysAmount, stats.sales.last30DaysAmount, stats.sales.last30DaysAmount)
    : [];

  /* ── Analytics max values ── */
  const analyticsMaxUsers = Math.max(stats?.users.newToday ?? 0, stats?.users.newLast7Days ?? 0, stats?.users.newLast30Days ?? 0, 1);
  const analyticsMaxSales = Math.max(stats?.sales.todayAmount ?? 0, stats?.sales.last7DaysAmount ?? 0, stats?.sales.last30DaysAmount ?? 0, 1);

  /* ── Nodes online/total ── */
  const nodesOnline = nodes.filter((n) => n.isConnected && !n.isDisabled).length;
  const nodesTotal = nodes.length;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground">Статистика пользователей, продажи, аналитика, ноды Remna</p>
      </motion.div>

      {/* Manager warning */}
      {admin?.role === "MANAGER" && (!admin.allowedSections || admin.allowedSections.length === 0) && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          У вас нет доступа ни к одному разделу. Обратитесь к администратору.
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ═══ Users Section ═══ */}
      <section>
        <SectionHeader icon={Users} iconBg="bg-blue-600" title="Пользователи" subtitle="Статистика клиентской базы" />
        <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" variants={staggerContainer} initial="hidden" animate="visible">
          <StatCard
            index={0}
            icon={Users}
            iconBg="bg-blue-500/20 dark:bg-blue-500/30"
            title="Всего пользователей"
            value={stats ? <CountUpNumber value={stats.users.total} /> : "—"}
            subtitle="Клиенты панели"
          />
          <StatCard
            index={1}
            icon={Shield}
            iconBg="bg-violet-500/20 dark:bg-violet-500/30"
            title="Привязано к Remna"
            value={stats ? <CountUpNumber value={stats.users.withRemna} /> : "—"}
            subtitle="С remnawaveUuid"
          />
          <StatCard
            index={2}
            icon={UserPlus}
            iconBg="bg-emerald-500/20 dark:bg-emerald-500/30"
            title="Новых сегодня"
            value={stats ? <CountUpNumber value={stats.users.newToday} /> : "—"}
            subtitle="Регистрации за день"
          />
          <StatCard
            index={3}
            icon={TrendingUp}
            iconBg="bg-amber-500/20 dark:bg-amber-500/30"
            title="Новых за 30 дней"
            value={stats ? <CountUpNumber value={stats.users.newLast30Days} /> : "—"}
            subtitle="Регистрации"
          />
        </motion.div>
      </section>

      {/* ═══ Sales Section ═══ */}
      <section>
        <SectionHeader icon={DollarSign} iconBg="bg-emerald-600" title="Статистика продаж" subtitle="Поступления и платежи" />
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4}>
          <Card className="hover:shadow-lg hover:shadow-black/5 transition-all duration-300">
            <CardContent className="pt-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total revenue */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Всего поступления</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {stats ? <CountUpMoney value={stats.sales.totalAmount} currency={defaultCurrency} /> : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{stats?.sales.totalCount ?? 0} платежей с платёжек (без оплаты с баланса)</p>
                    </div>
                    <Sparkline data={salesSparkTotal} color="#22c55e" height={48} width={100} />
                  </div>
                </div>
                {/* Today */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">За сегодня</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {stats ? <CountUpMoney value={stats.sales.todayAmount} currency={defaultCurrency} /> : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{stats?.sales.todayCount ?? 0} платежей</p>
                    </div>
                    <Sparkline data={salesSparkToday} color="#3b82f6" height={48} width={100} />
                  </div>
                </div>
                {/* 7 days */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">За 7 дней</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {stats ? <CountUpMoney value={stats.sales.last7DaysAmount} currency={defaultCurrency} /> : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{stats?.sales.last7DaysCount ?? 0} платежей</p>
                    </div>
                    <Sparkline data={salesSpark7d} color="#8b5cf6" height={48} width={100} />
                  </div>
                </div>
                {/* 30 days */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">За 30 дней</p>
                      <p className="text-xl font-semibold tabular-nums">
                        {stats ? <CountUpMoney value={stats.sales.last30DaysAmount} currency={defaultCurrency} /> : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{stats?.sales.last30DaysCount ?? 0} платежей</p>
                    </div>
                    <Sparkline data={salesSpark30d} color="#f59e0b" height={48} width={100} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* ═══ Analytics Section ═══ */}
      <section>
        <SectionHeader icon={Activity} iconBg="bg-violet-600" title="Аналитика" subtitle="Ключевые метрики за периоды" />
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={5}>
          <Card className="hover:shadow-lg hover:shadow-black/5 transition-all duration-300">
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <div className="rounded-xl border bg-muted/40 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Новые (сегодня)</p>
                  <p className="text-lg font-medium tabular-nums">
                    {stats ? <CountUpNumber value={stats.users.newToday} /> : "—"}
                  </p>
                  <MiniBar value={stats?.users.newToday ?? 0} maxValue={analyticsMaxUsers} color="#3b82f6" />
                </div>
                <div className="rounded-xl border bg-muted/40 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Новые (7 дн.)</p>
                  <p className="text-lg font-medium tabular-nums">
                    {stats ? <CountUpNumber value={stats.users.newLast7Days} /> : "—"}
                  </p>
                  <MiniBar value={stats?.users.newLast7Days ?? 0} maxValue={analyticsMaxUsers} color="#8b5cf6" />
                </div>
                <div className="rounded-xl border bg-muted/40 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Новые (30 дн.)</p>
                  <p className="text-lg font-medium tabular-nums">
                    {stats ? <CountUpNumber value={stats.users.newLast30Days} /> : "—"}
                  </p>
                  <MiniBar value={stats?.users.newLast30Days ?? 0} maxValue={analyticsMaxUsers} color="#6366f1" />
                </div>
                <div className="rounded-xl border bg-muted/40 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Продажи (сегодня)</p>
                  <p className="text-lg font-medium tabular-nums">
                    {stats ? <CountUpMoney value={stats.sales.todayAmount} currency={defaultCurrency} /> : "—"}
                  </p>
                  <MiniBar value={stats?.sales.todayAmount ?? 0} maxValue={analyticsMaxSales} color="#22c55e" />
                </div>
                <div className="rounded-xl border bg-muted/40 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Продажи (7 дн.)</p>
                  <p className="text-lg font-medium tabular-nums">
                    {stats ? <CountUpMoney value={stats.sales.last7DaysAmount} currency={defaultCurrency} /> : "—"}
                  </p>
                  <MiniBar value={stats?.sales.last7DaysAmount ?? 0} maxValue={analyticsMaxSales} color="#14b8a6" />
                </div>
                <div className="rounded-xl border bg-muted/40 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Продажи (30 дн.)</p>
                  <p className="text-lg font-medium tabular-nums">
                    {stats ? <CountUpMoney value={stats.sales.last30DaysAmount} currency={defaultCurrency} /> : "—"}
                  </p>
                  <MiniBar value={stats?.sales.last30DaysAmount ?? 0} maxValue={analyticsMaxSales} color="#f59e0b" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      {/* ═══ Server Monitoring Section ═══ */}
      {serverStats && (
        <section>
          <SectionHeader icon={Server} iconBg="bg-cyan-600" title="Сервер" subtitle={`${serverStats.hostname} — ${serverStats.platform} (${serverStats.arch})`} />
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={6}>
            <Card className="hover:shadow-lg hover:shadow-black/5 transition-all duration-300">
              <CardContent className="pt-6">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Ring Gauges */}
                  <div className="flex justify-center">
                    <RingGauge
                      percent={serverStats.cpu.usagePercent}
                      label="CPU"
                      detail={`${serverStats.cpu.cores} ядер`}
                      icon={Cpu}
                    />
                  </div>
                  <div className="flex justify-center">
                    <RingGauge
                      percent={serverStats.memory.usagePercent}
                      label="RAM"
                      detail={`${formatGb(serverStats.memory.usedBytes)} / ${formatGb(serverStats.memory.totalBytes)}`}
                      icon={MemoryStick}
                    />
                  </div>
                  {serverStats.disk ? (
                    <div className="flex justify-center">
                      <RingGauge
                        percent={serverStats.disk.usagePercent}
                        label="Диск"
                        detail={`${formatGb(serverStats.disk.usedBytes)} / ${formatGb(serverStats.disk.totalBytes)}`}
                        icon={HardDrive}
                      />
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <div className="flex flex-col items-center gap-2 opacity-30">
                        <div className="rounded-2xl p-4 bg-muted/20">
                          <svg width={120} height={120}>
                            <circle cx={60} cy={60} r={50} fill="none" stroke="currentColor" className="text-muted-foreground/10" strokeWidth={10} />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">—</span>
                          </div>
                        </div>
                        <span className="text-sm font-medium flex items-center gap-1.5">
                          <HardDrive className="h-4 w-4 text-muted-foreground" />
                          Диск
                        </span>
                        <p className="text-xs text-muted-foreground">Нет данных</p>
                      </div>
                    </div>
                  )}
                  {/* Uptime */}
                  <div className="flex justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-2xl p-4 bg-blue-500/10 transition-colors duration-500">
                        <div className="relative w-[120px] h-[120px] flex items-center justify-center">
                          <motion.div
                            className="text-center"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6, duration: 0.4 }}
                          >
                            <Clock className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                            <span className="text-xl font-bold tabular-nums block">
                              {formatUptime(serverStats.uptimeSeconds)}
                            </span>
                          </motion.div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        Uptime
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Load: {serverStats.loadAvg.join(" / ")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>
      )}

      {/* ═══ Remna Nodes Section ═══ */}
      <section>
        <SectionHeader
          icon={Globe}
          iconBg="bg-indigo-600"
          title="Ноды Remna"
          subtitle={hasRemnaNodesAccess && nodes.length > 0 ? `${nodesOnline} из ${nodesTotal} онлайн` : "Статус, трафик, CPU/RAM, онлайн пользователей"}
        />
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={7}>
          {!hasRemnaNodesAccess ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-muted-foreground text-sm text-center">
                  Нет доступа к управлению нодами Remna. Обратитесь к администратору для получения раздела «Ноды Remna».
                </p>
              </CardContent>
            </Card>
          ) : nodes.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-muted-foreground text-sm text-center">
                  Ноды не загружены или Remna API не настроен. Проверьте настройки и подключение к Remna.
                </p>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {nodes.map((node, idx) => {
                const isBusy = nodeActionUuid === node.uuid;
                const statusLabel = node.isDisabled
                  ? "Отключена"
                  : node.isConnecting
                    ? "Подключение…"
                    : node.isConnected
                      ? "Онлайн"
                      : "Офлайн";
                const statusColor = node.isDisabled
                  ? "text-gray-400"
                  : node.isConnecting
                    ? "text-amber-500"
                    : node.isConnected
                      ? "text-emerald-500"
                      : "text-red-500";

                return (
                  <motion.div key={node.uuid} custom={idx + 8} variants={cardVariants}>
                    <Card className="group hover:shadow-lg hover:shadow-black/5 transition-all duration-300 hover:scale-[1.01]">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <StatusDot isConnected={node.isConnected} isConnecting={node.isConnecting} isDisabled={node.isDisabled} />
                            <CardTitle className="text-base font-semibold truncate max-w-[180px]">
                              {node.name || node.uuid}
                            </CardTitle>
                          </div>
                          <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                        </div>
                        <CardDescription className="font-mono text-xs mt-1">
                          {node.address}{node.port != null ? `:${node.port}` : ""}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Traffic */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Трафик</p>
                          <TrafficBar used={node.trafficUsedBytes} limit={node.trafficLimitBytes} />
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">CPU / RAM</p>
                            <p className="text-sm font-medium tabular-nums">{formatNodeCpuRam(node.cpuCount, node.totalRam)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Онлайн юзеров</p>
                            <p className="text-sm font-medium tabular-nums flex items-center gap-1.5">
                              {node.usersOnline != null ? (
                                <>
                                  <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                                  {node.usersOnline}
                                </>
                              ) : (
                                <>
                                  <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                                  —
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {node.isDisabled ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              disabled={isBusy}
                              onClick={() => handleNodeAction(node.uuid, "enable")}
                            >
                              {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Power className="h-3 w-3" />}
                              Включить
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              disabled={isBusy}
                              onClick={() => handleNodeAction(node.uuid, "disable")}
                            >
                              {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <PowerOff className="h-3 w-3" />}
                              Выключить
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            disabled={isBusy}
                            onClick={() => handleNodeAction(node.uuid, "restart")}
                          >
                            <RotateCw className="h-3 w-3" />
                            Перезагрузить
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </section>
    </div>
  );
}
