"use client";

import { createSupabaseBrowserClient } from "@/infrastructure/supabase/client";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 to-white p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white/70 p-8 text-center shadow-sm backdrop-blur">
        <h1 className="text-xl font-semibold text-slate-800">
          Wedding Management System
        </h1>
        <p className="mt-1 text-sm text-slate-500">KS Wedding</p>

        <button
          onClick={handleGoogleLogin}
          className="mt-8 w-full rounded-2xl bg-sky-400 px-6 py-3 text-base font-medium text-white transition hover:bg-sky-500 active:scale-[0.98]"
        >
          Sign in with Google
        </button>

        <p className="mt-4 text-xs text-slate-400">
          Only whitelisted admin emails can access this system.
        </p>
      </div>
    </main>
  );
}
