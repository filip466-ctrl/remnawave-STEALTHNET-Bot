import { useEffect, useState } from "react";
import { ShieldAlert, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { api, type TrafficAbuseResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let val = bytes;
  let i = 0;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function TrafficAbusePage() {
  const token = useAuth().state.accessToken!;
  const [days, setDays] = useState("7");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrafficAbuseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getTrafficAbuseAnalytics(token, { days: Number(days) || 7 });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки аналитики");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><ShieldAlert className="h-6 w-6" />Анализ абуза трафика</h1>
          <p className="text-sm text-muted-foreground">Поиск пользователей с аномально высоким потреблением трафика</p>
        </div>
        <div className="flex items-center gap-2">
          <Input className="w-24" value={days} onChange={(e) => setDays(e.target.value)} />
          <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-2" />Обновить</Button>
        </div>
      </div>

      {error && <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div>}

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : data && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Card><CardContent className="pt-5"><div className="text-sm text-muted-foreground">Всего пользователей</div><div className="text-2xl font-semibold">{data.stats.totalUsers}</div></CardContent></Card>
            <Card><CardContent className="pt-5"><div className="text-sm text-muted-foreground">Нарушителей</div><div className="text-2xl font-semibold">{data.stats.abusersCount}</div></CardContent></Card>
            <Card><CardContent className="pt-5"><div className="text-sm text-muted-foreground">Трафик нарушителей</div><div className="text-2xl font-semibold">{formatBytes(data.stats.abuserTrafficTotal)}</div></CardContent></Card>
            <Card><CardContent className="pt-5"><div className="text-sm text-muted-foreground">Активные ноды</div><div className="text-2xl font-semibold">{data.stats.activeNodes}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Список нарушителей</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.abusers.map((u) => (
                <div key={`${u.username}-${u.uuid}`} className="rounded border px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{u.username}</div>
                    <div className="text-xs text-muted-foreground">score: {u.abuseScore}%</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    period: {formatBytes(u.periodUsageBytes)} · limit: {u.trafficLimitBytes ? formatBytes(u.trafficLimitBytes) : "unlimited"} · usage: {u.usagePercent.toFixed(2)}%
                  </div>
                </div>
              ))}
              {!data.abusers.length && <div className="text-sm text-muted-foreground">Нарушители не найдены</div>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
