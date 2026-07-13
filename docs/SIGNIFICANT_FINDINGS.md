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
