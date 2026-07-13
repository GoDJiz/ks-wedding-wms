-- Small addition: track a hash of the fetched CSV content per run, so
-- Settings -> Integrations can show "current CSV version" and, later if
-- useful, skip a sync when nothing changed. Deliberately just one column —
-- no new tables, per "keep this lightweight."
alter table sync_runs add column if not exists csv_hash text;
