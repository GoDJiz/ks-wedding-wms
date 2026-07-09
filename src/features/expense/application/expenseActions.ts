"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { ErrorCode } from "@/shared/lib/errorCodes";
import { mapSupabaseError } from "@/shared/lib/mapSupabaseError";
import type { Expense } from "../domain/Expense";
import type { SelectOption } from "@/shared/lib/SelectOption";
import { createExpenseSchema, type CreateExpenseInput } from "../expense.types";
import {
  listExpenses,
  insertExpense,
  insertExpenseFile,
  listCategoryOptions,
  listAccountOptions,
  listVendorOptions,
} from "../infrastructure/expenseRepository";

const PAGE_SIZE = 20;

export async function getExpenses(
  projectId: string,
  page: number
): Promise<
  ActionResult<{ expenses: Expense[]; totalCount: number; pageSize: number }>
> {
  try {
    const supabase = await createSupabaseServerClient();
    const { expenses, totalCount } = await listExpenses(supabase, projectId, {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });
    return { ok: true, data: { expenses, totalCount, pageSize: PAGE_SIZE } };
  } catch (err) {
    await logErrorServer({
      module: "features/expense/getExpenses",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function getExpenseFormOptions(projectId: string): Promise<
  ActionResult<{
    categories: SelectOption[];
    accounts: SelectOption[];
    vendors: SelectOption[];
  }>
> {
  try {
    const supabase = await createSupabaseServerClient();
    const [categories, accounts, vendors] = await Promise.all([
      listCategoryOptions(supabase, projectId),
      listAccountOptions(supabase, projectId),
      listVendorOptions(supabase, projectId),
    ]);
    return { ok: true, data: { categories, accounts, vendors } };
  } catch (err) {
    await logErrorServer({
      module: "features/expense/getExpenseFormOptions",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function createExpense(
  input: CreateExpenseInput
): Promise<ActionResult<{ expenseId: string }>> {
  const parsed = createExpenseSchema.safeParse(input);
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message ??
      "invalid_input") as ErrorCode;
    return { ok: false, code };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { expenseId, error } = await insertExpense(supabase, {
      projectId: parsed.data.projectId,
      categoryId: parsed.data.categoryId,
      paymentAccountId: parsed.data.paymentAccountId,
      vendorId: parsed.data.vendorId ?? null,
      date: parsed.data.date,
      amount: parsed.data.amount,
      vat: parsed.data.vat,
      discount: parsed.data.discount,
      shipping: parsed.data.shipping,
      withholdingTax: parsed.data.withholdingTax,
      paymentMethod: parsed.data.paymentMethod,
      remark: parsed.data.remark || null,
    });

    if (error || !expenseId) {
      return { ok: false, code: mapSupabaseError(error ?? "") };
    }

    revalidatePath("/expense");
    revalidatePath("/budget");
    return { ok: true, data: { expenseId } };
  } catch (err) {
    await logErrorServer({
      module: "features/expense/createExpense",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId: parsed.data.projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function attachExpenseReceipt(
  expenseId: string,
  storagePath: string
): Promise<ActionResult<null>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await insertExpenseFile(
      supabase,
      expenseId,
      storagePath,
      "receipt"
    );

    if (error) {
      return { ok: false, code: mapSupabaseError(error) };
    }

    revalidatePath("/expense");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/expense/attachExpenseReceipt",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}
