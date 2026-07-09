import type { SupabaseClient } from "@supabase/supabase-js";
import type { Income, IncomeType } from "../domain/Income";

const INCOME_SELECT =
  "id, type, amount, date, remark, source, payment_accounts(name), guests(name)";

type IncomeRow = {
  id: string;
  type: IncomeType;
  amount: number;
  date: string;
  remark: string | null;
  source: Income["source"];
  payment_accounts: { name: string } | null;
  guests: { name: string } | null;
};

function toDomain(row: IncomeRow): Income {
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    date: row.date,
    accountName: row.payment_accounts?.name ?? "—",
    guestName: row.guests?.name ?? null,
    remark: row.remark,
    source: row.source,
  };
}

export async function listIncomes(
  supabase: SupabaseClient,
  projectId: string,
  { limit, offset }: { limit: number; offset: number }
): Promise<{ incomes: Income[]; totalCount: number }> {
  const { data, error, count } = await supabase
    .from("incomes")
    .select(INCOME_SELECT, { count: "exact" })
    .eq("project_id", projectId)
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { incomes: [], totalCount: 0 };
  return {
    incomes: (data as unknown as IncomeRow[]).map(toDomain),
    totalCount: count ?? 0,
  };
}

export async function insertIncome(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    paymentAccountId: string;
    type: string;
    amount: number;
    date: string;
    remark: string | null;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("incomes").insert({
    project_id: input.projectId,
    payment_account_id: input.paymentAccountId,
    type: input.type,
    amount: input.amount,
    date: input.date,
    remark: input.remark,
    source: "manual",
  });
  return { error: error?.message ?? null };
}
