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

// A LINE User ID is always "U" followed by 32 lowercase hex characters
// (see https://developers.line.biz/en/docs/messaging-api/getting-user-ids/).
// Rejecting anything else here catches the most common real-world mistake
// — pasting a display name, a group/room ID, or a stray whitespace/quote —
// before it ever reaches the LINE API as an opaque 400 at test-send time.
const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/;

export async function addRecipient(
  projectId: string,
  lineUserId: string,
  label: string
): Promise<ActionResult<null>> {
  const trimmedId = lineUserId.trim();
  if (!trimmedId) return { ok: false, code: "invalid_input" };
  if (!LINE_USER_ID_PATTERN.test(trimmedId)) {
    return { ok: false, code: "line_invalid_recipient" };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("notification_recipients").insert({
      project_id: projectId,
      line_user_id: trimmedId,
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
): Promise<ActionResult<null> & { detail?: string }> {
  try {
    const { error, status, detail } = await sendLineMessage(lineUserId, {
      title: "Test Notification",
      summary: "This confirms LINE notifications are working correctly.",
    });
    if (error) {
      // Log the real HTTP status + LINE's own error body — this is what
      // actually lets someone tell "token invalid" apart from "invalid
      // recipient ID" apart from "LINE is down" in application_logs,
      // instead of every failure looking identical.
      await logErrorServer({
        module: "features/notifications/sendTestNotification",
        errorMessage: `status=${status} lineUserId=${lineUserId} ${error}`,
      });

      // status -1: env var missing entirely (see lineClient.ts).
      if (status === -1) {
        return { ok: false, code: "line_not_configured" };
      }
      // 401: the channel access token itself is invalid/expired/revoked.
      if (status === 401) {
        return { ok: false, code: "line_unauthorized", detail: detail ?? undefined };
      }
      // 403: token is valid but the channel lacks permission for this
      // operation (e.g. a plan/quota restriction).
      if (status === 403) {
        return { ok: false, code: "line_forbidden", detail: detail ?? undefined };
      }
      // 400: malformed request — in practice for a test send this is
      // almost always an invalid/mistyped LINE User ID (LINE returns
      // "The property, 'to', in the request body is invalid" for a
      // recipient who doesn't exist or hasn't added the OA as a friend).
      if (status === 400) {
        return {
          ok: false,
          code: "line_invalid_recipient",
          detail: detail ?? undefined,
        };
      }
      return {
        ok: false,
        code: "line_send_failed",
        detail: detail ?? error,
      };
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
