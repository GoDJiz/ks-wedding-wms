import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentAccount } from "../domain/PaymentAccount";

export async function listPaymentAccounts(
  supabase: SupabaseClient,
  projectId: string
): Promise<PaymentAccount[]> {
  const { data, error } = await supabase
    .from("payment_accounts")
    .select("id, name, type, owner, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    type: row.type as PaymentAccount["type"],
    owner: row.owner as PaymentAccount["owner"],
    createdAt: row.created_at as string,
  }));
}

export async function insertPaymentAccount(
  supabase: SupabaseClient,
  input: { projectId: string; name: string; type: string; owner: string }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("payment_accounts").insert({
    project_id: input.projectId,
    name: input.name,
    type: input.type,
    owner: input.owner,
  });
  return { error: error?.message ?? null };
}

export async function deletePaymentAccount(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("payment_accounts")
    .delete()
    .eq("id", id);
  return { error: error?.message ?? null };
}
