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
