"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import { mapSupabaseError } from "@/shared/lib/mapSupabaseError";
import type { SyncSettings, SyncRunSummary } from "../domain/SyncRun";
import { runGuestSync } from "../infrastructure/csvGuestSync";
import {
  getSyncSettingsRow,
  upsertCsvUrl,
  ensureFieldMappingsSeeded,
  updateFieldMappingRow,
  setAllowOverwriteFlag,
  insertSyncRun,
  listSyncRuns,
} from "../infrastructure/syncRepository";

export async function getSyncSettings(
  projectId: string
): Promise<ActionResult<SyncSettings>> {
  try {
    const supabase = await createSupabaseServerClient();
    let settings = await getSyncSettingsRow(supabase, projectId);

    if (settings.fieldMappings.length === 0) {
      await ensureFieldMappingsSeeded(supabase, projectId);
      settings = await getSyncSettingsRow(supabase, projectId);
    }

    return { ok: true, data: settings };
  } catch (err) {
    await logErrorServer({
      module: "features/sync/getSyncSettings",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function updateCsvUrl(
  projectId: string,
  csvUrl: string
): Promise<ActionResult<null>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await upsertCsvUrl(supabase, projectId, csvUrl);
    if (error) return { ok: false, code: mapSupabaseError(error) };

    revalidatePath("/settings/integrations");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/sync/updateCsvUrl",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function updateFieldMapping(
  id: string,
  sourceField: string
): Promise<ActionResult<null>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await updateFieldMappingRow(supabase, id, sourceField);
    if (error) return { ok: false, code: mapSupabaseError(error) };

    revalidatePath("/settings/integrations");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/sync/updateFieldMapping",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function setAllowOverwrite(
  projectId: string,
  enabled: boolean
): Promise<ActionResult<null>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await setAllowOverwriteFlag(supabase, projectId, enabled);
    if (error) return { ok: false, code: mapSupabaseError(error) };

    revalidatePath("/settings/integrations");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/sync/setAllowOverwrite",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function triggerGuestSync(
  projectId: string
): Promise<ActionResult<SyncRunSummary>> {
  try {
    const { user } = await requireSessionContext();
    const supabase = await createSupabaseServerClient();
    const settings = await getSyncSettingsRow(supabase, projectId);

    if (!settings.csvUrl) {
      return { ok: false, code: "no_csv_url" };
    }

    const result = await runGuestSync(supabase, projectId, settings.csvUrl);
    const run = await insertSyncRun(supabase, projectId, user.id, result);

    if (!run) return { ok: false, code: "unknown_error" };

    revalidatePath("/settings/integrations");
    revalidatePath("/guests");
    revalidatePath("/income");
    return { ok: true, data: run };
  } catch (err) {
    await logErrorServer({
      module: "features/sync/triggerGuestSync",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function getSyncRunHistory(
  projectId: string
): Promise<ActionResult<SyncRunSummary[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const runs = await listSyncRuns(supabase, projectId);
    return { ok: true, data: runs };
  } catch (err) {
    await logErrorServer({
      module: "features/sync/getSyncRunHistory",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}
