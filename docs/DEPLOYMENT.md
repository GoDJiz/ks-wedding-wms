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
Milestone 0 has exactly **one** migration file. Run it in the SQL Editor
(Dashboard → SQL Editor → New query), paste the full contents, and run:

1. `supabase/migrations/0001_milestone0_foundation.sql`

- [ ] Migration `0001` executed with no errors.
- [ ] Confirm tables exist: Dashboard → Table Editor should show `projects`,
      `project_members`, `whitelisted_emails`, `feature_flags`, `application_logs`.

*(Future milestones add `0002_...sql`, `0003_...sql`, etc. — always run new
migration files in ascending numeric order, never skip ahead.)*

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

| Bucket name | Public? | Used for | Max file size |
|---|---|---|---|
| `receipts` | **Private** | Expense/reimbursement receipt images | 10 MB |
| `slips` | **Private** | Bank transfer payment slips | 10 MB |
| `product-images` | **Private** | Reimbursement product photos | 10 MB |
| `project-assets` | **Public** | Wedding logo, non-sensitive assets | 10 MB |

- [ ] All four buckets created with the exact names above (code references
      these names literally — a typo breaks uploads silently).
- [ ] `receipts`, `slips`, `product-images` set to **private**.
- [ ] `project-assets` set to **public**.
- [ ] For each private bucket, set the file size limit to 10 MB (bucket
      settings → "File size limit").

*(RLS policies on Storage objects are added in Milestone 1/2 alongside the
Expense/Reimbursement schema — Milestone 0 only needs the buckets to exist so
the storage spike page can upload to `receipts`.)*

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

| Key | Value source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | §2.2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | §2.2 |
| `SUPABASE_SERVICE_ROLE_KEY` | §2.2 |

Note: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_TEST_USER_ID`, and
`SHEET_SYNC_SHARED_SECRET` are **not** Vercel variables — those are Supabase
Edge Function secrets (§6), because Edge Functions run on Supabase's
infrastructure, not Vercel's.

- [ ] All three variables added, each scoped to all three environments.

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
- [ ] On your own phone, add the OA as a friend (scan the QR code shown in OA Manager).
- [ ] Find your own `userId`: easiest way — temporarily enable the webhook
      URL to point at a request-bin style tool, send the OA a message, read
      your `userId` from the payload; or use the LINE Official Account's
      "target ID" shown for the account owner in some LINE developer tools.
      This value is `LINE_TEST_USER_ID`.

### Supabase Edge Function secrets (not Vercel, not `.env.local`)
Install the Supabase CLI if you haven't:
```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
```
Then set the secrets:
```bash
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN=<your-token> LINE_TEST_USER_ID=<your-user-id>
```
- [ ] Secrets set successfully (`supabase secrets list` shows both keys, values hidden).

### Deploy and test
```bash
supabase functions deploy notify-line-test
supabase functions invoke notify-line-test
```
- [ ] LINE message received on your phone with title, summary, amount, and an "Open Detail" button.

---

## 6. Google Apps Script

### 6.1 Set the shared secret
- [ ] Pick any random string, e.g. generate one: `openssl rand -hex 16`.
- [ ] Set it as an Edge Function secret:
  ```bash
  supabase secrets set SHEET_SYNC_SHARED_SECRET=<your-random-string>
  ```
- [ ] Deploy the receiving function:
  ```bash
  supabase functions deploy sync-guests-test
  ```

### 6.2 Configure the script
- [ ] Open your guest-list Google Sheet → Extensions → Apps Script.
- [ ] Paste the contents of `integrations/google-apps-script/sync.gs`.
- [ ] Replace `EDGE_FUNCTION_URL` with:
      `https://<your-project-ref>.supabase.co/functions/v1/sync-guests-test`
- [ ] Replace `SHARED_SECRET` with the same random string from §6.1.
- [ ] Save the script.

### 6.3 Run and verify
- [ ] Run the `testSyncCall` function from the Apps Script editor (first run
      will prompt for authorization — approve it, it's your own script).
- [ ] Check logs:
  ```bash
  supabase functions logs sync-guests-test
  ```
- [ ] Confirm the log shows the headers and rows you expected, and the
      Apps Script execution log shows a `200` status response.

---

## 7. Final Verification Checklist — Milestone 0 Fully Operational

Work through every item. Do not tag `v0.0` until all boxes are checked.

**Deploy pipeline**
- [ ] Pushing a commit to `main` on GitHub triggers an automatic Vercel deploy.
- [ ] The live Vercel URL loads the home page without errors.

**Authentication & Whitelist**
- [ ] Logging in with your whitelisted Google email succeeds and lands on the home page showing your email.
- [ ] Logging in with a **different**, non-whitelisted Google email is rejected and lands on `/no-access`.

**Row Level Security**
- [ ] Add a second whitelisted email with role `viewer` (`insert into whitelisted_emails ...`), log in as that user, confirm they **cannot** run an update against `projects` or insert into `project_members` (test via Supabase Table Editor "impersonate" feature or a quick script — should fail with a permissions error).

**Storage**
- [ ] On `/dev/storage-test` (your live Vercel URL), upload a normal image — see "✅ Upload + signed URL retrieval succeeded" and a working link.
- [ ] Attempt to upload a file over 10 MB — see the client-side rejection message, confirm no upload occurred in the `receipts` bucket.

**i18n**
- [ ] On `/dev/i18n-test`, toggle between ไทย and English, confirm all visible text changes correctly both times.

**LINE Notifications**
- [ ] `notify-line-test` invocation results in a real message arriving on your phone with the correct title, summary, amount, and working "Open Detail" button.

**Google Sheets Sync**
- [ ] `testSyncCall()` from the Sheet returns a `200` and the Edge Function logs show the correct row count received.

**Tag the release**
- [ ] `git tag v0.0 && git push --tags`

Once every box above is checked, Milestone 0 is complete and stable. Tell me
when it's done and we'll move to Milestone 1 (Foundation) real feature work.
