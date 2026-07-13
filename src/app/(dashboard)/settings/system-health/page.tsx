import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getSystemHealth } from "@/features/system-health/application/healthActions";
import { SystemHealthCards } from "@/features/system-health/components/SystemHealthCards";

export default async function SystemHealthPage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();
  const result = await getSystemHealth(projectId);

  return (
    <PageLayout title={t.systemHealth.pageTitle}>
      {result.ok ? (
        <SystemHealthCards health={result.data} t={t} />
      ) : (
        <InlineError message={translateErrorCode(t, result.code)} />
      )}
    </PageLayout>
  );
}
