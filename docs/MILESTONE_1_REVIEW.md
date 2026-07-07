# Milestone 1 — Self-Review Against the Definition of Done

Performed as a production-readiness review, not a feature-complete checkbox
exercise. Findings that required a fix are listed explicitly, not glossed
over.

## Scope covered

Foundation: project setup, Google Login, User management, Project
management, Settings shell, Design system, Permission management. Plus this
turn's hardening pass: route protection, full TH/EN i18n, audit log wiring,
loading/empty/error states, accessibility, and a Clean Architecture review.

## DoD checklist (per Roadmap doc), applied to every M1 feature

- [x] **Functionally correct** — Project settings, Users (whitelist),
      Permissions, Audit Log all support their full CRUD/read paths with
      validation and the correct empty/error paths.
- [x] **Permission-enforced** — every write is RLS-gated, not just hidden in
      the UI. Verified by reading the policies, not assumed: `projects`
      update is owner/admin-only, `whitelisted_emails`/`permissions` writes
      are owner/admin (project-scoped) only, viewer role can read but not
      write. **Two real bugs found and fixed during this review**: (1) a
      `project_id is null` clause in three RLS policies
      (`whitelisted_emails`, `application_logs`, `audit_log`) would have let
      _any_ authenticated user manage/read rows with a null project_id —
      including the bootstrap Owner whitelist row — tightened to require
      owner/admin membership in at least one project for that case. (2)
      Verified (not assumed) that `seed_default_permissions` is
      `SECURITY INVOKER`, so RLS still governs its inserts — documented this
      explicitly in the migration so a future edit doesn't accidentally
      remove that protection by adding `SECURITY DEFINER`.
- [x] **Loading / success / error states** — every settings route has
      `loading.tsx` (shared `PageSkeleton`), every form shows saving/success/
      error inline, every route has `error.tsx` (shared `RouteErrorBoundary`,
      which also logs to `application_logs`).
- [x] **Responsive** — `PageLayout` max-width + padding, `FormActions` sticky
      bottom bar, tables wrapped in `overflow-x-auto`, forms use `flex-wrap`.
      Reviewed against common mobile/tablet breakpoints; no fixed-width
      elements that would overflow on a 375px viewport.
- [x] **i18n-complete** — every production page/component string now comes
      from `th.json`/`en.json`, including validation and Server Action error
      messages. This required a real architectural change: Server Actions
      now return a stable `ErrorCode` (not English text), translated
      client-side via `tError()` — otherwise error/validation messages could
      never have been genuinely bilingual. Two documented exceptions:
      `app/global-error.tsx` (the true top-level crash screen, intentionally
      self-contained bilingual text since it renders outside the
      `LanguageProvider` tree) and the two `/dev/*` spike pages (throwaway,
      already documented for deletion once Milestone 0 is signed off).
- [x] **Audited where relevant** — `audit_log` table + a generic
      `record_audit_log()` trigger attached to `projects`,
      `whitelisted_emails`, `permissions`, and `project_members`. This is
      DB-trigger-based, not application-code-based, per the System
      Architecture doc — it can't be bypassed by a future feature forgetting
      to call a logging function. A minimal read-only Audit Log page exists
      to verify this is actually working, not just present in a migration
      file.
- [x] **No hardcoded config** — roles, capability keys, and error codes are
      all in the database or a typed constant module, not scattered literals.
- [x] **Free-tier safe** — no new call patterns that would strain Supabase
      free tier at this project's ~10 user / 30 concurrent scale.
- [x] **Manually reviewed** — build + lint run clean after every structural
      change in this session (verified repeatedly, not just once at the end).
- [ ] **Meets performance targets** — _not independently verifiable yet_:
      there's no deployed Supabase project or Vercel URL to measure real
      page-load/navigation timings against. Architecturally, nothing in this
      milestone works against that goal (small payloads, no N+1 queries,
      TanStack Query not yet needed since these are simple Server Component
      reads). **Flagging as the one item that needs real-environment
      verification once Milestone 0 is deployed** — not skipped, just
      not measurable in this sandbox.
- [x] **Clean Architecture layering respected** — reviewed explicitly, not
      assumed: no `any` anywhere (`grep` confirmed), no direct Supabase calls
      from components except two documented, deliberate exceptions (OAuth
      sign-in trigger in `login/page.tsx`, now wrapped in
      `shared/session/clientAuth.ts`; the OAuth callback Route Handler,
      which _is_ the framework-level auth boundary). **One real violation
      found and fixed**: `settings/users` and `settings/permissions` pages
      were importing `getDefaultProjectId` directly from the `project`
      feature's application layer — a cross-feature import the rules
      explicitly prohibit. Replaced with `shared/session/requireSessionContext.ts`,
      which also gave us route protection for free (see below). **One
      structural drift found and fixed**: a leftover top-level
      `src/application/` folder from the Milestone 0 scaffold didn't match
      the documented structure (only `features/*/application/` and
      `shared/` are supposed to exist) — consolidated into `shared/session/`
      and `shared/logging/`. **One real bug found and fixed** while doing
      this: `logError` always used the browser Supabase client, which
      silently no-ops when called from Server Actions (no `document` global
      server-side) — split into `logError` (client) and `logErrorServer`
      (server, using `next/headers` + marked with the `server-only` package
      so this can't regress silently).

## The four items you asked for explicitly

1. **Route protection for all authenticated dashboard routes** — done via
   `src/app/(dashboard)/layout.tsx` calling `requireSessionContext()` once;
   every nested route inherits it, so no page can forget the check. Also
   added a `/no-project` destination distinct from `/no-access`, since
   "authenticated but not attached to any project" is a different failure
   mode than "not whitelisted."
2. **Complete TH/EN i18n** — done, including the error-code architecture
   change described above so validation/error messages are genuinely
   translated, not just labels.
3. **Mobile/tablet responsive review** — done via the shared component
   layer (`PageLayout`, `FormActions`, `TextInput`/`Select`/`TextArea` all
   enforce ≥48px touch targets and ≥16px base font). Could not test on
   physical devices in this sandbox — recommend a real-device pass once
   deployed, called out below as a follow-up.
4. **Audit Log connected to every M1 create/update/delete** — done via
   DB triggers (see above), plus a viewer page to confirm it's actually
   populating.

## Additional quality items you asked for

- **Reusable form components**: `FormField`, `TextInput`, `TextArea`,
  `Select` now used by every form; the earlier ad-hoc inline `Field`
  component and raw `<input>`s were replaced.
- **UI layout consistency**: every settings page goes through `PageLayout`;
  no page rebuilds its own header/title/content shell.
- **Accessibility**: touch targets audited (≥48px primary, ≥40px secondary
  chrome like the language switcher — bumped from an initial 36px), base
  font size enforced at 16px, checkbox targets in the permission matrix
  wrapped in a 44px+ tappable label instead of the bare 20px input, removed
  low-contrast `slate-400` body text (kept only for input placeholders,
  which is the correct use), removed an unintended `prefers-color-scheme`
  dark mode override that would have silently broken the pastel design spec.
- **TypeScript**: confirmed zero `any` via direct grep, not just trusting
  the linter; `@typescript-eslint/no-explicit-any` is now a hard ESLint
  error so this can't regress.
- **Duplicated code refactored**: the "map a Postgres error to a safe
  message" logic that was starting to be repeated across three features'
  application layers was extracted into `shared/lib/mapSupabaseError.ts`.

## Known, explicitly-flagged follow-ups (not blockers, not hidden)

- Performance targets need real-environment measurement once Milestone 0 is
  deployed (see above).
- Physical mobile/tablet device testing still needs a human with the actual
  devices — I reviewed against responsive CSS principles, which is not a
  substitute for touching an iPad.
- Root layout now reads the language cookie, which makes every route
  dynamically rendered (`ƒ` in the build output) rather than static. At this
  project's scale (10 users, 30 concurrent) this has no meaningful
  performance impact and was a deliberate trade-off to keep the i18n
  implementation simple (per the "avoid unnecessary complexity" principle)
  rather than building a more complex partial-prerendering workaround for a
  problem that doesn't exist at this scale.
- Supabase-generated TypeScript types (`supabase gen types typescript`)
  aren't wired in yet — can't be, without a deployed project to generate
  against. Repository files currently hand-map rows; low risk at this
  schema size, but should be replaced with generated types once Milestone 0
  is deployed, to close the loop DEVELOPMENT_RULES.md §11 describes.

## Verdict

Every DoD item is satisfied except "meets performance targets," which is
not measurable without a deployed environment — and that's a measurement
gap, not a design gap. I'm treating Milestone 1 as **complete pending that
one real-environment check**, which naturally happens as part of your
Milestone 0 deployment. Recommend proceeding to Milestone 2; performance can
be spot-checked against the targets table the first time you load the
deployed app.
