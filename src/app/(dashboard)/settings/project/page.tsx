import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getProject } from "@/features/project/application/projectActions";
import { ProjectSettingsForm } from "@/features/project/components/ProjectSettingsForm";

export default async function ProjectSettingsPage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();
  const result = await getProject(projectId);

  return (
    <PageLayout title={t.project.pageTitle}>
      {result.ok ? (
        <ProjectSettingsForm project={result.data} />
      ) : (
        <InlineError message={translateErrorCode(t, result.code)} />
      )}
    </PageLayout>
  );
}
