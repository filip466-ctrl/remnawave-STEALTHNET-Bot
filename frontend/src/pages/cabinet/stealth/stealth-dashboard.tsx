/**
 * Stealth Dashboard — главная страница нового дизайна.
 *
 * мультиподписочность как в основном кабинете:
 *   1. Hero/визуал — мягкое свечение + большое лого/иконка над контентом
 *   2. Карточка «Подписки»: СПИСОК всех подписок клиента (единый код для любой —
 *      никаких спецслучаев для «нулевой»). На каждой: статус, «до даты», остаток
 *      дней, кнопки «Продлить» (/cabinet/tariffs?extend=id) и «Настроить»
 *      (/cabinet/subscribe?sub=id).
 *   3. Общие действия: установка VPN, промокоды, устройства, рефералка.
 *   4. Если подписок нет — hero + большая красная Buy CTA.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Settings2, Smartphone, Gift, Users, ChevronRight, Shield, Calendar, Clock, Plus } from "lucide-react";
import { StealthPromocodeModal } from "@/components/stealth/stealth-promocode-modal";
import { StealthDevicesModal } from "@/components/stealth/stealth-devices-modal";
import { useClientAuth } from "@/contexts/client-auth";
import { api } from "@/lib/api";
import { StadiumButton } from "@/components/stealth/stadium-button";
import { cn } from "@/lib/utils";

interface SubCard {
  id: string;
  index: number;
  label: string;
  emoji: string | null;
  expiresAt: string | null;
  daysLeft: number | null;
  isActive: boolean;
  isTrial: boolean;
  /** false → у триала нет кнопок продления/конвертации вовсе. */
  trialConvertEnabled: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "—"; }
}

/**
 * Развернуть Remnawave-обёртку: ответ может приходить как
 * { response: {...} }, { data: { response: {...} } }, либо плоский объект.
 * Идентичная логика используется в classic-dashboard parseSubscription.
 */
function unwrapRemnaSub(sub: unknown): Record<string, unknown> | null {
  if (!sub || typeof sub !== "object") return null;
  const raw = sub as Record<string, unknown>;
  if (raw.response && typeof raw.response === "object") return raw.response as Record<string, unknown>;
  if (raw.data && typeof raw.data === "object") {
    const d = raw.data as Record<string, unknown>;
    if (d.response && typeof d.response === "object") return d.response as Record<string, unknown>;
  }
  return raw;
}

export function StealthDashboard() {
  const { state } = useClientAuth();
  const navigate = useNavigate();
  const [subs, setSubs] = useState<SubCard[] | null>(null);
  const [devices, setDevices] = useState<{ used: number; total: number }>({ used: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0); // bump чтобы перезагрузить инфо после модалок
  const [showPromo, setShowPromo] = useState(false);
  const [showDevices, setShowDevices] = useState(false);

  useEffect(() => {
    if (!state.token) return;
    let alive = true;
    setLoading(true);
    Promise.all([
      api.clientAllSubscriptions(state.token).catch((): { items: [] } => ({ items: [] })),
      api.getClientDevices(state.token).catch(() => ({ total: 0 })),
    ]).then(([all, dev]) => {
      if (!alive) return;
      let devicesTotal = 0;
      const cards: SubCard[] = (all.items ?? []).map((it) => {
        const s = unwrapRemnaSub(it.subscription);
        const expireAt = typeof s?.expireAt === "string" ? s.expireAt : null;
        const expDate = expireAt ? new Date(expireAt) : null;
        const validDate = expDate && !Number.isNaN(expDate.getTime()) ? expDate : null;
        const isActive = !!validDate && validDate.getTime() > Date.now();
        const daysLeft = isActive
          ? Math.max(0, Math.ceil((validDate!.getTime() - Date.now()) / 86_400_000))
          : null;
        const limit = typeof s?.hwidDeviceLimit === "number" ? s.hwidDeviceLimit
          : s?.hwidDeviceLimit != null ? Number(s.hwidDeviceLimit) : 0;
        if (Number.isFinite(limit) && limit > 0) devicesTotal += limit;
        const idx = it.subscriptionIndex ?? 0;
        return {
          id: it.id,
          index: idx,
          label: it.tariffDisplayName?.trim() || `Подписка #${idx}`,
          emoji: it.tariffMenuEmoji ?? null,
          expiresAt: expireAt,
          daysLeft,
          isActive,
          isTrial: Boolean(it.trialId),
          trialConvertEnabled: it.trialConvertEnabled ?? true,
        };
      });
      setSubs(cards);
      setDevices({ used: dev?.total ?? 0, total: devicesTotal });
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [state.token, reloadKey]);

  const hasAnySub = (subs?.length ?? 0) > 0;
  const hasActiveSub = (subs ?? []).some((s) => s.isActive);

  return (
    <div className="px-4 pt-2 space-y-5">
      {/* Hero — большой светящийся шар-логотип (placeholder под favicon бренда) */}
      <div className="relative h-44 md:h-56 flex items-center justify-center">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(closest-side, rgba(255,35,87,0.18), transparent 65%)",
            filter: "blur(12px)",
          }}
        />
        <div className="relative h-32 w-32 md:h-40 md:w-40 rounded-full bg-gradient-to-br from-zinc-900 to-black border border-rose-500/20 flex items-center justify-center shadow-[0_0_60px_-10px_rgba(255,35,87,0.5),inset_0_0_30px_rgba(255,35,87,0.1)]">
          <Shield className="h-14 w-14 md:h-16 md:w-16 text-rose-500" strokeWidth={1.5} />
        </div>
      </div>

      {/* Subscriptions card */}
      <div className="rounded-3xl bg-zinc-900/70 border border-white/[0.06] p-5 backdrop-blur-md space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight">
            {(subs?.length ?? 0) > 1 ? "Подписки" : "Подписка"}
          </h2>
          {!loading && !hasAnySub && (
            <span className="rounded-full bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Нет подписки
            </span>
          )}
        </div>

        {/* Список подписок — единый рендер для любой (включая index 0) */}
        {hasAnySub && (
          <div className="space-y-2.5">
            {(subs ?? []).map((s) => (
              <div
                key={s.id}
                className={cn(
                  "rounded-2xl border p-3.5 space-y-2.5 transition-colors",
                  s.isActive
                    ? "bg-white/[0.03] border-white/[0.07]"
                    : "bg-zinc-900/40 border-white/[0.04]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        s.isActive
                          ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                          : "bg-zinc-600",
                      )}
                    />
                    <span className="text-sm font-bold truncate">
                      {s.emoji ? `${s.emoji} ` : ""}{s.label}
                    </span>
                    {s.isTrial && (
                      <span className="shrink-0 rounded-md bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-400">
                        проба
                      </span>
                    )}
                  </div>
                  {s.isActive ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2 py-1 text-[11px] tabular-nums shrink-0">
                      <Clock className="h-3 w-3 text-zinc-400" strokeWidth={2.2} />
                      {s.daysLeft} дн.
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-lg bg-zinc-800/80 border border-white/[0.05] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      истекла
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 tabular-nums">
                    <Calendar className="h-3 w-3 text-rose-400/80" strokeWidth={2.2} />
                    до {formatDate(s.expiresAt)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* триал: «Конвертировать» (выбор тарифа) или ничего,
                        если конвертация запрещена в настройках триала. */}
                    {(!s.isTrial || s.trialConvertEnabled) && (
                      <button
                        onClick={() => navigate(`/cabinet/tariffs?extend=${encodeURIComponent(s.id)}`)}
                        className="rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 px-3 py-1.5 text-xs font-bold text-rose-400 transition inline-flex items-center gap-1.5"
                      >
                        <Zap className="h-3 w-3" />
                        {s.isTrial ? "Конвертировать" : "Продлить"}
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/cabinet/subscribe?sub=${encodeURIComponent(s.id)}`)}
                      className="rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-zinc-300 transition inline-flex items-center gap-1.5"
                    >
                      <Settings2 className="h-3 w-3" />
                      Настроить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Devices pill */}
        {hasAnySub && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1.5 text-xs">
            <Smartphone className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-zinc-200">
              Устройства{" "}
              <span className="tabular-nums">
                {devices.used}{devices.total > 0 ? `/${devices.total}` : ""}
              </span>
            </span>
          </div>
        )}

        {/* Action stack */}
        <div className="space-y-2.5 pt-1">
          <StadiumButton
            variant="ghost"
            size="md"
            iconLeft={hasAnySub ? <Plus className="h-4 w-4 text-rose-400" /> : <Zap className="h-4 w-4 text-rose-400" />}
            onClick={() => navigate("/cabinet/tariffs")}
          >
            {hasAnySub ? "Оформить ещё подписку" : "Оформить подписку"}
          </StadiumButton>

          <StadiumButton
            variant="highlight"
            size="md"
            iconLeft={
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 border border-rose-500/30">
                <Settings2 className="h-3.5 w-3.5 text-rose-400" />
              </span>
            }
            iconRight={<ChevronRight className="h-4 w-4 text-zinc-500" />}
            onClick={() => navigate("/cabinet/subscribe")}
          >
            <span className="flex-1 text-left">Установить и настроить VPN</span>
          </StadiumButton>

          <div className="grid grid-cols-2 gap-2.5">
            <StadiumButton
              variant="ghost" size="md"
              iconLeft={<Gift className="h-4 w-4 text-zinc-400" />}
              onClick={() => setShowPromo(true)}
              className="!text-xs whitespace-nowrap !px-3"
            >
              Промокоды
            </StadiumButton>
            <StadiumButton
              variant="ghost" size="md"
              iconLeft={<Smartphone className="h-4 w-4 text-zinc-400" />}
              onClick={() => setShowDevices(true)}
              className="!text-xs whitespace-nowrap !px-3"
            >
              Мои устройства
            </StadiumButton>
          </div>

          <StadiumButton
            variant="ghost"
            size="md"
            iconLeft={<Users className="h-4 w-4 text-zinc-400" />}
            onClick={() => navigate("/cabinet/referral")}
          >
            Реферальная система
          </StadiumButton>
        </div>
      </div>

      {/* Если активных подписок нет — большая Buy CTA */}
      {!loading && !hasActiveSub && (
        <div className="px-1">
          <StadiumButton
            variant="primary" size="lg"
            onClick={() => navigate("/cabinet/tariffs")}
          >
            {hasAnySub ? "Продлить подписку" : "Начать бесплатно"}
          </StadiumButton>
        </div>
      )}

      {/* Модалки */}
      <StealthPromocodeModal
        open={showPromo}
        onClose={() => setShowPromo(false)}
        onActivated={() => setReloadKey((k) => k + 1)}
      />
      <StealthDevicesModal
        open={showDevices}
        onClose={() => setShowDevices(false)}
        onChanged={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
