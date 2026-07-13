import { PageLayout } from "@/shared/ui/PageLayout";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default async function ReportsPage() {
  await requireSessionContext();
  const { t } = await getDictionary();

  return (
    <PageLayout title={t.reports.pageTitle}>
      <div className="space-y-3">
        <a
          href="/api/reports/budget-pdf"
          className="block min-h-14 rounded-2xl bg-white/70 px-4 py-4 text-sm font-medium text-slate-700 hover:bg-white"
        >
          📄 {t.reports.budgetSummaryPdf}
        </a>
        <a
          href="/api/reports/expense-excel"
          className="block min-h-14 rounded-2xl bg-white/70 px-4 py-4 text-sm font-medium text-slate-700 hover:bg-white"
        >
          📊 {t.reports.expenseExcel}
        </a>
      </div>
    </PageLayout>
  );
}
