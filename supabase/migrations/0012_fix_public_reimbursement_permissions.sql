-- Fix — Public Reimbursement Link Permission Bug
-- Root cause: the "reimbursement_files_insert_public" policy (0009) enforces
-- its WITH CHECK by running a subquery against `reimbursement_requests`:
--
--   exists (select 1 from reimbursement_requests r
--           where r.id = reimbursement_id and r.status = 'submitted')
--
-- RLS policy subqueries run with the privileges of the CALLING role, not the
-- table owner. `reimbursement_requests` has no public/anon SELECT policy —
-- only "reimbursement_requests_select_members" (project members) — so for an
-- anonymous requester that subquery is itself blocked by RLS and silently
-- returns zero rows, no matter what the row's real status is. The WITH CHECK
-- therefore always evaluates to false for a public submitter, and the file
-- attachment insert is rejected as a permission error. Authenticated project
-- members never hit this because their own SELECT policy lets the subquery
-- see the row.
--
-- This is the "No Permission" a public link visitor sees on submit: the
-- request insert can succeed, but the very next call (attaching the
-- uploaded receipt/slip) is denied purely because of how the check is
-- implemented — not because of any real ownership or membership rule. The
-- fix moves the status lookup into a SECURITY DEFINER helper function, which
-- runs with the function owner's privileges and bypasses RLS for that one
-- read-only lookup, while the WITH CHECK condition itself (must still be
-- "submitted") is unchanged.
--
-- Also re-affirms (drop + recreate, identical logic) the other policies that
-- make up the intended "no login, no account, no membership required" public
-- flow, in case any of them individually drifted — this migration is meant
-- to be the single source of truth for "can an anonymous visitor with a
-- valid link submit a reimbursement" and leaves every other policy (member
-- reads, manager-only updates, storage read access) exactly as-is.

-- ══════════════════════════════════════════════════════════════
-- 1. SECURITY DEFINER helper — RLS-bypassing status lookup used only to
--    evaluate the reimbursement_files insert check below. Read-only,
--    returns a boolean, exposes no row data to the caller.
-- ══════════════════════════════════════════════════════════════
create or replace function reimbursement_request_is_submitted(p_request_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from reimbursement_requests
    where id = p_request_id and status = 'submitted'
  );
$$;

revoke all on function reimbursement_request_is_submitted(uuid) from public;
grant execute on function reimbursement_request_is_submitted(uuid) to anon, authenticated;

-- ══════════════════════════════════════════════════════════════
-- 2. reimbursement_files — same rule as before (only attach files to a
--    request that still exists and is still 'submitted'), now evaluated
--    without depending on the caller's SELECT access to the parent table.
-- ══════════════════════════════════════════════════════════════
drop policy if exists "reimbursement_files_insert_public" on reimbursement_files;

create policy "reimbursement_files_insert_public" on reimbursement_files
  for insert
  with check (reimbursement_request_is_submitted(reimbursement_id));

-- ══════════════════════════════════════════════════════════════
-- 3. Re-affirm the rest of the public flow, unchanged from 0005/0009 —
--    guards against any of these having been altered outside of migrations.
-- ══════════════════════════════════════════════════════════════
drop policy if exists "reimbursement_projects_select_public" on projects;

create policy "reimbursement_projects_select_public" on projects
  for select using (true);

drop policy if exists "reimbursement_requests_insert_public" on reimbursement_requests;

create policy "reimbursement_requests_insert_public" on reimbursement_requests
  for insert
  with check (
    status = 'submitted'
    and approved_amount is null
    and reviewed_by is null
    and reject_reason is null
    and partial_approval_reason is null
    and expense_id is null
  );

drop policy if exists "storage_private_buckets_insert_anyone" on storage.objects;

create policy "storage_private_buckets_insert_anyone" on storage.objects
  for insert
  with check (bucket_id in ('receipts', 'slips', 'product-images'));
