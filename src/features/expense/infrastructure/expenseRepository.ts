import type { SupabaseClient } from "@supabase/supabase-js";
import type { Expense } from "../domain/Expense";
import type { SelectOption } from "@/shared/lib/SelectOption";

const EXPENSE_SELECT =
  "id, date, amount, vat, discount, shipping, withholding_tax, net_total, remark, payment_method, created_at, " +
  "category_id, payment_account_id, vendor_id, " +
  "budget_categories(name), payment_accounts(name), vendors(name)";

type ExpenseRow = {
  id: string;
  date: string;
  amount: number;
  vat: number;
  discount: number;
  shipping: number;
  withholding_tax: number;
  net_total: number;
  remark: string | null;
  payment_method: Expense["paymentMethod"];
  created_at: string;
  category_id: string;
  payment_account_id: string;
  vendor_id: string | null;
  budget_categories: { name: string } | null;
  payment_accounts: { name: string } | null;
  vendors: { name: string } | null;
};

function toDomain(row: ExpenseRow): Expense {
  return {
    id: row.id,
    date: row.date,
    categoryId: row.category_id,
    categoryName: row.budget_categories?.name ?? "—",
    paymentAccountId: row.payment_account_id,
    paymentAccountName: row.payment_accounts?.name ?? "—",
    vendorId: row.vendor_id,
    vendorName: row.vendors?.name ?? null,
    amount: Number(row.amount),
    vat: Number(row.vat),
    discount: Number(row.discount),
    shipping: Number(row.shipping),
    withholdingTax: Number(row.withholding_tax),
    netTotal: Number(row.net_total),
    remark: row.remark,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
  };
}

export async function listExpenses(
  supabase: SupabaseClient,
  projectId: string,
  { limit, offset }: { limit: number; offset: number }
): Promise<{ expenses: Expense[]; totalCount: number }> {
  const { data, error, count } = await supabase
    .from("expenses")
    .select(EXPENSE_SELECT, { count: "exact" })
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { expenses: [], totalCount: 0 };

  return {
    expenses: (data as unknown as ExpenseRow[]).map(toDomain),
    totalCount: count ?? 0,
  };
}

export async function insertExpense(
  supabase: SupabaseClient,
  input: {
    projectId: string;
    categoryId: string;
    paymentAccountId: string;
    vendorId: string | null;
    date: string;
    amount: number;
    vat: number;
    discount: number;
    shipping: number;
    withholdingTax: number;
    paymentMethod: string;
    remark: string | null;
  }
): Promise<{ expenseId: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      project_id: input.projectId,
      category_id: input.categoryId,
      payment_account_id: input.paymentAccountId,
      vendor_id: input.vendorId,
      date: input.date,
      amount: input.amount,
      vat: input.vat,
      discount: input.discount,
      shipping: input.shipping,
      withholding_tax: input.withholdingTax,
      payment_method: input.paymentMethod,
      remark: input.remark,
    })
    .select("id")
    .single();

  if (error || !data)
    return { expenseId: null, error: error?.message ?? "insert failed" };
  return { expenseId: data.id as string, error: null };
}

export async function insertExpenseFile(
  supabase: SupabaseClient,
  expenseId: string,
  storagePath: string,
  fileType: "receipt" | "slip" | "product"
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("expense_files").insert({
    expense_id: expenseId,
    storage_path: storagePath,
    file_type: fileType,
  });
  return { error: error?.message ?? null };
}

export async function listCategoryOptions(
  supabase: SupabaseClient,
  projectId: string
): Promise<SelectOption[]> {
  const { data } = await supabase
    .from("budget_categories")
    .select("id, name")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
  }));
}

export async function listAccountOptions(
  supabase: SupabaseClient,
  projectId: string
): Promise<SelectOption[]> {
  const { data } = await supabase
    .from("payment_accounts")
    .select("id, name")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
  }));
}

export async function listVendorOptions(
  supabase: SupabaseClient,
  projectId: string
): Promise<SelectOption[]> {
  const { data } = await supabase
    .from("vendors")
    .select("id, name")
    .eq("project_id", projectId)
    .order("name", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
  }));
}
