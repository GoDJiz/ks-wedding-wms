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
  bootstrapProjectMembership,
  type BootstrapMembershipResult,
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

/**
 * Seats the currently authenticated user onto the project they were
 * invited to via /settings/users, if they aren't already a member.
 * See migration 0011 for why this has to be a SECURITY DEFINER RPC
 * rather than a plain table write: at this point in the flow the caller
 * has no project_members row yet, so RLS would otherwise block them from
 * reading their own whitelist entry or inserting their own membership.
 *
 * Intended to be called exactly once, right after a session is
 * established (src/app/auth/callback/route.ts). Never throws — a failure
 * here should not block login; worst case the user still lands on
 * /no-project, same as the pre-fix behavior, and this gets logged for
 * an admin to investigate.
 */
export async function bootstrapMembershipForCurrentUser(): Promise<BootstrapMembershipResult> {
  try {
    const supabase = await createSupabaseServerClient();
    return await bootstrapProjectMembership(supabase);
  } catch (err) {
    await logErrorServer({
      module: "features/users/bootstrapMembershipForCurrentUser",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { joined: false, reason: "error", projectId: null, role: null };
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
