/**
 * Stable, translatable error codes returned by Server Actions.
 * Never return raw English strings from a use case — always a code from
 * this list, translated at the point of display via the active dictionary
 * (t.errors[code]). This is what makes error/validation messages actually
 * bilingual instead of hardcoded to English.
 */
export type ErrorCode =
  | "not_signed_in"
  | "no_project"
  | "not_found"
  | "permission_denied"
  | "name_required"
  | "invalid_email"
  | "already_whitelisted"
  | "invalid_input"
  | "unknown_error";
