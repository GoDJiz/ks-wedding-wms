-- Pre-v1.0 Security Hardening
-- Found during the RC1 -> v1.0 production security review: the public
-- insert policy on reimbursement_files had `with check (true)` — a
-- completely unconditional insert, allowing anyone (no login required, by
-- design for this table) to attach a file record to ANY reimbursement_id,
-- including other people's already-reviewed/approved/paid requests, with
-- no relation to ever having uploaded anything. Not caught earlier because
-- the original comment reasoned about "orphan files tied to an arbitrary
-- reimbursement_id" as the worst case, without accounting for attaching
-- to an *existing, already-processed* request being a meaningfully worse
-- outcome than an orphan.
--
-- Fix: only allow attaching files to a request that still exists and is
-- still in 'submitted' status — i.e., still awaiting first review. Once a
-- request has moved past submitted (pending_approval/approved/rejected/
-- paid/completed/cancelled), no more public file attachments are allowed,
-- matching the same "requester cannot edit after submission" rule already
-- enforced conceptually elsewhere. This doesn't require a login and keeps
-- the same UX (attach files during the original submission), it just
-- closes the window during which the policy is exploitable.

drop policy if exists "reimbursement_files_insert_public" on reimbursement_files;

create policy "reimbursement_files_insert_public" on reimbursement_files
  for insert
  with check (
    exists (
      select 1 from reimbursement_requests r
      where r.id = reimbursement_id and r.status = 'submitted'
    )
  );

-- ══════════════════════════════════════════════════════════════
-- Defense-in-depth: DB-level bounds on public-writable tables.
-- The app's Zod schemas already cap these (reimbursement.types.ts), but
-- Zod only protects callers going through the app's Server Actions — a
-- request hitting the Supabase REST API directly (with just the anon key,
-- which is not secret) bypasses Zod entirely. RLS `with check` clauses
-- validate specific values; length/range bounds need CHECK constraints on
-- the table itself, which apply regardless of which client is inserting.
-- ══════════════════════════════════════════════════════════════
alter table reimbursement_requests
  add constraint reimbursement_requests_requester_name_length check (char_length(requester_name) <= 200),
  add constraint reimbursement_requests_phone_length check (char_length(phone) <= 20),
  add constraint reimbursement_requests_description_length check (description is null or char_length(description) <= 500),
  add constraint reimbursement_requests_bank_info_length check (bank_info is null or char_length(bank_info) <= 500),
  add constraint reimbursement_requests_amount_range check (requested_amount > 0 and requested_amount <= 100000000);

alter table application_logs
  add constraint application_logs_error_message_length check (char_length(error_message) <= 2000),
  add constraint application_logs_stack_trace_length check (stack_trace is null or char_length(stack_trace) <= 5000),
  add constraint application_logs_module_length check (module is null or char_length(module) <= 200);

-- ══════════════════════════════════════════════════════════════
-- Data-integrity gap: RLS `with check (status = 'submitted')` on
-- reimbursement_requests validates that ONE column, but doesn't restrict
-- which OTHER columns an insert can set — a direct-API caller could
-- pre-populate approved_amount / reviewed_by / reject_reason /
-- partial_approval_reason / expense_id on a fresh "submitted" row, which
-- can't move money (only the approve Server Action creates an Expense,
-- and it re-derives its own values) but would show confusing, misleading
-- data to admins reviewing the queue. Closing it directly: these columns
-- must be null on any publicly-inserted row.
-- ══════════════════════════════════════════════════════════════
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

-- ══════════════════════════════════════════════════════════════
-- notification_recipients was readable by ANY project member (including
-- viewer/organizer), but only owner/admin ever manage it via the UI.
-- LINE user IDs aren't highly sensitive on their own, but there's no
-- reason for broader read access than the write access already has —
-- tightened for consistency with whitelisted_emails' same reasoning.
-- ══════════════════════════════════════════════════════════════
drop policy if exists "notification_recipients_select_members" on notification_recipients;

create policy "notification_recipients_select_owner_admin" on notification_recipients
  for select using (has_project_role(project_id, array['owner','admin']));
