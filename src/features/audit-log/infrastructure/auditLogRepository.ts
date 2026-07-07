import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLogEntry } from "../domain/AuditLogEntry";

export async function listAuditLog(
  supabase: SupabaseClient,
  projectId: string,
  limit = 50
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, user_email, action, table_name, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    userEmail: row.user_email as string | null,
    action: row.action as AuditLogEntry["action"],
    tableName: row.table_name as string,
    createdAt: row.created_at as string,
  }));
}
