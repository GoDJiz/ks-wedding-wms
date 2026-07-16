# Pre-Deployment Checklist

Quick-reference version of the full checks in `docs/DEPLOYMENT_GUIDE_V1.md`.
Use this as your final sweep right before flipping the switch. If anything
is unchecked, don't deploy yet — go fix it first.

## Code & Repository

- [ ] Latest code pushed to `main` on GitHub
- [ ] `npm run build`, `npm run lint`, and `npm run test` all pass locally
- [ ] No `.env.local` or secrets committed to git

## Supabase

- [ ] Project created (free tier)
- [ ] All 10 migrations run, in order, no errors
- [ ] Whitelist Auth Hook wired to `check_email_whitelist`
- [ ] Your email added to `whitelisted_emails`
- [ ] 4 Storage buckets created (`receipts`, `slips`, `product-images`, `project-assets`) with correct visibility and 10MB limit
- [ ] Real wedding project row created + you're linked as `owner` in `project_members`

## Google OAuth

- [ ] OAuth client created in Google Cloud Console
- [ ] Redirect URI points to your Supabase project's callback URL
- [ ] Client ID/Secret entered into Supabase → Authentication → Providers → Google

## Vercel

- [ ] GitHub repo imported
- [ ] All 5 environment variables set (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LINE_CHANNEL_ACCESS_TOKEN`, `SHEET_SYNC_SHARED_SECRET`)
- [ ] Deployed successfully, live URL loads
- [ ] Supabase Site URL / Redirect URLs updated to match the real Vercel domain

## LINE

- [ ] Channel Access Token set in Vercel
- [ ] At least one recipient added in Settings → Notifications
- [ ] Test message received on a real phone

## Google Sheets Sync

- [ ] Guest sheet published to web as CSV
- [ ] CSV URL + field mapping configured in Settings → Integrations
- [ ] Dry Run previewed and looks correct
- [ ] Real sync run completed successfully

## Final Sanity Pass

- [ ] Logged in as a real whitelisted user — works
- [ ] Logged in as a non-whitelisted test email — correctly rejected
- [ ] Settings → System Health shows all green (or an accepted ⚠️)
- [ ] A recent database backup exists

Once everything above is checked, you're ready to tag `v1.0`. See
`docs/DEPLOYMENT_GUIDE_V1.md`'s Final Release Checklist for the fuller
version if anything here feels unclear.
