import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getPermissionMatrix } from "@/features/permissions/application/permissionsActions";
import { PermissionMatrix } from "@/features/permissions/components/PermissionMatrix";

export default async function PermissionsSettingsPage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();
  const result = await getPermissionMatrix(projectId);

  return (
    <PageLayout title={t.permissions.pageTitle}>
      {result.ok ? (
        <PermissionMatrix initialEntries={result.data} />
      ) : (
        <InlineError message={translateErrorCode(t, result.code)} />
      )}
    </PageLayout>
  );
}
