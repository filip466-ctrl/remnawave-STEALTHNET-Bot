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

/* ── Animation variants — God-Tier Entrance ── */

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95, filter: "blur(10px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      delay: i * 0.08,
      duration: 0.85,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};



/* ── Ambient Background Blobs (Aurora Borealis / God-Tier Elegance) ── */

function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Refined Cyber Grid */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Deep Violet & Indigo Core — Top Left */}
      <motion.div
        className="absolute -top-40 -left-20 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-violet-600/20 via-indigo-600/15 to-transparent blur-[160px]"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.4, 0.6, 0.4],
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Ethereal Teal / Emerald — Top Right */}
      <motion.div
        className="absolute -top-32 -right-40 h-[700px] w-[700px] rounded-full bg-gradient-to-bl from-teal-500/15 via-emerald-500/10 to-transparent blur-[160px]"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, -40, 0],
          y: [0, 40, 0],
        }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Warm Rose / Coral — Bottom Center */}
      <motion.div
        className="absolute -bottom-64 left-1/3 h-[800px] w-[800px] rounded-full bg-gradient-to-t from-rose-500/10 via-fuchsia-500/10 to-transparent blur-[160px]"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.45, 0.3],
          x: [0, -30, 0],
        }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />

      {/* Cyber Cyan Accent — Center Left */}
      <motion.div
        className="absolute top-1/2 -left-48 h-[500px] w-[500px] rounded-full bg-gradient-to-r from-cyan-500/15 to-blue-500/5 blur-[140px]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
          y: [0, -40, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 6 }}
      />

      {/* High-frequency Noise Texture for cinematic film grain */}
      <div
        className="absolute inset-0 mix-blend-overlay pointer-events-none"
        style={{
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

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



function canAccessRemnaNodes(role: string, allowedSections: string[] | undefined): boolean {
  if (role === "ADMIN") return true;
  return Array.isArray(allowedSections) && allowedSections.includes("remna-nodes");
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
  return (
    <span
      className="bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-500"
    >
      {formatMoney(animated, currency)}
    </span>
  );
}

function CountUpNumber({ value }: { value: number }) {
  const animated = useCountUp(value);
  return (
    <span
      className="bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-white/90 dark:to-white/50"
    >
      {animated.toLocaleString()}
    </span>
  );
}

/* ── Animated Border Beam — rotating gradient border glow ── */

function BorderBeam({ color = "violet" }: { color?: "violet" | "emerald" | "cyan" | "amber" | "rose" | "indigo" }) {
  const colorMap: Record<string, string> = {
    violet: "from-violet-500/50 via-fuchsia-400/30 to-indigo-500/50",
    emerald: "from-emerald-500/50 via-teal-400/30 to-cyan-500/50",
    cyan: "from-cyan-500/50 via-blue-400/30 to-indigo-500/50",
    amber: "from-amber-500/50 via-orange-400/30 to-rose-500/50",
    rose: "from-rose-500/50 via-pink-400/30 to-fuchsia-500/50",
    indigo: "from-indigo-500/50 via-violet-400/30 to-purple-500/50",
  };

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
      <motion.div
        className={`absolute -inset-[2px] bg-gradient-to-r ${colorMap[color]} rounded-[inherit] blur-[2px]`}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "center center" }}
      />
      <div className="absolute inset-[1px] bg-background/80 rounded-[inherit] backdrop-blur-3xl" />
    </div>
  );
}

/* ── Holographic Shimmer Overlay ── */

function HoloShimmer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
      <motion.div
        className="absolute -inset-[150%]"
        style={{
          background: `linear-gradient(
            115deg, 
            transparent 30%, 
            rgba(255,255,255,0.01) 35%, 
            rgba(255,255,255,0.04) 45%, 
            rgba(255,255,255,0.08) 50%, 
            rgba(255,255,255,0.04) 55%, 
            rgba(255,255,255,0.01) 65%, 
            transparent 70%
          )`,
        }}
        animate={{ x: ["-100%", "100%"], y: ["-20%", "20%"] }}
        transition={{ duration: 3.5, repeat: Infinity, repeatDelay: 1.5, ease: "easeInOut" }}
      />
    </div>
  );
}



/* ── Sparkline Mini Chart with Enhanced Glow ── */

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
  const glowFilterId = `spark-glow-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width={width} height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="50%" stopColor={color} stopOpacity={0.15} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          {/* Enhanced drop-shadow glow for sparkline stroke */}
          <filter id={glowFilterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.8 0" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={true}
          animationDuration={1400}
          style={{ filter: `url(#${glowFilterId})` }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Pulsing Status Dot — Enhanced "Radar" Effect ── */

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
      <span className="relative flex h-3.5 w-3.5">
        {/* Outer radar pulse — slow & large */}
        <span
          className="absolute -inset-1.5 inline-flex rounded-full bg-amber-400 opacity-20 animate-ping"
          style={{ animationDuration: "3s" }}
        />
        {/* Middle radar pulse */}
        <span
          className="absolute -inset-1 inline-flex rounded-full bg-amber-400 opacity-30 animate-ping"
          style={{ animationDuration: "2.2s", animationDelay: "0.3s" }}
        />
        {/* Inner radar pulse */}
        <span
          className="absolute -inset-0.5 inline-flex rounded-full bg-amber-400 opacity-40 animate-ping"
          style={{ animationDuration: "1.5s", animationDelay: "0.6s" }}
        />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.8)]" />
      </span>
    );
  }
  if (isConnected) {
    return (
      <span className="relative flex h-3.5 w-3.5">
        {/* Outer radar pulse — slow & large */}
        <span
          className="absolute -inset-2 inline-flex rounded-full bg-emerald-400 opacity-15 animate-ping"
          style={{ animationDuration: "3.5s" }}
        />
        {/* Middle radar pulse */}
        <span
          className="absolute -inset-1 inline-flex rounded-full bg-emerald-400 opacity-30 animate-ping"
          style={{ animationDuration: "2.5s", animationDelay: "0.4s" }}
        />
        {/* Inner radar pulse */}
        <span
          className="absolute -inset-0.5 inline-flex rounded-full bg-emerald-400 opacity-40 animate-ping"
          style={{ animationDuration: "1.8s", animationDelay: "0.8s" }}
        />
        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500 shadow-[0_0_16px_rgba(34,197,94,0.8)]" />
      </span>
    );
  }
  return (
    <span className="relative flex h-3.5 w-3.5">
      <span
        className="absolute -inset-1 inline-flex rounded-full bg-red-400 opacity-25 animate-ping"
        style={{ animationDuration: "2.5s" }}
      />
      <span
        className="absolute -inset-0.5 inline-flex rounded-full bg-red-400 opacity-35 animate-ping"
        style={{ animationDuration: "1.8s", animationDelay: "0.3s" }}
      />
      <span className="h-3.5 w-3.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
    </span>
  );
}

/* ── Section Header — with Animated Gradient Underline ── */

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
    <motion.div
      className="flex items-center gap-3 mb-5"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className={`relative flex items-center justify-center h-11 w-11 rounded-xl ${iconBg} shadow-lg border border-white/10`}
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <Icon className="h-5 w-5 text-white drop-shadow-sm" />
        {/* Icon glow */}
        <div className={`absolute inset-0 rounded-xl ${iconBg} blur-lg opacity-40`} />
      </motion.div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/80 to-foreground/50">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground/80">{subtitle}</p>
        {/* Animated gradient underline */}
        <motion.div
          className="h-[2px] mt-1 rounded-full bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </motion.div>
  );
}

/* ── Stat Card — God-Tier Glassmorphism + 3D Levitating Hover + Border Beam ── */

function StatCard({
  index,
  icon: Icon,
  iconBg,
  title,
  value,
  subtitle,
  sparkData,
  sparkColor,
  beamColor,
}: {
  index: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  title: string;
  value: React.ReactNode;
  subtitle: string;
  sparkData?: { v: number }[];
  sparkColor?: string;
  beamColor?: "violet" | "emerald" | "cyan" | "amber" | "rose" | "indigo";
}) {
  return (
    <motion.div custom={index} variants={cardVariants} initial="hidden" animate="visible">
      <Card className="group relative overflow-hidden bg-card/40 backdrop-blur-3xl border-white/[0.06] dark:border-white/[0.03] hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:shadow-violet-500/10 hover:border-white/[0.15] transition-all duration-700 ease-[0.22,1,0.36,1] cursor-default">
        {/* Border Beam */}
        <BorderBeam color={beamColor || "violet"} />
        {/* Holographic shimmer */}
        <HoloShimmer />
        {/* Subtle inner shine gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-black/[0.05] dark:from-white/[0.02] dark:via-transparent dark:to-white/[0.01] pointer-events-none" />
        {/* Top edge glow line */}
        <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-foreground/70 tracking-tight">{title}</CardTitle>
          <motion.div
            className={`relative flex items-center justify-center h-10 w-10 rounded-xl ${iconBg} shadow-md border border-white/10`}
            whileHover={{ scale: 1.15, rotate: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Icon className="h-4 w-4 text-white drop-shadow-md" />
            <div className={`absolute inset-0 rounded-xl ${iconBg} blur-md opacity-40`} />
          </motion.div>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
              <p className="text-xs text-muted-foreground/80 mt-1 font-medium">{subtitle}</p>
            </div>
            {sparkData && sparkColor && (
              <div className="opacity-50 group-hover:opacity-100 transition-opacity duration-700">
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
  const glowShadow =
    percent >= 90 ? "shadow-red-500/40" : percent >= 70 ? "shadow-amber-500/40" : "shadow-emerald-500/40";
  return (
    <div className="space-y-1 min-w-[100px]">
      <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} shadow-sm ${glowShadow}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
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
        style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}50` }}
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.8 }}
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

/* ── GlassCard wrapper for major sections ── */

function GlassCard({
  children,
  hoverShadowColor = "violet",
  innerGlowColor,
  animIndex = 0,
}: {
  children: React.ReactNode;
  hoverShadowColor?: string;
  innerGlowColor?: string;
  animIndex?: number;
}) {
  const shadowMap: Record<string, string> = {
    violet: "hover:shadow-violet-500/15",
    emerald: "hover:shadow-emerald-500/15",
    cyan: "hover:shadow-cyan-500/15",
    amber: "hover:shadow-amber-500/15",
    indigo: "hover:shadow-indigo-500/15",
  };
  const glowColorMap: Record<string, string> = {
    violet: "from-violet-500/[0.04]",
    emerald: "from-emerald-500/[0.04]",
    cyan: "from-cyan-500/[0.04]",
    amber: "from-amber-500/[0.04]",
    indigo: "from-indigo-500/[0.04]",
  };

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={animIndex}>
      <Card className={`group relative overflow-hidden bg-card/40 backdrop-blur-3xl border-white/[0.06] dark:border-white/[0.03] hover:-translate-y-1 hover:shadow-2xl ${shadowMap[hoverShadowColor] || shadowMap.violet} hover:border-white/[0.12] transition-all duration-700 ease-[0.22,1,0.36,1]`}>
        {/* Border Beam */}
        <BorderBeam color={hoverShadowColor as "violet" | "emerald" | "cyan" | "amber"} />
        {/* Holo shimmer */}
        <HoloShimmer />
        {/* Inner glow */}
        <div className={`absolute inset-0 bg-gradient-to-br ${glowColorMap[innerGlowColor || hoverShadowColor] || glowColorMap.violet} via-transparent to-transparent pointer-events-none`} />
        {/* Top edge glow */}
        <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        {children}
      </Card>
    </motion.div>
  );
}

/* ── Terminal / Command Center Components ── */

function DataBarSegmented({ percent, label, value, colorClass }: { percent: number, label: string, value: string, colorClass: "cyan" | "emerald" | "amber" | "red" | "violet" }) {
  const segments = 30;
  const activeSegments = Math.round((percent / 100) * segments);
  
  const bgMap = {
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    violet: "bg-violet-500"
  };
  const textMap = {
    cyan: "text-cyan-600 dark:text-cyan-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
    violet: "text-violet-600 dark:text-violet-400"
  };
  const shadowMap = {
    cyan: "dark:shadow-[0_0_10px_rgba(6,182,212,0.8)] shadow-[0_0_10px_rgba(6,182,212,0.3)]",
    emerald: "dark:shadow-[0_0_10px_rgba(16,185,129,0.8)] shadow-[0_0_10px_rgba(16,185,129,0.3)]",
    amber: "dark:shadow-[0_0_10px_rgba(245,158,11,0.8)] shadow-[0_0_10px_rgba(245,158,11,0.3)]",
    red: "dark:shadow-[0_0_10px_rgba(239,68,68,0.8)] shadow-[0_0_10px_rgba(239,68,68,0.3)]",
    violet: "dark:shadow-[0_0_10px_rgba(139,92,246,0.8)] shadow-[0_0_10px_rgba(139,92,246,0.3)]"
  };

  return (
    <div className="space-y-1.5 font-mono">
      <div className="flex justify-between items-end text-xs">
        <span className="text-foreground/60 uppercase tracking-widest">{label}</span>
        <span className={`font-bold ${textMap[colorClass]}`}>{value} <span className="opacity-50 text-[10px] ml-1 text-foreground/50">[{percent.toFixed(1)}%]</span></span>
      </div>
      <div className="flex gap-0.5 h-3">
        {Array.from({ length: segments }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scaleY: 0.2 }}
            animate={{ opacity: i < activeSegments ? 1 : 0.15, scaleY: 1 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
            className={`flex-1 rounded-[1px] ${i < activeSegments ? bgMap[colorClass] + ' ' + shadowMap[colorClass] : 'bg-slate-300 dark:bg-cyan-950'}`}
          />
        ))}
      </div>
    </div>
  );
}

function ServerCommandCenter({ serverStats }: { serverStats: ServerStats }) {
  return (
    <Card className="relative overflow-hidden bg-white/40 dark:bg-[#0A0A0C] backdrop-blur-3xl border border-white/20 dark:border-cyan-500/30 shadow-xl dark:shadow-[0_0_30px_rgba(6,182,212,0.15)] font-mono text-slate-900 dark:text-cyan-500 group transition-colors duration-500">
      {/* Hex Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L12 20L0 0M24 40L12 20L24 0' stroke='%2306b6d4' stroke-width='1' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Top Bar / Terminal Header */}
      <div className="border-b border-white/30 dark:border-cyan-500/20 bg-white/50 dark:bg-cyan-950/20 px-4 py-2 flex items-center justify-between text-xs transition-colors duration-500">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 shadow-[0_0_8px_#ef4444]"></span>
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 shadow-[0_0_8px_#f59e0b]"></span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_#10b981]"></span>
          </div>
          <span className="ml-2 text-slate-600 dark:text-cyan-500/70 tracking-widest uppercase text-[10px]">root@{serverStats.hostname} ~ /sys/core</span>
        </div>
        <div className="flex items-center gap-3 text-slate-500 dark:text-cyan-500/50">
          <span className="hidden sm:inline">ARCH: {serverStats.arch}</span>
          <span className="hidden sm:inline">OS: {serverStats.platform}</span>
          <motion.div 
            animate={{ opacity: [1, 0, 1] }} 
            transition={{ duration: 1.5, repeat: Infinity }}
            className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)] dark:shadow-[0_0_8px_#34d399]" />
            SYS_ONLINE
          </motion.div>
        </div>
      </div>

      <CardContent className="p-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Col: Main Resources */}
          <div className="lg:col-span-2 space-y-6">
            <DataBarSegmented 
              label={`CPU [${serverStats.cpu.cores} CORES]`}
              percent={serverStats.cpu.usagePercent}
              value={`${serverStats.cpu.usagePercent.toFixed(1)}%`}
              colorClass={serverStats.cpu.usagePercent > 80 ? "red" : serverStats.cpu.usagePercent > 60 ? "amber" : "cyan"}
            />
            
            <DataBarSegmented 
              label="MEM [RAM_ALLOC]"
              percent={serverStats.memory.usagePercent}
              value={`${formatGb(serverStats.memory.usedBytes)} / ${formatGb(serverStats.memory.totalBytes)}`}
              colorClass={serverStats.memory.usagePercent > 80 ? "red" : serverStats.memory.usagePercent > 60 ? "amber" : "violet"}
            />

            {serverStats.disk && (
              <DataBarSegmented 
                label="DSK [STORAGE]"
                percent={serverStats.disk.usagePercent}
                value={`${formatGb(serverStats.disk.usedBytes)} / ${formatGb(serverStats.disk.totalBytes)}`}
                colorClass={serverStats.disk.usagePercent > 80 ? "red" : serverStats.disk.usagePercent > 60 ? "amber" : "emerald"}
              />
            )}
            
            {/* Hex Dump / Mini Logs */}
            <div className="mt-4 p-3 bg-white/60 dark:bg-black/40 border border-white/40 dark:border-cyan-500/10 rounded overflow-hidden h-24 relative text-[10px] sm:text-xs text-slate-700 dark:text-cyan-700 font-mono leading-tight shadow-inner transition-colors duration-500">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-x-3 bottom-3"
              >
                <div className="flex gap-4"><span className="opacity-50">0x0000</span><span>48 65 6C 6C 6F 20 57 6F 72 6C 64 21 0A</span></div>
                <div className="flex gap-4"><span className="opacity-50">0x0010</span><span>53 79 73 74 65 6D 20 4F 6E 6C 69 6E 65</span></div>
                <div className="flex gap-4"><span className="opacity-50">0x0020</span><span>{serverStats.loadAvg.map(l => l.toFixed(2)).join(' ')} CPU_LOAD</span></div>
                <div className="flex gap-4"><span className="opacity-50">0x0030</span><span className="text-slate-900 dark:text-cyan-400 font-medium">WAITING FOR COMMANDS_</span><motion.span animate={{opacity:[0,1]}} transition={{repeat:Infinity, duration:0.8}}>█</motion.span></div>
              </motion.div>
            </div>
          </div>

          {/* Right Col: Digital Uptime & Status */}
          <div className="flex flex-col gap-4">
            <div className="border border-white/40 dark:border-cyan-500/20 bg-white/50 dark:bg-cyan-950/10 p-5 rounded-lg flex flex-col items-center justify-center relative overflow-hidden flex-1 hover:border-white/60 dark:group-hover:border-cyan-500/40 transition-colors duration-500 shadow-sm">
               {/* Radar scan effect in background */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10 dark:opacity-20">
                <motion.div
                   animate={{ rotate: 360 }}
                   transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                   className="w-[200%] h-[200%] absolute -top-1/2 -left-1/2"
                   style={{
                     background: "conic-gradient(from 0deg, transparent 70%, rgba(6, 182, 212, 0.4) 100%)"
                   }}
                />
              </div>

              <span className="text-slate-500 dark:text-cyan-500/50 text-xs tracking-[0.2em] mb-2 z-10 font-semibold">[ SYS_UPTIME ]</span>
              
              <div className="text-2xl sm:text-3xl font-bold tracking-widest text-slate-800 dark:text-cyan-400 dark:drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] text-center z-10">
                {formatUptime(serverStats.uptimeSeconds).toUpperCase()}
              </div>

              <div className="mt-6 flex flex-col gap-2 w-full z-10 text-slate-600 dark:text-cyan-500 font-medium">
                <div className="flex justify-between text-xs border-b border-white/30 dark:border-cyan-500/20 pb-1">
                  <span className="opacity-70 dark:opacity-50">LOAD_AVG</span>
                  <span className="text-slate-900 dark:text-cyan-400">{serverStats.loadAvg.map(l => l.toFixed(2)).join(' / ')}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-white/30 dark:border-cyan-500/20 pb-1">
                  <span className="opacity-70 dark:opacity-50">NETWORK</span>
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    ESTABLISHED <Zap className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════ *//* ══════════════════════════════════════════════════════════════════ */
/*                       MAIN COMPONENT                              */
/* ══════════════════════════════════════════════════════════════════ */

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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-violet-500" />
        </motion.div>
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
    <div className="relative space-y-8">
      {/* Ambient Neon Background */}
      <AmbientBackground />

      {/* Page header — animated gradient title */}
      <motion.div
        initial={{ opacity: 0, y: -16, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1
          className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/80 to-violet-500/70"
          style={{ textShadow: "0 0 40px rgba(139,92,246,0.1)" }}
        >
          Дашборд
        </h1>
        <p className="text-muted-foreground mt-1">Статистика пользователей, продажи, аналитика, ноды Remna</p>
        {/* Animated header underline */}
        <motion.div
          className="h-[2px] mt-2 rounded-full"
          style={{
            background: "linear-gradient(90deg, rgba(139,92,246,0.6), rgba(59,130,246,0.4), rgba(34,197,94,0.3), transparent)",
          }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "200px", opacity: 1 }}
          transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
        />
      </motion.div>

      {/* Manager warning */}
      {admin?.role === "MANAGER" && (!admin.allowedSections || admin.allowedSections.length === 0) && (
        <motion.div
          className="rounded-xl border border-amber-500/50 bg-amber-500/10 backdrop-blur-xl px-4 py-2 text-sm text-amber-700 dark:text-amber-400"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          У вас нет доступа ни к одному разделу. Обратитесь к администратору.
        </motion.div>
      )}

      {/* Error display */}
      {error && (
        <motion.div
          className="rounded-xl border border-destructive/50 bg-destructive/10 backdrop-blur-xl px-4 py-2 text-sm text-destructive"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {error}
        </motion.div>
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
            beamColor="cyan"
          />
          <StatCard
            index={1}
            icon={Shield}
            iconBg="bg-violet-500/20 dark:bg-violet-500/30"
            title="Привязано к Remna"
            value={stats ? <CountUpNumber value={stats.users.withRemna} /> : "—"}
            subtitle="С remnawaveUuid"
            beamColor="violet"
          />
          <StatCard
            index={2}
            icon={UserPlus}
            iconBg="bg-emerald-500/20 dark:bg-emerald-500/30"
            title="Новых сегодня"
            value={stats ? <CountUpNumber value={stats.users.newToday} /> : "—"}
            subtitle="Регистрации за день"
            beamColor="emerald"
          />
          <StatCard
            index={3}
            icon={TrendingUp}
            iconBg="bg-amber-500/20 dark:bg-amber-500/30"
            title="Новых за 30 дней"
            value={stats ? <CountUpNumber value={stats.users.newLast30Days} /> : "—"}
            subtitle="Регистрации"
            beamColor="amber"
          />
        </motion.div>
      </section>

      {/* ═══ Sales Section ═══ */}
      <section>
        <SectionHeader icon={DollarSign} iconBg="bg-emerald-600" title="Статистика продаж" subtitle="Поступления и платежи" />
        <GlassCard hoverShadowColor="emerald" animIndex={4}>
          <CardContent className="relative pt-6">
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
        </GlassCard>
      </section>

      {/* ═══ Analytics Section ═══ */}
      <section>
        <SectionHeader icon={Activity} iconBg="bg-violet-600" title="Аналитика" subtitle="Ключевые метрики за периоды" />
        <GlassCard hoverShadowColor="violet" animIndex={5}>
          <CardContent className="relative pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {[
                { label: "Новые (сегодня)", val: stats?.users.newToday, max: analyticsMaxUsers, color: "#3b82f6", isMoney: false },
                { label: "Новые (7 дн.)", val: stats?.users.newLast7Days, max: analyticsMaxUsers, color: "#8b5cf6", isMoney: false },
                { label: "Новые (30 дн.)", val: stats?.users.newLast30Days, max: analyticsMaxUsers, color: "#6366f1", isMoney: false },
                { label: "Продажи (сегодня)", val: stats?.sales.todayAmount, max: analyticsMaxSales, color: "#22c55e", isMoney: true },
                { label: "Продажи (7 дн.)", val: stats?.sales.last7DaysAmount, max: analyticsMaxSales, color: "#14b8a6", isMoney: true },
                { label: "Продажи (30 дн.)", val: stats?.sales.last30DaysAmount, max: analyticsMaxSales, color: "#f59e0b", isMoney: true },
              ].map((item, idx) => (
                <motion.div
                  key={item.label}
                  className="rounded-xl border border-white/[0.06] bg-muted/20 backdrop-blur-lg p-3 space-y-1 hover:bg-muted/40 hover:border-white/10 transition-all duration-400"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.06, duration: 0.5 }}
                >
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-medium tabular-nums">
                    {stats ? (
                      item.isMoney ? (
                        <CountUpMoney value={item.val ?? 0} currency={defaultCurrency} />
                      ) : (
                        <CountUpNumber value={item.val ?? 0} />
                      )
                    ) : (
                      "—"
                    )}
                  </p>
                  <MiniBar value={item.val ?? 0} maxValue={item.max} color={item.color} />
                </motion.div>
              ))}
            </div>
          </CardContent>
        </GlassCard>
      </section>

      {/* ═══ Server Command Center Section ═══ */}
      {serverStats && (
        <section>
          <SectionHeader icon={Server} iconBg="bg-cyan-600" title="Командный центр" subtitle="Мониторинг ядра сервера" />
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={6}>
            <ServerCommandCenter serverStats={serverStats} />
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
            <Card className="bg-card/50 backdrop-blur-2xl border-white/[0.08] dark:border-white/[0.04]">
              <CardContent className="py-8">
                <p className="text-muted-foreground text-sm text-center">
                  Нет доступа к управлению нодами Remna. Обратитесь к администратору для получения раздела «Ноды Remna».
                </p>
              </CardContent>
            </Card>
          ) : nodes.length === 0 ? (
            <Card className="bg-card/50 backdrop-blur-2xl border-white/[0.08] dark:border-white/[0.04]">
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
                const hoverShadow = node.isConnected && !node.isDisabled
                  ? "hover:shadow-emerald-500/15"
                  : node.isConnecting
                    ? "hover:shadow-amber-500/15"
                    : "hover:shadow-red-500/10";

                return (
                  <motion.div key={node.uuid} custom={idx + 8} variants={cardVariants}>
                    <Card className={`group relative overflow-hidden bg-card/50 backdrop-blur-2xl border-white/[0.08] dark:border-white/[0.04] hover:-translate-y-2 hover:scale-[1.01] hover:shadow-2xl ${hoverShadow} hover:border-white/15 transition-all duration-500 ease-out`}>
                      {/* Holo shimmer */}
                      <HoloShimmer />
                      {/* Inner shine */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-white/[0.01] pointer-events-none" />
                      {/* Top edge glow */}
                      <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      {/* Status indicator line at top */}
                      <div
                        className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
                        style={{
                          background: node.isDisabled
                            ? "linear-gradient(90deg, transparent, rgba(156,163,175,0.5), transparent)"
                            : node.isConnecting
                              ? "linear-gradient(90deg, transparent, rgba(245,158,11,0.6), transparent)"
                              : node.isConnected
                                ? "linear-gradient(90deg, transparent, rgba(34,197,94,0.6), transparent)"
                                : "linear-gradient(90deg, transparent, rgba(239,68,68,0.5), transparent)",
                        }}
                      />

                      <CardHeader className="relative pb-3">
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
                      <CardContent className="relative space-y-3">
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
                              className="h-7 text-xs gap-1 border-white/10 hover:border-white/25 hover:bg-white/5 backdrop-blur-sm transition-all duration-300"
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
                              className="h-7 text-xs gap-1 border-white/10 hover:border-white/25 hover:bg-white/5 backdrop-blur-sm transition-all duration-300"
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
                            className="h-7 text-xs gap-1 border-white/10 hover:border-white/25 hover:bg-white/5 backdrop-blur-sm transition-all duration-300"
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
