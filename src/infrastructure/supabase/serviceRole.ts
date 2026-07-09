import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS entirely. Used ONLY by the external
 * sync trigger (Route Handler called by Apps Script/cron, which has no
 * user session to authenticate with). Never import this into anything
 * reachable from a user-facing Server Action — those use the session-aware
 * server client in infrastructure/supabase/server.ts instead, so RLS still
 * governs who can trigger what.
 */
export function createSupabaseServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
