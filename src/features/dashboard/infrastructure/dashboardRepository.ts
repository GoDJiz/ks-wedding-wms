import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DashboardSummary,
  CategoryBreakdownItem,
  MonthlyTrendItem,
} from "../domain/DashboardSummary";

export async function computeDashboardSummary(
  supabase: SupabaseClient,
  projectId: string
): Promise<DashboardSummary> {
  // Independent reads in parallel — at this project's scale (a few hundred
  // rows max, per the approved Scale Requirements) fetching everything and
  // aggregating in memory is simpler and just as fast as a DB-side
  // aggregation function would be; not worth the extra complexity here.
  const [budgetsRes, expensesRes, incomesRes] = await Promise.all([
    supabase
      .from("budgets")
      .select("budgeted_amount")
      .eq("project_id", projectId),
    supabase
      .from("expenses")
      .select("date, net_total, budget_categories(name)")
      .eq("project_id", projectId)
      .is("deleted_at", null),
    supabase.from("incomes").select("date, amount").eq("project_id", projectId),
  ]);

  const totalBudget = (budgetsRes.data ?? []).reduce(
    (sum, b) => sum + Number(b.budgeted_amount),
    0
  );

  type ExpenseRow = {
    date: string;
    net_total: number;
    budget_categories: { name: string } | null;
  };
  const expenseRows = (expensesRes.data ?? []) as unknown as ExpenseRow[];
  const spent = expenseRows.reduce((sum, e) => sum + Number(e.net_total), 0);

  const incomeRows = (incomesRes.data ?? []) as {
    date: string;
    amount: number;
  }[];
  const income = incomeRows.reduce((sum, i) => sum + Number(i.amount), 0);

  // Category breakdown
  const categoryTotals = new Map<string, number>();
  for (const e of expenseRows) {
    const name = e.budget_categories?.name ?? "—";
    categoryTotals.set(
      name,
      (categoryTotals.get(name) ?? 0) + Number(e.net_total)
    );
  }
  const categoryBreakdown: CategoryBreakdownItem[] = Array.from(
    categoryTotals.entries()
  )
    .map(([categoryName, spentAmount]) => ({
      categoryName,
      spent: spentAmount,
    }))
    .sort((a, b) => b.spent - a.spent);

  // Monthly trend — last 6 months, including months with no activity
  const monthKeys: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  const expenseByMonth = new Map<string, number>();
  for (const e of expenseRows) {
    const key = e.date.slice(0, 7);
    expenseByMonth.set(
      key,
      (expenseByMonth.get(key) ?? 0) + Number(e.net_total)
    );
  }
  const incomeByMonth = new Map<string, number>();
  for (const i of incomeRows) {
    const key = i.date.slice(0, 7);
    incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + Number(i.amount));
  }

  const monthlyTrend: MonthlyTrendItem[] = monthKeys.map((month) => ({
    month,
    expense: expenseByMonth.get(month) ?? 0,
    income: incomeByMonth.get(month) ?? 0,
  }));

  return {
    totalBudget,
    spent,
    remaining: totalBudget - spent,
    income,
    profitLoss: income - spent,
    categoryBreakdown,
    monthlyTrend,
  };
}
