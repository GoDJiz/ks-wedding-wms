import { createSupabaseBrowserClient } from "@/infrastructure/supabase/client";

export type LogErrorInput = {
  module: string;
  errorMessage: string;
  stackTrace?: string;
  projectId?: string;
};

/**
 * Error Logging standard (DEVELOPMENT_RULES.md §10) — client-side path.
 * Used from Client Components only (error boundaries, caught UI errors).
 * For Server Actions/Route Handlers, use logErrorServer instead — kept as a
 * separate module (not one function branching on `typeof window`) because
 * bundlers still pull server-only imports into the client bundle even
 * behind a runtime check.
 * Never throws — a logging failure must not crash the caller.
 */
export async function logError(input: LogErrorInput) {
  try {
    const supabase = createSupabaseBrowserClient();
    const ua = navigator.userAgent;

    await supabase.from("application_logs").insert({
      project_id: input.projectId ?? null,
      module: input.module,
      error_message: input.errorMessage,
      stack_trace: input.stackTrace ?? null,
      browser: ua,
      device_type: /Mobi|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop",
    });
  } catch {
    console.error("Failed to write application log:", input.errorMessage);
  }
}
