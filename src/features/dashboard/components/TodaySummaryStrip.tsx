import { formatCurrency } from "@/shared/lib/formatCurrency";
import type { TodaySummary } from "../domain/DashboardSummary";
import type { Dictionary } from "@/lib/i18n/types";

export function TodaySummaryStrip({
  summary,
  t,
}: {
  summary: TodaySummary;
  t: Dictionary;
}) {
  const items = [
    {
      label: t.dashboard.todayExpenses,
      value: formatCurrency(summary.expensesToday),
    },
    {
      label: t.dashboard.todayIncome,
      value: formatCurrency(summary.incomeToday),
    },
    {
      label: t.dashboard.todayNewRequests,
      value: String(summary.newRequestsToday),
    },
    {
      label: t.dashboard.todayNewGuests,
      value: String(summary.newGuestsToday),
    },
  ];

  return (
    <div className="rounded-2xl bg-sky-100/60 px-4 py-3">
      <p className="mb-2 text-xs font-medium text-slate-600">
        {t.dashboard.todaySummary}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-sm font-semibold text-slate-800">{item.value}</p>
            <p className="text-[10px] text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
