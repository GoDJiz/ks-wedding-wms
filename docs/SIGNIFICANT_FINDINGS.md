# Significant Findings Log

Running log of architectural decisions, security findings, and production
issues worth remembering — not a full review per milestone, per the
lighter-weight process agreed after Milestone 2.

## Milestone 3 — Reimbursement

**Security fix (pre-existing gap, found during this milestone):** no RLS
policies existed on `storage.objects` at all, in any prior migration.
Supabase enables RLS on that table by default, so every file upload since
Milestone 0 (including the Milestone 2 Expense receipt upload) would have
failed with a permission error against a real deployed project — it just
hadn't been exercised against one yet. Fixed in migration 0005 with a
path-prefix convention (`<project_id>/...` as the first segment of every
object path) so one policy set covers every bucket/feature: insert is open
to anon (needed for the public reimbursement form), select is restricted to
owner/admin/finance of the matching project, generated via server-side
signed URLs — never a public URL for private buckets.

**Security hardening:** the first draft of the storage select policy used a
raw `::uuid` cast on the path prefix, which throws a hard error (not just a
failed check) for any malformed path — would have broken the whole query,
not just denied that one row. Fixed with a `safe_uuid()` helper that catches
the cast exception and returns NULL instead.

**Deliberate public-read exception:** added a `projects` SELECT policy
allowing anyone to read (`using (true)`) — needed so the public
reimbursement form can show the couple's names and validate the link is
real before rendering. Scoped narrowly: only the `projects` table itself is
exposed this way; no financial, guest, or user data.

**UX simplification (usability > features, per your explicit priority):**
dropped the optional "Category" field from the public reimbursement form
entirely. It was optional anyway, the admin assigns it at approval time
regardless, and removing it avoided needing a second public-read RLS
exception (on `budget_categories`) for a field most requesters would leave
blank. Fewer fields, less RLS surface, same outcome.

**Architecture fix:** `SelectOption` (a generic `{id, name}` type) was
originally defined inside `features/expense/domain/`. The Reimbursement
feature needed the same type for its category/account pickers, which would
have meant importing across feature boundaries — moved to
`shared/lib/SelectOption.ts` instead.

**Business-logic placement decision:** "approved reimbursement creates an
Expense" is implemented in the `approveReimbursement` Server Action (create
the Expense first, only then mark the request approved with a reference to
it), not as a DB trigger — unlike Audit Logging, this is a business rule
that needs category/account assignment decided at approval time, which
doesn't fit the "mechanical, always-fires" nature a trigger is good for.

**Known simplification:** duplicate detection is a simple heuristic (same
project + amount + purchase date as another active request) shown as a
non-blocking warning on the review screen — not image hashing or fuzzy
matching. Adequate at this project's scale; documented so it's not mistaken
for a more sophisticated check later.

**Lint fix:** React Hook Form's `watch()` triggers a React Compiler
incompatibility warning (returns a function that can't be safely memoized).
Switched to `useWatch()`, the compiler-safe equivalent, in the public
reimbursement form.

**Cleanup:** removed the `/dev/i18n-test` and `/dev/storage-test` spike
pages (already flagged for deletion once Milestone 0 was signed off) —
`storage-test`'s upload path didn't follow the new project-id-prefix
convention and would have broken under the new Storage RLS policies if left
in place.

## Milestone 4 — Guests, Income & Google Sheets Sync

**Architecture decision:** pivoted from the Milestone 0 spike's design
(Apps Script _pushes_ row data to an Edge Function) to a pull model (our
app fetches a "Published to web" CSV URL directly). Avoids needing Google
API OAuth/service-account credentials entirely — a real complexity
reduction, not just a preference. Apps Script's role shrinks to optionally
pinging our own `/api/sync/guests` endpoint on a timer for scheduled sync;
all actual sync logic lives in one place (`runGuestSync`), callable both
from the in-app "Sync Now" button and the external Route Handler.

**Safety mechanism:** `guests.is_manually_modified`, set only by the
Guest feature's own update Server Action, never by sync. Walk-in guests
(`source = 'walk_in'`) are excluded from sync matching entirely — not just
protected by the flag — so there's no configuration that could ever let
sync touch a walk-in row. Full design in `docs/SYNC_STRATEGY.md`.

**Per-row failure isolation:** the sync loop wraps each row's upsert in its
own try/catch; a single malformed row (e.g. missing name) is logged and
skipped without aborting the rest of the run. Verified this produces a
`partial` status (not `failed`) when some rows succeed and some don't —
the status calculation was deliberately not "any failure = failed run,"
since that would make a single bad row block 449 good ones.

**Reused existing infrastructure instead of adding new tables:** the
Activity Feed reads directly from the `audit_log` table (already populated
by triggers since Milestone 1/2) rather than introducing a separate
`activity_feed` table with its own population logic, which the original
Database Design doc had sketched. Simpler, and the data was already there.

**Testing approach, stated plainly:** delivered `docs/E2E_SCENARIOS.md` as
a structured manual regression checklist rather than automated
Playwright/Cypress tests. Automating real Google OAuth login reliably needs
either a dedicated test-auth bypass or a service-account flow — legitimate
future work, not something to fake having built. The checklist is written
so each scenario could become an automated test later without being
redesigned.

## Pre-Milestone-5 — Sync Dry Run & Metadata

**Kept genuinely lightweight, as asked:** `runGuestSync` gained one `dryRun`
boolean parameter that guards the actual write calls — the categorization
logic (insert/update/skip/fail decision) is the exact same code path either
way, so a dry-run preview can't drift from what a real run would actually
do. No new tables; `sync_runs` gained one `csv_hash` column. Dry runs
deliberately don't write a `sync_runs` row — a preview isn't a
synchronization that happened, so run history stays meaningful as
"things that actually happened."

## Milestone 5 — LINE Notifications, Reports, Analytics, Quick Actions

**Architecture consistency check caught 3 real cross-feature import
violations** (caught by the same grep audit I've run after every milestone
— worth noting it keeps finding real issues, not just passing cleanly):

1. Dashboard's `QuickActions` component imported directly from the `sync`
   feature. Fixed by passing the sync Server Action down as a prop from
   the page (Presentation layer, which may legitimately compose any
   feature) instead — and further simplified the prop's type to a minimal
   local shape rather than importing sync's domain types just for a
   function signature.
2. Expense and Reimbursement's application layers imported
   `notifyProjectRecipients` from inside `features/notifications/`.
   Sending a notification is a cross-cutting concern like logging or
   session handling, not specific to the notifications feature's own
   Settings UI — moved the LINE client and the notify function to
   `shared/notifications/`, same reasoning as `shared/logging/`.
3. The new Reports feature imported `Expense` and `BudgetCategoryOverview`
   domain types directly from the expense/budget features, just to type a
   function parameter. Replaced with report-local row shapes
   (`ExpenseReportRow`, `BudgetReportRow`) and map at the Route Handler
   boundary — same pattern established for `shared/lib/SelectOption.ts`
   back in Milestone 3.

**Known limitation, stated plainly:** the Budget Summary PDF renders in
Helvetica (react-pdf's default) with no font registered — Thai
category/project names will not render correctly. Bundling and registering
a Thai-capable font file is a reasonable follow-up, not done here to avoid
adding a font-loading dependency for what was meant to be a fast addition
this milestone; English labels and all numbers render correctly regardless.

**Design choice:** LINE notification failures never block the action that
triggered them (reimbursement submission, expense creation) — both call
sites fire the notification without awaiting/propagating its result
further than a `.catch()` swallow. A third-party API being briefly down
should never prevent someone from submitting a reimbursement request.

**Design choice:** the budget-overrun check on expense creation is a
small, targeted query (this one category's budget vs. spent) rather than
recomputing the full dashboard aggregation — cheap enough to run on every
expense creation without adding noticeable latency.

## Pre-v1.0 — Release Candidate Hardening

**Real bug found and fixed: Thai PDF font.** Bundled Sarabun (OFL license)
for the Budget Summary PDF. Initial implementation used the font's `.woff2`
variant, which passed a quick smoke test (one short string) but threw
`RangeError: Offset is outside the bounds of the DataView` inside
`fontkit`'s glyph subsetting once a real report (14 category names, mixed
Thai/English) was rendered — a bug that a shallow test would have missed
entirely. Found by deliberately stress-testing with realistic content
before considering the feature done, not by trusting the first successful
render. Switched to the same font's `.woff` variant, re-verified at full
scale (text extraction + visual render inspection), confirmed correct.

**Second issue caught before it shipped as a deployment bug:** the font
files were initially placed under `src/assets/`, read via a runtime
`fs`-style path. That works identically to `public/` in local dev, but
Vercel's serverless function file-tracing isn't guaranteed to include
arbitrary `src/` files referenced only through a computed runtime path
(vs. a static `import`) — it reliably includes everything under `public/`,
however. Moved before this became a "works locally, 500s in production"
surprise. Caught by reasoning through the deployment model, not by a local
test, since both paths behave identically in dev.

**Scope decision, stated plainly:** "Upcoming payment reminders" has no
real due-date concept to key off yet — Vendor Installments (which would
have real due dates) are Milestone 6 scope, not built. Implemented instead
as a reminder for reimbursements that were Approved but have sat unpaid
past a threshold — the closest honest analog available in the current
schema, documented as a placeholder to revisit rather than silently
presented as a full "payment due date" feature.

**Housekeeping:** found and removed 11 stray empty directories across the
`features/` tree, literally named `{domain,application,infrastructure,components}`
— leftover artifacts from `mkdir -p path/{a,b,c,d}` brace-expansion not
working the way it does in bash, in whatever shell context those specific
commands ran in during earlier milestones. Harmless (every real file was
always created via explicit correct paths), but worth a mention since it's
the kind of small drift that's easy to leave unnoticed indefinitely.

`docs/RC1_CHECKLIST.md` is the full gate for `v1.0` — see that document
for the complete module-by-module status and the honest list of what
still needs a real deployed environment to fully prove, rather than
duplicating that list here.

## Pre-v1.0 — Production Support Pass (QA/DevOps/Production Support role)

**Real security fixes (migration 0009):**

1. `reimbursement_files` had `with check (true)` on its public insert
   policy — completely unconditional. Anyone could attach a file record to
   **any** `reimbursement_id`, including other people's already-reviewed/
   approved/paid requests, with no relation to ever having uploaded
   anything. Tightened to only allow attaching to a request that still
   exists and is still `submitted` (matching "requester cannot edit after
   submission" already true elsewhere).
2. The public reimbursement insert policy validated `status = 'submitted'`
   but didn't restrict which _other_ columns a direct-API caller could
   set — `approved_amount`, `reviewed_by`, `reject_reason`,
   `partial_approval_reason`, `expense_id` could all be pre-populated on a
   fresh "submitted" row. Can't move money (only the approve Server Action
   creates an Expense, independently), but would show misleading data to
   admins. Closed by requiring all of those to be null on insert.
3. `notification_recipients` was readable by any project member (viewer,
   organizer) though only owner/admin ever manage it — tightened to
   owner/admin read access, consistent with `whitelisted_emails`.
4. Added DB-level length/range CHECK constraints on `reimbursement_requests`
   and `application_logs` (both have public, unauthenticated insert by
   design) — defense-in-depth beyond the app's Zod validation, which only
   protects callers going through the app's Server Actions, not someone
   hitting the Supabase REST API directly with the (non-secret) anon key.

**Real performance fixes:**

1. The sync engine re-fetched the default payment account **inside** the
   per-row loop for every guest with a non-zero envelope/transfer amount —
   up to ~2 extra queries per row, ~900 extra queries on a 450-guest sync.
   Fetched once before the loop instead.
2. Parallelized signed-URL generation for reimbursement attachments
   (previously sequential `await`s in a `for` loop; each file's URL is
   independent of the others).
3. `audit_log` and `sync_runs` were both queried as
   `where project_id = ? order by created_at/started_at desc limit N` in
   multiple pages, with no supporting index — added (migration 0010).
   `audit_log` is the fastest-growing table in the schema (every write
   across 10+ tables lands here via the audit trigger), making it the
   most likely to actually matter over the life of the app.

**Real deployment-documentation bug — the most significant finding of this
pass:** `DEPLOYMENT.md`, `.env.example`, and `integrations/google-apps-script/sync.gs`
all still described the Milestone 0 architecture (Apps Script _pushes_ row
data to a Supabase Edge Function; `LINE_CHANNEL_ACCESS_TOKEN` and
`SHEET_SYNC_SHARED_SECRET` set as _Supabase secrets_). That architecture
was replaced back in Milestone 4 — every actual runtime usage of those two
env vars is `process.env` inside Next.js Route Handlers/Server Actions,
never `Deno.env` in an Edge Function. Following the old docs as written
would have set both variables in the wrong place entirely, and LINE
notifications + scheduled sync would have silently never worked, with no
obvious error pointing at why. Fixed: rewrote the affected sections of all
three files, and deleted the two now-fully-obsolete Supabase Edge Functions
(`notify-line-test`, `sync-guests-test`) so they can't mislead a deployer
into thinking they're still needed.

**Verified, not just assumed:** `npm audit` flags `xlsx` (2 moderate + 1
high — prototype pollution and ReDoS). Checked directly: both advisories
affect XLSX's _parsing_ code path (`XLSX.read`/`readFile`), which this
app never calls — `expenseExcel.ts` only calls `json_to_sheet`/`book_new`/
`write` to build a workbook from data we already control. Not exploitable
in this app's usage; documented here so a future `npm audit` reading
doesn't cause unnecessary alarm or an unnecessary dependency swap.

**Automated tests added** (`npm run test`, Vitest, now part of the
pre-commit hook): 45 tests across `parseCsv`, `shortHash`, `formatCurrency`,
`mapSupabaseError`, and the sync engine's `normalizeExternalKey`/
`normalizeRsvp`/`parseAmount` — the pure logic most prone to subtle bugs
and least likely to be caught by TypeScript alone (e.g., CSV quoting edge
cases, RSVP value normalization, amount string parsing). This is real
regression protection for the highest-risk pure logic, not a full test
pyramid — integration/E2E behavior stays in `docs/E2E_SCENARIOS.md`'s
manual checklist, per that document's stated reasoning.

**Housekeeping:** removed the two obsolete Milestone 0 Edge Functions
entirely (see above) rather than leaving them as unused dead code that
could confuse a future deployer.
