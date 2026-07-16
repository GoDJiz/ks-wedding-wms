# Wedding Management System Deployment Guide (v1.0)

---

## Overview

### What this guide is

A complete, step-by-step walkthrough for deploying the Wedding Management
System (WMS) to production, starting from **nothing** — no accounts, no
project, no configuration. Follow it in order, top to bottom. Each step
tells you exactly what to click, why it matters, what you should see when
it works, and what to do if it doesn't.

### System architecture (what you're actually setting up)

```
┌─────────────────────────────┐
│   Your Browser / Phone      │
└──────────────┬───────────────┘
               │
               ▼
┌─────────────────────────────┐         ┌──────────────────┐
│   Vercel (hosts the app)    │◄────────│  GitHub (code)    │
│   Next.js application       │         │  auto-deploys on  │
└──────────────┬───────────────┘         │  every push       │
               │                          └──────────────────┘
               ▼
┌─────────────────────────────┐
│         Supabase            │
│  - Postgres database        │
│  - Google Login              │
│  - File Storage              │
└──────┬───────────┬───────────┘
       │           │
       ▼           ▼
┌─────────────┐ ┌───────────────────┐
│  LINE OA     │ │ Google Sheets      │
│  (notifies   │ │ (guest list you    │
│   you)       │ │  already maintain) │
└─────────────┘ └────────────────────┘
```

Everything runs on **free tiers**. Nothing in this guide costs money.

### Accounts you'll need (create these before you start)

| Account               | Used for                       | Cost                                |
| --------------------- | ------------------------------ | ----------------------------------- |
| GitHub                | Stores your code               | Free                                |
| Supabase              | Database, login, file storage  | Free                                |
| Vercel                | Hosts the live website         | Free                                |
| Google Cloud Console  | Lets people log in with Google | Free                                |
| LINE Official Account | Sends you notifications        | Free                                |
| Google Sheets         | Your existing guest list       | Free (you likely have this already) |

If you don't have any of these yet, that's fine — this guide tells you
exactly when to create each one.

### Estimated setup time

- **First-time setup, going carefully:** 2–3 hours
- **If you hit no problems at all:** about 60–90 minutes
- Most of the time isn't spent waiting — it's spent carefully copying the
  right values into the right places. Rushing this is the #1 cause of
  problems, so budget more time than you think you need.

### Deployment flow (the order matters — don't skip ahead)

```
1. GitHub          → your code needs a home before anything else works
2. Supabase        → your database, login system, and file storage
3. Google OAuth     → lets Supabase offer "Sign in with Google"
4. Vercel          → puts your app on the internet
5. LINE OA          → sends you notifications
6. Google Sheets    → connects your existing guest list
7. Production Validation → click through everything before calling it done
```

---

## Prerequisites

Before Step 1, make sure you have:

- [ ] A computer with a terminal (Command Prompt/PowerShell on Windows,
      Terminal on Mac) and [Git](https://git-scm.com/downloads) installed
- [ ] [Node.js](https://nodejs.org/) installed (version 20 or newer) —
      check by running `node -v` in your terminal
- [ ] A Google account (for Google Cloud Console, Google Sheets, and to
      test logging into the app yourself)
- [ ] A GitHub account — [github.com/join](https://github.com/join) if you
      don't have one
- [ ] The project's source code on your computer (the folder containing
      `src/`, `supabase/`, `docs/`, `package.json`)
- [ ] A phone with the LINE app installed (for testing notifications later)

You do **not** need to already have a Supabase, Vercel, or LINE account —
we'll create those together in the relevant steps.

---

## Step 1 – GitHub

### Why this step exists

Vercel (Step 4) works by connecting to a GitHub repository and
automatically deploying every time you push new code. Nothing downstream
works without your code living somewhere Vercel can reach.

### 1.1 Create the repository

- [ ] Go to [github.com/new](https://github.com/new)
- [ ] Repository name: something like `ks-wedding-wms`
- [ ] Set visibility to **Private** (this project will eventually touch
      real financial and guest data — no reason for the code to be public)
- [ ] **Do NOT check** "Add a README file," "Add .gitignore," or "Choose a
      license" — your project folder already has all of that, and adding
      them on GitHub too causes a conflict in the next step
- [ ] Click **Create repository**

`[Screenshot here: GitHub "Create a new repository" page with name filled in and Private selected]`

### 1.2 Push your project

Open a terminal, navigate to your project folder, and run:

```bash
cd path/to/wms
git remote add origin https://github.com/YOUR-USERNAME/ks-wedding-wms.git
git branch -M main
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username. The first time
you push, GitHub will likely ask you to log in (via browser popup or a
personal access token).

### 1.3 Verify the repository

- [ ] Refresh the GitHub repository page in your browser
- [ ] You should see folders: `src`, `supabase`, `docs`, `integrations`,
      `public`, and files like `package.json`, `README.md`
- [ ] Click into `supabase/migrations/` — you should see 10 files,
      `0001_...sql` through `0010_...sql`

**Expected result:** the GitHub repo looks like a mirror of your local
project folder — not empty, not just a README.

### Troubleshooting — Step 1

| Problem                                                          | Cause                                                                                               | Fix                                                                                                            |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `git push` fails with "failed to push some refs" / "fetch first" | You accidentally initialized the GitHub repo with a README/gitignore, creating a conflicting commit | Go back and delete the repo, recreate it **without** checking any of the initialization boxes, then push again |
| `fatal: No configured push destination`                          | You ran `git push` before `git remote add origin`                                                   | Run the `git remote add origin ...` command first                                                              |
| GitHub asks for a password and rejects it                        | GitHub no longer accepts account passwords for Git operations                                       | Create a [Personal Access Token](https://github.com/settings/tokens) and use that as the password instead      |
| `git branch -M main` says "fatal: not a git repository"          | You're not inside the project folder                                                                | `cd` into the correct folder first (it should contain `package.json`)                                          |

---

## Step 2 – Supabase

### Why this step exists

Supabase is your database, your login system, and your file storage — the
entire backend of this application lives here. Nothing in the app works
without this step.

### 2.1 Create the project

- [ ] Go to [supabase.com](https://supabase.com) → sign up / log in
- [ ] Click **New Project**
- [ ] Name: e.g. `ks-wedding` (this is just a label, not the wedding
      project's actual name inside the app)
- [ ] Set a **strong database password** — write it down somewhere safe
      (a password manager, not a sticky note). You'll rarely need it, but
      you will need it for direct database access (e.g. restoring a
      backup)
- [ ] Choose the region closest to you or your guests
- [ ] Pricing plan: **Free**
- [ ] Click **Create new project** and wait 1–3 minutes for it to provision

`[Screenshot here: Supabase "New Project" form filled in]`

**Expected result:** after a short wait, you land on your new project's
dashboard, showing a mostly-empty database.

### 2.2 Collect your API keys

- [ ] Go to **Project Settings → API**
- [ ] Copy the **Project URL** — you'll need this soon, call it `SUPABASE_URL`
- [ ] Copy the **`anon` `public`** key — call it `SUPABASE_ANON_KEY`
- [ ] Copy the **`service_role`** key — call it `SUPABASE_SERVICE_ROLE_KEY`.
      **This one is secret** — never share it, never paste it anywhere
      public, never commit it to GitHub.

Paste all three into a temporary text file for now — you'll need them
again in Step 4 (Vercel).

`[Screenshot here: Supabase Project Settings -> API page with the three keys visible (blur the actual key values in your own screenshot if sharing it with anyone)]`

### 2.3 Run the database migrations

Your project's database structure lives in 10 SQL files. You'll run each
one, in order, in Supabase's SQL Editor.

- [ ] In Supabase, go to **SQL Editor → New query**
- [ ] Open `supabase/migrations/0001_milestone0_foundation.sql` from your
      project folder in a text editor, copy its entire contents, paste
      into the SQL Editor, click **Run**
- [ ] Confirm it says "Success. No rows returned" (or similar) — not an
      error
- [ ] Repeat for `0002_permissions.sql`, `0003_audit_log.sql`,
      `0004_budget_and_expense.sql`, `0005_reimbursement.sql`,
      `0006_guest_income_sync.sql`, `0007_sync_dry_run_and_metadata.sql`,
      `0008_notifications.sql`, `0009_security_hardening.sql`,
      `0010_performance_indexes.sql` — **in that exact order, one at a time**

`[Screenshot here: Supabase SQL Editor showing a successfully-run migration]`

**Why one at a time, in order:** later migrations depend on tables and
functions created by earlier ones. Running them out of order will cause
errors like "relation does not exist."

### 2.4 Verify the database

- [ ] Go to **Table Editor**
- [ ] Confirm you see (at least): `projects`, `project_members`,
      `whitelisted_emails`, `feature_flags`, `application_logs`,
      `permissions`, `audit_log`, `budget_categories`, `budgets`,
      `payment_accounts`, `vendors`, `expenses`, `expense_files`, `guests`,
      `incomes`, `reimbursement_requests`, `reimbursement_files`,
      `sync_configs`, `sync_field_mappings`, `sync_runs`,
      `notification_recipients`
- [ ] Click into a few tables (e.g. `projects`) — each should be empty but
      show the correct columns

### 2.5 Configure Authentication settings

- [ ] Go to **Authentication → Providers → Email**
- [ ] Turn **OFF** "Enable Email provider" (this app is Google-login only
      — no email/password accounts)
- [ ] Go to **Authentication → Providers → Google** — leave this open for
      now, you'll fill it in during Step 3
- [ ] Go to **Authentication → URL Configuration**
  - **Site URL**: leave as `http://localhost:3000` for now — you'll come
    back and update this in Step 4 once you have a real Vercel URL
  - **Redirect URLs**: add `http://localhost:3000/auth/callback` for now
    (you'll add the real one in Step 4)

### 2.6 Create Storage buckets

- [ ] Go to **Storage → New bucket**, create these four, with these
      **exact** names (the app's code references these names literally):

| Bucket name      | Public?     | Used for                             |
| ---------------- | ----------- | ------------------------------------ |
| `receipts`       | **Private** | Expense/reimbursement receipt photos |
| `slips`          | **Private** | Bank transfer slips                  |
| `product-images` | **Private** | Reimbursement product photos         |
| `project-assets` | **Public**  | Wedding logo and similar             |

- [ ] For `receipts`, `slips`, and `product-images`: open bucket settings
      → set **File size limit** to `10 MB`
- [ ] **Recommended:** also set **Allowed MIME types** on those three
      buckets to `image/jpeg, image/png, image/heic, application/pdf` —
      this is the only real enforcement of "only images/PDFs allowed,"
      since the app's own checks can be bypassed by someone calling the
      API directly

`[Screenshot here: Supabase Storage page showing all four buckets created]`

### 2.7 Wire up the email whitelist Auth Hook

This is what makes "only whitelisted emails can log in" actually work.

- [ ] Go to **Authentication → Hooks**
- [ ] Add a **"Before User Created"** hook → type: **Postgres Function** →
      select `public.check_email_whitelist`
- [ ] Save

### 2.8 Whitelist your own email

- [ ] Go to **SQL Editor → New query**, run (replace with your real email):

```sql
insert into whitelisted_emails (email, invited_role) values ('you@gmail.com', 'owner');
```

- [ ] Confirm success, and check the `whitelisted_emails` table shows one row

**Expected result after this whole step:** you have a fully-structured,
empty database, with your email allowed to log in once Google OAuth (Step 3) and Vercel (Step 4) are wired up. You cannot fully test login yet —
that needs Step 3 and Step 4 first.

### Troubleshooting — Step 2

| Problem                                          | Cause                                                      | Fix                                                                                                                                                                                                                      |
| ------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A migration fails with "relation already exists" | You ran the same migration twice, or ran them out of order | If it's the exact same migration re-run, this is usually harmless (most statements use `if not exists`) — check the actual error text. If it's a genuinely different problem, note the exact error and debug from there. |
| A migration fails with "relation does not exist" | You skipped an earlier migration, or ran them out of order | Check which migrations have actually been run (Table Editor — do the referenced tables exist?), run any missing ones in order                                                                                            |
| Can't find "Hooks" under Authentication          | Supabase's UI changes occasionally                         | Search Supabase's dashboard search bar for "hooks," or check Supabase's own docs — the feature is sometimes under a slightly different menu label depending on your dashboard version                                    |
| Whitelist insert fails with "duplicate key"      | You already inserted that email once                       | That's fine — it means it's already there; check the table directly to confirm                                                                                                                                           |

---

## Step 3 – Google OAuth

### Why this step exists

This is what makes "Sign in with Google" actually appear and work. Without
it, Supabase has nothing to hand off to when someone clicks the sign-in
button.

### 3.1 Create OAuth credentials

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create a new project (top-left project selector → New Project) —
      name it anything, e.g. `ks-wedding-wms`
- [ ] Go to **APIs & Services → OAuth consent screen**
  - User type: **External**
  - Fill in app name, your email as both support and developer contact
  - Save (Testing mode is fine — you don't need Google's verification
    process for a handful of whitelisted family/admin users)
- [ ] Go to **APIs & Services → Credentials → Create Credentials → OAuth
      client ID**
  - Application type: **Web application**

`[Screenshot here: Google Cloud Console OAuth client ID creation form]`

### 3.2 Configure redirect URLs

- [ ] Under **Authorized redirect URIs**, add exactly:
      `https://<your-supabase-project-ref>.supabase.co/auth/v1/callback`
  - Find `<your-supabase-project-ref>` in your Supabase project URL from
    Step 2.2 — e.g. if it's `https://abcdefghijk.supabase.co`, the ref is
    `abcdefghijk`
- [ ] This is the **only** redirect URI Google needs. Supabase handles
      redirecting back to the actual app afterward — you'll add the app's
      own callback URL inside Supabase, not here.
- [ ] Click **Create**
- [ ] Copy the **Client ID** and **Client Secret** shown

### 3.3 Wire into Supabase

- [ ] Back in Supabase → **Authentication → Providers → Google**
- [ ] Toggle it **on**, paste in the Client ID and Client Secret
- [ ] Save

### 3.4 Verify (partially — full login test comes after Vercel)

You can't fully test login until the app is actually deployed (Step 4),
but you can confirm the configuration is saved correctly:

- [ ] In Supabase, reopen Authentication → Providers → Google — confirm
      it shows as enabled with your Client ID visible

**Expected result:** Google provider shows "enabled" in Supabase. Full
login testing happens in Step 4.4.

### Troubleshooting — Step 3

| Problem                                                             | Cause                                                                                  | Fix                                                                                                                                                                                                                       |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Error 400: redirect_uri_mismatch" (seen later, when testing login) | The redirect URI in Google Cloud Console doesn't exactly match Supabase's callback URL | Double, triple-check for typos, trailing slashes, `http` vs `https` — it must match character-for-character                                                                                                               |
| OAuth consent screen won't save                                     | Missing a required field (usually the support email)                                   | Fill in every field marked required, including the developer contact email at the bottom                                                                                                                                  |
| "This app isn't verified" warning when logging in                   | Normal for apps in Testing mode                                                        | Click "Advanced" → "Go to (app name) (unsafe)" — this warning is expected and harmless for a personal app with a handful of known users; you are not required to complete Google's verification process for this use case |

---

## Step 4 – Vercel

### Why this step exists

This is what actually puts your app on the internet at a real URL you and
your guests can visit.

### 4.1 Import the GitHub project

- [ ] Go to [vercel.com](https://vercel.com) → sign up / log in (you can
      sign in directly with your GitHub account, which also simplifies
      the next step)
- [ ] **Add New... → Project**
- [ ] Find and import your `ks-wedding-wms` repository
- [ ] Framework Preset should auto-detect as **Next.js** — leave it
- [ ] **Do not click Deploy yet** — add environment variables first

`[Screenshot here: Vercel "Import Git Repository" page with the repo selected]`

### 4.2 Configure Environment Variables

Still on the import screen (or Project Settings → Environment Variables if
you already clicked past it), add these five, each scoped to
**Production, Preview, and Development**:

| Key                             | Value                                                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | from Step 2.2                                                                                                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Step 2.2                                                                                                               |
| `SUPABASE_SERVICE_ROLE_KEY`     | from Step 2.2                                                                                                               |
| `LINE_CHANNEL_ACCESS_TOKEN`     | leave blank for now — you'll add this in Step 5                                                                             |
| `SHEET_SYNC_SHARED_SECRET`      | make up a random string now, e.g. run `openssl rand -hex 16` in your terminal, or just mash your keyboard for 32 characters |

`[Screenshot here: Vercel Environment Variables page with all keys added]`

**Important:** all five of these are read by the Next.js application code
directly (`process.env...`) — none of them are Supabase secrets. If
you've read any older notes suggesting `supabase secrets set`, that's
outdated — everything goes here, in Vercel.

### 4.3 Deploy

- [ ] Click **Deploy**
- [ ] Wait for the build to complete (usually 1–3 minutes)
- [ ] Note the resulting URL, e.g. `https://ks-wedding-wms.vercel.app`

### 4.4 Close the loop back to Supabase

Now that you have a real URL:

- [ ] Supabase → Authentication → URL Configuration → update **Site URL**
      to your real Vercel URL
- [ ] Add `https://<your-vercel-domain>/auth/callback` to **Redirect
      URLs** (keep the `localhost` one too, for local development)

### 4.5 Create your real wedding project (important, easy to miss)

Every part of this app is scoped to a "project" (your wedding) — without
one, nothing will work even if login succeeds. This isn't automated; you
create it once, manually, via SQL:

- [ ] First, **log in to your deployed app once** with your whitelisted
      Google account (visit your Vercel URL → Sign in with Google). This
      creates your user account inside Supabase's authentication system.
- [ ] Back in Supabase → SQL Editor, run (customize the values):

```sql
-- 1. Create the real project
insert into projects (id, name, bride_name, groom_name, wedding_date, venue, currency, default_language)
values (
  gen_random_uuid(),
  'KS Wedding',
  'Suttinee Tipmatchachai',
  'Krisanapon Sangthong',
  '2026-07-21',
  'Bride''s Family Home, Don Krabueang, Photharam, Ratchaburi',
  'THB',
  'th'
)
returning id;
```

- [ ] **Copy the `id` value returned** — you'll need it repeatedly (call
      it `YOUR_PROJECT_ID`)
- [ ] Then link yourself as the Owner:

```sql
insert into project_members (project_id, user_id, role)
select 'YOUR_PROJECT_ID', id, 'owner'
from auth.users where email = 'you@gmail.com';
```

### 4.6 Verify deployment

- [ ] Visit your Vercel URL in a normal (non-incognito) browser window
- [ ] Click **Sign in**, log in with your whitelisted Google account
- [ ] You should land on the home page showing your email, with
      **Dashboard** and **Settings** buttons
- [ ] Click **Dashboard** — you should see the app's dashboard (mostly
      empty, since there's no data yet), not an error page

**Expected result:** you can log in, see your name/email, and navigate to
`/dashboard` without errors.

### Troubleshooting — Step 4

| Problem                                                                | Cause                                                                                         | Fix                                                                                                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Build fails on Vercel                                                  | Missing environment variable, or a typo in one                                                | Check the build log for the specific error; confirm all 5 env vars are present and correctly spelled (case-sensitive)              |
| Login redirects to `/no-access` even though you whitelisted your email | Typo in the whitelisted email, or the Auth Hook (Step 2.7) isn't wired up                     | Double-check the exact email spelling in `whitelisted_emails`; confirm the Hook is enabled and pointing at `check_email_whitelist` |
| Login redirects to `/no-project`                                       | You skipped Step 4.5, or the `project_members` insert didn't find a matching `auth.users` row | Confirm you logged in at least once first (creates the `auth.users` row), then re-run the `project_members` insert                 |
| "Error 400: redirect_uri_mismatch" on login                            | Site URL / Redirect URLs in Supabase don't match your real Vercel domain                      | Re-check Step 4.4 — must be the exact Vercel URL, `https://`, no trailing slash mismatch                                           |
| Page loads but looks unstyled / broken                                 | Rare Next.js build caching issue                                                              | Try a fresh deploy: Vercel → Deployments → ⋯ menu → Redeploy (without cache)                                                       |

---

## Step 5 – LINE Official Account

### Why this step exists

This is what sends you (and any other admins) a LINE message when
something needs attention — a new reimbursement request, a budget
overrun, an approval, a completed payment, or an overdue payment.

### 5.1 Enable Messaging API

- [ ] Go to [LINE for Business](https://www.linebiz.com/) → create a free
      LINE Official Account (if you don't have one already)
- [ ] In **OA Manager → Settings → Messaging API**, click **Enable
      Messaging API**

`[Screenshot here: LINE OA Manager Messaging API settings page]`

### 5.2 Generate a Channel Access Token

- [ ] Still in Messaging API settings, issue a **Channel access token
      (long-lived)**
- [ ] Copy it — this is `LINE_CHANNEL_ACCESS_TOKEN`

### 5.3 Configure the Environment Variable

- [ ] Go to Vercel → your project → **Settings → Environment Variables**
- [ ] Edit `LINE_CHANNEL_ACCESS_TOKEN` (added blank in Step 4.2), paste
      the real token in
- [ ] **Redeploy** — Vercel environment variable changes don't apply to
      an already-running deployment; go to **Deployments → ⋯ → Redeploy**

### 5.4 Add yourself as a notification recipient (in the app, not an env var)

- [ ] On your phone, add your LINE OA as a friend (scan the QR code shown
      in OA Manager)
- [ ] Send the OA any message once (e.g. "hi") — this is often the
      simplest way to make your `userId` discoverable via LINE's developer
      tools/logs, depending on your LINE Developers Console setup
- [ ] Find your LINE `userId` (a long string starting with `U`)
- [ ] Sign in to the app → **Settings → Notifications**
- [ ] Add a recipient: paste your `userId`, give it a label like "Me"

`[Screenshot here: app's Settings -> Notifications page with a recipient added]`

### 5.5 Verify notifications

- [ ] Next to the recipient you just added, click **"Send test message"**
- [ ] Check your phone — you should receive a LINE message within a few
      seconds

**Expected result:** a real LINE message arrives on your phone.

### 5.6 Also verify via System Health

- [ ] In the app, go to **Settings → System Health**
- [ ] The **LINE** row should show ✅ — this is a real check (it calls
      LINE's own API to validate the token), not just "is the setting
      present"

### Troubleshooting — Step 5

| Problem                                            | Cause                                                                                      | Fix                                                                                                                                                                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test message never arrives                         | Token not actually saved/redeployed, or you haven't added the OA as a friend on your phone | Confirm you redeployed after adding the token (Step 5.3); confirm you've added the OA as a LINE friend                                                                                                                                          |
| System Health shows LINE as ❌ or "not configured" | Token missing or invalid                                                                   | Re-check the token was copied completely (no missing characters) and pasted into Vercel correctly, then redeployed                                                                                                                              |
| Can't find your LINE `userId`                      | LINE doesn't always make this obvious                                                      | Check the LINE Developers Console for your channel — recent user interactions are sometimes visible there; alternatively, any LINE bot debugging method you're already familiar with will work, since it's just LINE's standard `userId` format |

---

## Step 6 – Google Sheets Integration

### Why this step exists

This connects your existing guest-list spreadsheet to the app, so guest
names, RSVP status, and envelope/transfer amounts flow in automatically
instead of being retyped.

### 6.1 Publish your Sheet as CSV

- [ ] Open your guest-list Google Sheet
- [ ] **File → Share → Publish to web**
- [ ] Choose the specific sheet/tab (not "Entire Document")
- [ ] Format: **Comma-separated values (.csv)**
- [ ] Click **Publish**, confirm, copy the resulting URL

`[Screenshot here: Google Sheets "Publish to the web" dialog with CSV format selected]`

**Understand the trade-off before continuing:** anyone with this exact
URL can view the raw contents of this sheet/tab (guest names, RSVP,
contact info). This is the same level of exposure as a typical wedding
RSVP website — no financial account details are in this sheet, only guest
list information.

### 6.2 Configure the Sync URL

- [ ] Sign in to the app → **Settings → Integrations**
- [ ] Paste the published CSV URL into the **CSV URL** field
- [ ] Review the **Field Mapping** table — the left column must match
      your Sheet's actual column headers **exactly**, including
      capitalization. Edit any that don't match.

`[Screenshot here: app's Settings -> Integrations page with CSV URL and field mapping filled in]`

### 6.3 Configure sync settings

- [ ] Leave **"Allow sync to overwrite manually-edited records"** off for
      now (default, and the safer choice — turn it on only if you
      specifically want the Sheet to overwrite something you've since
      edited by hand in the app)

### 6.4 Test with Dry Run

- [ ] Click **"Dry Run (Preview)"**
- [ ] Review the preview: how many rows would be inserted, updated,
      skipped, or failed — and why, for anything skipped/failed
- [ ] If the numbers don't look right (e.g. everything shows as "failed"),
      stop here and check your field mapping against your Sheet's real
      column headers before continuing

### 6.5 Run a real sync

- [ ] Once the dry run looks correct, click **"Sync Now"**
- [ ] Confirm the summary counts match what you expected
- [ ] Go to **Guests** and **Income** in the app — confirm the data
      actually appears there

**Expected result:** your real guest list appears in the app, with
correct names/RSVP/table numbers, and any envelope/transfer amounts appear
as Income entries too.

### 6.6 (Optional) Schedule automatic sync

- [ ] Open any Google Sheet → **Extensions → Apps Script**
- [ ] Paste the contents of `integrations/google-apps-script/sync.gs`
- [ ] Fill in `APP_URL` (your Vercel URL), `PROJECT_ID` (from Step 4.5),
      and `SHARED_SECRET` (the value you made up in Step 4.2)
- [ ] Run `pingGuestSync` once manually to test — approve the
      authorization prompt (it's your own script)
- [ ] Check the Apps Script execution log shows a `200` response
- [ ] **Triggers** (clock icon, left sidebar) → Add Trigger → choose
      `pingGuestSync` → Time-driven → pick a frequency (e.g. daily) → Save

### 6.7 Verify via System Health

- [ ] Settings → System Health → **Guest Sync** row should show ✅

### Troubleshooting — Step 6

| Problem                                                        | Cause                                                                                   | Fix                                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Dry Run shows everything as "skipped" or "failed"              | Field mapping doesn't match your Sheet's actual column headers                          | Open your Sheet, check the exact header text (capitalization matters), update the mapping to match exactly |
| "No CSV URL configured" error                                  | URL field wasn't saved                                                                  | Re-paste the URL, click elsewhere on the page to trigger the save, refresh and confirm it's still there    |
| Sync succeeds but Guests page still looks empty                | You may be looking at the wrong project, or the sync ran against a different project ID | Confirm you're signed in as the right user and the app shows the right project                             |
| A previously-edited guest keeps reverting to the Sheet's value | Expected if you turned on "Allow sync to overwrite"                                     | Turn that setting back off if you don't want this — see Step 6.3                                           |
| A walk-in guest disappeared after sync                         | This should never happen by design — walk-in guests are never touched by sync           | This would be a real bug, not expected behavior — note it precisely if you ever see it                     |

---

## Step 7 – Production Validation

Work through every section below on your **real, deployed** app before
considering `v1.0` done. Check every box.

### Authentication

- [ ] Whitelisted email logs in successfully
- [ ] Non-whitelisted email is rejected to `/no-access`
- [ ] Signing out and back in works
- [ ] Session survives a full browser restart

### Permissions

- [ ] Add a second whitelisted user with role `viewer`
- [ ] Confirm that user can view but not edit project settings
- [ ] Confirm Owner can edit the permission matrix at Settings → Permissions

### Dashboard

- [ ] Dashboard loads with Today's Summary, summary cards, and both charts
- [ ] Quick Actions (Add Expense/Guest/Income, Copy Link, Sync Now) all work

### Budget

- [ ] Add a budget category
- [ ] Set a budgeted amount
- [ ] Confirm Spent/Remaining update correctly once an expense exists

### Expense

- [ ] Create an expense with all fields (VAT, discount, shipping,
      withholding tax) — confirm the Net Total is calculated correctly
- [ ] Attach a receipt photo — confirm it uploads and is viewable
- [ ] Attempt a file over 10MB — confirm it's rejected

### Reimbursement

- [ ] Submit a test request via the public link (`/r/<project-id>`, no
      login) from your phone
- [ ] Approve it as Owner/Admin — confirm a matching Expense appears
- [ ] Reject a different test request with a reason
- [ ] Mark one as Paid — confirm a LINE notification arrives

### Guest

- [ ] Add a walk-in guest manually
- [ ] Confirm search and RSVP filtering work
- [ ] Re-run guest sync — confirm the walk-in guest is untouched

### Income

- [ ] Add a manual income entry
- [ ] Confirm it appears and contributes to the Dashboard's Income figure

### Reports

- [ ] Download the Budget Summary PDF — confirm it opens and Thai text (if
      any category names are in Thai) displays correctly, not as boxes
- [ ] Download the Expense List Excel — confirm it opens in
      Excel/Google Sheets with correct data

### Analytics

- [ ] Visit `/analytics` — confirm Cost per Guest, Average Envelope,
      Budget Health %, and Pending Requests all show sensible numbers

### LINE Notifications

- [ ] Test message arrives (Step 5.5)
- [ ] Submitting a reimbursement triggers a real notification
- [ ] Approving one triggers a real notification
- [ ] Marking one Paid triggers a real notification

### Google Sync

- [ ] A real sync run completes successfully (Step 6.5)
- [ ] Dry Run and real Sync Now both produce sensible, matching previews/results

### Storage

- [ ] Receipts, slips, and product images all upload correctly to their
      respective buckets
- [ ] Files over 10MB are rejected

### System Health

- [ ] Visit Settings → System Health
- [ ] All four rows (Supabase, Storage, LINE, Guest Sync) show ✅ (or an
      accepted ⚠️ if something is intentionally not yet configured)

---

## Final Release Checklist

Everything below must be true before you tag `v1.0`:

- [ ] All 10 migrations run successfully against production Supabase
- [ ] Your real wedding project exists in the `projects` table (Step 4.5)
- [ ] You are linked as `owner` in `project_members`
- [ ] Google OAuth login works end-to-end on the real Vercel URL
- [ ] Non-whitelisted login is correctly rejected
- [ ] All Storage buckets exist with correct names, visibility, and size limits
- [ ] All 5 Vercel environment variables are set correctly
- [ ] LINE test message successfully received
- [ ] A real Google Sheets sync has completed successfully at least once
- [ ] Every section of Step 7 (Production Validation) is checked
- [ ] Settings → System Health shows all green (or explicitly-accepted ⚠️)
- [ ] You have a recent database backup (see Maintenance Guide below)

Once every box above is checked:

```bash
git tag v1.0
git push --tags
```

**v1.0 is live.**

---

## Common Errors

A quick-reference table for errors you might hit at any point, not just
during first setup.

| Error / Symptom                             | Where it happens         | Likely cause                                                                                            | Fix                                                                                                                  |
| ------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `redirect_uri_mismatch`                     | Login                    | Google/Supabase redirect URLs don't match exactly                                                       | Re-check Steps 3.2 and 4.4 character-for-character                                                                   |
| Redirected to `/no-access`                  | Login                    | Email not whitelisted, or whitelist has a typo                                                          | Check `whitelisted_emails` table for the exact email                                                                 |
| Redirected to `/no-project`                 | Login                    | No `project_members` row links you to a project                                                         | Re-do Step 4.5                                                                                                       |
| Build fails on Vercel                       | Deployment               | Missing/misspelled environment variable                                                                 | Check the build log; verify all 5 env vars                                                                           |
| "relation does not exist"                   | Running a migration      | Migrations run out of order                                                                             | Run all migrations in order, 0001 through 0010                                                                       |
| File upload fails silently                  | Any receipt/photo upload | Storage bucket missing, or RLS policy not applied (migration 0005 not run)                              | Confirm all 4 buckets exist; confirm migration 0005 ran successfully                                                 |
| LINE message never arrives                  | Notifications            | Token not set, not redeployed, or you haven't friended the OA                                           | Re-check Step 5.3–5.5                                                                                                |
| Sync shows all rows failed/skipped          | Google Sheets sync       | Field mapping doesn't match Sheet headers                                                               | Re-check Step 6.2                                                                                                    |
| PDF report shows boxes instead of Thai text | Reports                  | This should not happen in v1.0 (bundled Thai font) — if it does, this is a real bug, not a config issue | Note the exact category name/text that failed — needed for investigation                                             |
| App loads but looks broken/unstyled         | Any page                 | Stale build cache                                                                                       | Vercel → Deployments → Redeploy without cache                                                                        |
| "permission denied for table X"             | Any in-app action        | RLS correctly blocking an action your role isn't allowed to do                                          | This is often _expected behavior_, not a bug — confirm what role you're testing as before assuming something's wrong |

---

## Maintenance Guide

### How to update the application

1. Make your code changes locally (or have them made).
2. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "describe your change"
   git push
   ```
3. Vercel automatically detects the push and redeploys — watch the
   Deployments tab in Vercel to confirm it succeeds.
4. If the change included a new database migration, run that migration in
   Supabase's SQL Editor **before** relying on the new code in production
   (see below).

### How to run future database migrations

1. New migration files will be named `0011_...sql`, `0012_...sql`, etc.
2. Open each one, copy its full contents, run it in Supabase's SQL Editor
   — same process as Step 2.3.
3. Always run new migrations **in ascending numeric order**, and never
   skip one, even if it looks unrelated to what you're doing.
4. Never edit an already-applied migration file — if something needs to
   change, that becomes a new migration.

### How to back up the database

Three layers, from easiest to most thorough:

1. **Automatic**: Supabase's free tier includes automatic daily backups
   with a short retention window — no action needed, but don't rely on
   this alone.
2. **Manual data export**, anytime you want an extra copy:
   ```bash
   supabase db dump --data-only -f backup_$(date +%Y%m%d).sql
   ```
   (requires the Supabase CLI — `npm install -g supabase`, then
   `supabase login` and `supabase link --project-ref <your-ref>` once)
3. **Storage files**: download the contents of your Storage buckets via
   the Supabase Dashboard periodically, especially before any major change.

### How to restore a backup

1. Provision a Supabase project (a new one, or the same one if you're
   recovering in place).
2. Run all migrations in `supabase/migrations/`, in order, to recreate the
   schema.
3. Import your data dump:
   ```bash
   psql "$DATABASE_URL" -f backup_YYYYMMDD.sql
   ```
4. Re-upload any exported Storage files to their original bucket paths.
5. Re-wire the whitelist Auth Hook (Step 2.7) — this is project
   configuration, not part of the SQL dump, so it needs to be redone.
6. Verify: log in, confirm a few known records look right, confirm a
   non-whitelisted email is still correctly rejected.

### How to roll back to a previous Git version

If a deployment introduces a problem:

1. **Fastest fix — roll back the deployment, not the code:** Vercel →
   Deployments → find the last known-good deployment → **⋯ → Promote to
   Production**. This is instant and doesn't touch your Git history.
2. **If you also want your code repository to reflect the rollback:**
   ```bash
   git revert <bad-commit-hash>
   git push
   ```
   This creates a new commit that undoes the bad one, keeping your history
   honest (preferred over force-pushing over history).
3. **Database changes are not automatically rolled back** by either
   method above — if the problematic deployment included a migration that
   already ran, rolling back the app code does not undo the database
   change. Think through whether a migration needs its own undo migration
   before rolling back code that depended on it.

### How to monitor the application

- **Settings → System Health** (in-app): check this periodically — it's a
  real, live check of Supabase, Storage, LINE, and Guest Sync, not just a
  static status page.
- **Settings → Audit Log** (in-app): shows who did what and when, across
  every financial and guest record.
- **Settings → Activity Feed** (in-app): a friendlier, chronological view
  of the same underlying data.
- **Vercel Dashboard → your project → Logs**: real-time and historical
  server logs if something goes wrong.
- **Supabase Dashboard → Database → Usage**: keep an eye on this
  periodically to confirm you're staying within free-tier limits as data
  grows over the life of the wedding.

---

_This guide is the single source of truth for deploying and maintaining
this application. If any step doesn't match what you actually see once
you go through it, that's worth flagging precisely — the exact screen,
the exact error text — so the guide (or the underlying code, if that's
actually the problem) can be corrected._
