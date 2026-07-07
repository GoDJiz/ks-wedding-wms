"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logError } from "@/application/logging/logError";
import type { ActionResult } from "@/shared/lib/actionResult";
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
    await logError({
      module: "features/users/getWhitelistedUsers",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, message: "Something went wrong loading users." };
  }
}

export async function inviteUser(
  input: InviteUserInput
): Promise<ActionResult<null>> {
  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
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
      return {
        ok: false,
        message:
          "You don't have permission to add users, or this email is already whitelisted.",
      };
    }

    revalidatePath("/settings/users");
    return { ok: true, data: null };
  } catch (err) {
    await logError({
      module: "features/users/inviteUser",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId: parsed.data.projectId,
    });
    return { ok: false, message: "Something went wrong inviting the user." };
  }
}

export async function removeUser(id: string): Promise<ActionResult<null>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await deleteWhitelistedUser(supabase, id);

    if (error) {
      return {
        ok: false,
        message: "You don't have permission to remove this user.",
      };
    }

    revalidatePath("/settings/users");
    return { ok: true, data: null };
  } catch (err) {
    await logError({
      module: "features/users/removeUser",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, message: "Something went wrong removing the user." };
  }
}
