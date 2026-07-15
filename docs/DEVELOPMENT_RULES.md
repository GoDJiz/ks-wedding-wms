# Development Rules

Binding for the entire project. When any other doc is silent on a detail,
this one wins. Applies from Milestone 1 onward.

---

## 1. Folder Structure Conventions

Feature-based structure _inside_ Clean Architecture layering — features own
their vertical slice, shared code lives in `shared/`.

```
src/
  app/                        Next.js routes (Presentation layer only)
    (public)/                 route group: unauthenticated pages (login, no-access, public reimbursement form)
    (dashboard)/               route group: authenticated admin app
      budget/
      expense/
      reimbursement/
      ...
    api/                       Route Handlers (only where a Server Action can't be used — see §8)

  features/                    one folder per feature/module
    <feature>/
      domain/                  entities, value objects, pure business rules
      application/              use cases — the only thing app/ routes call
      infrastructure/           Supabase queries, external API calls for this feature
      components/               feature-specific React components
      <feature>.types.ts

  shared/
    ui/                         PageLayout, FormActions, Button, Card, etc. (shadcn-based)
    lib/                        generic helpers (formatting, error codes, mapSupabaseError)
    session/                    cross-cutting auth: requireSessionContext, signOut, clientAuth
    logging/                    logError (client) / logErrorServer (server) — see §10
    notifications/              LINE client + notifyProjectRecipients — cross-cutting like logging,
                                 called from multiple features' application layers
    i18n/                       dictionaries + LanguageProvider + getDictionary
    hooks/                      cross-feature hooks (useDebounce, useMediaQuery)

supabase/
  migrations/
  functions/

integrations/
  google-apps-script/
```

Rules:

- A feature's `infrastructure/` may only be imported by that feature's own
  `application/` — never directly from `app/` or from another feature.
- Cross-feature reuse goes through `shared/`, never by importing one
  feature's internals from another feature.
- If a piece of shared UI is used by 2+ features, promote it to `shared/ui/`.

---

## 2. File Naming Conventions

| Type                           | Convention                  | Example                           |
| ------------------------------ | --------------------------- | --------------------------------- |
| React component file           | PascalCase                  | `BudgetCard.tsx`                  |
| Non-component TS file          | camelCase                   | `getCurrentSession.ts`            |
| Route segment (Next.js folder) | kebab-case                  | `app/(dashboard)/expense-report/` |
| Type/interface file            | camelCase + `.types.ts`     | `expense.types.ts`                |
| Test file                      | same name + `.test.ts(x)`   | `BudgetCard.test.tsx`             |
| SQL migration                  | see §7                      |                                   |
| Constants file                 | camelCase + `.constants.ts` | `budgetCategories.constants.ts`   |

No spaces, no uppercase folder names, no abbreviations that aren't
self-evident (`reimb/` ❌, `reimbursement/` ✅).

---

## 3. Component Naming

- Component name = file name, PascalCase, matches its default export.
- Props type: `<ComponentName>Props` (e.g., `BudgetCardProps`), defined
  above the component in the same file unless shared (then in `.types.ts`).
- Presentational/shared components (in `shared/ui/`) must not import from any
  `features/*` — they take data via props only.
- Prefix with feature name only where genuinely useful for search, not
  cargo-culted (`ExpenseFilterBar` fine, `ExpenseExpenseCard` not).

---

## 4. React Hooks Conventions

- Custom hooks always start with `use` and live in `shared/hooks/` (cross-cutting)
  or `features/<feature>/hooks/` (feature-specific).
- One hook = one responsibility. A hook that both fetches and formats data is
  a sign it should be split.
- Data-fetching hooks wrap TanStack Query, not raw Supabase calls:
  `useExpenses(projectId)` internally calls an application-layer use case, a
  component never calls `supabase.from(...)` itself.
- Zustand stores live in `shared/state/` (e.g. `useUiStore.ts`) and hold only
  client/UI state (sidebar open, selected language) — never server data;
  server data is always TanStack Query's job.

---

## 5. Server vs Client Component Rules

- **Default to Server Components.** Add `"use client"` only when the file
  needs interactivity (state, effects, event handlers, browser-only APIs) or
  a hook that requires it.
- Data fetching for the _initial_ render happens in Server Components /
  Server Actions, calling the application-layer use case directly (no network
  round-trip to your own API needed).
- Client Components fetch/mutate via TanStack Query calling a Server Action
  or Route Handler — never call `createSupabaseServerClient` from client code
  (it doesn't work there) and never call `createSupabaseBrowserClient` from a
  Server Component.
- Keep the `"use client"` boundary as low in the tree as possible — a page
  can be a Server Component that renders one small Client Component island,
  rather than the whole page being client-rendered.

---

## 6. Database Naming Conventions

- Tables: `snake_case`, plural (`expenses`, `reimbursement_requests`).
- Columns: `snake_case` (`created_at`, `project_id`).
- Foreign keys: `<singular_table>_id` (`project_id`, `vendor_id`).
- Booleans: prefixed `is_`/`has_` where it reads naturally (`is_active`), plain
  name otherwise if unambiguous (`enabled`).
- Enums represented as `text` + `check` constraint (per Database Design doc),
  values always `snake_case` (`pending_approval`, not `PendingApproval`).
- Every table has `id uuid primary key default gen_random_uuid()` and
  `created_at timestamptz not null default now()` at minimum.
- RLS policy names: `<table>_<action>_<who>` (e.g. `expenses_select_members`,
  `projects_update_owner_admin`) — matches the pattern already used in
  migration `0001`.

---

## 7. Migration Naming Rules

Format: `NNNN_short_description.sql`, four-digit zero-padded sequence,
snake_case description, one migration file per logical change-set.

```
0001_milestone0_foundation.sql
0002_budget_and_expense.sql
0003_reimbursement.sql
0004_income_and_guests.sql
```

Rules:

- Never edit a migration that has already been applied to any shared
  environment (including your own deployed Supabase project) — write a new
  migration to alter it instead.
- Every migration that adds a table must also add its RLS policies in the
  same file (schema and access control are never split across separate
  migrations for the same table).
- Destructive changes (`drop column`, `drop table`) get their own migration,
  never bundled with additive changes, so they're easy to spot in review.

---

## 8. API Route Conventions

- Prefer **Server Actions** for mutations triggered from a form/UI action
  within the app — colocated with the feature (`features/<feature>/application/actions.ts`,
  marked `"use server"`).
- Use a **Route Handler** (`app/api/.../route.ts`) only when the caller isn't
  a React component in this app — e.g. the public reimbursement form's
  submit endpoint (called from a page that may be statically rendered), the
  Google Apps Script sync receiver, or a webhook target.
- Route Handler naming: `app/api/<resource>/route.ts`, plural resource name,
  matching REST verbs (`GET`, `POST`) as the exported functions — no verb in
  the path (`app/api/reimbursements/route.ts`, not `app/api/getReimbursements/route.ts`).
- Every Route Handler validates its input with a Zod schema before touching
  the database — no exceptions, especially for the public (unauthenticated)
  reimbursement endpoint.

---

## 9. Error Handling Standards

- Every Server Action / Route Handler / use case wraps its logic in
  try/catch; on failure it (a) logs via the Error Logging use case (§10) and
  (b) returns a typed result, never throws across the Server Action boundary
  into the client silently:
  ```ts
  type ActionResult<T> = { ok: true; data: T } | { ok: false; code: ErrorCode };
  ```
  `ErrorCode` is a fixed union (`shared/lib/errorCodes.ts`) — Server Actions
  **never return raw English strings**. The client translates the code via
  `tError(code)` from the active language dictionary. This is what makes
  every error and validation message genuinely bilingual instead of
  hardcoded to English; a raw Postgres/Supabase error is mapped to a code via
  `shared/lib/mapSupabaseError.ts`, never surfaced directly to the UI.
- Zod validation messages are error codes too (e.g. `"name_required"`, not
  `"Name is required"`), translated the same way at display time.
- Every async UI action (button click, form submit) has three visual states:
  loading, success, error — per the Definition of Done. No silent failures.
- Client-side: a top-level error boundary (`app/global-error.tsx`) and a
  shared `RouteErrorBoundary` (used by every route's `error.tsx`) catch
  anything unhandled and log it.

---

## 10. Logging Standards

- All unexpected errors go through `shared/logging/logError.ts` (Client
  Components) or `shared/logging/logErrorServer.ts` (Server Actions/Route
  Handlers) into `application_logs` — these are the only two logging paths;
  don't add a third ad-hoc mechanism. They're two separate modules rather
  than one function branching on `typeof window`, because bundlers still
  pull server-only imports (`next/headers`) into the client bundle even
  behind a runtime check — `logErrorServer.ts` is marked with the
  `server-only` package to catch that mistake at build time if it recurs.
- Log entries always include `module` (the feature/route name) so logs are
  filterable — never leave `module` empty.
- Never log secrets, tokens, or full request bodies containing personal bank
  details — log the error and a safe summary, not raw sensitive payloads.
- `console.log` is fine during local development but must not remain in
  committed code for anything other than the `logError` fallback console
  line already in place — ESLint's `no-console` rule (warn) will flag stray ones.

---

## 11. TypeScript Rules

- `strict: true` stays on (already set) — never weaken it.
- **`any` is not allowed.** Use `unknown` + narrowing, a proper generic, or a
  concrete type. If a third-party type is genuinely unknown, isolate it
  behind a small typed wrapper in `infrastructure/`, don't let `any` spread.
- No `// @ts-ignore` without a comment explaining why and a linked issue/TODO;
  prefer `// @ts-expect-error` (fails loudly if the error is later fixed and
  the suppression becomes stale).
- Every Supabase table has a generated/maintained TypeScript type (via
  `supabase gen types typescript`) — application code imports these types,
  never hand-rolled duplicates that can drift from the schema.
- Prefer `type` for data shapes, `interface` only when you need declaration
  merging (rare in this codebase).
- Exported functions have explicit return types — don't rely on inference for
  anything crossing a module boundary.

---

## 12. Code Formatting (Prettier / ESLint)

- Prettier is the single source of formatting truth — no manual formatting
  debates. Config (add to repo): 2-space indent, double quotes, semicolons,
  trailing commas (`es5`), 80-print-width default.
- ESLint (`eslint-config-next`, already installed) runs on every commit via a
  pre-commit hook (Husky + lint-staged, added in Milestone 1) and must pass
  with zero errors before merge — warnings are acceptable but should trend to zero.
- `no-console` (warn), `@typescript-eslint/no-explicit-any` (error) added to
  the ESLint config to enforce §11.
- Run `npm run lint`, `npm run build`, and `npm run test` locally before
  every commit — all three must be clean (this project doesn't have CI
  yet; you are the CI until a GitHub Actions workflow is added, which is
  optional/future). `npm run test` (Vitest) covers pure/critical logic
  (CSV parsing, sync matching/normalization, currency formatting, error
  mapping) added during the pre-v1.0 QA pass — it is not a full test
  pyramid, deliberately: business-logic correctness is covered here,
  integration/E2E behavior stays in `docs/E2E_SCENARIOS.md`'s manual
  regression checklist (see that doc for why full OAuth automation wasn't
  built).

---

## 13. Git Commit Message Conventions

Conventional Commits, lowercase type, imperative mood:

```
<type>(<scope>): <short summary>

[optional body]
```

Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`, `style`.
Scope = feature folder name where applicable.

Examples:

```
feat(budget): add over-budget flag to category card
fix(reimbursement): require slip upload for bank transfer method
docs: update DEPLOYMENT.md with LINE webhook steps
chore(deps): bump @supabase/ssr to 0.x
```

- One logical change per commit. Don't bundle an unrelated formatting sweep
  with a feature commit.
- Milestone completion commits: `chore(release): tag v0.x <milestone name>`.

---

## 14. Branch Naming Conventions

```
<type>/<short-description>
```

Same `<type>` values as commits. Examples:

```
feat/budget-category-crud
fix/reimbursement-partial-approval-rounding
docs/development-rules
```

- `main` is always deployable (Vercel auto-deploys it) — feature branches
  merge into `main` only when a milestone's checklist items they cover are done.
- Since this is a solo/personal project, branches are optional for tiny
  changes but required for anything touching more than one file/feature, so
  history stays reviewable even without a second person reviewing it.

---

## 15. Pull Request Checklist (for future use — e.g. if a collaborator joins)

- [ ] Linked to the milestone/feature it belongs to
- [ ] `npm run lint` and `npm run build` pass locally
- [ ] Meets the Definition of Done (Roadmap doc) for every feature included
- [ ] New/changed tables have a migration with RLS policies included
- [ ] No `any`, no stray `console.log`, no hardcoded config values
- [ ] Screenshots/GIF for any UI change (mobile + desktop)
- [ ] i18n strings added for both TH and EN
- [ ] Self-reviewed diff before requesting review

---

## 16. Documentation Requirements

- Every feature folder gets a short `README.md` if its business logic isn't
  obvious from code alone (e.g. the reimbursement state machine) — not
  required for simple CRUD features.
- Any new environment variable → add it to `.env.example` with a comment,
  same turn as the code that needs it (never after the fact).
- Any new external integration or architecture-level decision → update the
  System Architecture doc, don't let docs drift from reality.
- Non-obvious business rules (e.g. "why partial approval needs a reason
  field") get a one-line comment at the point of enforcement in code, not
  just in the spec doc.

---

## 17. Security Guidelines

- RLS is the real access control — UI-level permission checks are a UX nicety
  on top, never the only guard. Every new table ships with RLS enabled and
  policies in the same migration (§7).
- `SUPABASE_SERVICE_ROLE_KEY` is server-only, never imported into any file
  under `app/` that could end up in a Client Component bundle — only used in
  isolated admin scripts (e.g. backup export).
- Public (unauthenticated) endpoints — the reimbursement form, the Apps
  Script sync receiver — always validate input with Zod and check a shared
  secret / rate limit before touching the database.
- File uploads: validate type and size (10MB, per Storage rules) both
  client-side (fast feedback) and via Storage bucket policy (real
  enforcement) — never trust client-side validation alone.
- Never commit `.env.local`, service role keys, LINE tokens, or the shared
  sync secret to git — `.gitignore` already covers `.env.local`; keep it that way.
- No user-controlled input is ever interpolated into raw SQL — Supabase
  client / parameterized queries only.

---

## 18. Performance Guidelines

- Meet the targets in the Roadmap doc (page load <2s, navigation <500ms,
  dashboard <2s, form submit <2s) — check this informally after each
  milestone, not just at the end.
- Paginate any list that can exceed ~50 rows at this project's scale (guest
  list, expense list) — never fetch all 600 guests into an unpaginated table.
- Use TanStack Query's caching (`staleTime`) so navigating back to an
  already-visited page doesn't re-fetch instantly — but don't cache so
  aggressively that Admin/Finance see stale financial totals; short
  `staleTime` (seconds, not minutes) for money-related queries.
- Images (receipts, logo) go through Next.js `<Image>` or a client-side
  resize before upload — never upload/display a multi-MB image at full
  resolution in a list thumbnail.
- Avoid client-side waterfalls: fetch what a Server Component needs in
  parallel (`Promise.all`), not sequential `await`s where independent.

---

This document is binding starting with Milestone 1. Planning phase is now
complete — proceeding to Milestone 1 implementation.
