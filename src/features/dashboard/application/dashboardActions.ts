import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { DashboardSummary } from "../domain/DashboardSummary";
import { computeDashboardSummary } from "../infrastructure/dashboardRepository";

export async function getDashboardSummary(
  projectId: string
): Promise<ActionResult<DashboardSummary>> {
  try {
    const supabase = await createSupabaseServerClient();
    const summary = await computeDashboardSummary(supabase, projectId);
    return { ok: true, data: summary };
  } catch (err) {
    await logErrorServer({
      module: "features/dashboard/getDashboardSummary",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}
