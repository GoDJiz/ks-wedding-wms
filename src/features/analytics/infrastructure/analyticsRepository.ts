import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsSummary } from "../domain/AnalyticsSummary";

export async function computeAnalytics(
  supabase: SupabaseClient,
  projectId: string
): Promise<AnalyticsSummary> {
  const [
    budgetsRes,
    expensesRes,
    attendingGuestsRes,
    envelopeIncomesRes,
    pendingRes,
  ] = await Promise.all([
    supabase
      .from("budgets")
      .select("budgeted_amount")
      .eq("project_id", projectId),
    supabase
      .from("expenses")
      .select("net_total")
      .eq("project_id", projectId)
      .is("deleted_at", null),
    supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("rsvp_status", "attending"),
    supabase
      .from("incomes")
      .select("amount")
      .eq("project_id", projectId)
      .eq("type", "envelope"),
    supabase
      .from("reimbursement_requests")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .in("status", ["submitted", "pending_approval"]),
  ]);

  const totalBudget = (budgetsRes.data ?? []).reduce(
    (s, b) => s + Number(b.budgeted_amount),
    0
  );
  const totalSpent = (expensesRes.data ?? []).reduce(
    (s, e) => s + Number(e.net_total),
    0
  );
  const attendingCount = attendingGuestsRes.count ?? 0;
  const envelopeAmounts = (envelopeIncomesRes.data ?? []).map((i) =>
    Number(i.amount)
  );

  return {
    costPerGuest: attendingCount > 0 ? totalSpent / attendingCount : 0,
    averageEnvelope:
      envelopeAmounts.length > 0
        ? envelopeAmounts.reduce((s, a) => s + a, 0) / envelopeAmounts.length
        : 0,
    budgetHealthPercent: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    pendingRequestsCount: pendingRes.count ?? 0,
  };
}
