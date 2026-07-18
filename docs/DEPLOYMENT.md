# Milestone 0 — Deployment Package

Follow this document top to bottom, in order. Every step is either a checkbox
action in a dashboard or a command to run. Nothing is assumed — if a value
needs to come from somewhere, this document says exactly where.

Companion files: `.env.example` (variable descriptions), `docs/MILESTONE_0_CHECKLIST.md`
(functional verification), `docs/RESTORE.md` (backup/restore, not needed yet).

---

## 0. Order of Operations (why this order)

Supabase must exist before Google OAuth (needs the Supabase callback URL) and
before Vercel (needs the Supabase keys as env vars). GitHub must exist before
Vercel (Vercel imports from a GitHub repo). LINE and Google Sheets are
independent of the others and can be done last.

**Order: GitHub → Supabase → Google OAuth → Vercel → LINE OA → Google Apps Script → Final Verification.**

---

## 1. GitHub

- [ ] Create a new **private** GitHub repository (e.g. `ks-wedding-wms`).
- [ ] Push this project to it:
  ```bash
  cd wms
  git remote add origin https://github.com/<your-username>/ks-wedding-wms.git
  git branch -M main
  git push -u origin main
  ```
- [ ] Confirm `.env.local` is **not** in the repo (it's git-ignored already — verify with `git status`, it should not appear).

**GitHub Secrets required for Milestone 0: none.** Vercel reads environment
variables from its own dashboard (§7), not from GitHub Secrets — GitHub
Secrets only matter if you later add a GitHub Actions workflow (e.g., to run
`supabase db push` automatically on merge). Not required for Milestone 0 or
the free-tier deployment path.

---

## 2. Supabase

### 2.1 Create the project

- [ ] Go to supabase.com → New project → choose a name (e.g. `ks-wedding`), a
      strong database password (save it somewhere safe — needed for direct
      `psql`/restore access later, not needed day-to-day), and the region
      closest to you. Free tier (Nano/Micro) is sufficient.
- [ ] Wait for provisioning to finish (a few minutes).

### 2.2 Collect your keys

Go to **Project Settings → API** and copy:

- [ ] Project URL → this is `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `anon` `public` key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `service_role` `secret` key → this is `SUPABASE_SERVICE_ROLE_KEY` (keep private)

Paste all three into your local `.env.local` (copy from `.env.example` first).

### 2.3 SQL Migration Execution Order

Run each file in the SQL Editor (Dashboard → SQL Editor → New query), in
this exact order — each depends on functions/tables created by the ones
before it:

1. `supabase/migrations/0001_milestone0_foundation.sql` — core tables, RLS helpers, whitelist auth hook
2. `supabase/migrations/0002_permissions.sql` — permission matrix
3. `supabase/migrations/0003_audit_log.sql` — audit log + trigger function
4. `supabase/migrations/0004_budget_and_expense.sql` — budget/expense/payment accounts/vendors/guests/incomes schema
5. `supabase/migrations/0005_reimbursement.sql` — reimbursement schema + Storage RLS policies (also fixes a Storage RLS gap from M0)
6. `supabase/migrations/0006_guest_income_sync.sql` — sync config/mapping/run-log tables
7. `supabase/migrations/0007_sync_dry_run_and_metadata.sql` — one column (`sync_runs.csv_hash`)
8. `supabase/migrations/0008_notifications.sql` — LINE notification recipients
9. `supabase/migrations/0009_security_hardening.sql` — pre-v1.0 RLS/constraint hardening (see `docs/SIGNIFICANT_FINDINGS.md`)
10. `supabase/migrations/0010_performance_indexes.sql` — missing indexes on `audit_log`/`sync_runs` found during the pre-v1.0 performance review

- [ ] All 10 migrations executed with no errors, in order.
- [ ] Confirm tables exist: Dashboard → Table Editor should show at least
      `projects`, `project_members`, `whitelisted_emails`, `feature_flags`,
      `application_logs`, `permissions`, `audit_log`, `budget_categories`,
      `budgets`, `payment_accounts`, `vendors`, `expenses`, `expense_files`,
      `guests`, `incomes`, `reimbursement_requests`, `reimbursement_files`,
      `sync_configs`, `sync_field_mappings`, `sync_runs`,
      `notification_recipients`.

_(Future migrations add `0010_...sql`, etc. — always run new migration
files in ascending numeric order, never skip ahead, never edit an already-
applied migration — see `DEVELOPMENT_RULES.md` §7.)_

### 2.4 Required Authentication Settings

Dashboard → **Authentication → Providers → Email**:

- [ ] Turn **OFF** "Enable Email provider" sign-ups if you want Google-only
      login (optional but matches the spec — no email/password accounts).

Dashboard → **Authentication → Providers → Google**:

- [ ] Toggle ON (you'll paste the Client ID/Secret here in step 4).

Dashboard → **Authentication → URL Configuration**:

- [ ] **Site URL**: your production URL once you have it (e.g.
      `https://ks-wedding-wms.vercel.app`) — placeholder `http://localhost:3000` is fine for now, update after Vercel deploy (§4.4 has the final value).
- [ ] **Redirect URLs** (add both, one per line):
  - `http://localhost:3000/auth/callback`
  - `https://<your-vercel-domain>/auth/callback` (add after Vercel deploy, §5)

Dashboard → **Authentication → Hooks**:

- [ ] Add a **"Before User Created"** hook → type: Postgres Function → select
      `public.check_email_whitelist` (created by migration 0001).
- [ ] Save.

### 2.5 Whitelist your own email

SQL Editor → run (replace with your real email):

```sql
insert into whitelisted_emails (email, invited_role) values ('you@gmail.com', 'owner');
```

- [ ] Confirmed one row exists in `whitelisted_emails` for your email, role `owner`.

### 2.6 Storage Buckets — names and permissions

Dashboard → **Storage → New bucket**. Create these (Milestone 0 only needs
`receipts`; the rest are listed now so you don't have to come back later):

| Bucket name      | Public?     | Used for                             | Max file size |
| ---------------- | ----------- | ------------------------------------ | ------------- |
| `receipts`       | **Private** | Expense/reimbursement receipt images | 10 MB         |
| `slips`          | **Private** | Bank transfer payment slips          | 10 MB         |
| `product-images` | **Private** | Reimbursement product photos         | 10 MB         |
| `project-assets` | **Public**  | Wedding logo, non-sensitive assets   | 10 MB         |

- [ ] All four buckets created with the exact names above (code references
      these names literally — a typo breaks uploads silently).
- [ ] `receipts`, `slips`, `product-images` set to **private**.
- [ ] `project-assets` set to **public**.
- [ ] For each private bucket, set the file size limit to 10 MB (bucket
      settings → "File size limit").
- [ ] **Recommended hardening** (found during the pre-v1.0 security
      review): set "Allowed MIME types" on each private bucket to
      `image/jpeg, image/png, image/heic, application/pdf` — RLS policies
      can't restrict file content type, only who can read/write, so this
      is the only real server-side enforcement of "only images/PDFs,"
      backing up the client-side check already in the upload forms.

_(RLS policies on Storage objects are defined in migration `0005`, run in
§2.3 above — this section just needs the buckets to exist with the right
names/visibility/size limit before that migration's policies can apply to
anything.)_

---

## 3. Google OAuth

### 3.1 Create OAuth credentials

- [ ] Go to Google Cloud Console → create a new project (e.g. `ks-wedding-wms`).
- [ ] APIs & Services → OAuth consent screen → **External** → fill app name,
      your email as support/developer contact → save (Testing mode is fine —
      no verification needed for a handful of whitelisted users).
- [ ] APIs & Services → Credentials → **Create Credentials → OAuth client ID**
      → Application type: **Web application**.

### 3.2 Required Redirect URLs

Under **Authorized redirect URIs**, add exactly:

- [ ] `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`

(Find `<your-supabase-project-ref>` in your Supabase project URL, e.g. if
your URL is `https://abcdefghijk.supabase.co`, the ref is `abcdefghijk`.)

This is the **only** redirect URI Google needs — Supabase handles the
redirect back to your app's `/auth/callback` internally afterward.

- [ ] Save. Copy the **Client ID** and **Client Secret**.

### 3.3 Wire into Supabase

- [ ] Supabase Dashboard → Authentication → Providers → Google → paste Client
      ID + Client Secret → Save.

---

## 4. Vercel

### 4.1 Import the project

- [ ] Go to vercel.com → Add New Project → Import the GitHub repo from §1.
- [ ] Framework preset: Next.js (auto-detected).
- [ ] Do **not** deploy yet — add environment variables first (next step).

### 4.2 Required Vercel Environment Variables

Project Settings → Environment Variables → add for **Production, Preview, and
Development** (all three, so preview deploys also work):

| Key                             | Value source                                     |
| ------------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | §2.2                                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | §2.2                                             |
| `SUPABASE_SERVICE_ROLE_KEY`     | §2.2                                             |
| `LINE_CHANNEL_ACCESS_TOKEN`     | §5 below                                         |
| `SHEET_SYNC_SHARED_SECRET`      | §6 below (a random string you generate yourself) |

All five are Vercel/Next.js environment variables, read via `process.env`
by Route Handlers and Server Actions. This app has no Supabase Edge
Functions in active use — an earlier iteration did, and if you're
following older notes that say to use `supabase secrets set` for the LINE
token or shared secret, that's now incorrect; set them here instead.

- [ ] All five variables added, each scoped to all three environments.

### 4.3 Deploy

- [ ] Click Deploy. Wait for the build to succeed.
- [ ] Note the resulting production URL, e.g. `https://ks-wedding-wms.vercel.app`.

### 4.4 Close the loop back to Supabase

Now that you have the real Vercel URL:

- [ ] Supabase Dashboard → Authentication → URL Configuration → update **Site
      URL** to your real Vercel URL.
- [ ] Add `https://<your-vercel-domain>/auth/callback` to **Redirect URLs**
      (alongside the localhost one from §2.4 — keep both, localhost is for
      local dev).
- [ ] Google Cloud Console → your OAuth client → Authorized redirect URIs:
      no change needed here (it always points at Supabase's callback, not Vercel's).

---

## 5. LINE Official Account

- [ ] Go to LINE for Business → create a free LINE Official Account.
- [ ] OA Manager → Settings → Messaging API → **Enable Messaging API**.
- [ ] Issue a **Channel Access Token (long-lived)** — this is
      `LINE_CHANNEL_ACCESS_TOKEN`.
- [ ] Set it as a **Vercel environment variable** (§4.2) — not a Supabase
      secret, not `.env.local` in production. Redeploy after adding it
      (Vercel env var changes need a redeploy to take effect).

### Add recipients (who gets notified)

This is done **in the app**, not via any env var or config file:

- [ ] On your phone, add the OA as a friend (scan the QR code in OA Manager).
- [ ] Find your own LINE `userId` (LINE Developers Console → your channel
      → Messaging API → there's usually a way to see recent user IDs after
      you message the OA once; alternatively use any LINE userId lookup
      method you're already comfortable with).
- [ ] Sign in to the app → Settings → Notifications → add yourself as a
      recipient (paste the `userId`, give it a label like "Me").
- [ ] Click **"Send test message"** next to that recipient.
- [ ] Confirm the test message arrives on your phone.

### Verify via System Health

- [ ] Settings → System Health → confirm the **LINE** row shows ✅ (this
      calls LINE's `bot/info` endpoint for real — a genuine connectivity
      check, not just "is the env var present").

---

## 6. Google Sheets Sync (Guest & Income)

Two independent pieces: (1) the app pulling guest data FROM your Sheet,
and (2) an optional scheduler that pings the app on a timer so that
pulling happens automatically. Neither needs a Supabase Edge Function —
both are handled by this Next.js app directly.

### 6.1 Publish your guest Sheet as CSV

- [ ] Open your guest-list Google Sheet.
- [ ] File → Share → **Publish to web**.
- [ ] Choose the specific sheet/tab (not "Entire Document") and select
      **Comma-separated values (.csv)** as the format.
- [ ] Click Publish, copy the resulting URL.
- [ ] **Understand the trade-off**: anyone with this URL can view the raw
      sheet contents (guest names, RSVP, contact info — not financial
      data). Acceptable for a wedding guest list; documented in
      `docs/SYNC_STRATEGY.md`.

### 6.2 Configure the app

- [ ] Sign in → Settings → Integrations.
- [ ] Paste the published CSV URL.
- [ ] Review the **Field Mapping** table — each row maps a Sheet column
      header (left) to a system field (right). Adjust the left-hand values
      to match your actual Sheet's column headers exactly (case-sensitive).
- [ ] Click **"Dry Run (Preview)"** first — confirms what would happen
      (insert/update/skip/fail per row) without writing anything.
- [ ] Once the preview looks right, click **"Sync Now"** for a real run.
- [ ] Confirm the summary counts match what you expected, and check
      Guests/Income pages for the synced data.

### 6.3 Set the shared secret (only needed for scheduled/automated sync)

- [ ] Generate a random string: `openssl rand -hex 16`.
- [ ] Set it as `SHEET_SYNC_SHARED_SECRET` in **Vercel** (§4.2), not a
      Supabase secret. Redeploy after adding it.

### 6.4 Optional: schedule automatic sync via Apps Script

Manual "Sync Now" in the app is enough if you're fine triggering it
yourself occasionally. For automatic scheduled sync:

- [ ] Open any Google Sheet (doesn't need to be the guest list itself) →
      Extensions → Apps Script.
- [ ] Paste the contents of `integrations/google-apps-script/sync.gs`.
- [ ] Fill in `APP_URL` (your Vercel deployment URL), `PROJECT_ID` (your
      wedding project's UUID — found in the `projects` table), and
      `SHARED_SECRET` (same value as §6.3).
- [ ] Run `pingGuestSync` once manually to test (approve the authorization
      prompt — it's your own script) — check the Apps Script execution log
      shows a `200` response.
- [ ] (Optional) Run `pingPaymentReminders` once manually too, to test the
      payment-reminders endpoint the same way.
- [ ] Triggers (clock icon, left sidebar) → Add Trigger → pick a function
      → Time-driven → choose a frequency (e.g. daily) → Save. Repeat for
      the other function if you want both scheduled.

### 6.5 Optional: Configurable Auto Sync (Supabase pg_cron) instead of Apps Script

An alternative to §6.4 that doesn't depend on Google Apps Script staying
configured: a single global `pg_cron` job (added by migration
`0013_auto_sync_scheduler.sql`) ticks every 5 minutes and calls
`/api/sync/guests` in `"auto"` mode, which syncs every project whose Auto
Sync is enabled and due. The interval and on/off toggle are configured
per-project in the app — Settings → Integrations → Auto Sync — the cron
job itself never changes.

- [ ] In the Supabase SQL Editor, run once (values from §4.2/§6.3):
      ```sql
      select vault.create_secret(
        'https://<your-vercel-domain>/api/sync/guests',
        'auto_sync_endpoint_url'
      );
      select vault.create_secret(
        '<same value as SHEET_SYNC_SHARED_SECRET>',
        'auto_sync_shared_secret'
      );
      ```
- [ ] Settings → Integrations → turn on **Enable Auto Sync**, pick an
      interval. Saves immediately; no redeploy needed.
- [ ] Wait up to 5 minutes, then confirm **Last Sync** / **Next Sync** on
      that page update, and a new row appears in Sync History.
- [ ] These two approaches (§6.4 Apps Script, §6.5 pg_cron) are
      independent — use one or the other for a given project, not both, to
      avoid double-syncing.

### 6.6 Verify via System Health

- [ ] Settings → System Health → confirm the **Guest Sync** row shows ✅
      (based on real `sync_runs` history, not just "is a CSV URL present").

---

## 7. Final Verification Checklist — Deployment Fully Operational

Work through every item on a fresh deploy. This checklist covers basic
plumbing (is everything wired up correctly); `docs/PRODUCTION_VALIDATION.md`,
`docs/PRODUCTION_VALIDATION_M2.md`, and `docs/RC1_CHECKLIST.md` cover the
fuller feature-by-feature pass before tagging `v1.0`.

**Deploy pipeline**

- [ ] Pushing a commit to `main` on GitHub triggers an automatic Vercel deploy.
- [ ] The live Vercel URL loads the home page without errors.

**Authentication & Whitelist**

- [ ] Logging in with your whitelisted Google email succeeds and lands on the home page showing your email.
- [ ] Logging in with a **different**, non-whitelisted Google email is rejected and lands on `/no-access`.

**Row Level Security**

- [ ] Add a second whitelisted email with role `viewer` (`insert into whitelisted_emails ...`), log in as that user, confirm they **cannot** run an update against `projects` or insert into `project_members` (test via Supabase Table Editor "impersonate" feature or a quick script — should fail with a permissions error).

**Storage**

- [ ] From the app, create an Expense with a receipt image attached (`/expense` → Add Expense) — confirms upload + the `receipts` bucket + Storage RLS all work together for real.
- [ ] Attempt to upload a file over 10 MB — see the client-side rejection message, confirm no upload occurred in the bucket.

**i18n**

- [ ] On any page, toggle between ไทย and EN (top-right switcher), confirm all visible text changes correctly both times.

**LINE Notifications**

- [ ] Settings → Notifications → add yourself as a recipient → "Send test message" → confirm it arrives on your phone.
- [ ] Settings → System Health → LINE row shows ✅.

**Google Sheets Sync**

- [ ] Settings → Integrations → configure a real published CSV URL → "Dry Run (Preview)" shows a sensible preview → "Sync Now" completes with a `success` or `partial` status.
- [ ] Settings → System Health → Guest Sync row shows ✅ (or a reasonable ⚠️ if you haven't set it up yet).

**Tag the release**

- [ ] `git tag v0.0 && git push --tags`

Once every box above is checked, the basic deployment is confirmed
operational. Continue to Milestone 1+ feature verification, and
eventually `docs/RC1_CHECKLIST.md` before `v1.0`.
