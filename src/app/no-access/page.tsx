import { getDictionary } from "@/lib/i18n/getDictionary";

export default async function NoAccessPage() {
  const { t } = await getDictionary();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 to-white p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white/70 p-8 text-center shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold text-slate-800">
          {t.noAccess.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{t.noAccess.description}</p>
      </div>
    </main>
  );
}
