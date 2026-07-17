import type { ErrorCode } from "./errorCodes";

/**
 * `warning` is optional and additive — existing callers that only check
 * `.ok`/`.data` are unaffected. Used for non-fatal issues where the main
 * action succeeded but a secondary effect (e.g. guest->income sync) didn't,
 * so the UI can surface why instead of the failure being silently logged.
 */
export type ActionResult<T> =
  | { ok: true; data: T; warning?: string }
  | { ok: false; code: ErrorCode };
