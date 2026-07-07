import type { SupabaseClient } from "@supabase/supabase-js";
import type { PermissionEntry } from "../permissions.types";

export async function listPermissions(
  supabase: SupabaseClient,
  projectId: string
): Promise<PermissionEntry[]> {
  const { data, error } = await supabase
    .from("permissions")
    .select("id, role, capability_key, allowed")
    .eq("project_id", projectId)
    .order("capability_key", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    role: row.role as string,
    capabilityKey: row.capability_key as string,
    allowed: row.allowed as boolean,
  }));
}

export async function updatePermissionRow(
  supabase: SupabaseClient,
  id: string,
  allowed: boolean
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("permissions")
    .update({ allowed })
    .eq("id", id);

  return { error: error?.message ?? null };
}

export async function ensurePermissionsSeeded(
  supabase: SupabaseClient,
  projectId: string
): Promise<void> {
  await supabase.rpc("seed_default_permissions", { p_project_id: projectId });
}
