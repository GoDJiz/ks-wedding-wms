"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logError } from "@/application/logging/logError";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { PermissionEntry } from "../permissions.types";
import {
  listPermissions,
  updatePermissionRow,
  ensurePermissionsSeeded,
} from "../infrastructure/permissionsRepository";

export async function getPermissionMatrix(
  projectId: string
): Promise<ActionResult<PermissionEntry[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    let entries = await listPermissions(supabase, projectId);

    if (entries.length === 0) {
      // First load for this project — seed the default matrix (owner-only
      // per RLS; harmless no-op if already seeded or caller isn't owner).
      await ensurePermissionsSeeded(supabase, projectId);
      entries = await listPermissions(supabase, projectId);
    }

    return { ok: true, data: entries };
  } catch (err) {
    await logError({
      module: "features/permissions/getPermissionMatrix",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, message: "Something went wrong loading permissions." };
  }
}

export async function togglePermission(
  id: string,
  allowed: boolean
): Promise<ActionResult<null>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await updatePermissionRow(supabase, id, allowed);

    if (error) {
      return { ok: false, message: "Only the Owner can change permissions." };
    }

    revalidatePath("/settings/permissions");
    return { ok: true, data: null };
  } catch (err) {
    await logError({
      module: "features/permissions/togglePermission",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return {
      ok: false,
      message: "Something went wrong updating the permission.",
    };
  }
}
