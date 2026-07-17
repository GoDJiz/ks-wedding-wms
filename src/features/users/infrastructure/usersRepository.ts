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

export type BootstrapMembershipResult = {
  joined: boolean;
  reason:
    | "joined"
    | "already_member"
    | "not_whitelisted"
    | "not_authenticated"
    | "invalid_role"
    | "error";
  projectId: string | null;
  role: string | null;
};

/**
 * Bridges whitelisted_emails -> project_members for the CURRENTLY
 * AUTHENTICATED user (never takes a user id / project id — see
 * migration 0011). Call this once, right after the user's session is
 * established (auth/callback route), so a freshly whitelisted user who
 * has never signed in before ends up seated on the project they were
 * invited to instead of hitting /no-project.
 *
 * Safe to call on every login: idempotent (project_members' existing
 * unique(project_id, user_id) constraint + an explicit already_member
 * check inside the function), and a no-op for users who were never
 * whitelisted or are already members.
 */
export async function bootstrapProjectMembership(
  supabase: SupabaseClient
): Promise<BootstrapMembershipResult> {
  const { data, error } = await supabase.rpc("bootstrap_project_membership");

  if (error || !data) {
    return { joined: false, reason: "error", projectId: null, role: null };
  }

  return {
    joined: Boolean(data.joined),
    reason: data.reason as BootstrapMembershipResult["reason"],
    projectId: (data.project_id as string) ?? null,
    role: (data.role as string) ?? null,
  };
}
