# Wedding Management System (WMS) — KS Wedding

Personal wedding ERP-style management system. Next.js + Supabase, free-tier only.

See `/docs` for:

- `DEVELOPMENT_RULES.md` — binding coding standards (folder structure, naming, TypeScript, Git, security, performance)
- `DEPLOYMENT.md` — complete, no-assumptions deployment package (GitHub, Supabase, Google OAuth, Vercel, LINE OA, Google Apps Script, final verification checklist)
- `MILESTONE_1_REVIEW.md` — Definition of Done self-review for Milestone 1 (Foundation)
- `PRODUCTION_VALIDATION.md` — pre-`v0.1` production readiness checklist (run against the real deployed environment)
- `PRODUCTION_VALIDATION_M2.md` — pre-`v0.2` addendum: seed script, Budget, Expense, Dashboard, Payment Accounts
- `SEED_STRATEGY.md` — development seed data (safe, isolated, repeatable) — see `supabase/seed/dev_seed.sql`
- `MILESTONE_2_REVIEW.md` — Definition of Done self-review for Milestone 2 (Budget & Expenses)
- `SIGNIFICANT_FINDINGS.md` — running log of significant architectural decisions/security findings/production issues (replaces a full review doc per milestone, per the lighter-weight process from Milestone 3 onward)
- `SYNC_STRATEGY.md` — Google Sheets guest/income sync design (safety rules, matching, per-row failure handling)
- `E2E_SCENARIOS.md` — end-to-end regression checklist covering all major workflows through Milestone 4
- `MILESTONE_0_CHECKLIST.md` — functional verification checklist (mirrors §7 of DEPLOYMENT.md)
- `RESTORE.md` — backup/restore runbook

## Milestone progress

- ✅ Milestone 0 — Architecture Validation (scaffold, see `docs/MILESTONE_0_CHECKLIST.md`)
- ✅ Milestone 1 — Foundation (complete pending a real-environment performance check — see `docs/MILESTONE_1_REVIEW.md` for the full DoD self-review, including two RLS security fixes and a server-side logging bug found during review)
- ✅ Milestone 2 — Budget & Expenses (complete pending a real-environment performance check + one real run of the seed script — see `docs/MILESTONE_2_REVIEW.md`)
- ✅ Milestone 3 — Reimbursement (complete pending real-environment testing on the public form — see `docs/SIGNIFICANT_FINDINGS.md` for the Storage RLS security fix and other decisions from this milestone)
- ✅ Milestone 4 — Guests, Income & Sync (complete pending a real sync run against a real published Sheet — see `docs/SYNC_STRATEGY.md`, `docs/E2E_SCENARIOS.md`, and `docs/SIGNIFICANT_FINDINGS.md`), plus Dry Run mode and sync metadata display added afterward
- ✅ Milestone 5 — LINE Notifications, Reports, Analytics, Dashboard Quick Actions (complete pending a real LINE channel + a real published Sheet to test against — see `docs/SIGNIFICANT_FINDINGS.md`)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in real values, see docs/SETUP.md
npm run dev
```

## Project structure (Clean Architecture)

```
src/
  domain/            — entities, business rules (framework-agnostic)
  application/       — use cases (e.g. getCurrentSession, logError)
  infrastructure/    — Supabase client wrappers, external service adapters
  app/               — Next.js routes (Presentation layer) — calls application/ only
  lib/i18n/          — Thai/English dictionaries + language provider
supabase/
  migrations/        — SQL schema, one file per milestone
  functions/         — Edge Functions (LINE push, Sheets sync, etc.)
integrations/
  google-apps-script/ — .gs scripts to paste into the Google Sheet's Apps Script editor
```

Roadmap, DoD, feature flags, and all frozen planning docs are tracked separately (the six planning documents already delivered: Project Overview, Functional Requirements, System Architecture, Database Design, UI/UX Design, Development Roadmap).
