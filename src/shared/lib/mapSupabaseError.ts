import type { ErrorCode } from "./errorCodes";

/**
 * Maps a raw Postgres/Supabase error message to a translatable ErrorCode.
 * Centralizes the "which Postgres error means what" heuristic in one place
 * instead of duplicating similar if/else checks across every feature's
 * application layer (see DEVELOPMENT_RULES.md §9, "refactor duplicated code").
 */
export function mapSupabaseError(message: string): ErrorCode {
  const lower = message.toLowerCase();

  if (
    lower.includes("row-level security") ||
    lower.includes("permission denied")
  ) {
    return "permission_denied";
  }
  if (lower.includes("duplicate key") || lower.includes("already exists")) {
    return "already_whitelisted";
  }
  return "unknown_error";
}
