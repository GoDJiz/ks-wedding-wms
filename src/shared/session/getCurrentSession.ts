import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

/**
 * Returns the current authenticated user, or null — for pages that want to
 * optionally personalize (e.g. the public home page) without redirecting.
 * For pages that require a session, use requireSessionContext() instead.
 */
export async function getCurrentSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}
