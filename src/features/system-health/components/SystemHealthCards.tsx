import type { HealthCheck, SystemHealth } from "../domain/SystemHealth";
import type { Dictionary } from "@/lib/i18n/types";

const statusStyles: Record<
  HealthCheck["status"],
  { color: string; icon: string }
> = {
  ok: { color: "bg-emerald-100 text-emerald-700", icon: "✅" },
  warning: { color: "bg-amber-100 text-amber-700", icon: "⚠️" },
  error: { color: "bg-rose-100 text-rose-700", icon: "❌" },
  not_configured: { color: "bg-slate-100 text-slate-500", icon: "➖" },
};

function StatusRow({ label, check }: { label: string; check: HealthCheck }) {
  const style = statusStyles[check.status];
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-4">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-500">{check.detail}</p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-xs font-medium ${style.color}`}
      >
        {style.icon}
      </span>
    </div>
  );
}

export function SystemHealthCards({
  health,
  t,
}: {
  health: SystemHealth;
  t: Dictionary;
}) {
  return (
    <div className="space-y-2">
      <StatusRow label={t.systemHealth.supabase} check={health.supabase} />
      <StatusRow label={t.systemHealth.storage} check={health.storage} />
      <StatusRow label={t.systemHealth.line} check={health.line} />
      <StatusRow label={t.systemHealth.guestSync} check={health.guestSync} />
    </div>
  );
}
