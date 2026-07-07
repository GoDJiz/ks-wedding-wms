import { redirect } from "next/navigation";
import { PageLayout } from "@/shared/ui/PageLayout";
import { getDefaultProjectId } from "@/features/project/application/projectActions";
import { getPermissionMatrix } from "@/features/permissions/application/permissionsActions";
import { PermissionMatrix } from "@/features/permissions/components/PermissionMatrix";

export default async function PermissionsSettingsPage() {
  const projectIdResult = await getDefaultProjectId();
  if (!projectIdResult.ok) {
    redirect("/login");
  }

  const permissionsResult = await getPermissionMatrix(projectIdResult.data);

  return (
    <PageLayout title="Permissions">
      {permissionsResult.ok ? (
        <PermissionMatrix initialEntries={permissionsResult.data} />
      ) : (
        <p className="text-sm text-rose-600">{permissionsResult.message}</p>
      )}
    </PageLayout>
  );
}
