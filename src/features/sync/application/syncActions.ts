"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import { mapSupabaseError } from "@/shared/lib/mapSupabaseError";
import type {
  SyncSettings,
  SyncRunSummary,
  GuestIncomeSyncConfig,
} from "../domain/SyncRun";
import type { PreviewItem } from "../infrastructure/csvGuestSync";
import { runGuestSync } from "../infrastructure/csvGuestSync";
import {
  getSyncSettingsRow,
  upsertCsvUrl,
  ensureFieldMappingsSeeded,
  updateFieldMappingRow,
  setAllowOverwriteFlag,
  insertSyncRun,
  listSyncRuns,
  getSyncMetadata,
  listPaymentAccountOptions,
  upsertIncomePaymentAccountMapping,
  type SyncMetadata,
} from "../infrastructure/syncRepository";
import { getConfiguredPaymentAccountId } from "@/shared/lib/guestIncomeSync";

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

export async function getGuestIncomeSyncConfig(
  projectId: string
): Promise<ActionResult<GuestIncomeSyncConfig>> {
  try {
    const supabase = await createSupabaseServerClient();
    const [paymentAccountId, paymentAccountOptions] = await Promise.all([
      getConfiguredPaymentAccountId(supabase, projectId),
      listPaymentAccountOptions(supabase, projectId),
    ]);
    return { ok: true, data: { paymentAccountId, paymentAccountOptions } };
  } catch (err) {
    await logErrorServer({
      module: "features/sync/getGuestIncomeSyncConfig",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function updateGuestIncomeSyncPaymentAccount(
  projectId: string,
  paymentAccountId: string
): Promise<ActionResult<null>> {
  try {
    const supabase = await createSupabaseServerClient();

    // Re-validate server-side that this id actually belongs to the
    // project's own payment_accounts — never trust the dropdown's value
    // as-is, and never fall back to guessing if it doesn't match.
    const options = await listPaymentAccountOptions(supabase, projectId);
    if (!options.some((o) => o.id === paymentAccountId)) {
      return { ok: false, code: "invalid_input" };
    }

    const { error } = await upsertIncomePaymentAccountMapping(
      supabase,
      projectId,
      paymentAccountId
    );
    if (error) return { ok: false, code: mapSupabaseError(error) };

    revalidatePath("/settings/integrations");
    revalidatePath("/guests");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/sync/updateGuestIncomeSyncPaymentAccount",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function triggerGuestSync(
  projectId: string,
  dryRun = false
): Promise<ActionResult<SyncRunSummary & { preview: PreviewItem[] }>> {
  try {
    const { user } = await requireSessionContext();
    const supabase = await createSupabaseServerClient();
    const settings = await getSyncSettingsRow(supabase, projectId);

    if (!settings.csvUrl) {
      return { ok: false, code: "no_csv_url" };
    }

    const result = await runGuestSync(
      supabase,
      projectId,
      settings.csvUrl,
      dryRun
    );

    // A dry run previews what would happen — it isn't a real synchronization,
    // so it doesn't get a permanent sync_runs log entry (run history means
    // "things that actually happened"; keeps this addition lightweight
    // rather than threading a "was this a dry run" flag through the UI).
    if (dryRun) {
      return {
        ok: true,
        data: {
          id: "dry-run",
          status: result.status,
          rowsProcessed: result.rowsProcessed,
          rowsInserted: result.rowsInserted,
          rowsUpdated: result.rowsUpdated,
          rowsSkipped: result.rowsSkipped,
          rowsFailed: result.rowsFailed,
          errorLog: result.errorLog,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          preview: result.preview,
        },
      };
    }

    const run = await insertSyncRun(supabase, projectId, user.id, result);
    if (!run) return { ok: false, code: "unknown_error" };

    revalidatePath("/settings/integrations");
    revalidatePath("/guests");
    revalidatePath("/income");
    return { ok: true, data: { ...run, preview: result.preview } };
  } catch (err) {
    await logErrorServer({
      module: "features/sync/triggerGuestSync",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function getSyncMetadataAction(
  projectId: string
): Promise<ActionResult<SyncMetadata>> {
  try {
    const supabase = await createSupabaseServerClient();
    const metadata = await getSyncMetadata(supabase, projectId);
    return { ok: true, data: metadata };
  } catch (err) {
    await logErrorServer({
      module: "features/sync/getSyncMetadataAction",
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
