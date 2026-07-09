import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getActivityFeed } from "@/features/activity-feed/application/activityFeedActions";
import { ActivityFeedList } from "@/features/activity-feed/components/ActivityFeedList";

export default async function ActivityPage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();
  const result = await getActivityFeed(projectId);

  return (
    <PageLayout title={t.activity.pageTitle}>
      {result.ok ? (
        <ActivityFeedList entries={result.data} t={t} />
      ) : (
        <InlineError message={translateErrorCode(t, result.code)} />
      )}
    </PageLayout>
  );
}
