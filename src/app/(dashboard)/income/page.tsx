import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getIncomes } from "@/features/income/application/incomeActions";
import { getExpenseFormOptions } from "@/features/expense/application/expenseActions";
import { IncomePageClient } from "@/features/income/components/IncomePageClient";

export default async function IncomePage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();

  const [incomesResult, optionsResult] = await Promise.all([
    getIncomes(projectId, 0),
    getExpenseFormOptions(projectId), // reused for its `accounts` list — same shared shape
  ]);

  if (!incomesResult.ok) {
    return (
      <PageLayout title={t.income.pageTitle}>
        <InlineError message={translateErrorCode(t, incomesResult.code)} />
      </PageLayout>
    );
  }
  if (!optionsResult.ok) {
    return (
      <PageLayout title={t.income.pageTitle}>
        <InlineError message={translateErrorCode(t, optionsResult.code)} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t.income.pageTitle}>
      <IncomePageClient
        projectId={projectId}
        initialIncomes={incomesResult.data.incomes}
        initialTotalCount={incomesResult.data.totalCount}
        pageSize={incomesResult.data.pageSize}
        accounts={optionsResult.data.accounts}
      />
    </PageLayout>
  );
}
