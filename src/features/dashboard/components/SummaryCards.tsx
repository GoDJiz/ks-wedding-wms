import { formatCurrency } from "@/shared/lib/formatCurrency";
import type { DashboardSummary } from "../domain/DashboardSummary";
import type { Dictionary } from "@/lib/i18n/types";

export function SummaryCards({
  summary,
  t,
}: {
  summary: DashboardSummary;
  t: Dictionary;
}) {
  const cards = [
    {
      label: t.dashboard.totalBudget,
      value: summary.totalBudget,
      tone: "default" as const,
    },
    {
      label: t.dashboard.spent,
      value: summary.spent,
      tone: "default" as const,
    },
    {
      label: t.dashboard.remaining,
      value: summary.remaining,
      tone: summary.remaining < 0 ? ("danger" as const) : ("default" as const),
    },
    {
      label: t.dashboard.income,
      value: summary.income,
      tone: "default" as const,
    },
    {
      label: t.dashboard.profitLoss,
      value: summary.profitLoss,
      tone: summary.profitLoss < 0 ? ("danger" as const) : ("success" as const),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl bg-white/70 px-4 py-4">
          <p className="text-xs font-medium text-slate-500">{card.label}</p>
          <p
            className={`mt-1 text-xl font-semibold ${
              card.tone === "danger"
                ? "text-rose-600"
                : card.tone === "success"
                  ? "text-emerald-600"
                  : "text-slate-800"
            }`}
          >
            {formatCurrency(card.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
