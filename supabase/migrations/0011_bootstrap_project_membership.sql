-- Bug fix: newly whitelisted users land on /no-project after first login
--
-- Root cause: inviteUser() (features/users) only inserts a row into
-- whitelisted_emails — it records the *intent* to grant access (email,
-- invited_role, project_id), but it cannot create the actual auth.users
-- row or project_members row, because the person hasn't signed in yet at
-- invite time. The bridge from "whitelisted" to "seated on a project" was
-- simply never wired up anywhere — check_email_whitelist() (see migration
-- 0001) only gates *whether* sign-in is allowed, it never touches
-- project_members. requireSessionContext() then finds no project_members
-- row for the new user and redirects to /no-project.
--
-- The natural place to close this gap is the invited user's first
-- authenticated request (src/app/auth/callback/route.ts, right after
-- exchangeCodeForSession). But that route runs with the NEW user's own,
-- unprivileged session — and by design (0001) both whitelisted_emails and
-- project_members are only readable/writable by existing project
-- owner/admins via RLS. A brand-new user is neither, so a plain
-- session-scoped insert is rejected by RLS, and a plain select can't even
-- see their own whitelist row.
--
-- Fix: one SECURITY DEFINER function, following the exact pattern already
-- used by check_email_whitelist() and record_audit_log() in this codebase.
-- It takes NO parameters — every id it acts on (auth.uid(), the caller's
-- own email) is derived server-side from the caller's JWT, never supplied
-- by the client. That means it can only ever seat the CALLER into the
-- project THEY were already invited to by an owner/admin (who created the
-- whitelisted_emails row via the existing /settings/users flow) — it
-- cannot be used to add an arbitrary user to an arbitrary project, so RLS
-- remains the real access control for every other path into these tables.

-- SET search_path = public, pg_temp pins name resolution for every
-- unqualified identifier below (whitelisted_emails, project_members) to
-- the public schema, regardless of the CALLER's search_path — closes the
-- classic SECURITY DEFINER search_path-hijack vector (a caller creating
-- an object in a schema that resolves earlier, to shadow one of these
-- names). auth.uid()/auth.users are already schema-qualified so they were
-- never exposed to this either way. Note: is_project_member(),
-- has_project_role(), is_owner_or_admin_anywhere(), and
-- check_email_whitelist() (0001) and record_audit_log() (0003) predate
-- this hardening and do not yet set search_path — worth a follow-up
-- migration, out of scope here.
create or replace function bootstrap_project_membership()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_project_id uuid;
  v_role text;
  v_already_member boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('joined', false, 'reason', 'not_authenticated');
  end if;

  select email into v_email from auth.users where id = v_user_id;

  if v_email is null then
    return jsonb_build_object('joined', false, 'reason', 'not_authenticated');
  end if;

  -- whitelisted_emails.email is globally unique (0001), so at most one
  -- pending invitation can exist per email at any given time — no
  -- "multiple simultaneous project invites" case to disambiguate here.
  select project_id, invited_role
    into v_project_id, v_role
  from whitelisted_emails
  where email = v_email;

  if v_project_id is null then
    -- No whitelist row for this email, or a whitelist row with no
    -- project_id attached (a global invite not tied to a specific
    -- project) — nothing to seat them into.
    return jsonb_build_object('joined', false, 'reason', 'not_whitelisted');
  end if;

  select exists (
    select 1 from project_members
    where project_id = v_project_id and user_id = v_user_id
  ) into v_already_member;

  if v_already_member then
    return jsonb_build_object(
      'joined', false,
      'reason', 'already_member',
      'project_id', v_project_id,
      'role', v_role
    );
  end if;

  -- project_members.role is constrained to a fixed set (0001); invited_role
  -- on whitelisted_emails is not DB-constrained (only Zod-validated at
  -- invite time in usersActions.ts), so guard against a stray/invalid
  -- value instead of letting the insert raise an unhandled exception on
  -- every future login attempt for that row.
  if v_role not in ('owner', 'admin', 'finance', 'organizer', 'viewer') then
    return jsonb_build_object(
      'joined', false,
      'reason', 'invalid_role',
      'project_id', v_project_id
    );
  end if;

  insert into project_members (project_id, user_id, role)
  values (v_project_id, v_user_id, v_role)
  on conflict (project_id, user_id) do nothing;

  return jsonb_build_object(
    'joined', true,
    'reason', 'joined',
    'project_id', v_project_id,
    'role', v_role
  );
exception
  when others then
    -- Never let a bootstrap failure surface as a hard error on login —
    -- worst case the user still lands on /no-project, same as today,
    -- and an admin can investigate rather than the user being locked
    -- out of the login flow entirely.
    return jsonb_build_object('joined', false, 'reason', 'error');
end;
$$;

-- Any authenticated user may call this — safe per the comment above: it
-- only ever reads/writes rows tied to auth.uid()/the caller's own email,
-- never a caller-supplied id, so it cannot be used to seat someone else
-- or join a project they weren't invited to.
grant execute on function bootstrap_project_membership() to authenticated;
