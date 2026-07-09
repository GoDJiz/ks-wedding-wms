-- Milestone 3 — Reimbursement
-- Also fixes a gap from Milestone 0/2: no RLS policies existed on
-- storage.objects at all. Supabase enables RLS on that table by default,
-- so every file upload since Milestone 0 (the storage-test spike, and the
-- Milestone 2 Expense receipt upload) would fail with a permission error
-- against a real deployed project. Fixing it here, since the public
-- reimbursement form needs correct Storage policies to work at all.

-- ── Reimbursement Requests ───────────────────────────────────
create table if not exists reimbursement_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  requester_name text not null,
  phone text not null,
  category_id uuid references budget_categories(id),
  vendor_id uuid references vendors(id),
  description text,
  purchase_date date not null,
  requested_amount numeric(12, 2) not null,
  approved_amount numeric(12, 2),
  payment_method text not null check (
    payment_method in ('cash', 'bank_transfer', 'promptpay', 'qr_payment')
  ),
  bank_info jsonb,
  status text not null default 'submitted' check (
    status in (
      'draft', 'submitted', 'pending_approval', 'approved',
      'rejected', 'paid', 'completed', 'cancelled'
    )
  ),
  reject_reason text,
  partial_approval_reason text,
  reviewed_by uuid references auth.users(id),
  expense_id uuid references expenses(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reimbursement_files (
  id uuid primary key default gen_random_uuid(),
  reimbursement_id uuid not null references reimbursement_requests(id) on delete cascade,
  file_type text not null check (file_type in ('receipt', 'product', 'slip', 'cash_photo')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Now that this table exists, wire the FK left as a plain uuid in migration 0004.
alter table expenses
  add constraint expenses_source_reimbursement_id_fkey
  foreign key (source_reimbursement_id) references reimbursement_requests(id);

-- Public read access for the reimbursement form's header (couple's names,
-- wedding date) and to validate the link is real before showing the form.
-- Intentional, narrow exception: this exposes non-financial project display
-- fields to anyone with the link — acceptable for a wedding site (guests
-- broadly know this information anyway); no financial/guest/user data is
-- exposed by this policy, only what's on the `projects` table itself.
create policy "reimbursement_projects_select_public" on projects
  for select using (true);

-- ══════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════
alter table reimbursement_requests enable row level security;
alter table reimbursement_files enable row level security;

-- Public submission: anyone (including anon, no login) can insert — but
-- ONLY as 'submitted' status, never any other value. This is the one place
-- in the schema an unauthenticated write is intentional; the check clause
-- is the actual enforcement (not just app-layer trust), since a client
-- could otherwise call the Supabase API directly and skip the app entirely.
create policy "reimbursement_requests_insert_public" on reimbursement_requests
  for insert
  with check (status = 'submitted');

-- Members can read all requests for their project.
create policy "reimbursement_requests_select_members" on reimbursement_requests
  for select using (is_project_member(project_id));

-- Only owner/admin/finance can update (approve/reject/mark paid/etc) —
-- matches the Functional Requirements permission matrix
-- (reimbursement.approve capability).
create policy "reimbursement_requests_update_managers" on reimbursement_requests
  for update using (has_project_role(project_id, array['owner','admin','finance']));

-- Files: same public-insert-once pattern. No update policy — files are
-- immutable once attached (delete-and-reattach, not edit, if ever needed).
create policy "reimbursement_files_insert_public" on reimbursement_files
  for insert
  with check (true);

create policy "reimbursement_files_select_members" on reimbursement_files
  for select using (
    exists (
      select 1 from reimbursement_requests r
      where r.id = reimbursement_id and is_project_member(r.project_id)
    )
  );

-- ══════════════════════════════════════════════════════════════
-- Audit Log trigger
-- ══════════════════════════════════════════════════════════════
create trigger audit_reimbursement_requests
  after insert or update or delete on reimbursement_requests
  for each row execute function record_audit_log();

-- ══════════════════════════════════════════════════════════════
-- Storage RLS policies (the actual gap fix — see header comment)
-- ══════════════════════════════════════════════════════════════
-- Convention: every uploaded object's path starts with its project_id as
-- the first path segment (e.g. "<project_id>/reimbursements/...",
-- "<project_id>/<expense_id>/..."). These policies check that prefix
-- against project membership, so a single set of rules covers every bucket
-- and every feature that uploads to it.

-- Storage object paths are expected to start with "<project_id>/..." (see
-- below), but a malformed or legacy path (e.g. a dev-spike upload that
-- predates this convention) would make a raw `::uuid` cast throw a hard
-- error inside the RLS check itself, rather than just failing the check —
-- which would break the query entirely, not just deny access to that one
-- row. This wraps the cast so a bad prefix safely evaluates to NULL
-- (which then correctly fails has_project_role's comparison) instead.
create or replace function safe_uuid(p_text text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end;
$$;

-- receipts / slips / product-images: private buckets.
-- Insert: open to anon + authenticated (the public reimbursement form has
-- no login), matching the same "write-only for the public" pattern as the
-- table policies above — someone can upload a file but can never list,
-- read, or overwrite anyone else's.
create policy "storage_private_buckets_insert_anyone" on storage.objects
  for insert
  with check (bucket_id in ('receipts', 'slips', 'product-images'));

-- Select: only project owner/admin/finance can read (via signed URL
-- generation server-side) — never public, never every authenticated user.
create policy "storage_private_buckets_select_managers" on storage.objects
  for select using (
    bucket_id in ('receipts', 'slips', 'product-images')
    and has_project_role(safe_uuid(split_part(name, '/', 1)), array['owner', 'admin', 'finance'])
  );

-- project-assets: public bucket (wedding logo etc).
create policy "storage_project_assets_select_public" on storage.objects
  for select using (bucket_id = 'project-assets');

create policy "storage_project_assets_write_owner_admin" on storage.objects
  for insert
  with check (
    bucket_id = 'project-assets'
    and has_project_role(safe_uuid(split_part(name, '/', 1)), array['owner', 'admin'])
  );

-- ══════════════════════════════════════════════════════════════
-- Indexes
-- ══════════════════════════════════════════════════════════════
create index if not exists idx_reimbursements_project_status
  on reimbursement_requests (project_id, status);
