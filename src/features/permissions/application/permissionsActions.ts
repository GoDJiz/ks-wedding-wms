"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import { mapSupabaseError } from "@/shared/lib/mapSupabaseError";
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
    await logErrorServer({
      module: "features/permissions/getPermissionMatrix",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
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
      return { ok: false, code: mapSupabaseError(error) };
    }

    revalidatePath("/settings/permissions");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/permissions/togglePermission",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}
