import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyProjectRecipients } from "@/shared/notifications/notifyRecipients";

/**
 * "Upcoming payment reminders" — scoped to what actually exists in the
 * schema today. There's no due-date or vendor-installment concept yet
 * (Vendor Installments are Milestone 6 scope), so this reminds about
 * reimbursements that were Approved but have sat unpaid longer than
 * `thresholdDays` — the closest real analog to "a payment is coming due
 * and hasn't happened yet" available right now. Revisit once Vendor
 * Installments exist and have real due dates to remind against.
 */
export async function sendUpcomingPaymentReminders(
  supabase: SupabaseClient,
  projectId: string,
  thresholdDays = 3
): Promise<{ remindedCount: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);

  const { data: staleApproved } = await supabase
    .from("reimbursement_requests")
    .select("id, requester_name, approved_amount, requested_amount, updated_at")
    .eq("project_id", projectId)
    .eq("status", "approved")
    .lt("updated_at", cutoff.toISOString());

  const rows = staleApproved ?? [];
  if (rows.length === 0) return { remindedCount: 0 };

  const totalAmount = rows.reduce(
    (sum, r) => sum + Number(r.approved_amount ?? r.requested_amount),
    0
  );

  await notifyProjectRecipients(supabase, projectId, {
    title: "Upcoming Payment Reminder",
    summary: `${rows.length} approved reimbursement(s) still awaiting payment: ${rows
      .map((r) => r.requester_name)
      .join(", ")}`,
    amountText: `${totalAmount.toFixed(2)} THB total`,
  });

  return { remindedCount: rows.length };
}
