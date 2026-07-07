import { createSupabaseBrowserClient } from "@/infrastructure/supabase/client";

/**
 * Triggers Google OAuth sign-in. This is the one place a Client Component
 * is allowed to call the Supabase client directly — auth itself is a
 * cross-cutting infrastructure concern, not a "feature" with its own
 * application layer. Keeping it here (rather than inline in the login page)
 * means Apple Sign-In (feature flag `apple_sign_in`, Milestone 6) has a
 * single obvious place to add a sibling function later.
 */
export async function signInWithGoogle(redirectPath = "/auth/callback") {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}${redirectPath}`,
    },
  });
}
