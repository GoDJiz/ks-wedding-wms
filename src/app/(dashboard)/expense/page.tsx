import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import {
  getExpenses,
  getExpenseFormOptions,
} from "@/features/expense/application/expenseActions";
import { ExpensePageClient } from "@/features/expense/components/ExpensePageClient";

export default async function ExpensePage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();

  // Fetched in parallel — independent reads, no reason to wait on one
  // before starting the other (DEVELOPMENT_RULES.md §18).
  const [expensesResult, optionsResult] = await Promise.all([
    getExpenses(projectId, 0),
    getExpenseFormOptions(projectId),
  ]);

  if (!expensesResult.ok) {
    return (
      <PageLayout title={t.expense.pageTitle}>
        <InlineError message={translateErrorCode(t, expensesResult.code)} />
      </PageLayout>
    );
  }
  if (!optionsResult.ok) {
    return (
      <PageLayout title={t.expense.pageTitle}>
        <InlineError message={translateErrorCode(t, optionsResult.code)} />
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t.expense.pageTitle}>
      <ExpensePageClient
        projectId={projectId}
        initialExpenses={expensesResult.data.expenses}
        initialTotalCount={expensesResult.data.totalCount}
        pageSize={expensesResult.data.pageSize}
        categories={optionsResult.data.categories}
        accounts={optionsResult.data.accounts}
        vendors={optionsResult.data.vendors}
      />
    </PageLayout>
  );
}
