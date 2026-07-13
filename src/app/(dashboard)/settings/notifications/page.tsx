import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getRecipients } from "@/features/notifications/application/notificationActions";
import { NotificationRecipientsManager } from "@/features/notifications/components/NotificationRecipientsManager";

export default async function NotificationsPage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();
  const result = await getRecipients(projectId);

  return (
    <PageLayout title={t.notifications.pageTitle}>
      {result.ok ? (
        <NotificationRecipientsManager
          projectId={projectId}
          initialRecipients={result.data}
        />
      ) : (
        <InlineError message={translateErrorCode(t, result.code)} />
      )}
    </PageLayout>
  );
}
