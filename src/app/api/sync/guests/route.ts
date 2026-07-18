import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/serviceRole";
import { runGuestSync } from "@/features/sync/infrastructure/csvGuestSync";
import {
  getSyncSettingsRow,
  insertSyncRun,
  claimDueAutoSyncs,
  markAutoSyncAttempted,
} from "@/features/sync/infrastructure/syncRepository";

/**
 * POST /api/sync/guests
 *
 * Two request shapes, same endpoint (no duplicate API surface):
 *
 * 1. `{ projectId: string, secret: string }` — single-project trigger, used
 *    by Apps Script's time-driven trigger (see docs/SYNC_STRATEGY.md) or
 *    manual curl testing. Unchanged from before.
 * 2. `{ mode: "auto", secret: string }` — the global Auto Sync sweep, called
 *    every 5 minutes by the single pg_cron job (see
 *    supabase/migrations/0013_auto_sync_scheduler.sql). Claims every project
 *    whose Auto Sync is enabled and due, then runs the exact same
 *    `runGuestSync` + `insertSyncRun` path as case 1 and as the in-app
 *    "Sync Now" button — no separate sync implementation.
 *
 * Both cases use the service-role client because the caller has no Supabase
 * user session; the shared secret is the actual authentication here, not
 * RLS.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.secret !== "string") {
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

  if (body.mode === "auto") {
    const due = await claimDueAutoSyncs(supabase);
    const results: { projectId: string; skipped?: string; status?: string }[] =
      [];

    for (const project of due) {
      if (!project.csvUrl) {
        results.push({ projectId: project.projectId, skipped: "no_csv_url" });
        continue;
      }
      const startedAt = new Date().toISOString();
      const result = await runGuestSync(
        supabase,
        project.projectId,
        project.csvUrl
      );
      await insertSyncRun(supabase, project.projectId, null, result);
      await markAutoSyncAttempted(supabase, project.projectId, startedAt);
      results.push({ projectId: project.projectId, status: result.status });
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  }

  if (typeof body.projectId !== "string") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

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
