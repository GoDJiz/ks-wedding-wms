import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import {
  getSyncSettings,
  getSyncRunHistory,
  getSyncMetadataAction,
} from "@/features/sync/application/syncActions";
import { SyncSettingsPanel } from "@/features/sync/components/SyncSettingsPanel";

export default async function IntegrationsPage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();

  const [settingsResult, runsResult, metadataResult] = await Promise.all([
    getSyncSettings(projectId),
    getSyncRunHistory(projectId),
    getSyncMetadataAction(projectId),
  ]);

  if (!settingsResult.ok) {
    return (
      <PageLayout title={t.sync.pageTitle}>
        <InlineError message={translateErrorCode(t, settingsResult.code)} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t.sync.pageTitle}>
      <SyncSettingsPanel
        projectId={projectId}
        initialSettings={settingsResult.data}
        initialRuns={runsResult.ok ? runsResult.data : []}
        initialMetadata={
          metadataResult.ok
            ? metadataResult.data
            : {
                lastSuccessfulSync: null,
                lastAttemptedSync: null,
                totalRowsProcessed: 0,
                currentCsvHash: null,
              }
        }
      />
    </PageLayout>
  );
}
