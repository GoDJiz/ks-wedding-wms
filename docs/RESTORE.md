# Backup & Restore Runbook

## Backups (see System Architecture doc §8 for the full strategy)

1. Supabase automatic daily backups (free tier, short rolling window) — passive, no action needed.
2. Manual DB export, anytime:
   ```bash
   supabase db dump --data-only -f backup_$(date +%Y%m%d).sql
   ```
3. Manual Storage export — download all objects in each bucket via the Supabase dashboard, or script it with the Supabase CLI/SDK once Milestone 2+ buckets exist.
4. Google Sheets remains an independent copy of guest/income data — no extra action needed beyond keeping the Sheet itself backed up (Google Drive version history already does this).
5. Owner "Export All" (built in a later milestone): one Settings button that bundles a JSON data dump + Storage file list into a single downloadable zip, logged in Audit Log.

## Restore (manual, documented — no one-click tool)

1. Provision a Supabase project (new or existing).
2. Run all migrations in `supabase/migrations/` in order to recreate the schema.
3. Import the data dump:
   ```bash
   psql "$DATABASE_URL" -f backup_YYYYMMDD.sql
   ```
4. Re-upload exported Storage files to their original bucket paths (matching the paths recorded at export time).
5. Update `.env.local` / Vercel env vars with the (possibly new) `NEXT_PUBLIC_SUPABASE_URL` / keys, redeploy.
6. Re-wire the whitelist Auth Hook (Dashboard → Authentication → Hooks) — this is project-specific config, not part of the SQL dump.
7. Verify: log in as Owner, confirm a few known records look right, confirm a non-whitelisted email is still rejected (RLS/whitelist working post-restore).

Keep this file updated any time the schema or integration wiring changes — restore should never require guessing.
