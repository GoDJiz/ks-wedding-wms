import { formatCurrency } from "@/shared/lib/formatCurrency";
import type { AnalyticsSummary } from "../domain/AnalyticsSummary";
import type { Dictionary } from "@/lib/i18n/types";

export function AnalyticsCards({
  summary,
  t,
}: {
  summary: AnalyticsSummary;
  t: Dictionary;
}) {
  const cards = [
    {
      label: t.analytics.costPerGuest,
      value: formatCurrency(summary.costPerGuest),
    },
    {
      label: t.analytics.averageEnvelope,
      value: formatCurrency(summary.averageEnvelope),
    },
    {
      label: t.analytics.budgetHealth,
      value: `${summary.budgetHealthPercent.toFixed(0)}%`,
    },
    {
      label: t.analytics.pendingRequests,
      value: String(summary.pendingRequestsCount),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl bg-white/70 px-4 py-4">
          <p className="text-xs font-medium text-slate-500">{card.label}</p>
          <p className="mt-1 text-xl font-semibold text-slate-800">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
