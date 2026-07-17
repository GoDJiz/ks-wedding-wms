"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { ErrorCode } from "@/shared/lib/errorCodes";
import { mapSupabaseError } from "@/shared/lib/mapSupabaseError";
import {
  inviteUserSchema,
  type InviteUserInput,
  type WhitelistedUser,
} from "../users.types";
import {
  listWhitelistedUsers,
  insertWhitelistedUser,
  deleteWhitelistedUser,
} from "../infrastructure/usersRepository";

export async function getWhitelistedUsers(
  projectId: string
): Promise<ActionResult<WhitelistedUser[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const users = await listWhitelistedUsers(supabase, projectId);
    return { ok: true, data: users };
  } catch (err) {
    await logErrorServer({
      module: "features/users/getWhitelistedUsers",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function inviteUser(
  input: InviteUserInput
): Promise<ActionResult<null>> {
  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message ??
      "invalid_input") as ErrorCode;
    return { ok: false, code };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await insertWhitelistedUser(
      supabase,
      parsed.data.email,
      parsed.data.role,
      parsed.data.projectId
    );

    if (error) {
      return { ok: false, code: mapSupabaseError(error) };
    }

    revalidatePath("/settings/users");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/users/inviteUser",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId: parsed.data.projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function removeUser(id: string): Promise<ActionResult<null>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await deleteWhitelistedUser(supabase, id);

    if (error) {
      return { ok: false, code: mapSupabaseError(error) };
    }

    revalidatePath("/settings/users");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/users/removeUser",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}
