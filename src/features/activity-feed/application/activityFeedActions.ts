import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { ActivityEntry } from "../domain/ActivityEntry";
import { listRecentActivity } from "../infrastructure/activityFeedRepository";

export async function getActivityFeed(
  projectId: string
): Promise<ActionResult<ActivityEntry[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const entries = await listRecentActivity(supabase, projectId);
    return { ok: true, data: entries };
  } catch (err) {
    await logErrorServer({
      module: "features/activity-feed/getActivityFeed",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}
