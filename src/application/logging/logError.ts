import { createSupabaseBrowserClient } from "@/infrastructure/supabase/client";

export type LogErrorInput = {
  module: string;
  errorMessage: string;
  stackTrace?: string;
  projectId?: string;
};

/**
 * Application layer use case for Error Logging standard.
 * Writes to application_logs (RLS allows anyone to insert their own row).
 * Never throws — logging must not itself crash the app.
 */
export async function logError(input: LogErrorInput) {
  try {
    const supabase = createSupabaseBrowserClient();
    const ua =
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown";

    await supabase.from("application_logs").insert({
      project_id: input.projectId ?? null,
      module: input.module,
      error_message: input.errorMessage,
      stack_trace: input.stackTrace ?? null,
      browser: ua,
      device_type: /Mobi|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop",
    });
  } catch {
    // Swallow — logging failure should never surface to the user.
    console.error("Failed to write application log:", input.errorMessage);
  }
}
