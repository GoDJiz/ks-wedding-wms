import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/serviceRole";
import { sendUpcomingPaymentReminders } from "@/shared/notifications/paymentReminders";

/**
 * POST /api/notifications/payment-reminders
 * Body: { projectId: string, secret: string }
 * Intended for a daily scheduled trigger (Apps Script time-driven trigger,
 * same free-tier mechanism already used for guest sync) — or manual curl.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.projectId !== "string" ||
    typeof body.secret !== "string"
  ) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Reuses the same shared secret as /api/sync/guests — both are "trusted
  // external trigger" endpoints, not sheet-specific despite the env var's
  // name. Introducing a second secret for a second endpoint with the same
  // trust model (server-to-server, not user-facing) would be config sprawl
  // without a real security benefit.
  const expectedSecret = process.env.SHEET_SYNC_SHARED_SECRET;
  if (!expectedSecret || body.secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const result = await sendUpcomingPaymentReminders(supabase, body.projectId);

  return NextResponse.json({ ok: true, ...result });
}
