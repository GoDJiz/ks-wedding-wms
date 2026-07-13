-- Milestone 4 — Guest & Income Synchronization
-- See docs/SYNC_STRATEGY.md for the full design this schema supports.

-- ── Safety columns on guests ─────────────────────────────────
-- external_key already exists (migration 0004) but was unused until now —
-- this is the natural key sync matches sheet_sync rows against.
alter table guests
  add column if not exists is_manually_modified boolean not null default false;

-- ── Income upsert key (so re-syncing doesn't duplicate rows) ─
create unique index if not exists idx_incomes_guest_type_unique
  on incomes (guest_id, type)
  where guest_id is not null;

-- ── Sync configuration (per project) ─────────────────────────
create table if not exists sync_configs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  csv_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create table if not exists sync_field_mappings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  source_field text not null,
  target_field text not null,
  created_at timestamptz not null default now(),
  unique (project_id, target_field)
);

-- ── Sync run log ──────────────────────────────────────────────
create table if not exists sync_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  integration_type text not null default 'google_sheet_guests',
  status text not null check (status in ('success', 'partial', 'failed')),
  rows_processed int not null default 0,
  rows_inserted int not null default 0,
  rows_updated int not null default 0,
  rows_skipped int not null default 0,
  rows_failed int not null default 0,
  error_log jsonb not null default '[]'::jsonb,
  triggered_by uuid references auth.users(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- ══════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════
alter table sync_configs enable row level security;
alter table sync_field_mappings enable row level security;
alter table sync_runs enable row level security;

create policy "sync_configs_select_members" on sync_configs
  for select using (is_project_member(project_id));
create policy "sync_configs_write_owner_admin" on sync_configs
  for all using (has_project_role(project_id, array['owner','admin']));

create policy "sync_field_mappings_select_members" on sync_field_mappings
  for select using (is_project_member(project_id));
create policy "sync_field_mappings_write_owner_admin" on sync_field_mappings
  for all using (has_project_role(project_id, array['owner','admin']));

create policy "sync_runs_select_members" on sync_runs
  for select using (is_project_member(project_id));
-- Insert/update comes from the sync engine using the caller's own
-- authenticated session (in-app "Sync Now") or the service role (external
-- scheduled trigger via the Route Handler) — no separate write policy
-- needed beyond owner/admin/finance already being able to trigger it.
create policy "sync_runs_write_managers" on sync_runs
  for all using (has_project_role(project_id, array['owner','admin','finance']));

-- ══════════════════════════════════════════════════════════════
-- Audit Log triggers for the new config tables (not sync_runs itself —
-- sync_runs IS the log, auditing it would be redundant)
-- ══════════════════════════════════════════════════════════════
create trigger audit_sync_configs after insert or update or delete on sync_configs
  for each row execute function record_audit_log();
create trigger audit_sync_field_mappings after insert or update or delete on sync_field_mappings
  for each row execute function record_audit_log();

-- ══════════════════════════════════════════════════════════════
-- Seed default field mapping (Sheet column name -> guests column) —
-- owner-editable afterward in Settings -> Integrations
-- ══════════════════════════════════════════════════════════════
create or replace function seed_default_sync_mapping(p_project_id uuid)
returns void
language plpgsql
as $$
begin
  insert into sync_field_mappings (project_id, source_field, target_field) values
    (p_project_id, 'Name', 'name'),
    (p_project_id, 'Phone', 'phone'),
    (p_project_id, 'Email', 'email'),
    (p_project_id, 'Table', 'table_no'),
    (p_project_id, 'RSVP', 'rsvp_status'),
    (p_project_id, 'Transfer Amount', 'transfer_amount'),
    (p_project_id, 'Envelope Amount', 'envelope_amount'),
    (p_project_id, 'Remarks', 'remark')
  on conflict (project_id, target_field) do nothing;
end;
$$;
