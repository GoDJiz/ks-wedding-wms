import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getReimbursementDetail } from "@/features/reimbursement/application/adminReimbursementActions";
import { ReimbursementDetailPanel } from "@/features/reimbursement/components/ReimbursementDetailPanel";
import { getExpenseFormOptions } from "@/features/expense/application/expenseActions";

export default async function ReimbursementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();

  const [detailResult, optionsResult] = await Promise.all([
    getReimbursementDetail(id),
    getExpenseFormOptions(projectId),
  ]);

  if (!detailResult.ok) {
    return (
      <PageLayout title={t.reimbursementAdmin.pageTitle}>
        <InlineError message={translateErrorCode(t, detailResult.code)} />
      </PageLayout>
    );
  }
  if (!optionsResult.ok) {
    return (
      <PageLayout title={t.reimbursementAdmin.pageTitle}>
        <InlineError message={translateErrorCode(t, optionsResult.code)} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t.reimbursementAdmin.pageTitle}>
      <ReimbursementDetailPanel
        projectId={projectId}
        request={detailResult.data.request}
        files={detailResult.data.files}
        fileUrls={detailResult.data.fileUrls}
        isPossibleDuplicate={detailResult.data.isPossibleDuplicate}
        categories={optionsResult.data.categories}
        accounts={optionsResult.data.accounts}
      />
    </PageLayout>
  );
}
