# User Manual — Wedding Management System

A quick guide to using the app day-to-day. For admin-only tasks (users,
permissions, sync setup, etc.), see `docs/ADMIN_MANUAL.md` instead.

## Logging In

1. Open the app's link in your browser.
2. Click **Sign in with Google**.
3. Use the Google account that's been whitelisted for you. If you see
   "This account isn't authorized," ask the Owner to add your email in
   Settings → Users.
4. You'll land on the home page, then can go to **Dashboard**.

Switch between Thai and English anytime using the language button near
the top of any page.

## Dashboard

Your home base. Shows:

- **Today's Summary** — a quick strip of today's expenses, income, new
  requests, and new guests.
- **Quick Actions** — one-tap shortcuts to add an expense, add a guest,
  add income, copy the reimbursement link, or sync guests now.
- **Summary cards** — total budget, spent, remaining, income, profit/loss.
- **Charts** — spending by category, and a monthly trend.

## Budget

- Shows every budget category with how much is budgeted, spent, and
  remaining. A red "Over Budget" badge appears if a category has gone over.
- Only Owner/Admin can add categories or change budgeted amounts —
  everyone else can view.

## Expense

- Click **Add Expense** to log a purchase: date, category, account,
  amount, VAT/discount/shipping/withholding tax (all optional except
  amount), payment method, and an optional receipt photo.
- The list is paginated — use the arrows at the bottom to browse older
  expenses.

## Reimbursement

Two sides to this module:

**If you're asking to be paid back** (no login needed): use the shared
link (looks like `.../r/<some-id>`) that your wedding admin gives you.
Fill in your name, phone, purchase date, amount, how you'd like to be
paid, and attach a photo of your receipt (or the transfer slip, if you
paid by bank transfer). Submit — you'll get a reference code.

**If you're reviewing requests** (Owner/Admin/Finance): go to
**Reimbursement** in the app. Filter by status using the tabs at the top.
Open any request to see the details and receipt photos, then Approve
(you can approve a lower amount than requested, with a reason), Reject
(with a reason), or mark it Paid/Completed once money has actually moved.

## Guest

- Search by name, filter by RSVP status.
- **Add Guest** for anyone not already on your synced guest list
  ("walk-ins").
- A 🔒 icon means that guest was manually edited and won't be
  overwritten the next time the guest list syncs from Google Sheets.

## Income

- Shows every income record — from your guest list sync (envelopes,
  transfers) and anything added manually.
- Use **Add Income** for anything not tied to a guest (sponsorships,
  gifts, gold, etc.).

## Reports

- **Budget Summary PDF** — a printable summary of every category's
  budgeted/spent/remaining, with your project's branding.
- **Expense List Excel** — every expense, exportable to open in Excel or
  Google Sheets for your own analysis.

## Getting Help

If something looks wrong or you're stuck, take a screenshot of what you
see and share it with your wedding admin (Owner/Admin) — most day-to-day
questions are answered in `docs/ADMIN_MANUAL.md` on their end.
