import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getAnalytics } from "@/features/analytics/application/analyticsActions";
import { AnalyticsCards } from "@/features/analytics/components/AnalyticsCards";

export default async function AnalyticsPage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();
  const result = await getAnalytics(projectId);

  return (
    <PageLayout title={t.analytics.pageTitle}>
      {result.ok ? (
        <AnalyticsCards summary={result.data} t={t} />
      ) : (
        <InlineError message={translateErrorCode(t, result.code)} />
      )}
    </PageLayout>
  );
}
