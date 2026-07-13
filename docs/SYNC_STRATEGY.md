# Google Sheets Sync Strategy

## Principles (from your requirements)

1. Google Sheets is an external data source — never the primary database.
2. Supabase is the source of truth after every sync — the app always reads
   from Supabase, never from the Sheet directly.
3. Sync never overwrites a manually created or manually edited record
   unless explicitly configured to.
4. Walk-in guests are always preserved — full stop, no configuration can
   change this one.
5. Every sync run is logged.
6. One bad row never stops the rest of the sync.
7. Every run produces a summary.

## Architecture decision: pull via published CSV, not push via Apps Script

Milestone 0 built a spike where Apps Script _pushes_ rows to an Edge
Function. For the real implementation, this flips to the app _pulling_ a
published CSV — simpler, and avoids needing Google API OAuth/service-account
credentials (which cost nothing but do cost setup complexity):

1. In Google Sheets: File → Share → **Publish to web** → CSV. This gives a
   public, read-only CSV URL for the sheet (or a specific tab).
2. That URL is stored in the project's sync settings (`sync_field_mappings`
   context) via Settings → Integrations.
3. Sync (manual button in-app, or an external scheduled call) fetches that
   CSV URL directly with `fetch()` — no Google credentials needed at all.
4. Apps Script's job shrinks to just pinging our own sync endpoint on a
   timer (optional, for scheduled sync) — it no longer needs to push row
   data itself.

Trade-off, stated plainly: "publish to web" means anyone with the URL can
view the raw sheet. Acceptable here because the sheet only contains guest
names/RSVP/contact info — the same information already visible to a wedding
website's RSVP form — never financial account details.

## The core safety mechanism: `is_manually_modified`

`guests.is_manually_modified` (boolean, default `false`) is the single flag
everything else is built on:

- A **walk-in guest** (`source = 'walk_in'`) is **never touched by sync at
  all** — not even matched against, regardless of this flag. This is the
  one rule with no override.
- A **sheet-synced guest** (`source = 'sheet_sync'`) starts with
  `is_manually_modified = false`. Every subsequent sync run is free to
  update it.
- The moment an Admin/Organizer edits that guest through the app's Guest
  feature, the Server Action sets `is_manually_modified = true` — from that
  point on, sync **skips** this row (logged as "skipped — manually
  modified"), unless the project's `sync_allow_overwrite_manual` feature
  flag (Settings → Users/Permissions-adjacent toggle, reusing the existing
  `feature_flags` table from Milestone 1 rather than a new table) is
  explicitly turned on. If an Owner does turn that on, a sync run that
  updates a previously-manually-edited row resets `is_manually_modified`
  back to `false` — the Sheet becomes authoritative for that row again
  until the next manual edit.

## Matching rule (how a Sheet row maps to a guest row)

- Natural key: `external_key`, computed as the guest's email if present,
  otherwise a normalized `name|phone` string. Stored on the `guests` row at
  first sync.
- Sync only ever matches against rows where `source = 'sheet_sync'`. A Sheet
  row is **never** merged into a `walk_in` row even if the name coincidentally
  matches — worst case, this creates a duplicate-looking `sheet_sync` guest
  next to a similarly-named walk-in, which is a visible, correctable
  situation rather than silent data loss of someone's walk-in entry.
- No match among existing `sheet_sync` rows → insert a new guest row.
- Match found, not manually modified (or override flag on) → update.
- Match found, manually modified, override flag off → skip, logged.

## Per-row failure isolation

The sync loop processes rows in a plain `for` loop with a try/catch around
each row's upsert — a single row's failure (bad date format, oversized
value, etc.) is caught, logged into that run's error list, and the loop
continues. The run itself only fails outright if the CSV can't be fetched
or parsed at all (nothing to iterate over).

## Every run is logged: `sync_runs`

One row per run: `status` (`success`/`partial`/`failed`), `rows_processed`,
`rows_inserted`, `rows_updated`, `rows_skipped`, `rows_failed`,
`started_at`, `finished_at`, `error_log` (jsonb array of `{row, reason}`).
Displayed in Settings → Integrations as run history, and the Server
Action/Route Handler both return the same summary shape immediately after
a run — no need to separately query for it.

## Income rows derived from guest sync

Per the Functional Requirements ("Income supports synchronization with the
guest system"), a guest row with a non-zero `transfer_amount` or
`envelope_amount` also gets a matching `incomes` row (type `transfer` or
`envelope`, `source = 'sheet_sync'`, linked via `guest_id`). To stay
repeatable without duplicating income rows on every re-sync, `incomes` gets
a partial unique index on `(guest_id, type) where guest_id is not null` —
sync upserts against that key, same skip/overwrite rules as guests apply
(an income row derived from a manually-modified guest is left alone, same
reasoning).

## What's intentionally NOT built here

- No two-way sync — the app never writes back to the Sheet.
- No Google Sheets API/OAuth — the published-CSV approach avoids that
  entirely, at the cost of the sheet needing to be "published to web."
- No column-level diffing/audit of _what_ changed on a synced row beyond
  what the existing `audit_log` trigger already captures (old/new full row
  JSON) — sufficient at this scale, per DEVELOPMENT_RULES.md's
  "avoid unnecessary complexity" principle.
