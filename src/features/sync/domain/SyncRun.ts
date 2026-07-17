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

export type SyncSettings = {
  csvUrl: string | null;
  fieldMappings: FieldMapping[];
  allowOverwriteManual: boolean;
};

export type GuestIncomeSyncConfig = {
  paymentAccountId: string | null;
  paymentAccountOptions: { id: string; name: string }[];
};
