import Link from "next/link";
import { getCurrentSession } from "@/application/auth/getCurrentSession";

export default async function Home() {
  const user = await getCurrentSession();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white/70 p-8 text-center shadow-sm backdrop-blur">
        <h1 className="text-xl font-semibold text-slate-800">
          Wedding Management System
        </h1>
        <p className="mt-1 text-sm text-slate-500">KS Wedding</p>

        {user ? (
          <>
            <p className="mt-6 text-sm text-slate-600">
              Signed in as {user.email}
            </p>
            <Link
              href="/settings"
              className="mt-4 inline-block rounded-2xl bg-sky-100 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-sky-200"
            >
              Settings
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="mt-6 inline-block rounded-2xl bg-sky-400 px-6 py-3 text-sm font-medium text-white hover:bg-sky-500"
          >
            Sign in
          </Link>
        )}

        <div className="mt-8 border-t border-sky-100 pt-4 text-left text-xs text-slate-400">
          <p className="mb-2 font-medium text-slate-500">Milestone 0 spikes:</p>
          <ul className="space-y-1">
            <li>
              <Link className="text-sky-600 underline" href="/dev/i18n-test">
                i18n toggle test
              </Link>
            </li>
            <li>
              <Link className="text-sky-600 underline" href="/dev/storage-test">
                Storage upload test
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
