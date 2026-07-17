import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Explicit auth cookie attributes, shared by every place a Supabase client
 * is created (browser, server, proxy/middleware).
 *
 * Without this, @supabase/ssr falls back to its own per-call defaults,
 * which is fine in Chrome but not reliably in Safari/WebKit: Safari (and
 * every iOS browser and in-app browser, which are required to use WebKit)
 * enforces stricter first-party/SameSite cookie rules than Chromium, and a
 * cookie set without an explicit, consistent `path`/`sameSite`/`secure`
 * across requests can be written on one request and silently not read back
 * on the next — most visibly right after the OAuth redirect back from
 * Google lands on `/auth/callback` and the dashboard immediately re-checks
 * the session. `sameSite: "lax"` is required (not "strict") because the
 * session cookie must still be sent on that top-level GET redirect coming
 * back from accounts.google.com. `secure` is only forced on in production —
 * every deployed environment (Vercel) is https, but local dev via
 * `next dev` still serves over plain http, and a browser silently drops
 * any `Secure` cookie set over http, which would break local login.
 */
export const SUPABASE_COOKIE_OPTIONS: CookieOptionsWithName = {
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};
