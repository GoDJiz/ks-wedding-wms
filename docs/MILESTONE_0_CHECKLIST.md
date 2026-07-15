# Milestone 0 — Architecture Validation Checklist

> **Historical document.** Milestone 0 was completed and signed off long
> ago; the `/dev/i18n-test` and `/dev/storage-test` spike pages this
> checklist refers to were deleted in Milestone 3 as planned (see the note
> at the bottom of this file). Kept here as a historical record of what was
> validated, not as an actionable checklist — for current deployment
> verification, use `docs/DEPLOYMENT.md` §7 and `docs/PRODUCTION_VALIDATION.md`.

Work through `docs/SETUP.md` first, then verify each item below. Tag `v0.0` once all are checked.

- [ ] Vercel deploy pipeline works from a GitHub push
      → push a small change, confirm Vercel auto-deploys.
- [ ] RLS blocks a lower-permission test user correctly
      → create a second whitelisted user with role `viewer`, confirm they cannot update `projects` or insert `project_members`.
- [ ] Whitelisted email logs in; non-whitelisted email is rejected
      → test both paths via `/login`, confirm the rejected one lands on `/no-access`.
- [ ] File upload + signed URL retrieval works; oversized file rejected
      → use `/dev/storage-test`, try a normal image and a file over 10MB.
- [ ] Apps Script successfully calls a Supabase Edge Function
      → run `testSyncCall()` from the Sheet, confirm a 200 response and correct row count in logs.
- [ ] Test LINE Flex Message delivered to a real LINE account
      → invoke `notify-line-test`, confirm the message arrives with title/summary/amount/button.
- [ ] TH/EN text switch works on a test page
      → use `/dev/i18n-test`, confirm both languages render correctly.
- [ ] `v0.0` tagged
      → `git tag v0.0 && git push --tags` once all boxes above are checked.

## What's intentionally NOT in Milestone 0

No real feature UI, no real business data, no production RLS policies beyond the ones needed to prove the pattern (Milestones 1+ add the full table set from the Database Design doc). This milestone only proves the architecture holds — it is deliberately throwaway-adjacent (the `/dev/*` spike pages will be deleted once Milestone 0 is signed off).
