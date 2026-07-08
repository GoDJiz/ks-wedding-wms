"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { ErrorCode } from "@/shared/lib/errorCodes";
import { mapSupabaseError } from "@/shared/lib/mapSupabaseError";
import type { PaymentAccount } from "../domain/PaymentAccount";
import {
  createPaymentAccountSchema,
  type CreatePaymentAccountInput,
} from "../paymentAccounts.types";
import {
  listPaymentAccounts,
  insertPaymentAccount,
  deletePaymentAccount,
} from "../infrastructure/paymentAccountsRepository";

export async function getPaymentAccounts(
  projectId: string
): Promise<ActionResult<PaymentAccount[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const accounts = await listPaymentAccounts(supabase, projectId);
    return { ok: true, data: accounts };
  } catch (err) {
    await logErrorServer({
      module: "features/payment-accounts/getPaymentAccounts",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function createPaymentAccount(
  input: CreatePaymentAccountInput
): Promise<ActionResult<null>> {
  const parsed = createPaymentAccountSchema.safeParse(input);
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message ??
      "invalid_input") as ErrorCode;
    return { ok: false, code };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await insertPaymentAccount(supabase, parsed.data);

    if (error) {
      return { ok: false, code: mapSupabaseError(error) };
    }

    revalidatePath("/settings/payment-accounts");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/payment-accounts/createPaymentAccount",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId: parsed.data.projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function removePaymentAccount(
  id: string
): Promise<ActionResult<null>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await deletePaymentAccount(supabase, id);

    if (error) {
      return { ok: false, code: mapSupabaseError(error) };
    }

    revalidatePath("/settings/payment-accounts");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/payment-accounts/removePaymentAccount",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}
