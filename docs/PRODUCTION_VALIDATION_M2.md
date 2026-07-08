# Production Validation — Milestone 2 Addendum (v0.2 Gate)

Run this against the real deployed environment, after `v0.1` is already
tagged. This addendum covers only what's new in Milestone 2 — everything in
`PRODUCTION_VALIDATION.md` (auth, session, route protection, mobile/tablet,
browser compatibility, accessibility, general security) still applies and
doesn't need repeating; re-run it only for the new routes below if you
skipped spot-checking them the first time.

Prerequisite: `v0.1` tagged, Milestone 2 code deployed.

---

## 1. Seed Script — Run It For Real

This is the item flagged in `docs/MILESTONE_2_REVIEW.md` as needing a real
run before its correctness moves from "hand-verified" to "confirmed."

- [ ] Follow `docs/SEED_STRATEGY.md` exactly: edit the placeholder email,
      run `psql "$DATABASE_URL" -v allow_seed=yes -f supabase/seed/dev_seed.sql`.
- [ ] Script completes with no SQL errors.
- [ ] `select count(*) from projects where name like 'KS Wedding (DEV SEED%';`
      → exactly 1 row (not accumulating duplicates from repeat runs).
- [ ] Re-run the exact same command a second time → still exactly 1 dev
      project, same row counts in each table (confirms delete-and-reseed
      repeatability actually works, not just in theory).
- [ ] Sign in as the dev owner email, switch to the dev-seed project (once
      the project switcher exists — until then, verify directly via
      Supabase Table Editor) → 14 budget categories, 4 payment accounts, 20
      vendors, ~200 expenses, ~450 guests, ~215 incomes all present.
- [ ] Run the cleanup statement from the bottom of `dev_seed.sql` → confirms
      the cascade delete removes every child row (spot-check a couple of
      tables afterward).

## 2. Budget Module

- [ ] `/budget` loads and shows all 14 seeded categories with plausible
      spent/remaining figures.
- [ ] At least one category shows the "Over Budget" badge (the seed data
      was deliberately built so this happens) — confirm the badge and the
      progress bar both render in the over-budget color, not just one of them.
- [ ] Edit a budgeted amount as Owner/Admin → saves, spent/remaining
      recalculate correctly without a full page reload.
- [ ] Attempt the same edit signed in as a `viewer` → translated
      permission-denied error, value unchanged.
- [ ] Add a new category → appears immediately with 0 spent/0 budgeted,
      no error.

## 3. Expense Module

- [ ] `/expense` loads the first page of seeded expenses (20 rows), total
      page count matches ~200 seeded rows ÷ 20.
- [ ] Pagination forward/back works correctly at both ends (first page's
      "←" disabled, last page's "→" disabled).
- [ ] Create a new expense with all fields filled (including VAT, discount,
      shipping, withholding tax) → verify the displayed **Net Total**
      matches `amount + vat − discount + shipping − withholding_tax`
      calculated by hand, not just "looks about right."
- [ ] Create an expense with a receipt image attached (under 10MB) →
      confirm the file actually lands in the `receipts` Storage bucket
      under the expected path, not just that the UI showed success.
- [ ] Attempt a receipt over 10MB → rejected client-side, expense itself
      still saves successfully (upload failure shouldn't block the record).
- [ ] After creating an expense, return to the list → the new expense
      appears without a manual browser refresh (validates the
      fetch-fresh-data-after-create fix from the M2 review, not the stale
      state bug it replaced).
- [ ] Signed in as `viewer`, attempt to open the "Add expense" form and
      submit → translated permission-denied error.

## 4. Dashboard

- [ ] `/dashboard` cards show figures consistent with `/budget` and
      `/expense` (Total Budget matches the sum from the Budget page, Spent
      matches, etc.) — cross-check numbers across pages, don't just confirm
      each page individually "looks right."
- [ ] Category Breakdown chart shows all categories with actual expenses,
      sorted by amount, bars sized proportionally.
- [ ] Monthly Trend chart shows 6 months, including any months with zero
      activity (should show as a flat/zero point, not a gap or a crash).
- [ ] Income and Profit/Loss figures reflect the seeded income data
      correctly (Profit/Loss = Income − Spent).
- [ ] Resize the browser to mobile width → both charts remain readable
      (no overflow, text doesn't overlap).

## 5. Payment Accounts

- [ ] `/settings/payment-accounts` shows the 4 seeded accounts.
- [ ] Attempting to delete an account currently referenced by seeded
      expenses — confirm the behavior (should either be blocked by the FK
      constraint with a translated error, or cascade in a way you've
      explicitly decided is correct; don't let this silently fail or
      silently orphan expense rows).

## 6. Audit Log (Milestone 2 tables)

- [ ] After the actions above (budget edit, category add, expense create),
      check `/settings/audit-log` → each action appears with the correct
      table name (`budgets`, `budget_categories`, `expenses`) and your
      email, confirming the triggers added in migration 0004 actually fire
      against the real database, not just that they compiled.

## 7. Performance Verification (same gap as Milestone 1)

- [ ] `/dashboard` load time with the full seeded dataset (~200 expenses,
      ~450 guests, ~215 incomes) — under 2s. This is the most
      performance-sensitive new page (three parallel queries + in-memory
      aggregation) and the most important one to verify for real, since it's
      the one place this milestone made a deliberate "small enough to
      aggregate in memory" bet — confirm that bet was right.
- [ ] `/expense` list navigation between pages — under 500ms.
- [ ] Expense creation with a receipt upload — under 2s perceived (upload
      itself may take longer on slow connections; the important thing is
      the UI shows a saving state throughout, not that the network is fast).

---

## Sign-off

```bash
git tag v0.2
git push --tags
```

Tell me once `v0.2` is tagged and I'll begin Milestone 3 (Reimbursement).
