# Production Validation — Milestone 1 (v0.1 Gate)

Run this against the real deployed Vercel URL, not localhost — several items
(cookies, redirect URLs, cold-start timing) only surface in the real
environment. Check every box before tagging `v0.1`. Where a box can't pass,
write down what you saw — don't skip silently.

Prerequisite: `docs/DEPLOYMENT.md` fully completed, `v0.0` already tagged.

---

## 1. Authentication

- [ ] Sign in with your whitelisted Google email → lands on `/` showing your email.
- [ ] Sign out (top-right of the dashboard header) → lands on `/login`, and
      going back to any `/settings/*` URL directly redirects to `/login`
      (not a flash of protected content first).
- [ ] Sign in with a **second**, non-whitelisted Google email → redirected to
      `/no-access`, not left in a broken/stuck state.
- [ ] Whitelist that second email with role `viewer`
      (`insert into whitelisted_emails ...`), sign in again with it →
      succeeds and lands on `/`.
- [ ] Refresh the page while signed in → session persists (no forced re-login).
- [ ] Close the browser fully, reopen, visit the site again → still signed
      in (session survives a real browser restart, not just a tab refresh).

## 2. Session Handling

- [ ] Session persists across a hard refresh (`Cmd/Ctrl+Shift+R`).
- [ ] Session persists after leaving the tab idle for 15+ minutes, then
      interacting again (tests the token refresh in `src/proxy.ts`).
- [ ] Two different browsers (or one normal + one incognito) signed in as
      two different whitelisted users work independently — no session bleed.
- [ ] After sign-out, the browser back button does not reveal cached
      protected content from before sign-out.

## 3. Route Protection

- [ ] Signed out, directly visit `/settings/project` (typed URL, not
      clicked) → redirected to `/login`, not an error page or blank screen.
- [ ] Signed out, directly visit `/settings/users` and `/settings/permissions`
      and `/settings/audit-log` → same redirect behavior on each.
- [ ] Signed in as `viewer` role, attempt to edit the project name and Save
      → UI shows the permission-denied error message (translated, not a raw
      Postgres error), and the value is confirmed unchanged in the DB.
- [ ] Signed in as `viewer`, try toggling a permission checkbox on
      `/settings/permissions` → fails with a translated error, box reverts.
- [ ] A whitelisted-but-unattached account (whitelisted email with no
      `project_members` row) → redirected to `/no-project`, not `/no-access`
      and not a crash.

## 4. Mobile Usability (real device — iPhone Safari, not just Chrome DevTools emulation)

- [ ] `/login` renders correctly, Google sign-in button is easily tappable
      one-handed.
- [ ] `/settings` list items are each comfortably tappable without
      mis-tapping a neighboring row.
- [ ] `/settings/project` form: all fields reachable and editable with the
      on-screen keyboard open (form doesn't get hidden behind the keyboard);
      Save/Cancel bar stays visible and reachable while scrolled.
- [ ] `/settings/users`: adding a user via the on-screen keyboard works
      end-to-end; the role `<select>` opens a native iOS picker correctly.
- [ ] `/settings/permissions`: the matrix table scrolls horizontally without
      breaking the page layout; checkboxes are tappable without zooming in.
- [ ] Rotate the device portrait ↔ landscape mid-session → layout doesn't
      break or lose form state.

## 5. Tablet Usability (real device — iPad Safari)

- [ ] Same walkthrough as §4, checking that layouts don't look stretched or
      awkwardly narrow at tablet width (this app is mobile-first, but
      shouldn't look broken at the wider tablet breakpoint either).
- [ ] Split-view / multitasking (iPad Safari alongside another app at ~50%
      width) still renders usably, not just at full-screen width.

## 6. Browser Compatibility

- [ ] Chrome (desktop) — full walkthrough of login → settings → sign out.
- [ ] Safari (desktop) — same walkthrough (Safari's cookie/third-party
      handling is the most likely place Supabase auth quietly breaks).
- [ ] Firefox (desktop) — same walkthrough.
- [ ] Mobile Safari (iOS) and Chrome (Android) — at minimum, login → view
      one settings page → sign out.

## 7. Slow Network Behavior

- [ ] Chrome DevTools → Network → throttle to "Slow 3G" → load `/` and
      `/settings/project` → loading skeleton (`PageSkeleton`) appears
      instead of a blank white screen during the delay.
- [ ] Submit the project settings form under Slow 3G throttling → the
      Save button shows its saving state and doesn't allow a second
      duplicate submit while pending.
- [ ] Throttle to "Offline" mid-navigation → confirm the app fails
      gracefully (translated error / retry option via `RouteErrorBoundary`),
      not a silent blank page.

## 8. Loading States

- [ ] Every settings route (`project`, `users`, `permissions`, `audit-log`)
      shows `PageSkeleton` momentarily on first navigation, confirmed via
      Slow 3G throttling if it's too fast to see normally.
- [ ] Form submissions (project save, invite user, permission toggle) all
      show a distinct saving/pending state, not just a frozen button.

## 9. Empty States

- [ ] `/settings/users` with only your own whitelisted email → still shows
      correctly (not empty, since you exist) — verify the "no users" message
      would appear by temporarily viewing a project with none, or reading
      the `EmptyState` component render path.
- [ ] `/settings/audit-log` on a **freshly deployed** project (before you've
      made any edits yet) → shows the translated "no activity logged yet"
      message, not a blank table or an error.
- [ ] `/settings/permissions` before the seed function has run (very first
      load) → seeds automatically and renders the full matrix, not an empty
      table (confirms `ensurePermissionsSeeded` fires correctly against a
      real DB).

## 10. Error Handling

- [ ] Force a Server Action error (e.g., temporarily revoke your own role to
      `viewer` in the DB directly, then try to save the project) → see the
      translated permission-denied message, not a raw stack trace or a
      Next.js error overlay.
- [ ] Check `application_logs` table in Supabase after triggering an error →
      confirm a row was written with correct `module`, `browser`,
      `device_type` fields populated (validates the client/server logging
      split actually works against a real DB, not just compiles).
- [ ] Visit a route that doesn't exist (e.g., `/settings/nonexistent`) →
      Next.js 404 page, not a crash.

## 11. File Upload Limits

- [ ] On `/dev/storage-test` (or wherever the receipts bucket is exercised),
      upload a normal JPG/PNG under 10MB → succeeds, signed URL opens and
      displays the image.
- [ ] Attempt a file over 10MB → client-side rejection message shown,
      **and** confirm no partial/orphaned file landed in the `receipts`
      bucket (check Supabase Storage directly).
- [ ] Attempt a disallowed file type (e.g., `.exe` renamed to `.jpg`) →
      either rejected or safely stored as an opaque blob — confirm it can't
      be executed or interpreted as anything other than a stored file.

## 12. Accessibility

- [ ] Zoom the browser to 200% → text remains readable, layout doesn't
      overlap or clip (elderly-usability requirement).
- [ ] Tab through `/settings/project`'s form using only the keyboard → focus
      order is logical, focus ring is visible on every input and button.
- [ ] Test with a screen reader (VoiceOver on Mac/iOS, or TalkBack on
      Android) on at least the login page and one settings page → labels
      and error messages are announced correctly (checks `FormField`'s
      `role="alert"` and `aria-label`s on the permission matrix checkboxes
      actually work, not just compile).
- [ ] Confirm no interactive element requires a mouse-only action (hover-only
      menus, etc.) — this app shouldn't have any, but verify.

## 13. Security Review

- [ ] In the Supabase dashboard, confirm RLS is **enabled** (not just
      policies present) on every table: `projects`, `project_members`,
      `whitelisted_emails`, `feature_flags`, `application_logs`,
      `permissions`, `audit_log`.
- [ ] Using the Supabase SQL editor's "run as" / a second test JWT, confirm a
      `viewer`-role user genuinely cannot `update projects` or
      `insert into whitelisted_emails` — a real query attempt, not just
      reading the policy and assuming it works.
- [ ] Confirm `whitelisted_emails` and `application_logs` rows with a null
      `project_id` are **not** readable/writable by a non-owner/admin user
      (this was a real bug found and fixed in the M1 review — verify the fix
      actually holds against the deployed database).
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is not present in any client-side
      bundle: `view-source:` the deployed site and search for the key
      fragment, or check Vercel's build output — it should never appear.
- [ ] Confirm `.env.local` was never committed to GitHub (`git log --all --
.env.local` should show nothing).
- [ ] Confirm the Google OAuth consent screen and redirect URIs match
      exactly what's in `docs/DEPLOYMENT.md` — no stray extra redirect URIs
      left over from testing.

## 14. Performance Verification

Measure against the Roadmap doc's targets, on the real deployed URL (not
localhost), ideally via Chrome DevTools' Network/Performance tabs or
Lighthouse — **this is the one item that could not be verified in the
development sandbox and is the actual reason this milestone was pending**:

- [ ] Initial page load (`/`, cold) — under 2s.
- [ ] Client-side navigation between settings pages — under 500ms.
- [ ] `/settings/audit-log` render with a small number of rows — under 2s.
- [ ] Form submission (project save) — under 2s round-trip.
- [ ] Run a Lighthouse pass (mobile preset) on `/` and `/settings/project` —
      no critical performance/accessibility flags.

## 15. Deployment Verification

- [ ] Push a trivial commit to `main` → Vercel auto-deploys without manual
      intervention.
- [ ] The production URL uses HTTPS (Vercel default — just confirm, don't
      assume).
- [ ] Environment variables in Vercel match `.env.example`'s current set
      exactly — no leftover unused vars, no missing ones.
- [ ] Supabase project is on the free tier as expected — check the usage
      dashboard shows $0 and reasonable headroom (DB size, bandwidth) at
      current data volume.
- [ ] `git tag v0.0` already exists (Milestone 0 gate) before proceeding.

---

## Sign-off

Once every box above is checked (or explicitly noted as "checked and found
acceptable" with a reason, for anything environment-dependent that can't be
literally verified until real usage begins):

```bash
git tag v0.1
git push --tags
```

Tell me once `v0.1` is tagged and I'll begin Milestone 2 (Budget & Expenses).
