export type SyncRunStatus = "success" | "partial" | "failed";

export type SyncRunSummary = {
  id: string;
  status: SyncRunStatus;
  rowsProcessed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsFailed: number;
  errorLog: { row: number; reason: string }[];
  startedAt: string;
  finishedAt: string | null;
};

export type FieldMapping = {
  id: string;
  sourceField: string;
  targetField: string;
};

// Keep in sync with the `sync_configs_sync_interval_minutes_check` constraint
// in supabase/migrations/0013_auto_sync_scheduler.sql.
export const AUTO_SYNC_INTERVAL_OPTIONS = [
  15, 30, 60, 180, 360, 720, 1440,
] as const;
export type AutoSyncIntervalMinutes = (typeof AUTO_SYNC_INTERVAL_OPTIONS)[number];

export type SyncSettings = {
  csvUrl: string | null;
  fieldMappings: FieldMapping[];
  allowOverwriteManual: boolean;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: AutoSyncIntervalMinutes;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
};

export type GuestIncomeSyncConfig = {
  paymentAccountId: string | null;
  paymentAccountOptions: { id: string; name: string }[];
};
