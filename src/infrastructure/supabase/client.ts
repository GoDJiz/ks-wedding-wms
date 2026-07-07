import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 * Infrastructure layer — never import this directly into a page/component
 * for data access; go through an application-layer use case instead.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
