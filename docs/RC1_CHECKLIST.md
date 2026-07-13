# Release Candidate 1 (RC1) Checklist

This is the gate for `v1.0`. Every module below needs a ✅ (or an
explicitly-accepted ⚠️ with a written reason) before tagging `v1.0`. Where
a module can't be fully verified without a real deployed environment, that
gap is called out explicitly rather than assumed away — same discipline as
every milestone review so far.

## How to use this

1. Deploy the current `main` branch (all migrations through `0008`).
2. Work through every module below on the real deployed app.
3. Check the box, or mark ⚠️ with a one-line reason if something is
   accepted-but-imperfect for v1.0.
4. Once every row is checked, do the final v1.0 steps at the bottom.

---

## Module Status

| #   | Module                                      | Routes                                    | Status        | Notes                                                                                                                           |
| --- | ------------------------------------------- | ----------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Authentication (Google + whitelist)         | `/login`, `/no-access`, `/no-project`     | ✅ Built      | Verified in code; needs one real login pass post-deploy per `PRODUCTION_VALIDATION.md` §1                                       |
| 2   | Session & Route Protection                  | `(dashboard)/layout.tsx`                  | ✅ Built      | Single enforcement point for every nested route                                                                                 |
| 3   | Project Settings                            | `/settings/project`                       | ✅ Built      |                                                                                                                                 |
| 4   | User Management (whitelist)                 | `/settings/users`                         | ✅ Built      |                                                                                                                                 |
| 5   | Permission Matrix                           | `/settings/permissions`                   | ✅ Built      | Owner-editable; RLS is the real enforcement, UI is a convenience                                                                |
| 6   | Audit Log                                   | `/settings/audit-log`                     | ✅ Built      | DB-trigger based, covers every financial/guest table                                                                            |
| 7   | Payment Accounts                            | `/settings/payment-accounts`              | ✅ Built      |                                                                                                                                 |
| 8   | Budget (categories + amounts)               | `/budget`                                 | ✅ Built      | Over-budget flag verified against seed data                                                                                     |
| 9   | Expense (create, list, receipt upload)      | `/expense`                                | ✅ Built      | Net total formula hand-verified in Milestone 2 review                                                                           |
| 10  | Reimbursement — public form                 | `/r/[projectId]`                          | ✅ Built      | No real-device pass yet — see Open Items                                                                                        |
| 11  | Reimbursement — admin workflow              | `/reimbursement`, `/reimbursement/[id]`   | ✅ Built      | Approve/reject/paid/completed, partial approval, duplicate warning                                                              |
| 12  | Guests                                      | `/guests`                                 | ✅ Built      | Walk-in protection verified in code (S4.1–S4.4 in `E2E_SCENARIOS.md`)                                                           |
| 13  | Income                                      | `/income`                                 | ✅ Built      | Manual entry + sync-derived                                                                                                     |
| 14  | Google Sheets Sync                          | `/settings/integrations`                  | ✅ Built      | **Not yet run against a real published Sheet** — see Open Items                                                                 |
| 15  | Sync Dry Run & Metadata                     | `/settings/integrations`                  | ✅ Built      | Added post-M4, same untested-against-real-Sheet gap                                                                             |
| 16  | Activity Feed                               | `/activity`                               | ✅ Built      | Reuses `audit_log`, no separate schema                                                                                          |
| 17  | LINE Notifications — recipients & test send | `/settings/notifications`                 | ✅ Built      | **Not yet tested against a real LINE channel** — see Open Items                                                                 |
| 18  | LINE Notifications — triggers               | (background)                              | ✅ Built      | New request, budget overrun, approved, payment completed, upcoming payment reminders (5 triggers total)                         |
| 19  | Reports — Budget PDF                        | `/reports` → `/api/reports/budget-pdf`    | ✅ Built      | Thai font verified via direct render testing (see below)                                                                        |
| 20  | Reports — Expense Excel                     | `/reports` → `/api/reports/expense-excel` | ✅ Built      |                                                                                                                                 |
| 21  | Analytics                                   | `/analytics`                              | ✅ Built      | Cost/guest, avg envelope, budget health %, pending requests                                                                     |
| 22  | Dashboard — summary + charts                | `/dashboard`                              | ✅ Built      |                                                                                                                                 |
| 23  | Dashboard — Today's Summary                 | `/dashboard`                              | ✅ Built      | Compact strip: today's expenses/income/new requests/new guests                                                                  |
| 24  | Dashboard — Quick Actions                   | `/dashboard`                              | ✅ Built      | Add Expense/Guest/Income, copy reimbursement link, Sync Now                                                                     |
| 25  | System Health                               | `/settings/system-health`                 | ✅ Built      | Live checks: Supabase, Storage, LINE (real token validation), Guest Sync                                                        |
| 26  | i18n (TH/EN)                                | 全体                                      | ✅ Built      | Every page/component/error message, cookie-persisted                                                                            |
| 27  | Backup & Restore                            | `docs/RESTORE.md`                         | ✅ Documented | Manual runbook, matches System Architecture doc design; not automated (by design, see that doc)                                 |
| 28  | Vendor Management                           | —                                         | ❌ Not built  | Deferred to Milestone 6 per approved roadmap — only a minimal `vendors` table exists (for Expense/Reimbursement vendor linkage) |
| 29  | OCR                                         | —                                         | ❌ Not built  | Deferred to Milestone 6 per approved roadmap, feature-flagged off                                                               |
| 30  | Offline Mode                                | —                                         | ❌ Not built  | Deferred to Milestone 6 per approved roadmap, feature-flagged off                                                               |
| 31  | Apple Sign-In                               | —                                         | ❌ Not built  | Deferred to Milestone 6 per approved roadmap, feature-flagged off                                                               |

Rows 28–31 are **intentionally out of scope for v1.0** — they were always
Milestone 6 items per the approved roadmap, not RC1 gaps. Listed here for
completeness, not as blockers.

---

## RC-Specific Hardening (this pass)

- [x] **Thai font support in PDF exports** — bundled Sarabun (OFL license,
      `public/fonts/`), registered with react-pdf. **Real bug found and
      fixed during this work**: the font's `.woff2` variant throws a
      `fontkit` glyph-subsetting error once a report has enough distinct
      glyphs (a short test string works, a full 14-category report
      doesn't) — switched to `.woff`, verified correct at full report
      scale via direct render + text-extraction + visual inspection.
      Also caught before it became a deployment bug: the font files were
      initially placed under `src/assets/`, which isn't reliably included
      in Vercel's serverless function file-tracing for runtime `fs` reads
      — moved to `public/fonts/`, which always is.
- [x] **3 additional LINE notification triggers** — Reimbursement
      Approved, Payment Completed, Upcoming Payment Reminders. The last
      one is explicitly scoped to what exists in the schema today (no
      due-date/vendor-installment concept yet) — reminds about
      Approved-but-unpaid reimbursements past a threshold, not a true
      "payment due date" reminder. Revisit once Vendor Installments
      (Milestone 6) exist.
- [x] **Today's Summary** — compact dashboard strip, 4 numbers, no new
      tables.
- [x] **System Health page** — 4 live checks (not just "is the env var
      set"): Supabase via a real query, Storage via a real bucket list
      call, LINE via a real token-validation API call that doesn't
      message anyone, Guest Sync via the actual `sync_runs` history.

---

## Open Items (not blockers for the code being complete, but need a human

## with real access to actually exercise before v1.0 is truly proven)

1. **No real Supabase/Vercel deployment has been exercised in this
   session** — every check above is "correct by code review, build, and
   lint," not "confirmed by clicking through the live app." This is the
   same gap flagged in every milestone review; RC1 is where it needs to
   finally close.
2. **Guest Sync has never run against a real published Google Sheet.**
   The engine is unit-verified in isolation (SQL cross-checked against
   migrations, per-row logic traced by hand) but `docs/E2E_SCENARIOS.md`
   S4.1–S4.9 need a real run.
3. **LINE notifications have never been sent to a real LINE account.**
   Same reasoning — `sendLineMessage`'s request shape matches the LINE
   Messaging API docs and the Milestone 0 spike proved connectivity works
   in principle, but the 5 real trigger points haven't fired against a
   live channel.
4. **PDF Thai rendering verified in an isolated Node script in this
   sandbox, not through the actual deployed Route Handler.** High
   confidence (same react-pdf version, same font files, same code path)
   but not identical to running it.
5. **No physical mobile/tablet device pass** on the newer pages (Guests,
   Income, Analytics, Reports, System Health, Today's Summary) —
   Milestone 1's responsive review covered the shared components these
   all reuse, but a fresh look at each new page on a real phone is still
   worth doing.
6. **Column-level Organizer restriction on Expenses** (documented back in
   Milestone 2: RLS is row-level, "own remarks only" isn't enforced at
   the database level) remains an accepted, documented limitation, not
   fixed in this pass.

None of these are "the code is wrong" — they're "the code hasn't been
proven against the real outside world yet," which is exactly what RC1 is
for.

---

## Final v1.0 Steps (after every item above is checked)

```bash
# 1. Confirm every migration through 0008 has been applied to production
# 2. Confirm docs/PRODUCTION_VALIDATION.md and PRODUCTION_VALIDATION_M2.md
#    checks still hold (spot-check, not a full re-run, if nothing in
#    those areas changed since they were last verified)
# 3. Work through the Open Items above with real access
# 4. Tag the release
git tag v1.0
git push --tags
```

After `v1.0`, Milestone 6 (Vendor Management, OCR, Offline Mode, Apple
Sign-In) resumes as normal feature work — v1.0 is "the app is done and
usable for the wedding," not "the roadmap is finished."
