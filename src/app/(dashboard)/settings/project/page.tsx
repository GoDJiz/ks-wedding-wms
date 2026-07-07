import { redirect } from "next/navigation";
import { PageLayout } from "@/shared/ui/PageLayout";
import {
  getDefaultProjectId,
  getProject,
} from "@/features/project/application/projectActions";
import { ProjectSettingsForm } from "@/features/project/components/ProjectSettingsForm";

export default async function ProjectSettingsPage() {
  const projectIdResult = await getDefaultProjectId();
  if (!projectIdResult.ok) {
    redirect("/login");
  }

  const projectResult = await getProject(projectIdResult.data);
  if (!projectResult.ok) {
    return (
      <PageLayout title="Wedding Project">
        <p className="text-sm text-rose-600">{projectResult.message}</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Wedding Project">
      <ProjectSettingsForm project={projectResult.data} />
    </PageLayout>
  );
}
