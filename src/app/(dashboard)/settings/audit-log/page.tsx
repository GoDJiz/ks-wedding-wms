import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getAuditLog } from "@/features/audit-log/application/auditLogActions";
import { AuditLogList } from "@/features/audit-log/components/AuditLogList";

export default async function AuditLogPage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();
  const result = await getAuditLog(projectId);

  return (
    <PageLayout title={t.auditLog.pageTitle}>
      {result.ok ? (
        <AuditLogList
          entries={result.data}
          labels={{
            noEntries: t.auditLog.noEntries,
            who: t.auditLog.who,
            when: t.auditLog.when,
            action: t.auditLog.action,
            table: t.auditLog.table,
          }}
        />
      ) : (
        <InlineError message={translateErrorCode(t, result.code)} />
      )}
    </PageLayout>
  );
}
