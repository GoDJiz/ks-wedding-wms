"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import { mapSupabaseError } from "@/shared/lib/mapSupabaseError";
import type { NotificationRecipient } from "../domain/NotificationRecipient";
import { sendLineMessage } from "@/shared/notifications/lineClient";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { sendUpcomingPaymentReminders } from "@/shared/notifications/paymentReminders";

export async function getRecipients(
  projectId: string
): Promise<ActionResult<NotificationRecipient[]>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("notification_recipients")
      .select("id, line_user_id, label, enabled")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    return {
      ok: true,
      data: (data ?? []).map((r) => ({
        id: r.id as string,
        lineUserId: r.line_user_id as string,
        label: r.label as string | null,
        enabled: r.enabled as boolean,
      })),
    };
  } catch (err) {
    await logErrorServer({
      module: "features/notifications/getRecipients",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function addRecipient(
  projectId: string,
  lineUserId: string,
  label: string
): Promise<ActionResult<null>> {
  if (!lineUserId.trim()) return { ok: false, code: "invalid_input" };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("notification_recipients").insert({
      project_id: projectId,
      line_user_id: lineUserId.trim(),
      label: label || null,
    });

    if (error) return { ok: false, code: mapSupabaseError(error.message) };

    revalidatePath("/settings/notifications");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/notifications/addRecipient",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function removeRecipient(id: string): Promise<ActionResult<null>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("notification_recipients")
      .delete()
      .eq("id", id);
    if (error) return { ok: false, code: mapSupabaseError(error.message) };

    revalidatePath("/settings/notifications");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/notifications/removeRecipient",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function sendTestNotification(
  lineUserId: string
): Promise<ActionResult<null>> {
  try {
    const { error } = await sendLineMessage(lineUserId, {
      title: "Test Notification",
      summary: "This confirms LINE notifications are working correctly.",
    });
    if (error) {
      await logErrorServer({
        module: "features/notifications/sendTestNotification",
        errorMessage: error,
      });
      return { ok: false, code: "unknown_error" };
    }
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/notifications/sendTestNotification",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function sendPaymentRemindersNow(
  projectId: string
): Promise<ActionResult<{ remindedCount: number }>> {
  try {
    await requireSessionContext();
    const supabase = await createSupabaseServerClient();
    const result = await sendUpcomingPaymentReminders(supabase, projectId);
    return { ok: true, data: result };
  } catch (err) {
    await logErrorServer({
      module: "features/notifications/sendPaymentRemindersNow",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}
