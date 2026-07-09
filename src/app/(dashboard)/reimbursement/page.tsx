import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getReimbursements } from "@/features/reimbursement/application/adminReimbursementActions";
import { ReimbursementAdminList } from "@/features/reimbursement/components/ReimbursementAdminList";

export default async function ReimbursementPage() {
  await requireSessionContext();
  const { t } = await getDictionary();
  const result = await getReimbursements("all");

  return (
    <PageLayout title={t.reimbursementAdmin.pageTitle}>
      {result.ok ? (
        <ReimbursementAdminList initialRequests={result.data} />
      ) : (
        <InlineError message={translateErrorCode(t, result.code)} />
      )}
    </PageLayout>
  );
}
