-- Milestone 2 — Budget & Expenses
-- Also includes minimal `vendors`, `guests`, `incomes` tables ahead of their
-- roadmapped UI milestones (M6/M4/M4 respectively): expenses.vendor_id needs
-- vendors to exist, and the Dashboard (built in M2) shows an Income figure.
-- Only the schema + seed data exist now — no Vendor/Guest/Income *feature*
-- (CRUD pages) is built until its own milestone, per the approved roadmap.

-- ── Payment Accounts ─────────────────────────────────────────
create table if not exists payment_accounts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  type text not null check (type in ('bank', 'cash')),
  owner text check (owner in ('bride', 'groom', 'joint')),
  created_at timestamptz not null default now()
);

-- ── Budget Categories ────────────────────────────────────────
create table if not exists budget_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  category_id uuid not null references budget_categories(id) on delete cascade,
  budgeted_amount numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, category_id)
);

-- ── Vendors (minimal — see Milestone 6 for installments/bank accounts) ──
create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  contact_person text,
  phone text,
  line_id text,
  facebook text,
  website text,
  remark text,
  created_at timestamptz not null default now()
);

-- ── Expenses ─────────────────────────────────────────────────
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  category_id uuid not null references budget_categories(id),
  payment_account_id uuid not null references payment_accounts(id),
  vendor_id uuid references vendors(id) on delete set null,
  date date not null,
  amount numeric(12, 2) not null,
  vat numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  shipping numeric(12, 2) not null default 0,
  withholding_tax numeric(12, 2) not null default 0,
  net_total numeric(12, 2) generated always as
    (amount + vat - discount + shipping - withholding_tax) stored,
  remark text,
  payment_method text not null check (
    payment_method in ('cash', 'bank_transfer', 'promptpay', 'qr_payment')
  ),
  source_reimbursement_id uuid, -- FK added in Milestone 3
  created_by uuid references auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists expense_files (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  file_type text not null check (file_type in ('receipt', 'slip', 'product')),
  storage_path text not null,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ── Guests (schema only this milestone — see Milestone 4 for the feature) ──
create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  table_no text,
  rsvp_status text not null default 'pending' check (
    rsvp_status in ('pending', 'attending', 'declined')
  ),
  transfer_amount numeric(12, 2) not null default 0,
  envelope_amount numeric(12, 2) not null default 0,
  remark text,
  source text not null default 'walk_in' check (source in ('sheet_sync', 'walk_in')),
  external_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Incomes (schema only this milestone — see Milestone 4 for the feature) ──
create table if not exists incomes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  payment_account_id uuid not null references payment_accounts(id),
  guest_id uuid references guests(id) on delete set null,
  type text not null check (
    type in ('envelope', 'transfer', 'cash', 'sponsor', 'gift', 'gold', 'cheque', 'other')
  ),
  amount numeric(12, 2) not null,
  date date not null,
  source text not null default 'manual' check (source in ('manual', 'sheet_sync')),
  remark text,
  created_at timestamptz not null default now()
);

-- ══════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════
alter table payment_accounts enable row level security;
alter table budget_categories enable row level security;
alter table budgets enable row level security;
alter table vendors enable row level security;
alter table expenses enable row level security;
alter table expense_files enable row level security;
alter table guests enable row level security;
alter table incomes enable row level security;

-- Payment accounts: members read; owner/admin manage
create policy "payment_accounts_select_members" on payment_accounts
  for select using (is_project_member(project_id));
create policy "payment_accounts_write_owner_admin" on payment_accounts
  for all using (has_project_role(project_id, array['owner','admin']));

-- Budget categories: members read; owner/admin manage (per Functional
-- Requirements — "Users cannot create categories, only Admin")
create policy "budget_categories_select_members" on budget_categories
  for select using (is_project_member(project_id));
create policy "budget_categories_write_owner_admin" on budget_categories
  for all using (has_project_role(project_id, array['owner','admin']));

-- Budgeted amounts: members read; owner/admin/finance edit
create policy "budgets_select_members" on budgets
  for select using (is_project_member(project_id));
create policy "budgets_write_finance" on budgets
  for all using (has_project_role(project_id, array['owner','admin','finance']));

-- Vendors: members read; owner/admin/finance/organizer manage (per Functional
-- Requirements permission matrix)
create policy "vendors_select_members" on vendors
  for select using (is_project_member(project_id));
create policy "vendors_write_managers" on vendors
  for all using (has_project_role(project_id, array['owner','admin','finance','organizer']));

-- Expenses: members read; owner/admin/finance/organizer can create/edit.
-- NOTE: the Functional Requirements matrix further restricts Organizer to
-- "own remarks only" — that field-level nuance is NOT enforced by this
-- row-level policy (Postgres RLS is row-level, not column-level). It's
-- enforced in the application layer's Server Action for now. Flagged as a
-- known limitation, not silently skipped — revisit with a column-privilege
-- or trigger-based check if this needs to be bulletproof against a
-- non-application client (e.g. someone hitting the Supabase API directly).
create policy "expenses_select_members" on expenses
  for select using (is_project_member(project_id));
create policy "expenses_write_managers" on expenses
  for all using (has_project_role(project_id, array['owner','admin','finance','organizer']));

create policy "expense_files_select_members" on expense_files
  for select using (
    exists (select 1 from expenses e where e.id = expense_id and is_project_member(e.project_id))
  );
create policy "expense_files_write_managers" on expense_files
  for all using (
    exists (
      select 1 from expenses e
      where e.id = expense_id
        and has_project_role(e.project_id, array['owner','admin','finance','organizer'])
    )
  );

-- Guests: members read; owner/admin/organizer manage
create policy "guests_select_members" on guests
  for select using (is_project_member(project_id));
create policy "guests_write_managers" on guests
  for all using (has_project_role(project_id, array['owner','admin','organizer']));

-- Incomes: members read; owner/admin/finance record
create policy "incomes_select_members" on incomes
  for select using (is_project_member(project_id));
create policy "incomes_write_finance" on incomes
  for all using (has_project_role(project_id, array['owner','admin','finance']));

-- ══════════════════════════════════════════════════════════════
-- Audit Log triggers (per System Architecture doc — DB-trigger based)
-- ══════════════════════════════════════════════════════════════
create trigger audit_payment_accounts after insert or update or delete on payment_accounts
  for each row execute function record_audit_log();
create trigger audit_budget_categories after insert or update or delete on budget_categories
  for each row execute function record_audit_log();
create trigger audit_budgets after insert or update or delete on budgets
  for each row execute function record_audit_log();
create trigger audit_vendors after insert or update or delete on vendors
  for each row execute function record_audit_log();
create trigger audit_expenses after insert or update or delete on expenses
  for each row execute function record_audit_log();
create trigger audit_guests after insert or update or delete on guests
  for each row execute function record_audit_log();
create trigger audit_incomes after insert or update or delete on incomes
  for each row execute function record_audit_log();

-- ══════════════════════════════════════════════════════════════
-- Indexes for the query patterns Milestone 2 actually uses
-- (dashboard totals, expense list filtering/pagination)
-- ══════════════════════════════════════════════════════════════
create index if not exists idx_expenses_project_date on expenses (project_id, date desc) where deleted_at is null;
create index if not exists idx_expenses_project_category on expenses (project_id, category_id) where deleted_at is null;
create index if not exists idx_incomes_project_date on incomes (project_id, date desc);
create index if not exists idx_guests_project_name on guests (project_id, name);
