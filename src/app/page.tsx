import Link from "next/link";
import { getCurrentSession } from "@/shared/session/getCurrentSession";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default async function Home() {
  const user = await getCurrentSession();
  const { t } = await getDictionary();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white/70 p-8 text-center shadow-sm backdrop-blur">
        <h1 className="text-xl font-semibold text-slate-800">{t.home.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.home.subtitle}</p>

        {user ? (
          <>
            <p className="mt-6 text-sm text-slate-600">
              {t.home.signedInAs} {user.email}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center rounded-2xl bg-sky-400 px-6 py-3 text-sm font-medium text-white hover:bg-sky-500"
              >
                {t.nav.dashboard}
              </Link>
              <Link
                href="/settings"
                className="inline-flex min-h-12 items-center rounded-2xl bg-sky-100 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-sky-200"
              >
                {t.common.settings}
              </Link>
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-sky-400 px-6 py-3 text-sm font-medium text-white hover:bg-sky-500"
          >
            {t.common.signIn}
          </Link>
        )}
      </div>
    </main>
  );
}
