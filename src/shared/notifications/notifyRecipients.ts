import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendLineMessage, type LineNotification } from "./lineClient";

/**
 * The one function other features call to send a notification — they
 * don't need to know about LINE specifics or recipient management.
 * Fire-and-forget in spirit: failures are logged by the caller if it
 * chooses to inspect the returned array, but never thrown, so a
 * notification failure can never block the business action that
 * triggered it (per DEVELOPMENT_RULES.md — a Server Action's core
 * responsibility succeeding shouldn't depend on a third-party API).
 */
export async function notifyProjectRecipients(
  supabase: SupabaseClient,
  projectId: string,
  notification: LineNotification
): Promise<{ sentCount: number; errors: string[] }> {
  const { data } = await supabase
    .from("notification_recipients")
    .select("line_user_id")
    .eq("project_id", projectId)
    .eq("enabled", true);

  const recipients = data ?? [];
  const errors: string[] = [];
  let sentCount = 0;

  for (const recipient of recipients) {
    const { error } = await sendLineMessage(
      recipient.line_user_id as string,
      notification
    );
    if (error) errors.push(error);
    else sentCount++;
  }

  return { sentCount, errors };
}
