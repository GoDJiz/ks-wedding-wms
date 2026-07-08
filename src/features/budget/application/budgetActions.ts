"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { ErrorCode } from "@/shared/lib/errorCodes";
import { mapSupabaseError } from "@/shared/lib/mapSupabaseError";
import type { BudgetCategoryOverview } from "../domain/BudgetCategoryOverview";
import {
  createCategorySchema,
  type CreateCategoryInput,
  updateBudgetAmountSchema,
  type UpdateBudgetAmountInput,
} from "../budget.types";
import {
  listBudgetOverview,
  insertCategory,
  upsertBudgetAmount,
} from "../infrastructure/budgetRepository";

export async function getBudgetOverview(
  projectId: string
): Promise<ActionResult<BudgetCategoryOverview[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const overview = await listBudgetOverview(supabase, projectId);
    return { ok: true, data: overview };
  } catch (err) {
    await logErrorServer({
      module: "features/budget/getBudgetOverview",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function createCategory(
  input: CreateCategoryInput,
  sortOrder: number
): Promise<ActionResult<null>> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message ??
      "invalid_input") as ErrorCode;
    return { ok: false, code };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await insertCategory(
      supabase,
      parsed.data.projectId,
      parsed.data.name,
      sortOrder
    );

    if (error) {
      return { ok: false, code: mapSupabaseError(error) };
    }

    revalidatePath("/budget");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/budget/createCategory",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId: parsed.data.projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function updateBudgetAmount(
  input: UpdateBudgetAmountInput
): Promise<ActionResult<null>> {
  const parsed = updateBudgetAmountSchema.safeParse(input);
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message ??
      "invalid_input") as ErrorCode;
    return { ok: false, code };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await upsertBudgetAmount(
      supabase,
      parsed.data.projectId,
      parsed.data.categoryId,
      parsed.data.budgetedAmount
    );

    if (error) {
      return { ok: false, code: mapSupabaseError(error) };
    }

    revalidatePath("/budget");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/budget/updateBudgetAmount",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId: parsed.data.projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}
