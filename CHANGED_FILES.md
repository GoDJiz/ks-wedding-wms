# Changed Files — Guest ↔ Income Sync Feature

This document lists every file touched while implementing the `/guests` → `/income`
synchronization feature (walk-in guest `transfer_amount` syncing into the `incomes`
ledger), plus the unrelated Husky tooling fix made in the same session.

---

## Summary

| Item | Count / Result |
|---|---|
| Total modified files | 10 |
| Total new files | 2 |
| Database schema changes | **None** |
| Migration files changed | **None** |
| TypeScript (`tsc --noEmit`) | ✅ Passed |
| ESLint | ✅ Passed |
| Vitest (`vitest run`) | ✅ Passed — 6 test files, 50/50 tests |
| Production build (`npm run build`) | ✅ Passed — 32/32 routes generated |

No columns, tables, or indexes were added. The feature reuses the existing
`guests.transfer_amount`, `incomes.guest_id`, `incomes.type`, `incomes.amount`,
`incomes.source` columns and the existing unique index on `incomes (guest_id, type)`.

---

## Modified Files

### `src/features/guest/application/guestActions.ts`
- **Reason:** `createGuest` and `updateGuest` server actions now call the shared
  sync helper after a successful guest write, so manually-entered ("walk-in")
  guests sync their `transfer_amount` into `incomes` the same way CSV-imported
  guests already did.
- **Related files:** `src/shared/lib/guestIncomeSync.ts`,
  `src/features/guest/infrastructure/guestRepository.ts`,
  `src/features/guest/guest.types.ts`

### `src/features/guest/components/GuestForm.tsx`
- **Reason:** Added the "Transfer amount" input field to the walk-in guest
  create/edit form so staff can enter the value that drives the sync.
- **Related files:** `src/features/guest/guest.types.ts`,
  `src/features/guest/application/guestActions.ts`

### `src/features/guest/components/GuestPageClient.tsx`
- **Reason:** Added a "Synced / Pending / Cancelled" badge next to each guest's
  transfer amount on the `/guests` list, derived entirely from existing data
  (no new field) via `guestIncomeSyncStatus`.
- **Related files:** `src/shared/lib/guestIncomeSync.ts`,
  `src/features/guest/domain/Guest.ts`

### `src/features/guest/domain/Guest.ts`
- **Reason:** Added a derived (non-persisted) `linkedTransferIncomeAmount` field
  to the `Guest` domain object so the UI can compare the guest's
  `transferAmount` against the linked income's current amount without a new
  database column.
- **Related files:** `src/features/guest/infrastructure/guestRepository.ts`,
  `src/features/guest/components/GuestPageClient.tsx`

### `src/features/guest/guest.types.ts`
- **Reason:** Added `transferAmount` to `createGuestSchema` /
  `updateGuestSchema` so the field submitted by `GuestForm` is actually
  validated and passed through (previously silently dropped by the schema).
- **Related files:** `src/features/guest/components/GuestForm.tsx`,
  `src/features/guest/application/guestActions.ts`

### `src/features/guest/infrastructure/guestRepository.ts`
- **Reason:** `insertWalkInGuest` / `updateGuestRow` now read and write
  `transfer_amount`; `listGuests` now also fetches linked `incomes` rows
  (type `transfer`) to populate `linkedTransferIncomeAmount` for the sync
  status badge.
- **Related files:** `src/features/guest/domain/Guest.ts`,
  `src/features/guest/application/guestActions.ts`

### `src/features/sync/infrastructure/csvGuestSync.ts`
- **Reason:** Refactored the inline income-upsert logic used by the CSV/Sheet
  guest import into a call to the new shared helper, so there is a single
  source of truth for the upsert instead of duplicated logic. Behavior is
  unchanged — verified by the pre-existing `csvGuestSync.test.ts` suite,
  which still passes unmodified.
- **Related files:** `src/shared/lib/guestIncomeSync.ts`

### `src/lib/i18n/dictionaries/en.json`
- **Reason:** Added translation keys for the transfer-amount form field and
  the Synced/Pending/Cancelled sync status labels.
- **Related files:** `src/features/guest/components/GuestForm.tsx`,
  `src/features/guest/components/GuestPageClient.tsx`

### `src/lib/i18n/dictionaries/th.json`
- **Reason:** Thai translations for the same new keys added to `en.json`.
- **Related files:** same as `en.json`

### `docs/E2E_SCENARIOS.md`
- **Reason:** Added manual regression scenarios **S4.10–S4.14** covering
  walk-in guest create-with-amount, `0 → amount`, `amount → amount` (no
  duplicate), `amount → 0` (zero-out), and repeated-save duplicate
  prevention — following this project's existing convention of covering
  Supabase-touching behavior via manual E2E checklists rather than mocked
  unit tests.
- **Related files:** `src/shared/lib/guestIncomeSync.ts`

---

## New Files

### `src/shared/lib/guestIncomeSync.ts`
- **Purpose:** Single source of truth for all guest → income synchronization
  logic. Exports:
  - `upsertGuestIncome` — insert-or-update an income row for a
    `(guest_id, type)` pair, keyed on the existing unique index (used when
    `transfer_amount > 0`).
  - `zeroOutGuestIncome` — sets an existing linked income's `amount` to `0`
    without deleting the row, when `transfer_amount` drops to `NULL`/`0`.
    Includes a code comment noting this is temporary pending a future
    income-cancellation/status workflow.
  - `syncGuestTransferIncome` — the entry point that decides between the two
    above based on the guest's current `transfer_amount`.
  - `getDefaultPaymentAccountId` — shared lookup of the project's default
    payment account, reused from the original CSV sync logic.
  - `guestIncomeSyncStatus` — pure function computing the
    `"synced" | "pending" | "cancelled" | null` badge state for the UI.
- **Used by:** `src/features/guest/application/guestActions.ts`,
  `src/features/sync/infrastructure/csvGuestSync.ts`,
  `src/features/guest/components/GuestPageClient.tsx` (status function only)

### `src/shared/lib/guestIncomeSync.test.ts`
- **Purpose:** Unit tests for the pure `guestIncomeSyncStatus` logic
  (Synced/Pending/Cancelled classification), consistent with this project's
  approach of unit-testing pure logic and covering Supabase-dependent
  behavior via `docs/E2E_SCENARIOS.md` instead.
- **Used by:** N/A (test file; exercised by `vitest run`)

---

## Tooling-only change (separate commit, no application code)

### `.husky/pre-commit`, `.husky/_/*` (17 files)
- **Reason:** None of the Husky hook scripts had the executable bit set, so
  git silently skipped `lint-staged`/tests on commit. Fixed with `chmod +x`
  only — no file contents changed (`0 insertions, 0 deletions` in the diff).
  Committed separately as `chore: fix husky hook executable permissions`.

---

## Upload Guide

Files that must overwrite the corresponding files in the existing GitHub
repository (same relative paths):

```
docs/E2E_SCENARIOS.md
src/features/guest/application/guestActions.ts
src/features/guest/components/GuestForm.tsx
src/features/guest/components/GuestPageClient.tsx
src/features/guest/domain/Guest.ts
src/features/guest/guest.types.ts
src/features/guest/infrastructure/guestRepository.ts
src/features/sync/infrastructure/csvGuestSync.ts
src/lib/i18n/dictionaries/en.json
src/lib/i18n/dictionaries/th.json
src/shared/lib/guestIncomeSync.ts
src/shared/lib/guestIncomeSync.test.ts
```

No files should be deleted. No `supabase/` migration files are part of this
upload. If applying manually instead of via the provided git bundle, also
re-apply the executable bit to the Husky hook files listed above
(`chmod +x .husky/pre-commit .husky/_/*`), since ZIP archives do not always
preserve the executable permission bit depending on how they're extracted.
