import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/serviceRole";
import { runGuestSync } from "@/features/sync/infrastructure/csvGuestSync";
import {
  getSyncSettingsRow,
  insertSyncRun,
} from "@/features/sync/infrastructure/syncRepository";

/**
 * POST /api/sync/guests
 * Body: { projectId: string, secret: string }
 * Called by Apps Script's time-driven trigger (see docs/SYNC_STRATEGY.md) —
 * or manually via curl for testing. Uses the service-role client because
 * the caller has no Supabase user session; the shared secret is the actual
 * authentication here, not RLS.
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

  const expectedSecret = process.env.SHEET_SYNC_SHARED_SECRET;
  if (!expectedSecret || body.secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const settings = await getSyncSettingsRow(supabase, body.projectId);

  if (!settings.csvUrl) {
    return NextResponse.json(
      { error: "No CSV URL configured for this project" },
      { status: 400 }
    );
  }

  const result = await runGuestSync(supabase, body.projectId, settings.csvUrl);
  const run = await insertSyncRun(supabase, body.projectId, null, result);

  return NextResponse.json({ ok: true, summary: run });
}
