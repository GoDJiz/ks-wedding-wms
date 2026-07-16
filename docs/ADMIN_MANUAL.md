# Administrator Manual — Wedding Management System

For everyday features (Budget, Expense, Reimbursement, Guests, Income,
Reports), see `docs/USER_MANUAL.md`. This guide covers Owner/Admin-only
setup and maintenance tasks, all found under **Settings**.

## Project (Settings → Wedding Project)

Edit the couple's names, wedding date, venue, and currency. This
information appears on the public reimbursement form and in reports.

## Users (Settings → Users)

This is the whitelist — only emails listed here can log in at all.

- **Add a user**: enter their email and pick a role (Owner, Admin,
  Finance, Organizer, or Viewer).
- **Remove a user**: they immediately lose access next time they try to
  log in (an active session isn't force-ended, but a fresh login fails).
- New users must sign in with Google using the exact email you whitelist.

## Permissions (Settings → Permissions)

A grid of which role can do what (e.g., only Owner/Admin can manage
budget categories; Finance can edit budgets and approve reimbursements).
The Owner can toggle any cell except the Owner row itself, which always
has full access. Change this carefully — it affects real access
immediately.

## Google Sync (Settings → Integrations)

Connects your existing guest-list Google Sheet.

- **CSV URL**: the published-to-web link from your Sheet (File → Share →
  Publish to web → CSV format).
- **Field Mapping**: make sure the left column matches your Sheet's exact
  column headers.
- **Allow sync to overwrite manually-edited records**: leave this off
  unless you specifically want the Sheet to overwrite something you've
  since hand-edited in the app. Walk-in guests are never touched by sync,
  regardless of this setting.
- Always try **Dry Run (Preview)** before a real **Sync Now** — it shows
  what would happen without changing anything.
- Sync history at the bottom shows every past run and its results.

## LINE OA (Settings → Notifications)

Add LINE user IDs here to receive notifications for: new reimbursement
requests, approvals, budget overruns, completed payments, and overdue
payment reminders. Use **Send test message** to confirm a recipient is
set up correctly. **"Send Payment Reminders Now"** manually triggers a
check for approved-but-unpaid requests, if you don't want to wait for the
scheduled check.

## Settings — Other Pages

- **Payment Accounts**: the bank/cash accounts money moves through.
  Needed before you can log expenses or income.
- **Audit Log**: a full history of every important change — who did what,
  when, and the before/after values. Useful for tracking down "wait, who
  changed this?"
- **System Health**: a live status check of the database, file storage,
  LINE, and guest sync. Check this occasionally, and any time something
  seems broken — it's often the fastest way to see what's actually wrong.

## Backup

- Supabase automatically keeps short-term daily backups — no action
  needed, but don't rely on this alone.
- For an extra manual copy anytime: `supabase db dump --data-only -f backup.sql`
  (requires the Supabase CLI — see `docs/DEPLOYMENT_GUIDE_V1.md`'s
  Maintenance Guide for full restore steps).
- Periodically download your Storage buckets' contents too (receipts,
  slips) — the database dump doesn't include actual files.

## When Something Goes Wrong

1. Check **Settings → System Health** first.
2. Check **Settings → Audit Log** to see what changed recently.
3. See `docs/DEPLOYMENT_GUIDE_V1.md`'s **Common Errors** table for
   specific symptoms and fixes.
