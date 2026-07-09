import type { SupabaseClient } from "@supabase/supabase-js";
import type { SyncSettings, SyncRunSummary } from "../domain/SyncRun";

export async function getSyncSettingsRow(
  supabase: SupabaseClient,
  projectId: string
): Promise<SyncSettings> {
  const [configRes, mappingsRes, flagRes] = await Promise.all([
    supabase
      .from("sync_configs")
      .select("csv_url")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("sync_field_mappings")
      .select("id, source_field, target_field")
      .eq("project_id", projectId)
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
  };
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
