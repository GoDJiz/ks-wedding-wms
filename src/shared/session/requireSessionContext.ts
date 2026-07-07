import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import type { User } from "@supabase/supabase-js";

export type SessionContext = {
  user: User;
  projectId: string;
};

/**
 * Shared (cross-feature) helper: resolves the current authenticated user and
 * their active project. Any dashboard page needing "who is logged in and
 * which project are we in" calls this, instead of reaching into the
 * `project` or `users` features directly — keeps features decoupled per
 * DEVELOPMENT_RULES.md §1.
 *
 * Redirects to /login if there is no session or no project membership.
 * This is also the single place route protection logic lives — the
 * (dashboard) layout calls this so every nested page is protected for free.
 */
export async function requireSessionContext(): Promise<SessionContext> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (error || !data) {
    // Authenticated but not attached to any project yet — distinct from
    // "not logged in", so it gets its own destination rather than looping
    // back to /login.
    redirect("/no-project");
  }

  return { user, projectId: data.project_id as string };
}
