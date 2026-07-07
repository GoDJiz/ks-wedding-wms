"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex gap-1 rounded-full bg-sky-100 p-1">
      <button
        onClick={() => setLang("th")}
        aria-pressed={lang === "th"}
        className={`min-h-10 rounded-full px-3 text-xs font-medium transition ${
          lang === "th" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
        }`}
      >
        ไทย
      </button>
      <button
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`min-h-10 rounded-full px-3 text-xs font-medium transition ${
          lang === "en" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
        }`}
      >
        EN
      </button>
    </div>
  );
}
