import { redirect } from "next/navigation";
import { PageLayout } from "@/shared/ui/PageLayout";
import { getDefaultProjectId } from "@/features/project/application/projectActions";
import { getWhitelistedUsers } from "@/features/users/application/usersActions";
import { UsersManager } from "@/features/users/components/UsersManager";

export default async function UsersSettingsPage() {
  const projectIdResult = await getDefaultProjectId();
  if (!projectIdResult.ok) {
    redirect("/login");
  }

  const usersResult = await getWhitelistedUsers(projectIdResult.data);

  return (
    <PageLayout title="Users">
      {usersResult.ok ? (
        <UsersManager
          projectId={projectIdResult.data}
          initialUsers={usersResult.data}
        />
      ) : (
        <p className="text-sm text-rose-600">{usersResult.message}</p>
      )}
    </PageLayout>
  );
}
