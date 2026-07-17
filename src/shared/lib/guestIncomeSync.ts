import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared guest → income sync logic. Lives in shared/ (not inside a single
 * feature's infrastructure/) because it's used by two features — see
 * docs/DEVELOPMENT_RULES.md §1: cross-feature reuse goes through shared/,
 * never by importing one feature's internals from another.
 *
 * Used by:
 *  - features/guest/application/guestActions.ts (manual walk-in create/update)
 *  - features/sync/infrastructure/csvGuestSync.ts (Google Sheet sync)
 */

export type GuestIncomeType = "transfer" | "envelope";

/**
 * Looks up the project's default payment account for auto-created income
 * rows. Extracted from the CSV sync's original inline query so both sync
 * paths share one implementation instead of two copies drifting apart.
 * Returns undefined if the project has no payment account configured yet —
 * callers should skip income sync gracefully in that case, same as before.
 */
export async function getDefaultPaymentAccountId(
  supabase: SupabaseClient,
  projectId: string
): Promise<string | undefined> {
  const { data } = await supabase
    .from("payment_accounts")
    .select("id")
    .eq("project_id", projectId)
    .limit(1)
    .maybeSingle();
  return data?.id as string | undefined;
}

/**
 * Creates or updates the one income record linked to this guest+type,
 * relying on the existing unique index `idx_incomes_guest_type_unique on
 * incomes (guest_id, type)` (migration 0006) to prevent duplicates — this
 * is an upsert, not an insert, so calling it repeatedly with the same
 * guest+type is always safe (Case 2B / duplicate-prevention requirement).
 *
 * Only call this when amount > 0 — it does not know how to zero out an
 * existing record (see zeroOutGuestIncome below for that).
 */
export async function upsertGuestIncome(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    paymentAccountId: string;
    guestId: string;
    type: GuestIncomeType;
    amount: number;
    source: "manual" | "sheet_sync";
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("incomes").upsert(
    {
      project_id: input.projectId,
      payment_account_id: input.paymentAccountId,
      guest_id: input.guestId,
      type: input.type,
      amount: input.amount,
      date: new Date().toISOString().slice(0, 10),
      source: input.source,
    },
    { onConflict: "guest_id,type" }
  );
  return { error: error?.message ?? null };
}

/**
 * TEMPORARY behavior (Scenario C — transfer_amount drops to NULL/0):
 * `incomes` has no status/cancellation column yet, and we're deliberately
 * not adding one for this personal-project scope (see chat decision —
 * avoid unnecessary schema changes, keep the current DB design stable).
 * Until a proper income status/cancellation workflow is introduced in a
 * future milestone, we keep the linked income row (preserving the
 * historical guest↔income relationship, per the requirement not to
 * delete it) and simply zero out its amount instead of a real "cancelled"
 * state. This intentionally does nothing if no linked row exists yet —
 * a guest that was never synced shouldn't get a stray zero-amount income
 * row created for it.
 */
export async function zeroOutGuestIncome(
  supabase: SupabaseClient,
  input: { guestId: string; type: GuestIncomeType }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("incomes")
    .update({ amount: 0 })
    .eq("guest_id", input.guestId)
    .eq("type", input.type);
  return { error: error?.message ?? null };
}

/**
 * Composite entry point for the manual guest flow: given a guest's current
 * `transfer_amount`, either upserts the linked income (amount > 0) or zeros
 * out any existing one (amount <= 0/null), covering the ticket's Cases
 * 1, 2A, 2B and Scenario C in one call. Silently no-ops (like the CSV sync
 * path already did) if the project has no payment account configured yet —
 * guest creation/update should never fail because of a missing account.
 */
export async function syncGuestTransferIncome(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    guestId: string;
    transferAmount: number | null | undefined;
  }
): Promise<{ error: string | null }> {
  const amount = input.transferAmount ?? 0;

  if (amount > 0) {
    const paymentAccountId = await getDefaultPaymentAccountId(
      supabase,
      input.projectId
    );
    if (!paymentAccountId) return { error: null };
    return upsertGuestIncome(supabase, {
      projectId: input.projectId,
      paymentAccountId,
      guestId: input.guestId,
      type: "transfer",
      amount,
      source: "manual",
    });
  }

  return zeroOutGuestIncome(supabase, {
    guestId: input.guestId,
    type: "transfer",
  });
}

/**
 * Pure decision logic for the "Guest Income Sync" indicator on /guests —
 * derived entirely from existing data (guests.transfer_amount + the linked
 * incomes row's amount), no new database field. Exported separately so it
 * can be unit-tested without a Supabase client.
 */
export type GuestIncomeSyncStatus = "synced" | "pending" | "cancelled" | "none";

export function guestIncomeSyncStatus(
  transferAmount: number,
  linkedIncomeAmount: number | null
): GuestIncomeSyncStatus {
  if (transferAmount > 0) {
    return linkedIncomeAmount === transferAmount ? "synced" : "pending";
  }
  // transfer_amount is 0/absent: a linked income row still existing (even
  // at amount 0, per the zero-out behavior above) means it was cancelled,
  // not that it never existed.
  return linkedIncomeAmount !== null ? "cancelled" : "none";
}
