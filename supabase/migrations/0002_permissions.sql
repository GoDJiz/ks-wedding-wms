-- Milestone 1 — Permission Matrix
-- Adds the owner-customizable capability matrix described in
-- Functional Requirements §1 and Database Design "permissions" table.

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  role text not null check (role in ('owner','admin','finance','organizer','viewer')),
  capability_key text not null,
  allowed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (project_id, role, capability_key)
);

alter table permissions enable row level security;

create policy "permissions_select_members" on permissions
  for select using (is_project_member(project_id));

create policy "permissions_write_owner" on permissions
  for all using (has_project_role(project_id, array['owner']));

-- ── Seed function: default capability matrix for a new project ──────
-- Called once when a project is created (see features/project application layer).
create or replace function seed_default_permissions(p_project_id uuid)
returns void
language plpgsql
as $$
declare
  caps text[] := array[
    'project.manage',
    'users.manage',
    'budget.category.manage',
    'budget.amount.edit',
    'expense.create',
    'reimbursement.approve',
    'income.record',
    'guest.manage',
    'vendor.manage',
    'reports.view',
    'reports.export',
    'audit_log.view',
    'sheet_sync.trigger',
    'integrations.configure'
  ];
  cap text;
begin
  foreach cap in array caps loop
    insert into permissions (project_id, role, capability_key, allowed)
    values
      (p_project_id, 'owner', cap, true),
      (p_project_id, 'admin', cap, cap not in ('project.manage','integrations.configure')),
      (p_project_id, 'finance', cap, cap in ('budget.amount.edit','expense.create','reimbursement.approve','income.record','vendor.manage','reports.view','reports.export')),
      (p_project_id, 'organizer', cap, cap in ('expense.create','guest.manage','vendor.manage','reports.view')),
      (p_project_id, 'viewer', cap, cap in ('reports.view'))
    on conflict (project_id, role, capability_key) do nothing;
  end loop;
end;
$$;
