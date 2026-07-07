"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function I18nTestPage() {
  const { lang, setLang, t } = useLanguage();

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-3xl bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold">{t.milestone0.title}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {t.milestone0.description}
        </p>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setLang("th")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              lang === "th"
                ? "bg-sky-400 text-white"
                : "bg-sky-100 text-slate-600"
            }`}
          >
            ไทย
          </button>
          <button
            onClick={() => setLang("en")}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              lang === "en"
                ? "bg-sky-400 text-white"
                : "bg-sky-100 text-slate-600"
            }`}
          >
            English
          </button>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          {t.common.save} · {t.common.cancel} · {t.common.delete}
        </p>
      </div>
    </main>
  );
}
