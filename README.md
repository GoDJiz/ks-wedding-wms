# Wedding Management System (WMS) — KS Wedding

Personal wedding ERP-style management system. Next.js + Supabase, free-tier only.

See `/docs` for:
- `DEPLOYMENT.md` — **start here** — complete, no-assumptions deployment package (GitHub, Supabase, Google OAuth, Vercel, LINE OA, Google Apps Script, final verification checklist)
- `MILESTONE_0_CHECKLIST.md` — functional verification checklist (mirrors §7 of DEPLOYMENT.md)
- `RESTORE.md` — backup/restore runbook

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
