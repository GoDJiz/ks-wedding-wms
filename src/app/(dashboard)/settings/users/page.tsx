import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getWhitelistedUsers } from "@/features/users/application/usersActions";
import { UsersManager } from "@/features/users/components/UsersManager";

export default async function UsersSettingsPage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();
  const result = await getWhitelistedUsers(projectId);

  return (
    <PageLayout title={t.users.pageTitle}>
      {result.ok ? (
        <UsersManager projectId={projectId} initialUsers={result.data} />
      ) : (
        <InlineError message={translateErrorCode(t, result.code)} />
      )}
    </PageLayout>
  );
}
