import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { AuditLogEntry } from "../domain/AuditLogEntry";
import { listAuditLog } from "../infrastructure/auditLogRepository";

export async function getAuditLog(
  projectId: string
): Promise<ActionResult<AuditLogEntry[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const entries = await listAuditLog(supabase, projectId);
    return { ok: true, data: entries };
  } catch (err) {
    await logErrorServer({
      module: "features/audit-log/getAuditLog",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}
