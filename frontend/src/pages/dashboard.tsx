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
  Zap,
  Cpu,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { DashboardStats, RemnaNode, RemnaNodesResponse, ServerStats } from "@/lib/api";
import { useAuth } from "@/contexts/auth";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { AnimatedBackground } from "@/components/animated-background";

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

function CountUpMoney({ value, currency, className }: { value: number; currency: string; className?: string }) {
  const animated = useCountUp(value);
  return (
    <span className={className || "text-inherit drop-shadow-sm dark:drop-shadow-none"}>
      {formatMoney(animated, currency)}
    </span>
  );
}

function CountUpNumber({ value, className }: { value: number; className?: string }) {
  const animated = useCountUp(value);
  return (
    <span className={className || "text-inherit drop-shadow-sm dark:drop-shadow-none"}>
      {animated.toLocaleString()}
    </span>
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


/* ── Section Header — Terminal Style ── */

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <motion.div
      className="flex items-center gap-4 mb-6 font-mono"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className={`relative flex items-center justify-center h-10 w-10 border border-white/20 dark:border-primary/30 bg-white/10 dark:bg-primary/20 shadow-[0_0_15px_hsl(var(--primary)/0.15)]`}
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <Icon className="h-5 w-5 text-slate-800 dark:text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]" />
      </motion.div>
      <div>
        <h2 className="text-lg font-bold tracking-widest uppercase text-slate-800 dark:text-primary flex items-center gap-2">
          <span className="text-primary/50 hidden sm:inline">&gt;</span> {title} <motion.span animate={{opacity:[0,1]}} transition={{repeat:Infinity, duration:0.9}} className="w-2 h-4 bg-primary/50 inline-block"></motion.span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-primary/60 uppercase tracking-widest">{subtitle}</p>
      </div>
    </motion.div>
  );
}

/* ── Stat Card — God-Tier Glassmorphism + 3D Levitating Hover + Border Beam ── */

function StatCard({
  index,
  icon: Icon,
  title,
  value,
  subtitle,
  sparkData,
  sparkColor,
  accentColor = "primary",
}: {
  index: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: React.ReactNode;
  subtitle: string;
  sparkData?: { v: number }[];
  sparkColor?: string;
  accentColor?: "primary" | "emerald" | "amber" | "red" | "violet" | "cyan";
}) {
  const colorMap = {
    primary: {
      borderHover: "hover:border-primary/50",
      shadowHover: "hover:shadow-primary/10",
      gradient: "from-transparent via-primary/50 to-transparent",
      bracket: "text-primary/50",
      title: "text-slate-900 dark:text-white",
      iconBg: "dark:bg-primary/30",
      iconBorder: "dark:border-primary/30",
      iconShadow: "shadow-[0_0_10px_hsl(var(--primary)/0.1)]",
      iconText: "text-slate-800 dark:text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.8)]",
      subtitle: "text-primary/70 dark:text-primary",
      valueGlow: "text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]",
    },
    emerald: {
      borderHover: "hover:border-primary/50",
      shadowHover: "hover:shadow-primary/10",
      gradient: "from-transparent via-primary/50 to-transparent",
      bracket: "text-emerald-500/50",
      title: "text-slate-900 dark:text-white",
      iconBg: "dark:bg-primary/30",
      iconBorder: "dark:border-primary/30",
      iconShadow: "shadow-[0_0_10px_rgba(16,185,129,0.1)]",
      iconText: "text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]",
      subtitle: "text-primary/70 dark:text-primary",
      valueGlow: "text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]",
    },
    amber: {
      borderHover: "hover:border-primary/50",
      shadowHover: "hover:shadow-primary/10",
      gradient: "from-transparent via-primary/50 to-transparent",
      bracket: "text-amber-500/50",
      title: "text-slate-900 dark:text-white",
      iconBg: "dark:bg-primary/30",
      iconBorder: "dark:border-primary/30",
      iconShadow: "shadow-[0_0_10px_rgba(245,158,11,0.1)]",
      iconText: "text-amber-600 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]",
      subtitle: "text-primary/70 dark:text-primary",
      valueGlow: "text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]",
    },
    red: {
      borderHover: "hover:border-primary/50",
      shadowHover: "hover:shadow-primary/10",
      gradient: "from-transparent via-primary/50 to-transparent",
      bracket: "text-red-500/50",
      title: "text-slate-900 dark:text-white",
      iconBg: "dark:bg-primary/30",
      iconBorder: "dark:border-primary/30",
      iconShadow: "shadow-[0_0_10px_rgba(239,68,68,0.1)]",
      iconText: "text-red-600 dark:text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]",
      subtitle: "text-primary/70 dark:text-primary",
      valueGlow: "text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]",
    },
    violet: {
      borderHover: "hover:border-primary/50",
      shadowHover: "hover:shadow-primary/10",
      gradient: "from-transparent via-primary/50 to-transparent",
      bracket: "text-violet-500/50",
      title: "text-slate-900 dark:text-white",
      iconBg: "dark:bg-primary/30",
      iconBorder: "dark:border-primary/30",
      iconShadow: "shadow-[0_0_10px_rgba(139,92,246,0.1)]",
      iconText: "text-violet-600 dark:text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]",
      subtitle: "text-primary/70 dark:text-primary",
      valueGlow: "text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]",
    },
    cyan: {
      borderHover: "hover:border-primary/50",
      shadowHover: "hover:shadow-primary/10",
      gradient: "from-transparent via-primary/50 to-transparent",
      bracket: "text-cyan-500/50",
      title: "text-slate-900 dark:text-white",
      iconBg: "dark:bg-primary/30",
      iconBorder: "dark:border-primary/30",
      iconShadow: "shadow-[0_0_10px_rgba(6,182,212,0.1)]",
      iconText: "text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]",
      subtitle: "text-primary/70 dark:text-primary",
      valueGlow: "text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]",
    },
  };
  const theme = colorMap[accentColor];

  return (
    <motion.div custom={index} variants={cardVariants} initial="hidden" animate="visible">
      <Card className={`group relative overflow-hidden bg-white/5 dark:bg-black/40 backdrop-blur-xl border border-white/10 dark:border-primary/30 hover:-translate-y-1 transition-all duration-500 font-mono ${theme.borderHover} ${theme.shadowHover}`}>
        {/* Scanlines / Matrix background */}
        <div 
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L12 20L0 0M24 40L12 20L24 0' stroke='var(--primary)' stroke-width='1' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Terminal Header Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        
        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
          <div className="flex items-center gap-2">
            <span className={`${theme.bracket} text-xs hidden sm:inline`}>[</span>
            <CardTitle className={`text-xs font-bold tracking-widest uppercase ${theme.title}`}>{title}</CardTitle>
            <span className={`${theme.bracket} text-xs hidden sm:inline`}>]</span>
          </div>
          <motion.div
            className={`relative flex items-center justify-center h-8 w-8 rounded-none border border-white/20 bg-white/10 ${theme.iconBg} ${theme.iconBorder} ${theme.iconShadow}`}
            whileHover={{ scale: 1.1, rotate: 90 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <Icon className={`h-4 w-4 ${theme.iconText}`} />
          </motion.div>
        </CardHeader>
        <CardContent className="relative pb-4">
          <div className="flex items-end justify-between gap-2 mt-2">
            <div>
              <div className={`text-2xl font-bold tracking-widest tabular-nums ${theme.valueGlow}`}>
                {value}
              </div>
              <p className={`text-[10px] mt-1 tracking-widest uppercase text-slate-500 ${theme.subtitle}`}>
                &gt; {subtitle}
              </p>
            </div>
            {sparkData && sparkColor && (
              <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                <Sparkline data={sparkData} color={sparkColor} height={36} width={70} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}


/* ── Mini Bar for analytics ── */

function MiniBar({ value, maxValue, color }: { value: number; maxValue: number; color: string }) {
  const percent = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  const segments = 25;
  const activeSegments = Math.round((percent / 100) * segments);

  return (
    <div className="flex gap-[2px] h-2.5 w-full mt-3">
      {Array.from({ length: segments }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scaleY: 0.2 }}
          animate={{ opacity: i < activeSegments ? 1 : 0.15, scaleY: 1 }}
          transition={{ delay: 0.8 + i * 0.02, duration: 0.3 }}
          className="flex-1 rounded-[1px] bg-slate-300 dark:bg-primary/10"
          style={i < activeSegments ? { backgroundColor: color, boxShadow: `0 0 8px ${color}` } : undefined}
        />
      ))}
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

/* ── Terminal Container wrapper for major sections ── */

function GlassCard({
  children,
  animIndex = 0,
}: {
  children: React.ReactNode;
  animIndex?: number;
}) {
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={animIndex}>
      <Card className="group relative overflow-hidden bg-white/5 dark:bg-black/40 backdrop-blur-xl border border-white/10 dark:border-primary/30 hover:border-white/20 dark:hover:border-primary/50 transition-all duration-500 shadow-lg dark:shadow-[0_0_20px_hsl(var(--primary)/0.1)] font-mono">
        {/* Matrix background */}
        <div 
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L12 20L0 0M24 40L12 20L24 0' stroke='var(--primary)' stroke-width='1' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}
        />
        {/* Inner scanline sweep */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.05] to-transparent h-[10%] w-full pointer-events-none"
          animate={{ y: ["-100%", "1000%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
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
    cyan: "bg-primary",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    violet: "bg-violet-500"
  };
  const textMap = {
    cyan: "text-primary/80 dark:text-primary",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
    violet: "text-violet-600 dark:text-violet-400"
  };
  const shadowMap = {
    cyan: "dark:shadow-[0_0_10px_hsl(var(--primary)/0.8)] shadow-[0_0_10px_hsl(var(--primary)/0.3)]",
    emerald: "dark:shadow-[0_0_10px_rgba(16,185,129,0.8)] shadow-[0_0_10px_rgba(16,185,129,0.3)]",
    amber: "dark:shadow-[0_0_10px_rgba(245,158,11,0.8)] shadow-[0_0_10px_rgba(245,158,11,0.3)]",
    red: "dark:shadow-[0_0_10px_rgba(239,68,68,0.8)] shadow-[0_0_10px_rgba(239,68,68,0.3)]",
    violet: "dark:shadow-[0_0_10px_rgba(139,92,246,0.8)] shadow-[0_0_10px_rgba(139,92,246,0.3)]"
  };

  return (
    <div className="space-y-1.5 font-mono">
      <div className="flex justify-between items-end text-xs">
        <span className={`${textMap[colorClass]} uppercase tracking-widest`}>{label}</span>
        <span className={`font-bold ${textMap[colorClass]}`}>{value} <span className="opacity-50 text-[10px] ml-1 text-foreground/50">[{percent.toFixed(1)}%]</span></span>
      </div>
      <div className="flex gap-0.5 h-3">
        {Array.from({ length: segments }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scaleY: 0.2 }}
            animate={{ opacity: i < activeSegments ? 1 : 0.15, scaleY: 1 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
            className={`flex-1 rounded-[1px] ${i < activeSegments ? bgMap[colorClass] + ' ' + shadowMap[colorClass] : 'bg-slate-300 dark:bg-primary/10'}`}
          />
        ))}
      </div>
    </div>
  );
}

function ServerCommandCenter({ serverStats }: { serverStats: ServerStats }) {
  return (
    <Card className="relative overflow-hidden bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-white/20 dark:border-primary/30 shadow-xl dark:shadow-[0_0_30px_hsl(var(--primary)/0.15)] font-mono text-slate-900 dark:text-primary group transition-colors duration-500">
      {/* Hex Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L12 20L0 0M24 40L12 20L24 0' stroke='var(--primary)' stroke-width='1' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Top Bar / Terminal Header */}
      <div className="border-b border-white/30 dark:border-primary/20 bg-white/50 dark:bg-primary/20 px-4 py-2 flex items-center justify-between text-xs transition-colors duration-500">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 shadow-[0_0_8px_#ef4444]"></span>
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 shadow-[0_0_8px_#f59e0b]"></span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_#10b981]"></span>
          </div>
          <span className="ml-2 text-slate-600 dark:text-primary/70 tracking-widest uppercase text-[10px]">root@{serverStats.hostname} ~ /sys/core</span>
        </div>
        <div className="flex items-center gap-3 text-slate-500 dark:text-primary/50">
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

      <CardContent className="p-4 sm:p-5 relative">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Left Col: Main Resources */}
          <div className="xl:col-span-2 space-y-4">
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
            <div className="mt-4 p-3 bg-white/60 dark:bg-black/40 border border-white/40 dark:border-primary/10 rounded overflow-hidden h-24 relative text-[10px] sm:text-xs text-slate-700 dark:text-primary/60 font-mono leading-tight shadow-inner transition-colors duration-500">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-x-3 bottom-3"
              >
                <div className="flex gap-4"><span className="opacity-50">0x0000</span><span>48 65 6C 6C 6F 20 57 6F 72 6C 64 21 0A</span></div>
                <div className="flex gap-4"><span className="opacity-50">0x0010</span><span>53 79 73 74 65 6D 20 4F 6E 6C 69 6E 65</span></div>
                <div className="flex gap-4"><span className="opacity-50">0x0020</span><span>{serverStats.loadAvg.map(l => l.toFixed(2)).join(' ')} CPU_LOAD</span></div>
                <div className="flex gap-4"><span className="opacity-50">0x0030</span><span className="text-slate-900 dark:text-primary font-medium">WAITING FOR COMMANDS_</span><motion.span animate={{opacity:[0,1]}} transition={{repeat:Infinity, duration:0.8}}>█</motion.span></div>
              </motion.div>
            </div>
          </div>

          {/* Right Col: Digital Uptime & Status */}
          <div className="flex flex-col gap-3">
            <div className="border border-white/40 dark:border-primary/20 bg-white/50 dark:bg-primary/10 p-4 rounded-lg flex flex-col items-center justify-center relative overflow-hidden flex-1 hover:border-white/60 dark:group-hover:border-primary/40 transition-colors duration-500 shadow-sm">
               {/* Radar scan effect in background */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10 dark:opacity-20">
                <motion.div
                   animate={{ rotate: 360 }}
                   transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                   className="w-[200%] h-[200%] absolute -top-1/2 -left-1/2"
                   style={{
                     background: "conic-gradient(from 0deg, transparent 70%, hsl(var(--primary)/0.4) 100%)"
                   }}
                />
              </div>

              <span className="text-slate-500 dark:text-primary/50 text-xs tracking-[0.2em] mb-2 z-10 font-semibold">[ SYS_UPTIME ]</span>
              
              <div className="text-2xl sm:text-3xl font-bold tracking-widest text-slate-800 dark:text-primary dark:drop-shadow-[0_0_15px_hsl(var(--primary)/0.8)] text-center z-10">
                {formatUptime(serverStats.uptimeSeconds).toUpperCase()}
              </div>

              <div className="mt-6 flex flex-col gap-2 w-full z-10 text-slate-600 dark:text-primary font-medium">
                <div className="flex justify-between text-xs border-b border-white/30 dark:border-primary/20 pb-1">
                  <span className="opacity-70 dark:opacity-50">LOAD_AVG</span>
                  <span className="text-slate-900 dark:text-primary">{serverStats.loadAvg.map(l => l.toFixed(2)).join(' / ')}</span>
                </div>
                <div className="flex justify-between text-xs border-b border-white/30 dark:border-primary/20 pb-1">
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
      <div className="flex flex-col items-center justify-center min-h-[400px] font-mono gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <RotateCw className="h-8 w-8 text-primary" />
        </motion.div>
        <motion.div
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="text-primary tracking-widest text-xs font-bold"
        >
          INITIALIZING_SYSTEM_
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
    <div className="relative w-full rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#050507] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1),0_0_20px_rgba(0,0,0,0.05)] dark:shadow-[0_30px_80px_-15px_rgba(0,0,0,0.6),0_0_30px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Frame glowing inner border effect (3D Bevel) */}
      <div className="absolute inset-0 border-[2px] border-white/80 dark:border-white/[0.03] rounded-[2rem] pointer-events-none z-20" />
      
      {/* Background Matrix/Grid strictly inside the frame */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L12 20L0 0M24 40L12 20L24 0' stroke='var(--primary)' stroke-width='1' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Animated glowing lights STRICTLY INSIDE the frame, behind the content */}
      <AnimatedBackground variant="absolute" intensity="weak" />

      <div className="relative space-y-8 p-6 sm:p-8 md:p-10 z-10">
      {/* Ambient Neon Background */}
      {/* Page header — Terminal Style */}
      <motion.div
        initial={{ opacity: 0, y: -16, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="font-mono"
      >
        <h1
          className="text-2xl font-bold tracking-widest uppercase text-slate-900 dark:text-primary flex items-center gap-3"
          style={{ textShadow: "0 0 20px hsl(var(--primary)/0.3)" }}
        >
          <span className="text-primary/50">~/</span> Дашборд <motion.span animate={{opacity:[0,1]}} transition={{repeat:Infinity, duration:0.8}} className="w-4 h-6 bg-primary inline-block"></motion.span>
        </h1>
        <p className="text-slate-500 dark:text-primary/60 mt-2 text-xs tracking-widest uppercase">Статистика / Пользователи / Продажи / Аналитика / Ноды_Remna</p>
        {/* Animated header underline */}
        <motion.div
          className="h-[1px] mt-4"
          style={{
            background: "linear-gradient(90deg, hsl(var(--primary)/0.8), transparent)",
          }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "100%", opacity: 1 }}
          transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
        />
      </motion.div>

      {/* Manager warning */}
      {admin?.role === "MANAGER" && (!admin.allowedSections || admin.allowedSections.length === 0) && (
        <motion.div
          className="rounded-none border border-amber-500/50 bg-amber-500/10 backdrop-blur-xl px-4 py-3 text-xs tracking-widest uppercase font-mono text-amber-600 dark:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          [WARNING]: У вас нет доступа ни к одному разделу. Обратитесь к администратору.
        </motion.div>
      )}

      {/* Error display */}
      {error && (
        <motion.div
          className="rounded-none border border-red-500/50 bg-red-500/10 backdrop-blur-xl px-4 py-3 text-xs tracking-widest uppercase font-mono text-red-600 dark:text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
        >
          [ERROR]: {error}
        </motion.div>
      )}

      {/* ═══ Users Section ═══ */}
      <section>
        <SectionHeader icon={Users} title="Пользователи" subtitle="Статистика клиентской базы" />
        <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" variants={staggerContainer} initial="hidden" animate="visible">
          <StatCard
            index={0}
            icon={Users}
            title="Всего пользователей"
            value={stats ? <CountUpNumber value={stats.users.total} /> : "—"}
            subtitle="Клиенты панели"
            accentColor="primary"
          />
          <StatCard
            index={1}
            icon={Shield}
            title="Привязано к Remna"
            value={stats ? <CountUpNumber value={stats.users.withRemna} /> : "—"}
            subtitle="С remnawaveUuid"
            accentColor="cyan"
          />
          <StatCard
            index={2}
            icon={UserPlus}
            title="Новых сегодня"
            value={stats ? <CountUpNumber value={stats.users.newToday} /> : "—"}
            subtitle="Регистрации за день"
            accentColor="emerald"
          />
          <StatCard
            index={3}
            icon={TrendingUp}
            title="Новых за 30 дней"
            value={stats ? <CountUpNumber value={stats.users.newLast30Days} /> : "—"}
            subtitle="Регистрации"
            accentColor="violet"
          />
        </motion.div>
      </section>

      {/* ═══ Sales Section ═══ */}
      <section>
        <SectionHeader icon={DollarSign} title="Статистика продаж" subtitle="Поступления и платежи" />
        <GlassCard animIndex={4}>
          <CardContent className="relative pt-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total revenue */}
              <div className="space-y-2 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-slate-900 dark:text-white transition-colors">&gt; Всего поступления</p>
                    <p className="text-2xl font-bold tabular-nums tracking-widest mt-1 text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                      {stats ? <CountUpMoney value={stats.sales.totalAmount} currency={defaultCurrency} /> : "—"}
                    </p>
                    <p className="text-[10px] tracking-widest text-slate-400 dark:text-primary/50 mt-1 uppercase">{stats?.sales.totalCount ?? 0} PAYMENTS_RCVD</p>
                  </div>
                  {stats && stats.sales.totalAmount > 0 && (
                    <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                      <Sparkline data={salesSparkTotal} color="#10b981" height={48} width={100} />
                    </div>
                  )}
                </div>
              </div>
              {/* Today */}
              <div className="space-y-2 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-slate-900 dark:text-white transition-colors">&gt; За сегодня</p>
                    <p className="text-2xl font-bold tabular-nums tracking-widest mt-1 text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                      {stats ? <CountUpMoney value={stats.sales.todayAmount} currency={defaultCurrency} /> : "—"}
                    </p>
                    <p className="text-[10px] tracking-widest text-slate-400 dark:text-primary/50 mt-1 uppercase">{stats?.sales.todayCount ?? 0} PAYMENTS_RCVD</p>
                  </div>
                  {stats && stats.sales.todayAmount > 0 && (
                    <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                      <Sparkline data={salesSparkToday} color="hsl(var(--primary))" height={48} width={100} />
                    </div>
                  )}
                </div>
              </div>
              {/* 7 days */}
              <div className="space-y-2 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-slate-900 dark:text-white transition-colors">&gt; За 7 дней</p>
                    <p className="text-2xl font-bold tabular-nums tracking-widest mt-1 text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                      {stats ? <CountUpMoney value={stats.sales.last7DaysAmount} currency={defaultCurrency} /> : "—"}
                    </p>
                    <p className="text-[10px] tracking-widest text-slate-400 dark:text-primary/50 mt-1 uppercase">{stats?.sales.last7DaysCount ?? 0} PAYMENTS_RCVD</p>
                  </div>
                  {stats && stats.sales.last7DaysAmount > 0 && (
                    <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                      <Sparkline data={salesSpark7d} color="#8b5cf6" height={48} width={100} />
                    </div>
                  )}
                </div>
              </div>
              {/* 30 days */}
              <div className="space-y-2 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-slate-900 dark:text-white transition-colors">&gt; За 30 дней</p>
                    <p className="text-2xl font-bold tabular-nums tracking-widest mt-1 text-slate-900 dark:text-white dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                      {stats ? <CountUpMoney value={stats.sales.last30DaysAmount} currency={defaultCurrency} /> : "—"}
                    </p>
                    <p className="text-[10px] tracking-widest text-slate-400 dark:text-primary/50 mt-1 uppercase">{stats?.sales.last30DaysCount ?? 0} PAYMENTS_RCVD</p>
                  </div>
                  {stats && stats.sales.last30DaysAmount > 0 && (
                    <div className="opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                      <Sparkline data={salesSpark30d} color="#f59e0b" height={48} width={100} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </GlassCard>
      </section>

      {/* ═══ Analytics Section ═══ */}
      <section>
        <SectionHeader icon={Activity} title="Аналитика" subtitle="Ключевые метрики за периоды" />
        <GlassCard animIndex={5}>
          <CardContent className="relative pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Новые (сегодня)", val: stats?.users.newToday, max: analyticsMaxUsers, color: "hsl(var(--primary))", isMoney: false, theme: "primary" },
                { label: "Новые (7 дн.)", val: stats?.users.newLast7Days, max: analyticsMaxUsers, color: "hsl(var(--primary))", isMoney: false, theme: "primary" },
                { label: "Новые (30 дн.)", val: stats?.users.newLast30Days, max: analyticsMaxUsers, color: "hsl(var(--primary))", isMoney: false, theme: "violet" },
                { label: "Продажи (сегодня)", val: stats?.sales.todayAmount, max: analyticsMaxSales, color: "#10b981", isMoney: true, theme: "emerald" },
                { label: "Продажи (7 дн.)", val: stats?.sales.last7DaysAmount, max: analyticsMaxSales, color: "#10b981", isMoney: true, theme: "emerald" },
                { label: "Продажи (30 дн.)", val: stats?.sales.last30DaysAmount, max: analyticsMaxSales, color: "#10b981", isMoney: true, theme: "emerald" },
              ].map((item, idx) => {
                const isEmerald = item.theme === "emerald";
                const isViolet = item.theme === "violet";
                const borderClass = "border-white/[0.05] dark:border-primary/20 hover:border-white/20 dark:hover:border-primary/50";
                const bgClass = "bg-white/10 dark:bg-primary/10 hover:bg-white/20 dark:hover:bg-primary/20";
                const textClass = isEmerald ? "text-emerald-700 dark:text-emerald-400 group-hover:text-emerald-500" : isViolet ? "text-violet-700 dark:text-violet-400 group-hover:text-violet-500" : "text-slate-900 dark:text-white dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]";
                const titleGlow = isEmerald ? "dark:drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]" : isViolet ? "dark:drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]" : "";
                
                return (
                <motion.div
                  key={item.label}
                  className={`rounded border backdrop-blur-sm p-4 space-y-2 transition-all duration-400 group ${borderClass} ${bgClass}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + idx * 0.06, duration: 0.5 }}
                >
                  <p className="text-[10px] tracking-widest uppercase text-slate-900 dark:text-white transition-colors">
                    &gt; {item.label}
                  </p>
                  <p className={`text-xl font-bold tabular-nums tracking-widest ${textClass} ${titleGlow}`}>
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
              )})}
            </div>
          </CardContent>
        </GlassCard>
      </section>

      {/* ═══ Server Command Center Section ═══ */}
      {serverStats && (
        <section>
          <SectionHeader icon={Server} title="Командный центр" subtitle="Мониторинг ядра сервера" />
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={6}>
            <ServerCommandCenter serverStats={serverStats} />
          </motion.div>
        </section>
      )}

      {/* ═══ Remna Nodes Section ═══ */}
      <section>
        <SectionHeader
          icon={Globe}
          title="Ноды Remna"
          subtitle={hasRemnaNodesAccess && nodes.length > 0 ? `${nodesOnline} из ${nodesTotal} онлайн` : "Статус, трафик, CPU/RAM, онлайн пользователей"}
        />
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={7}>
          {!hasRemnaNodesAccess ? (
            <Card className="bg-white/5 dark:bg-black/40 backdrop-blur-xl border-white/10 dark:border-primary/30 rounded-none font-mono">
              <CardContent className="py-8">
                <p className="text-slate-500 dark:text-primary/60 text-xs tracking-widest uppercase text-center">
                  [ACCESS_DENIED] Нет доступа к управлению нодами Remna. Обратитесь к администратору.
                </p>
              </CardContent>
            </Card>
          ) : nodes.length === 0 ? (
            <Card className="bg-white/5 dark:bg-black/40 backdrop-blur-xl border-white/10 dark:border-primary/30 rounded-none font-mono">
              <CardContent className="py-8">
                <p className="text-slate-500 dark:text-primary/60 text-xs tracking-widest uppercase text-center">
                  [SYSTEM_EMPTY] Ноды не загружены или Remna API не настроен. Проверьте настройки.
                </p>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              className="grid gap-4 lg:grid-cols-2"
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
                  ? "hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : node.isConnecting
                    ? "hover:shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    : "hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]";

                const limit = node.trafficLimitBytes ?? 0;
                const usedVal = node.trafficUsedBytes ?? 0;
                const percent = limit > 0 ? Math.min((usedVal / limit) * 100, 100) : 0;
                const colorClass = percent >= 90 ? "red" : percent >= 70 ? "amber" : "cyan";
                const valueStr = limit > 0 ? `${formatBytes(usedVal)} / ${formatBytes(limit)}` : `${formatBytes(usedVal)}`;

                return (
                  <motion.div key={node.uuid} custom={idx + 8} variants={cardVariants}>
                    <Card className={`relative overflow-hidden bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-white/20 dark:border-primary/30 shadow-xl dark:shadow-[0_0_30px_hsl(var(--primary)/0.15)] font-mono text-slate-900 dark:text-primary group transition-colors duration-500 ${hoverShadow}`}>
                      {/* Hex Background Pattern */}
                      <div 
                        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='40' viewBox='0 0 24 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L12 20L0 0M24 40L12 20L24 0' stroke='var(--primary)' stroke-width='1' fill='none' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                        }}
                      />
                      
                      {/* Top Bar / Terminal Header */}
                      <div className="border-b border-white/30 dark:border-primary/20 bg-white/50 dark:bg-primary/20 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors duration-500">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 shadow-[0_0_8px_#ef4444]"></span>
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 shadow-[0_0_8px_#f59e0b]"></span>
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_#10b981]"></span>
                          </div>
                          <span className="ml-2 text-slate-600 dark:text-primary/70 tracking-widest uppercase text-[10px] truncate max-w-[200px] sm:max-w-[400px]">
                            root@{node.address} ~ /sys/node/{node.name || node.uuid.substring(0,6)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 dark:text-primary/50 justify-between sm:justify-end">
                          <span className="hidden sm:inline">PORT: {node.port ?? "N/A"}</span>
                          <motion.div 
                            animate={node.isConnected && !node.isDisabled ? { opacity: [1, 0, 1] } : {}} 
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className={`flex items-center gap-1.5 font-bold uppercase tracking-widest text-[10px] ${statusColor}`}
                          >
                            <div className={`h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]`} />
                            {statusLabel}
                          </motion.div>
                        </div>
                      </div>

                      <CardContent className="p-4 sm:p-5 relative">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
                          
                          {/* Left Col: Main Resources */}
                          <div className="xl:col-span-2 space-y-4">
                            <DataBarSegmented 
                              label="BANDWIDTH [ALLOC]"
                              percent={percent}
                              value={valueStr}
                              colorClass={colorClass}
                            />

                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div className="space-y-1.5">
                                <span className="text-slate-500 dark:text-primary/70 uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                                  <Cpu className="h-3 w-3"/> CPU/RAM [ALLOC]
                                </span>
                                <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-primary tabular-nums">
                                  {formatNodeCpuRam(node.cpuCount, node.totalRam)}
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <span className="text-slate-500 dark:text-primary/70 uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                                  <Wifi className="h-3 w-3"/> CONN [WIFI]
                                </span>
                                <div className="text-sm sm:text-base font-bold text-slate-800 dark:text-primary tabular-nums flex items-center gap-2">
                                  {node.usersOnline != null ? (
                                    <>
                                      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                                      {node.usersOnline} ONLINE
                                    </>
                                  ) : (
                                    <>
                                      <span className="h-2 w-2 rounded-full bg-slate-500/50"></span>
                                      OFFLINE
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Hex Dump / Mini Logs */}
                            <div className="mt-4 p-3 bg-white/60 dark:bg-black/40 border border-white/40 dark:border-primary/10 rounded overflow-hidden h-24 relative text-[10px] sm:text-xs text-slate-700 dark:text-primary/60 font-mono leading-tight shadow-inner transition-colors duration-500">
                              <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="absolute inset-x-3 bottom-3"
                              >
                                <div className="flex gap-4"><span className="opacity-50">0x0000</span><span>NODE_UUID: {node.uuid}</span></div>
                                <div className="flex gap-4"><span className="opacity-50">0x0010</span><span>TRAFFIC_LIMIT: {limit > 0 ? formatBytes(limit) : 'UNLIMITED'}</span></div>
                                <div className="flex gap-4"><span className="opacity-50">0x0020</span><span>VER: {node.name || 'UNKNOWN'}</span></div>
                                <div className="flex gap-4"><span className="opacity-50">0x0030</span><span className="text-slate-900 dark:text-primary font-medium">STATUS: {statusLabel.toUpperCase()}_</span><motion.span animate={{opacity:[0,1]}} transition={{repeat:Infinity, duration:0.8}}>█</motion.span></div>
                              </motion.div>
                            </div>
                          </div>

                          {/* Right Col: Actions */}
                          <div className="flex flex-col gap-3">
                            <div className="border border-white/40 dark:border-primary/20 bg-white/50 dark:bg-primary/10 p-4 rounded-lg flex flex-col items-center justify-center relative overflow-hidden flex-1 hover:border-white/60 dark:hover:border-primary/40 transition-colors duration-500 shadow-sm gap-4">
                              {/* Radar scan effect in background */}
                              <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10 dark:opacity-20">
                                <motion.div
                                  animate={{ rotate: -360 }}
                                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                  className="w-[200%] h-[200%] absolute -top-1/2 -left-1/2"
                                  style={{
                                    background: "conic-gradient(from 0deg, transparent 70%, hsl(var(--primary)/0.4) 100%)"
                                  }}
                                />
                              </div>

                              <span className="text-slate-500 dark:text-primary/50 text-xs tracking-[0.2em] z-10 font-semibold">[ ACTIONS ]</span>
                              
                              <div className="flex flex-col gap-3 w-full z-10">
                                {node.isDisabled ? (
                                  <Button
                                    variant="outline"
                                    className="w-full h-10 text-[10px] sm:text-xs uppercase tracking-widest gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all bg-white/50 dark:bg-black/20"
                                    disabled={isBusy}
                                    onClick={() => handleNodeAction(node.uuid, "enable")}
                                  >
                                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                                    ACTIVATE
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    className="w-full h-10 text-[10px] sm:text-xs uppercase tracking-widest gap-2 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all bg-white/50 dark:bg-black/20"
                                    disabled={isBusy}
                                    onClick={() => handleNodeAction(node.uuid, "disable")}
                                  >
                                    {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PowerOff className="h-4 w-4" />}
                                    HALT
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  className="w-full h-10 text-[10px] sm:text-xs uppercase tracking-widest gap-2 border-primary/30 text-primary/80 dark:text-primary hover:bg-primary/10 hover:border-primary/50 transition-all bg-white/50 dark:bg-black/20"
                                  disabled={isBusy}
                                  onClick={() => handleNodeAction(node.uuid, "restart")}
                                >
                                  <RotateCw className="h-4 w-4" />
                                  REBOOT
                                </Button>
                              </div>
                            </div>
                          </div>

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
    </div>
  );
}
