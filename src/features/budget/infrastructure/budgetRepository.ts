import type { SupabaseClient } from "@supabase/supabase-js";
import type { BudgetCategoryOverview } from "../domain/BudgetCategoryOverview";

export async function listBudgetOverview(
  supabase: SupabaseClient,
  projectId: string
): Promise<BudgetCategoryOverview[]> {
  // Three independent reads in parallel (categories, budgeted amounts, spent
  // aggregation) — fetched together rather than sequentially, per
  // DEVELOPMENT_RULES.md §18 (avoid client-side/server-side waterfalls).
  const [categoriesRes, budgetsRes, spentRes] = await Promise.all([
    supabase
      .from("budget_categories")
      .select("id, name, sort_order")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("budgets")
      .select("category_id, budgeted_amount")
      .eq("project_id", projectId),
    supabase
      .from("expenses")
      .select("category_id, net_total")
      .eq("project_id", projectId)
      .is("deleted_at", null),
  ]);

  const categories = categoriesRes.data ?? [];
  const budgetByCategory = new Map<string, number>(
    (budgetsRes.data ?? []).map((b) => [
      b.category_id as string,
      Number(b.budgeted_amount),
    ])
  );

  const spentByCategory = new Map<string, number>();
  for (const row of spentRes.data ?? []) {
    const key = row.category_id as string;
    spentByCategory.set(
      key,
      (spentByCategory.get(key) ?? 0) + Number(row.net_total)
    );
  }

  return categories.map((c) => {
    const budgetedAmount = budgetByCategory.get(c.id as string) ?? 0;
    const spentAmount = spentByCategory.get(c.id as string) ?? 0;
    return {
      categoryId: c.id as string,
      name: c.name as string,
      sortOrder: c.sort_order as number,
      budgetedAmount,
      spentAmount,
      remaining: budgetedAmount - spentAmount,
      isOverBudget: spentAmount > budgetedAmount,
    };
  });
}

export async function insertCategory(
  supabase: SupabaseClient,
  projectId: string,
  name: string,
  sortOrder: number
): Promise<{ categoryId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("budget_categories")
    .insert({ project_id: projectId, name, sort_order: sortOrder })
    .select("id")
    .single();

  if (error || !data)
    return { categoryId: null, error: error?.message ?? "insert failed" };

  const { error: budgetError } = await supabase.from("budgets").insert({
    project_id: projectId,
    category_id: data.id,
    budgeted_amount: 0,
  });

  return { categoryId: data.id as string, error: budgetError?.message ?? null };
}

export async function upsertBudgetAmount(
  supabase: SupabaseClient,
  projectId: string,
  categoryId: string,
  budgetedAmount: number
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("budgets").upsert(
    {
      project_id: projectId,
      category_id: categoryId,
      budgeted_amount: budgetedAmount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id,category_id" }
  );

  return { error: error?.message ?? null };
}
