import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getDashboardSummary } from "@/features/dashboard/application/dashboardActions";
import { SummaryCards } from "@/features/dashboard/components/SummaryCards";
import {
  CategoryBreakdownChart,
  MonthlyTrendChart,
} from "@/features/dashboard/components/DashboardCharts";

export default async function DashboardPage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();
  const result = await getDashboardSummary(projectId);

  return (
    <PageLayout title={t.dashboard.pageTitle}>
      {result.ok ? (
        <div className="space-y-4">
          <SummaryCards summary={result.data} t={t} />
          <CategoryBreakdownChart data={result.data.categoryBreakdown} />
          <MonthlyTrendChart data={result.data.monthlyTrend} />
        </div>
      ) : (
        <InlineError message={translateErrorCode(t, result.code)} />
      )}
    </PageLayout>
  );
}
