import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { SystemHealth } from "../domain/SystemHealth";
import {
  checkSupabase,
  checkStorage,
  checkLine,
  checkGuestSync,
} from "../infrastructure/healthChecks";

export async function getSystemHealth(
  projectId: string
): Promise<ActionResult<SystemHealth>> {
  try {
    const supabase = await createSupabaseServerClient();

    // Each check is independent and already internally try/caught — one
    // failing check must never prevent the others from reporting.
    const [supabaseCheck, storageCheck, lineCheck, guestSyncCheck] =
      await Promise.all([
        checkSupabase(supabase, projectId),
        checkStorage(supabase),
        checkLine(),
        checkGuestSync(supabase, projectId),
      ]);

    return {
      ok: true,
      data: {
        supabase: supabaseCheck,
        storage: storageCheck,
        line: lineCheck,
        guestSync: guestSyncCheck,
      },
    };
  } catch (err) {
    await logErrorServer({
      module: "features/system-health/getSystemHealth",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}
