import type { SupabaseClient } from "@supabase/supabase-js";
import type { WhitelistedUser } from "../users.types";

export async function listWhitelistedUsers(
  supabase: SupabaseClient,
  projectId: string
): Promise<WhitelistedUser[]> {
  const { data, error } = await supabase
    .from("whitelisted_emails")
    .select("id, email, invited_role, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    email: row.email as string,
    invitedRole: row.invited_role as string,
    createdAt: row.created_at as string,
  }));
}

export async function insertWhitelistedUser(
  supabase: SupabaseClient,
  email: string,
  role: string,
  projectId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("whitelisted_emails")
    .insert({ email, invited_role: role, project_id: projectId });

  return { error: error?.message ?? null };
}

export async function deleteWhitelistedUser(
  supabase: SupabaseClient,
  id: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("whitelisted_emails")
    .delete()
    .eq("id", id);
  return { error: error?.message ?? null };
}
