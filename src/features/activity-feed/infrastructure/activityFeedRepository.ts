import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityEntry } from "../domain/ActivityEntry";

export async function listRecentActivity(
  supabase: SupabaseClient,
  projectId: string,
  limit = 50
): Promise<ActivityEntry[]> {
  const { data } = await supabase
    .from("audit_log")
    .select("id, user_email, action, table_name, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    actorEmail: row.user_email as string | null,
    action: row.action as ActivityEntry["action"],
    tableName: row.table_name as string,
    createdAt: row.created_at as string,
  }));
}
