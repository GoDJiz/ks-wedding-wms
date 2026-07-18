import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SyncSettings,
  SyncRunSummary,
  AutoSyncIntervalMinutes,
} from "../domain/SyncRun";
import { SYNC_MAPPING_KEYS } from "@/shared/lib/guestIncomeSync";

export async function getSyncSettingsRow(
  supabase: SupabaseClient,
  projectId: string
): Promise<SyncSettings> {
  const [configRes, mappingsRes, flagRes] = await Promise.all([
    supabase
      .from("sync_configs")
      .select(
        "csv_url, auto_sync_enabled, sync_interval_minutes, last_sync_at, next_sync_at"
      )
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("sync_field_mappings")
      .select("id, source_field, target_field")
      .eq("project_id", projectId)
      // Excludes the guest->income Payment Account setting, which also
      // lives in this table now (see shared/lib/guestIncomeSync.ts) — it
      // must never appear as an editable row in the CSV column-mapping UI.
      .neq("target_field", SYNC_MAPPING_KEYS.GUEST_INCOME_PAYMENT_ACCOUNT)
      .order("target_field", { ascending: true }),
    supabase
      .from("feature_flags")
      .select("enabled")
      .eq("project_id", projectId)
      .eq("flag_key", "sync_allow_overwrite_manual")
      .maybeSingle(),
  ]);

  return {
    csvUrl: (configRes.data?.csv_url as string | null) ?? null,
    fieldMappings: (mappingsRes.data ?? []).map((m) => ({
      id: m.id as string,
      sourceField: m.source_field as string,
      targetField: m.target_field as string,
    })),
    allowOverwriteManual: flagRes.data?.enabled === true,
    autoSyncEnabled: configRes.data?.auto_sync_enabled === true,
    syncIntervalMinutes: (configRes.data?.sync_interval_minutes ??
      60) as AutoSyncIntervalMinutes,
    lastSyncAt: (configRes.data?.last_sync_at as string | null) ?? null,
    nextSyncAt: (configRes.data?.next_sync_at as string | null) ?? null,
  };
}

/**
 * Updates the Auto Sync toggle and/or interval for a project. Only ever
 * writes `next_sync_at` here (never creates/removes the pg_cron job — that
 * stays a single global schedule, see migration 0013). Turning Auto Sync on
 * or changing the interval both reschedule `next_sync_at` to "now + the
 * (possibly new) interval" so the next global cron tick picks up the change
 * without needing an immediate sync.
 */
export async function updateAutoSyncSettings(
  supabase: SupabaseClient,
  projectId: string,
  autoSyncEnabled: boolean,
  syncIntervalMinutes: AutoSyncIntervalMinutes
): Promise<{ error: string | null }> {
  const nextSyncAt = autoSyncEnabled
    ? new Date(Date.now() + syncIntervalMinutes * 60_000).toISOString()
    : null;

  const { error } = await supabase.from("sync_configs").upsert(
    {
      project_id: projectId,
      auto_sync_enabled: autoSyncEnabled,
      sync_interval_minutes: syncIntervalMinutes,
      next_sync_at: nextSyncAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" }
  );
  return { error: error?.message ?? null };
}

/**
 * Atomically claims every project whose Auto Sync is due right now and
 * reschedules its `next_sync_at` in the same statement (via the
 * `claim_due_auto_syncs` SQL function — see migration 0013). This is what
 * makes concurrent/overlapping cron ticks safe: a project claimed by one
 * call is immediately rescheduled, so a second call racing it will not see
 * it as due anymore.
 */
export type DueAutoSync = {
  projectId: string;
  csvUrl: string | null;
};

export async function claimDueAutoSyncs(
  supabase: SupabaseClient
): Promise<DueAutoSync[]> {
  const { data, error } = await supabase.rpc("claim_due_auto_syncs");
  if (error || !data) return [];
  return (data as { project_id: string; csv_url: string | null }[]).map(
    (row) => ({ projectId: row.project_id, csvUrl: row.csv_url })
  );
}

export async function markAutoSyncAttempted(
  supabase: SupabaseClient,
  projectId: string,
  attemptedAt: string
): Promise<void> {
  await supabase
    .from("sync_configs")
    .update({ last_sync_at: attemptedAt })
    .eq("project_id", projectId);
}

export async function upsertCsvUrl(
  supabase: SupabaseClient,
  projectId: string,
  csvUrl: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("sync_configs").upsert(
    {
      project_id: projectId,
      csv_url: csvUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" }
  );
  return { error: error?.message ?? null };
}

export async function ensureFieldMappingsSeeded(
  supabase: SupabaseClient,
  projectId: string
): Promise<void> {
  await supabase.rpc("seed_default_sync_mapping", { p_project_id: projectId });
}

export async function updateFieldMappingRow(
  supabase: SupabaseClient,
  id: string,
  sourceField: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("sync_field_mappings")
    .update({ source_field: sourceField })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function setAllowOverwriteFlag(
  supabase: SupabaseClient,
  projectId: string,
  enabled: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("feature_flags").upsert(
    {
      project_id: projectId,
      flag_key: "sync_allow_overwrite_manual",
      enabled,
    },
    { onConflict: "project_id,flag_key" }
  );
  return { error: error?.message ?? null };
}

export type PaymentAccountOption = { id: string; name: string };

export async function listPaymentAccountOptions(
  supabase: SupabaseClient,
  projectId: string
): Promise<PaymentAccountOption[]> {
  const { data } = await supabase
    .from("payment_accounts")
    .select("id, name")
    .eq("project_id", projectId)
    .order("name", { ascending: true });
  return (data ?? []) as PaymentAccountOption[];
}

/**
 * Sets the administrator-selected Payment Account for guest->income sync.
 * Stored in sync_field_mappings under a reserved key (chat-approved reuse,
 * no schema change) — see SYNC_MAPPING_KEYS in shared/lib/guestIncomeSync.ts.
 * Server-side callers must validate the
 * given id actually belongs to this project's payment_accounts before
 * calling this — this function does not re-validate that itself.
 */
export async function upsertIncomePaymentAccountMapping(
  supabase: SupabaseClient,
  projectId: string,
  paymentAccountId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("sync_field_mappings").upsert(
    {
      project_id: projectId,
      target_field: SYNC_MAPPING_KEYS.GUEST_INCOME_PAYMENT_ACCOUNT,
      source_field: paymentAccountId,
    },
    { onConflict: "project_id,target_field" }
  );
  return { error: error?.message ?? null };
}

export async function insertSyncRun(
  supabase: SupabaseClient,
  projectId: string,
  triggeredBy: string | null,
  result: {
    status: string;
    rowsProcessed: number;
    rowsInserted: number;
    rowsUpdated: number;
    rowsSkipped: number;
    rowsFailed: number;
    errorLog: unknown;
    csvHash?: string | null;
  }
): Promise<SyncRunSummary | null> {
  const { data, error } = await supabase
    .from("sync_runs")
    .insert({
      project_id: projectId,
      triggered_by: triggeredBy,
      status: result.status,
      rows_processed: result.rowsProcessed,
      rows_inserted: result.rowsInserted,
      rows_updated: result.rowsUpdated,
      rows_skipped: result.rowsSkipped,
      rows_failed: result.rowsFailed,
      error_log: result.errorLog,
      csv_hash: result.csvHash ?? null,
      finished_at: new Date().toISOString(),
    })
    .select(
      "id, status, rows_processed, rows_inserted, rows_updated, rows_skipped, rows_failed, error_log, started_at, finished_at"
    )
    .single();

  if (error || !data) return null;

  return {
    id: data.id as string,
    status: data.status as SyncRunSummary["status"],
    rowsProcessed: data.rows_processed as number,
    rowsInserted: data.rows_inserted as number,
    rowsUpdated: data.rows_updated as number,
    rowsSkipped: data.rows_skipped as number,
    rowsFailed: data.rows_failed as number,
    errorLog: data.error_log as SyncRunSummary["errorLog"],
    startedAt: data.started_at as string,
    finishedAt: data.finished_at as string | null,
  };
}

export type SyncMetadata = {
  lastSuccessfulSync: string | null;
  lastAttemptedSync: string | null;
  totalRowsProcessed: number;
  currentCsvHash: string | null;
};

export async function getSyncMetadata(
  supabase: SupabaseClient,
  projectId: string
): Promise<SyncMetadata> {
  const [lastAnyRes, lastSuccessRes, allRunsRes] = await Promise.all([
    supabase
      .from("sync_runs")
      .select("started_at, csv_hash")
      .eq("project_id", projectId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sync_runs")
      .select("started_at")
      .eq("project_id", projectId)
      .in("status", ["success", "partial"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("sync_runs")
      .select("rows_processed")
      .eq("project_id", projectId),
  ]);

  const totalRowsProcessed = (allRunsRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.rows_processed),
    0
  );

  return {
    lastSuccessfulSync: lastSuccessRes.data?.started_at ?? null,
    lastAttemptedSync: lastAnyRes.data?.started_at ?? null,
    totalRowsProcessed,
    currentCsvHash: (lastAnyRes.data?.csv_hash as string | null) ?? null,
  };
}

export async function listSyncRuns(
  supabase: SupabaseClient,
  projectId: string,
  limit = 10
): Promise<SyncRunSummary[]> {
  const { data } = await supabase
    .from("sync_runs")
    .select(
      "id, status, rows_processed, rows_inserted, rows_updated, rows_skipped, rows_failed, error_log, started_at, finished_at"
    )
    .eq("project_id", projectId)
    .order("started_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    status: r.status as SyncRunSummary["status"],
    rowsProcessed: r.rows_processed as number,
    rowsInserted: r.rows_inserted as number,
    rowsUpdated: r.rows_updated as number,
    rowsSkipped: r.rows_skipped as number,
    rowsFailed: r.rows_failed as number,
    errorLog: r.error_log as SyncRunSummary["errorLog"],
    startedAt: r.started_at as string,
    finishedAt: r.finished_at as string | null,
  }));
}
