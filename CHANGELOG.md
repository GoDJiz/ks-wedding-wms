# Changelog

All notable changes to this project, by version. Dates reflect when each
milestone was completed during development, not calendar dates.

## Unreleased — Bugfix: Public Reimbursement Permission Bug & Safari Compatibility

### 1. Public Reimbursement Link Permission Bug

**Root cause:** `reimbursement_files_insert_public` (added in
`0009_security_hardening.sql`) enforces its `WITH CHECK` with a subquery
against `reimbursement_requests`:
```sql
exists (select 1 from reimbursement_requests r
        where r.id = reimbursement_id and r.status = 'submitted')
```
Postgres RLS subqueries run under the **calling role's** privileges, not
the table owner's. `reimbursement_requests` has no anon/public `SELECT`
policy — only `reimbursement_requests_select_members` (project members).
For an anonymous public-link submitter, that subquery is itself blocked by
RLS and always returns zero rows, so the `WITH CHECK` evaluates to `false`
regardless of the row's real status. Result: the reimbursement request row
inserts fine, but attaching the uploaded receipt/slip is rejected as a
permission error — the "No Permission" the user sees. Logged-in project
members never hit this because their own `SELECT` policy lets the
subquery see the row. No login, account, or project-membership check was
ever added to the request-insert path itself — the bug was isolated to
the file-attachment step.

**Files changed:**
- `supabase/migrations/0012_fix_public_reimbursement_permissions.sql` (new)

**Fix applied:**
- Added a `SECURITY DEFINER` helper function
  `reimbursement_request_is_submitted(uuid)` that performs the same
  read-only status check but bypasses RLS for that one lookup (returns
  only a boolean, exposes no row data).
- `reimbursement_files_insert_public` now calls that function instead of
  the RLS-blocked subquery. The condition being checked (`status =
  'submitted'`) is unchanged — same rule, correctly evaluated.
- Re-affirmed (`drop policy if exists` + identical `create policy`) the
  other three policies making up the intended public flow —
  `reimbursement_projects_select_public`, `reimbursement_requests_insert_public`,
  `storage_private_buckets_insert_anyone` — as a safety net against drift,
  without changing their logic.
- Untouched: `reimbursement_requests_select_members` (member reads),
  `reimbursement_requests_update_managers` (approve/reject), and the
  audit-log trigger — authenticated dashboard/admin reimbursement
  functionality is unaffected. No `WITH CHECK`/`USING` clause was
  loosened; the same conditions are enforced, just evaluated correctly.

**Verification performed:**
- Confirmed via `grep` across all migrations that no public/anon `SELECT`
  policy on `reimbursement_requests` exists, which is exactly what makes
  the old subquery fail for anonymous callers — confirming root cause
  rather than assuming it.
- Diffed the re-affirmed policies against their original definitions in
  `0005_reimbursement.sql` / `0009_security_hardening.sql` to confirm no
  security condition changed.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npm test` all
  pass (this fix is SQL-only; no application code paths changed).
- **Not verified in this environment:** live execution against a running
  Supabase/Postgres instance — no database is reachable from this
  sandbox. After deploying the migration, manually confirm by opening
  `/r/<projectId>` logged out, submitting a request with a receipt
  attached, and checking the admin queue shows both the request **and**
  the attached file (not just that no error appeared).

### 2. Dashboard Safari / iOS / In-App Browser Compatibility

**Root cause:** the three places a Supabase client is created
(`client.ts`, `server.ts`, `proxy.ts`) each relied on `@supabase/ssr`'s
own per-call cookie defaults instead of one explicit, consistent set of
attributes (`path`, `sameSite`, `secure`). Safari/WebKit (which every iOS
browser and in-app browser is required to use) enforces stricter
first-party/same-site cookie handling than Chromium and is less forgiving
of a cookie being set under one implicit default on one request and read
back under a different implicit default on the next — most visibly right
after the redirect back from Google's OAuth consent screen lands on
`/auth/callback`, when the dashboard immediately re-checks the session.
Chrome's cookie jar tolerated the inconsistency; Safari did not.

**Files changed:**
- `src/infrastructure/supabase/cookieOptions.ts` (new — single source of
  truth for cookie attributes)
- `src/infrastructure/supabase/server.ts`
- `src/infrastructure/supabase/client.ts`
- `src/proxy.ts`

**Fix applied:**
- Added `SUPABASE_COOKIE_OPTIONS` (`path: "/"`, `sameSite: "lax"`,
  `secure` only in production, so local `http` dev still works) and
  passed it as `cookieOptions` to all three `createServerClient` /
  `createBrowserClient` calls, so the auth cookie is written and read
  with identical attributes everywhere, on every browser. `sameSite:
  "lax"` (not `"strict"`) is required so the cookie is still sent on the
  top-level GET redirect back from `accounts.google.com`.
- No change to the PKCE flow, OAuth provider config, login UI, or any
  redirect logic — same architecture, same login experience, just
  consistent cookie attributes everywhere they're set or read.

**Verification performed:**
- `npm run lint`, `npx tsc --noEmit`, `npm run build` (Next.js reports the
  Proxy/Middleware and all routes — including `/auth/callback`, `/login`,
  `/dashboard` — building successfully), and `npm test` all pass.
- Confirmed all three client-creation sites import from the same
  `cookieOptions.ts`, so no divergent config is left anywhere.
- **Not verified in this environment:** this sandbox has no real browser,
  no live Supabase project, and no network access to Google's OAuth
  endpoints or Vercel, so an actual Safari/iOS session (first login,
  refresh, browser restart, external link, in-app browser) could not be
  exercised end-to-end here. This targets a confirmed class of
  Safari/WebKit cookie-consistency defect; please validate on the real
  deployment with an iPhone/iPad Safari session and a LINE/Instagram
  in-app browser before considering this closed.

## v1.0 — Production Release

The app is live and ready for real use.

- Deployment guide, pre-deployment checklist, user manual, and admin
  manual created for a smooth handoff.
- Final production support pass: security hardening (tightened RLS
  policies, added DB-level input bounds), performance fixes (removed a
  real N+1 query in guest sync, added missing indexes), corrected
  deployment documentation to match the app's actual current
  architecture, added an automated test suite (Vitest) for core logic.

## RC1 — Release Candidate

- Full Thai font support in PDF reports (bundled, open-source font).
- Three more LINE notification triggers: reimbursement approved, payment
  completed, upcoming payment reminders.
- Compact "Today's Summary" added to the Dashboard.
- New System Health page: live status checks for the database, file
  storage, LINE, and guest sync.
- Full module-by-module Release Candidate checklist created.

## v0.5 — LINE Notifications, Reports, Analytics

- LINE Official Account notifications for new reimbursement requests and
  budget overruns.
- Budget Summary PDF and Expense List Excel exports.
- Analytics page: cost per guest, average envelope, budget health,
  pending requests.
- Dashboard Quick Actions for the most common daily tasks.

## v0.4 — Guests, Income & Google Sheets Sync

- Guest management: search, RSVP filtering, walk-in guests.
- Income tracking, including amounts synced from the guest list.
- Safe, repeatable Google Sheets sync: pulls a published CSV, never
  overwrites a manually-edited guest, never touches walk-in guests, logs
  every run, and continues past any single bad row.
- Activity Feed showing recent changes across the project.

## v0.3 — Reimbursement

- Public, no-login reimbursement request form, designed for speed and
  simplicity on a phone.
- Admin approval workflow: approve (full or partial), reject, mark paid,
  mark completed — each with the right notifications and audit trail.
- Duplicate request detection.

## v0.2 — Budget & Expenses

- Budget categories and budgeted amounts, with spent/remaining tracking
  and an over-budget indicator.
- Expense tracking with VAT, discount, shipping, and withholding tax
  calculations, plus receipt photo uploads.
- Payment accounts (bank/cash) that every expense and income record ties to.
- Dashboard summary cards and charts.

## v0.1 — Foundation

- Google Login with an email whitelist (only approved people can access
  the system).
- User roles and a customizable permission matrix (Owner, Admin, Finance,
  Organizer, Viewer).
- Wedding project settings, editable by the Owner.
- Full Thai/English bilingual support throughout.
- Audit logging for every important change.

## v0.0 — Architecture Validation

- Confirmed the core technical foundation works end-to-end: deployment
  pipeline, database security rules, file uploads, Google Sheets
  connectivity, and LINE messaging — all before building real features on
  top of them.
