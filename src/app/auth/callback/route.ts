import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

// Handles the redirect back from Google OAuth.
// If the Auth Hook (see migration 0001) rejected a non-whitelisted email,
// Supabase returns an error here instead of a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(`${origin}/no-access`);
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/no-access`);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
