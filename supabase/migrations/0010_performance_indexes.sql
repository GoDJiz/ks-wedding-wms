-- Pre-v1.0 Performance Review
-- audit_log and sync_runs are both queried as
--   `where project_id = ? order by created_at/started_at desc limit N`
-- (Settings -> Audit Log, /activity, Settings -> Integrations run history)
-- but neither had a supporting index — unlike expenses/incomes/guests,
-- which got one in migration 0004. audit_log in particular is the fastest-
-- growing table in the schema (every insert/update/delete across 10+
-- tables writes a row here via the record_audit_log trigger), making it
-- the most likely to actually benefit from this over the life of the app.

create index if not exists idx_audit_log_project_created
  on audit_log (project_id, created_at desc);

create index if not exists idx_sync_runs_project_started
  on sync_runs (project_id, started_at desc);
