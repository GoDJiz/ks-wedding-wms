# End-to-End Scenario Tests (Regression Checklist)

**Format note:** these are structured manual test scripts, not automated
Playwright/Cypress code. Automating real Google OAuth login reliably needs
either a dedicated test-auth bypass or a service-account flow — solvable,
but a separate piece of infrastructure investment I didn't want to bolt on
silently. Flagging that trade-off here rather than pretending these run in
CI. Each scenario is written so it _could_ become an automated test later
(clear steps, clear expected results) without redesigning anything.

Run this checklist after any milestone that touches a workflow it covers —
that's the "regression" part. Scenarios are grouped by the milestone that
introduced them; new milestones add new sections rather than rewriting old
ones.

---

## Setup (once, before running any scenario below)

- [ ] Deployed environment, `v0.1`+ already tagged
- [ ] Two whitelisted test accounts: one `owner`, one `viewer`
- [ ] Dev seed data loaded (`docs/SEED_STRATEGY.md`) for realistic volume

---

## Milestone 1 — Foundation

**S1.1 — Whitelisted login succeeds**

1. Sign in with the `owner` test account.
2. Expected: lands on `/`, shows the signed-in email, `/dashboard` and
   `/settings` links both work.

**S1.2 — Non-whitelisted login is rejected**

1. Sign in with a Google account NOT in `whitelisted_emails`.
2. Expected: redirected to `/no-access`, no session created.

**S1.3 — Route protection**

1. Signed out, visit `/settings/project` directly by URL.
2. Expected: redirected to `/login`, not a blank page or crash.

**S1.4 — Permission enforcement (viewer can't write)**

1. Sign in as `viewer`. Attempt to edit the project name on
   `/settings/project` and save.
2. Expected: translated permission-denied message; value unchanged in DB.

**S1.5 — i18n toggle**

1. On any page, switch ไทย ↔ EN.
2. Expected: all visible text changes, including previously-shown error
   messages if you trigger one again.

---

## Milestone 2 — Budget & Expenses

**S2.1 — Budget over-budget state**

1. As `owner`, view `/budget` with seed data loaded.
2. Expected: at least one category shows the "Over Budget" badge with a
   red progress bar.

**S2.2 — Expense net total calculation**

1. Create an expense: amount 1000, VAT 70, discount 50, shipping 20,
   withholding tax 30.
2. Expected: Net Total = 1000 + 70 − 50 + 20 − 30 = **1010** exactly.

**S2.3 — Receipt upload + 10MB limit**

1. Create an expense, attach a normal photo (<10MB).
2. Expected: expense saves; receipt appears in Supabase Storage under
   `<project_id>/<expense_id>/...`.
3. Repeat attaching a file >10MB.
4. Expected: client-side rejection, expense itself still saves without
   the receipt.

**S2.4 — Dashboard consistency**

1. Compare `/dashboard` totals against `/budget` and `/expense` totals.
2. Expected: Total Budget, Spent figures match exactly across all three
   pages — not just "look similar."

---

## Milestone 3 — Reimbursement

**S3.1 — Public submission (no login)**

1. In an incognito window, visit `/r/<project_id>`.
2. Fill in name, phone, date, amount, select "Cash," attach a photo, submit.
3. Expected: success screen with a reference code; no login was ever
   required or offered.

**S3.2 — Conditional bank info**

1. Repeat S3.1 but select "Bank Transfer."
2. Expected: a bank info field appears and is required; submission fails
   with a clear message if left blank.

**S3.3 — Admin approval creates an Expense**

1. As `owner`, open `/reimbursement`, find the request from S3.1, approve
   it in full, assigning a category and account.
2. Expected: request status becomes "Approved"; a new row appears on
   `/expense` with the approved amount, linked back to this request.

**S3.4 — Partial approval requires a reason**

1. Approve a different request for less than the requested amount.
2. Expected: a reason field is required before the approve button submits;
   the resulting Expense uses the approved (not requested) amount.

**S3.5 — Rejection**

1. Reject a request without a reason.
2. Expected: blocked with a translated validation message.
3. Reject with a reason.
4. Expected: status becomes "Rejected," no Expense created.

**S3.6 — Duplicate warning**

1. Submit two public requests with the same amount and purchase date.
2. Expected: opening either one's admin detail view shows the duplicate
   warning banner.

---

## Milestone 4 — Guests, Income, Sync

**S4.1 — Walk-in guest survives a sync**

1. Add a walk-in guest manually via `/guests` (e.g. "Test Walkin").
2. Run a guest sync (`Sync Now` on `/settings/integrations`) against a
   Sheet that does NOT contain that name.
3. Expected: "Test Walkin" still exists on `/guests` afterward, untouched,
   `source` still `walk_in`.

**S4.2 — Sync inserts new guests, updates existing sheet_sync guests**

1. Configure a test published-CSV URL with 3 sample rows.
2. Run `Sync Now`.
3. Expected: summary shows `rowsInserted: 3` (first run), all 3 appear on
   `/guests` with `source: sheet_sync`.
4. Change one value in the Sheet (e.g. RSVP status), re-run sync.
5. Expected: summary shows `rowsUpdated: 1`, the guest's RSVP reflects the
   new value.

**S4.3 — Manual edit protects a guest from the next sync**

1. Edit one of the sheet-synced guests from S4.2 through the app (e.g.
   change their table number).
2. Expected: 🔒 icon now shows next to their name on `/guests`.
3. Change that same guest's data again in the Sheet, re-run sync.
4. Expected: summary shows this row under `rowsSkipped`, not `rowsUpdated`;
   the app's manually-edited value is unchanged.

**S4.4 — Explicit override bypasses the protection**

1. Enable "Allow sync to overwrite manually-edited records" on
   `/settings/integrations`.
2. Re-run sync.
3. Expected: the previously-skipped row is now updated from the Sheet;
   its 🔒 icon disappears (protection resets after an explicit overwrite).
4. Turn the toggle back off afterward.

**S4.5 — One bad row doesn't stop the sync**

1. Add a row to the test Sheet with an empty Name column.
2. Run sync.
3. Expected: summary status is `partial` (not `failed`), that row is
   counted under `rowsFailed`/`rowsSkipped` with a reason in the error log,
   and all other valid rows still processed normally.

**S4.6 — Income mirrors guest envelope/transfer amounts**

1. In the test Sheet, set a non-zero "Envelope Amount" for one guest row.
2. Run sync.
3. Expected: a new row appears on `/income` with type "Envelope," the
   correct amount, linked to that guest, `source: sheet_sync`.
4. Re-run sync without changing that value.
5. Expected: still exactly one income row for that guest+type — not
   duplicated.

**S4.7 — Manual income entry**

1. Add a manual income record via `/income` (type "Sponsor").
2. Expected: appears in the list immediately, `source: manual`, and
   contributes correctly to `/dashboard`'s Income figure.

**S4.8 — Activity Feed reflects real actions**

1. After performing S4.1–S4.7, open `/activity`.
2. Expected: entries for guest inserts/updates, income inserts, in
   correct chronological order, with the correct actor email.

**S4.9 — External sync trigger (Route Handler)**

1. `curl -X POST https://<your-domain>/api/sync/guests -d '{"projectId":"<id>","secret":"<wrong-secret>"}'`
2. Expected: `401 Unauthorized`.
3. Repeat with the correct secret.
4. Expected: `200`, a summary JSON, and a new row on
   `/settings/integrations`'s run history.

---

## Adding new scenarios (future milestones)

Append a new `## Milestone N — ...` section following the same
`S<milestone>.<number>` numbering. Don't renumber or remove old scenarios —
they stay as the permanent regression set for what they cover.
