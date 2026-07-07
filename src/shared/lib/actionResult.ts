import type { ErrorCode } from "./errorCodes";

export type ActionResult<T> =
  { ok: true; data: T } | { ok: false; code: ErrorCode };
