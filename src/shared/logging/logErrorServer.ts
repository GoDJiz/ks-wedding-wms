import "server-only";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import type { LogErrorInput } from "./logError";

/**
 * Error Logging standard — server-side path. See logError.ts for the
 * Client Component equivalent and why these are two separate modules.
 * Never throws — a logging failure must not crash the caller.
 */
export async function logErrorServer(input: LogErrorInput) {
  try {
    const supabase = await createSupabaseServerClient();
    const headerList = await headers();
    const ua = headerList.get("user-agent") ?? "unknown";

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
