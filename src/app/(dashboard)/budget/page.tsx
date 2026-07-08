import { PageLayout } from "@/shared/ui/PageLayout";
import { InlineError } from "@/shared/ui/StateViews";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { getDictionary, translateErrorCode } from "@/lib/i18n/getDictionary";
import { getBudgetOverview } from "@/features/budget/application/budgetActions";
import { BudgetOverviewList } from "@/features/budget/components/BudgetOverviewList";

export default async function BudgetPage() {
  const { projectId } = await requireSessionContext();
  const { t } = await getDictionary();
  const result = await getBudgetOverview(projectId);

  return (
    <PageLayout title={t.budget.pageTitle}>
      {result.ok ? (
        <BudgetOverviewList
          projectId={projectId}
          initialCategories={result.data}
        />
      ) : (
        <InlineError message={translateErrorCode(t, result.code)} />
      )}
    </PageLayout>
  );
}
