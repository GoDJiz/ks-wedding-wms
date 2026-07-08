# Development Seed Strategy

## Why a separate script, not a migration

Migrations (`supabase/migrations/`) run in every environment, including
whatever you eventually call "production" for this personal deployment.
Seed data must never be able to run there by accident. `supabase/seed/dev_seed.sql`
lives outside the migrations folder specifically so `supabase db push` (and
any CI/CD that might be added later) never touches it — it only runs when
someone deliberately invokes `psql -f`.

## Safety design (three independent layers)

1. **Explicit opt-in flag.** The script aborts immediately unless invoked
   with `-v allow_seed=yes`. Copy-pasting the file's contents into a random
   SQL editor without that flag does nothing.
2. **Total data isolation.** Every row this script creates hangs off one
   fixed, obviously-fake project (`KS Wedding (DEV SEED — safe to delete)`,
   UUID `00000000-0000-0000-0000-0000000000d5`). It never writes into your
   real "KS Wedding" project's rows. Even a worst-case accidental run against
   a real environment just adds one extra, clearly-labeled, fully
   self-contained project — one `delete from projects where name = '...'`
   removes it completely (cascading deletes handle every child row).
3. **Repeatable by construction.** The script deletes that one dev project
   before recreating it, so running it 1 time or 50 times produces the same
   clean state — no accumulating duplicate junk to clean up manually.

## How to run it

```bash
# 1. Edit supabase/seed/dev_seed.sql once: replace YOUR_EMAIL_HERE with a
#    real, already-whitelisted email that has signed in at least once.
# 2. Run it:
psql "$DATABASE_URL" -v allow_seed=yes -f supabase/seed/dev_seed.sql
```

`DATABASE_URL` is the connection string from Supabase Dashboard → Project
Settings → Database → Connection string (use the "URI" format, direct
connection — not the pooled one, for a one-off script like this).

## What it seeds, and why those volumes

Mapped directly to the approved Scale Requirements (10 users / 30 concurrent
/ 300-600 guests / 100-300 expenses / 50-150 reimbursements / 20-50 vendors):

| Data              | Count | Reasoning                                                                                                                                                                                                                            |
| ----------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Payment accounts  | 4     | Fixed set per the Payment Accounts module spec                                                                                                                                                                                       |
| Budget categories | 14    | The full suggested list from Functional Requirements                                                                                                                                                                                 |
| Vendors           | 20    | Mid-point of the 20-50 target range                                                                                                                                                                                                  |
| Expenses          | 200   | Mid-point of the 100-300 target range, spread across the last ~5 months with varied categories/vendors/accounts/payment methods so category breakdowns and monthly trend charts have real shape                                      |
| Guests            | 450   | Mid-point of the 300-600 target range, with randomized RSVP status, table numbers, and envelope/transfer amounts so guest search/filtering and "cost per guest" style analytics have realistic variety                               |
| Incomes           | ~215  | Mostly derived from guests' seeded envelope/transfer amounts (so Income and Guest data are consistent with each other, not two disconnected random sets), plus 15 non-guest income rows (sponsor/gift/gold/cheque) for chart variety |

Budgeted amounts per category are deliberately uneven relative to the
randomized expense amounts, so at least a few categories will show as
"over budget" once seeded — that's a real state the Budget module's UI needs
to handle, not just the common "under budget" case.

Reimbursements aren't seeded yet — that table doesn't exist until Milestone 3.

## What it does NOT do

- Does not touch `whitelisted_emails`/`project_members` for your real
  project — it only inserts a whitelist row scoped to the dev project's own
  `project_id` (via `on conflict (email) do nothing`, so if that email is
  already whitelisted for your real project, this is a no-op there).
- Does not seed Storage objects (receipt images, logo) — `expense_files`
  isn't populated, since fake image binaries aren't useful test data; the
  Expense feature's file upload should be tested manually via the app UI
  against a couple of real (or placeholder) images.
- Does not seed `audit_log` or `application_logs` directly — those populate
  naturally from the triggers as a side effect of the inserts above, which
  is itself a useful smoke test that the Milestone 1/2 triggers fire
  correctly against a realistic data volume.

## Re-seeding during Milestone 2+ development

Safe to re-run any time schema changes — just re-run the same command. If a
migration changes a table this script inserts into, update the corresponding
`insert into` statement in the same commit as the migration, so the seed
script never silently drifts out of sync with the schema (per
DEVELOPMENT_RULES.md §16, Documentation Requirements).
