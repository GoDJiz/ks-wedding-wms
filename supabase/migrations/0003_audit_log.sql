-- Milestone 1 — Audit Log
-- Generic trigger-based audit logging per System Architecture doc §"Error
-- Logging"/Database Design "audit_log" table — every insert/update/delete on
-- a tracked table is mirrored here automatically, so it can't be bypassed by
-- forgetting to call a logging function in application code.

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

alter table audit_log enable row level security;

create policy "audit_log_select_owner_admin" on audit_log
  for select using (
    case
      when project_id is null then is_owner_or_admin_anywhere()
      else has_project_role(project_id, array['owner','admin'])
    end
  );

-- No insert/update/delete policy for regular users — only the trigger
-- function (security definer) writes to this table.

create or replace function record_audit_log()
returns trigger
language plpgsql
security definer
as $$
declare
  v_project_id uuid;
  v_user_email text;
begin
  select email into v_user_email from auth.users where id = auth.uid();

  -- Every tracked table has a project_id column except project_members's
  -- parent (projects itself), where the row's own id is the project id.
  if TG_TABLE_NAME = 'projects' then
    v_project_id := coalesce(new.id, old.id);
  else
    v_project_id := coalesce(new.project_id, old.project_id);
  end if;

  insert into audit_log (project_id, user_id, user_email, action, table_name, record_id, old_value, new_value)
  values (
    v_project_id,
    auth.uid(),
    v_user_email,
    lower(TG_OP),
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    case when TG_OP in ('update','delete') then to_jsonb(old) else null end,
    case when TG_OP in ('insert','update') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

-- Attach to every Milestone 1 table that users can write to.
create trigger audit_projects
  after insert or update or delete on projects
  for each row execute function record_audit_log();

create trigger audit_whitelisted_emails
  after insert or update or delete on whitelisted_emails
  for each row execute function record_audit_log();

create trigger audit_permissions
  after insert or update or delete on permissions
  for each row execute function record_audit_log();

create trigger audit_project_members
  after insert or update or delete on project_members
  for each row execute function record_audit_log();
