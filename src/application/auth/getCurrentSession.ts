import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

/**
 * Application layer use case — Presentation calls this, never the Supabase
 * client directly. Returns the current authenticated user, or null.
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
