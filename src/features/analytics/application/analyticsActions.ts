import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { AnalyticsSummary } from "../domain/AnalyticsSummary";
import { computeAnalytics } from "../infrastructure/analyticsRepository";

export async function getAnalytics(
  projectId: string
): Promise<ActionResult<AnalyticsSummary>> {
  try {
    const supabase = await createSupabaseServerClient();
    const summary = await computeAnalytics(supabase, projectId);
    return { ok: true, data: summary };
  } catch (err) {
    await logErrorServer({
      module: "features/analytics/getAnalytics",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}
