import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HealthCheck } from "../domain/SystemHealth";

export async function checkSupabase(
  supabase: SupabaseClient,
  projectId: string
): Promise<HealthCheck> {
  try {
    const { error } = await supabase
      .from("projects")
      .select("id", { head: true, count: "exact" })
      .eq("id", projectId);
    if (error) return { status: "error", detail: error.message };
    return { status: "ok", detail: "Connected" };
  } catch (err) {
    return {
      status: "error",
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function checkStorage(
  supabase: SupabaseClient
): Promise<HealthCheck> {
  try {
    const { error } = await supabase.storage
      .from("receipts")
      .list("", { limit: 1 });
    if (error) return { status: "error", detail: error.message };
    return { status: "ok", detail: "receipts bucket reachable" };
  } catch (err) {
    return {
      status: "error",
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function checkLine(): Promise<HealthCheck> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return {
      status: "not_configured",
      detail: "LINE_CHANNEL_ACCESS_TOKEN not set",
    };
  }
  try {
    // LINE's "get bot info" endpoint validates the token without sending
    // any message to anyone — a real connectivity check, not just an env
    // var presence check.
    const res = await fetch("https://api.line.me/v2/bot/info", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return { status: "ok", detail: "Channel token valid" };
    return { status: "error", detail: `LINE API returned HTTP ${res.status}` };
  } catch (err) {
    return {
      status: "error",
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function checkGuestSync(
  supabase: SupabaseClient,
  projectId: string
): Promise<HealthCheck> {
  try {
    const { data: config } = await supabase
      .from("sync_configs")
      .select("csv_url")
      .eq("project_id", projectId)
      .maybeSingle();

    if (!config?.csv_url) {
      return { status: "not_configured", detail: "No CSV URL configured" };
    }

    const { data: lastRun } = await supabase
      .from("sync_runs")
      .select("status, started_at")
      .eq("project_id", projectId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastRun) {
      return { status: "warning", detail: "Configured, but never run yet" };
    }

    const daysSince =
      (Date.now() - new Date(lastRun.started_at as string).getTime()) /
      86400000;
    if (lastRun.status === "failed") {
      return {
        status: "error",
        detail: `Last run failed (${lastRun.started_at})`,
      };
    }
    if (daysSince > 14) {
      return {
        status: "warning",
        detail: `Last run was ${Math.round(daysSince)} days ago`,
      };
    }
    return {
      status: "ok",
      detail: `Last run: ${lastRun.status} (${lastRun.started_at})`,
    };
  } catch (err) {
    return {
      status: "error",
      detail: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
