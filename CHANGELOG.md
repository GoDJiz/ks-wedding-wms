# Changelog

All notable changes to this project, by version. Dates reflect when each
milestone was completed during development, not calendar dates.

## v1.0 — Production Release

The app is live and ready for real use.

- Deployment guide, pre-deployment checklist, user manual, and admin
  manual created for a smooth handoff.
- Final production support pass: security hardening (tightened RLS
  policies, added DB-level input bounds), performance fixes (removed a
  real N+1 query in guest sync, added missing indexes), corrected
  deployment documentation to match the app's actual current
  architecture, added an automated test suite (Vitest) for core logic.

## RC1 — Release Candidate

- Full Thai font support in PDF reports (bundled, open-source font).
- Three more LINE notification triggers: reimbursement approved, payment
  completed, upcoming payment reminders.
- Compact "Today's Summary" added to the Dashboard.
- New System Health page: live status checks for the database, file
  storage, LINE, and guest sync.
- Full module-by-module Release Candidate checklist created.

## v0.5 — LINE Notifications, Reports, Analytics

- LINE Official Account notifications for new reimbursement requests and
  budget overruns.
- Budget Summary PDF and Expense List Excel exports.
- Analytics page: cost per guest, average envelope, budget health,
  pending requests.
- Dashboard Quick Actions for the most common daily tasks.

## v0.4 — Guests, Income & Google Sheets Sync

- Guest management: search, RSVP filtering, walk-in guests.
- Income tracking, including amounts synced from the guest list.
- Safe, repeatable Google Sheets sync: pulls a published CSV, never
  overwrites a manually-edited guest, never touches walk-in guests, logs
  every run, and continues past any single bad row.
- Activity Feed showing recent changes across the project.

## v0.3 — Reimbursement

- Public, no-login reimbursement request form, designed for speed and
  simplicity on a phone.
- Admin approval workflow: approve (full or partial), reject, mark paid,
  mark completed — each with the right notifications and audit trail.
- Duplicate request detection.

## v0.2 — Budget & Expenses

- Budget categories and budgeted amounts, with spent/remaining tracking
  and an over-budget indicator.
- Expense tracking with VAT, discount, shipping, and withholding tax
  calculations, plus receipt photo uploads.
- Payment accounts (bank/cash) that every expense and income record ties to.
- Dashboard summary cards and charts.

## v0.1 — Foundation

- Google Login with an email whitelist (only approved people can access
  the system).
- User roles and a customizable permission matrix (Owner, Admin, Finance,
  Organizer, Viewer).
- Wedding project settings, editable by the Owner.
- Full Thai/English bilingual support throughout.
- Audit logging for every important change.

## v0.0 — Architecture Validation

- Confirmed the core technical foundation works end-to-end: deployment
  pipeline, database security rules, file uploads, Google Sheets
  connectivity, and LINE messaging — all before building real features on
  top of them.
