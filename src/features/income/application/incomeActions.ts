"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { ErrorCode } from "@/shared/lib/errorCodes";
import { mapSupabaseError } from "@/shared/lib/mapSupabaseError";
import type { Income } from "../domain/Income";
import { createIncomeSchema, type CreateIncomeInput } from "../income.types";
import { listIncomes, insertIncome } from "../infrastructure/incomeRepository";

const PAGE_SIZE = 20;

export async function getIncomes(
  projectId: string,
  page: number
): Promise<
  ActionResult<{ incomes: Income[]; totalCount: number; pageSize: number }>
> {
  try {
    const supabase = await createSupabaseServerClient();
    const { incomes, totalCount } = await listIncomes(supabase, projectId, {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    });
    return { ok: true, data: { incomes, totalCount, pageSize: PAGE_SIZE } };
  } catch (err) {
    await logErrorServer({
      module: "features/income/getIncomes",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function createIncome(
  input: CreateIncomeInput
): Promise<ActionResult<null>> {
  const parsed = createIncomeSchema.safeParse(input);
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message ??
      "invalid_input") as ErrorCode;
    return { ok: false, code };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await insertIncome(supabase, {
      projectId: parsed.data.projectId,
      paymentAccountId: parsed.data.paymentAccountId,
      type: parsed.data.type,
      amount: parsed.data.amount,
      date: parsed.data.date,
      remark: parsed.data.remark || null,
    });

    if (error) return { ok: false, code: mapSupabaseError(error) };

    revalidatePath("/income");
    revalidatePath("/dashboard");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/income/createIncome",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId: parsed.data.projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}
