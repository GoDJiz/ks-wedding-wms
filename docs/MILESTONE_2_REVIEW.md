# Milestone 2 — Self-Review Against the Definition of Done

## Scope covered

Budget management, Expense management, Payment accounts, Dashboard — per
the approved roadmap — plus the requested development seed strategy.
Audit Log is DB-trigger-based (migration 0004 attaches `record_audit_log` to
every new table), consistent with Milestone 1's approach, so no additional
application code was needed to satisfy that requirement.

## Seed strategy

`supabase/seed/dev_seed.sql` + `docs/SEED_STRATEGY.md`. Three independent
safety layers (explicit opt-in flag, isolated dev-only project row,
delete-and-reseed repeatability) — see that doc for full rationale. Found
and fixed two real bugs while writing it before ever running it against a
real database:

- The initial safety guard used `current_setting()`, which reads a Postgres
  session GUC — but `-v allow_seed=yes` sets a **psql client-side variable**,
  a different mechanism entirely. The original guard would have always
  failed closed, even when correctly invoked. Fixed to use `:'allow_seed'`
  psql interpolation directly.
- Four spots used `(array[...])[floor(random() * n)]` — Postgres array
  subscripting requires an `integer` index with no implicit cast from
  `double precision` (unlike `LIMIT`/`OFFSET`, which do coerce). Fixed with
  explicit `::int` casts, and applied the same cast defensively everywhere
  else `floor(random())` feeds into a subscript, an `OFFSET`, or string
  concatenation, so nothing here depends on an assumption about Postgres's
  implicit-cast rules being lucky rather than correct.

I can't run this script in this sandbox (no live Supabase project), so I
traced every column reference by hand against the actual migration 0004
schema rather than trusting it compiles — every `insert into` column list
was individually cross-checked against the corresponding `create table`
statement (documented in this session's tool output). This is the one part
of Milestone 2 that most needs a real run against your deployed database
before being taken as more than "carefully reviewed."

## DoD checklist

- [x] **Functionally correct** — Payment Accounts, Budget (categories +
      amounts + spent/remaining/over-budget), Expense (create with computed
      net_total, file upload, paginated list), Dashboard (cards + two
      charts) all implemented against the real schema.
- [x] **Permission-enforced** — every table's RLS policy follows the
      Functional Requirements permission matrix (categories: owner/admin
      only; budgeted amounts: +finance; expenses/vendors: +organizer;
      guests: owner/admin/organizer; incomes: owner/admin/finance).
      **Known, explicitly-flagged limitation** (not silently skipped): the
      matrix further restricts Organizer to "own remarks only" on expenses —
      Postgres RLS is row-level, not column-level, so this nuance is not
      enforced by the policy itself; it would need to be enforced in the
      application layer's Server Action if a non-application client (e.g.
      someone calling the Supabase API directly) needs to be bulletproof
      against it. Documented directly in migration 0004's comments, not
      buried.
- [x] **Loading / success / error states** — every new route has
      `loading.tsx`/`error.tsx`; Expense list has an explicit loading state
      during pagination; forms show saving/error inline.
- [x] **Responsive** — reused the same shared components (`PageLayout`,
      `FormField`, `TextInput`, `Select`) that were already reviewed for
      touch targets/font size in Milestone 1; Expense table and Budget list
      wrap safely with `overflow-x-auto`/`flex-wrap`; charts sized via
      `ResponsiveContainer` inside a fixed-height wrapper rather than a fixed
      pixel width.
- [x] **i18n-complete** — all Milestone 2 strings added to both
      dictionaries; Server Actions return `ErrorCode`, not English text,
      same pattern as Milestone 1 (`amount_required`, `date_required`,
      `file_too_large` added).
- [x] **Audited where relevant** — DB triggers on every new financial/guest
      table (`payment_accounts`, `budget_categories`, `budgets`, `vendors`,
      `expenses`, `guests`, `incomes`).
- [x] **No hardcoded config** — categories/accounts/vendors are DB rows the
      Owner manages, not constants in code.
- [x] **Free-tier safe** — Dashboard aggregates in application memory rather
      than adding a DB-side aggregation function, appropriate at this
      project's scale (a few hundred rows) per the "avoid unnecessary
      complexity" principle — documented inline as a deliberate choice, not
      an oversight.
- [x] **TypeScript strict, no `any`** — confirmed via direct grep, not
      assumed. One real type issue found and fixed: `z.coerce.number()`
      fields have a different pre-coercion (form) type than post-coercion
      (validated) type; using `z.infer` for both `useForm` and the Server
      Action caused a genuine type mismatch, not a lint nitpick — fixed by
      splitting into `z.input`/`z.output`.
- [x] **Clean Architecture layering** — no cross-feature imports (checked
      directly), no direct Supabase calls from page/components outside the
      documented client-upload exception in `ExpenseForm` (client-side
      Storage upload is legitimately a Client Component's job — the DB
      record itself still goes through a Server Action).
- [x] **Refactored duplication** — `formatCurrency` extracted to `shared/lib`
      once Budget, Expense, and Dashboard all needed identical formatting;
      `ExpensePageClient` was restructured mid-implementation after I
      noticed a real bug in my first draft (a `key`-based remount trick that
      would have displayed stale data after creating a new expense) — fixed
      by moving data ownership up to the container instead of patching
      around the symptom.
- [ ] **Meets performance targets** — same gap as Milestone 1: not
      independently measurable without a deployed environment. Nothing
      added here works against the targets (aggregation is in-memory over a
      small row count, expense list is paginated at 20/page), but this
      needs a real-environment check, same as before.

## Verdict

Complete pending the same real-environment performance check flagged in
Milestone 1, plus one additional item specific to this milestone: **the
seed script needs one real run against your deployed database** before its
correctness moves from "carefully hand-verified" to "confirmed." Recommend
running `docs/SEED_STRATEGY.md`'s steps as part of your next Production
Validation pass, then proceeding to Milestone 3 (Reimbursement).
