-- Milestone 5 — LINE OA Notifications
create table if not exists notification_recipients (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  line_user_id text not null,
  label text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (project_id, line_user_id)
);

alter table notification_recipients enable row level security;

create policy "notification_recipients_select_members" on notification_recipients
  for select using (is_project_member(project_id));
create policy "notification_recipients_write_owner_admin" on notification_recipients
  for all using (has_project_role(project_id, array['owner','admin']));

create trigger audit_notification_recipients
  after insert or update or delete on notification_recipients
  for each row execute function record_audit_log();
