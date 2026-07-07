-- Milestone 0 — Architecture Validation
-- Minimal schema needed to prove: multi-project scoping, RLS-enforced roles,
-- email whitelist, application error logging, feature flags.
-- Full schema for Milestones 1+ lives in later migration files.

-- ── Projects ────────────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bride_name text,
  groom_name text,
  wedding_date date,
  venue text,
  logo_url text,
  currency text not null default 'THB',
  default_language text not null default 'th',
  created_at timestamptz not null default now()
);

-- ── Project members (role per user per project) ────────────
create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','finance','organizer','viewer')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

-- ── Email whitelist (who is even allowed to sign in) ────────
create table if not exists whitelisted_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  invited_role text not null default 'viewer',
  project_id uuid references projects(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ── Feature flags ────────────────────────────────────────────
create table if not exists feature_flags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  flag_key text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, flag_key)
);

-- ── Application error logs ───────────────────────────────────
create table if not exists application_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  module text,
  error_message text not null,
  stack_trace text,
  browser text,
  device_type text,
  created_at timestamptz not null default now()
);

-- ══════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════
alter table projects enable row level security;
alter table project_members enable row level security;
alter table whitelisted_emails enable row level security;
alter table feature_flags enable row level security;
alter table application_logs enable row level security;

-- Helper: is the current user a member of a given project, at or above a role?
create or replace function is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id and user_id = auth.uid()
  );
$$;

create or replace function has_project_role(p_project_id uuid, p_roles text[])
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id
      and user_id = auth.uid()
      and role = any(p_roles)
  );
$$;

-- Projects: members can read, only owner/admin can update
create policy "projects_select_members" on projects
  for select using (is_project_member(id));

create policy "projects_update_owner_admin" on projects
  for update using (has_project_role(id, array['owner','admin']));

-- Project members: members can see other members of their project;
-- only owner/admin can manage membership
create policy "project_members_select_own_project" on project_members
  for select using (is_project_member(project_id));

create policy "project_members_write_owner_admin" on project_members
  for insert with check (has_project_role(project_id, array['owner','admin']));

create policy "project_members_update_owner_admin" on project_members
  for update using (has_project_role(project_id, array['owner','admin']));

create policy "project_members_delete_owner_admin" on project_members
  for delete using (has_project_role(project_id, array['owner','admin']));

-- Whitelisted emails: only owner/admin can manage; nobody else can read the list
create policy "whitelist_owner_admin_all" on whitelisted_emails
  for all using (
    project_id is null or has_project_role(project_id, array['owner','admin'])
  );

-- Feature flags: members can read, only owner can toggle
create policy "feature_flags_select_members" on feature_flags
  for select using (is_project_member(project_id));

create policy "feature_flags_write_owner" on feature_flags
  for all using (has_project_role(project_id, array['owner']));

-- Application logs: anyone (incl. anon) can insert their own error;
-- only owner/admin can read
create policy "application_logs_insert_anyone" on application_logs
  for insert with check (true);

create policy "application_logs_select_owner_admin" on application_logs
  for select using (
    project_id is null or has_project_role(project_id, array['owner','admin'])
  );

-- ══════════════════════════════════════════════════════════════
-- Auth Hook: reject sign-in for non-whitelisted emails
-- (Configure this as a "Before User Created" Auth Hook in the
--  Supabase Dashboard → Authentication → Hooks, pointing at this function.)
-- ══════════════════════════════════════════════════════════════
create or replace function check_email_whitelist()
returns trigger
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from whitelisted_emails where email = new.email
  ) then
    raise exception 'Email % is not whitelisted for this application', new.email;
  end if;
  return new;
end;
$$;

-- Note: wire this via Supabase's Auth Hooks UI (not a raw trigger on auth.users,
-- which Supabase manages) — see docs/SETUP.md Step 4 for exact steps.
