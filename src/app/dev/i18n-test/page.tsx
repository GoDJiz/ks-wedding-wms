"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";

export default function I18nTestPage() {
  const { t } = useLanguage();

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="rounded-3xl bg-white/70 p-6 shadow-sm backdrop-blur">
        <h1 className="text-lg font-semibold">{t.devSpike.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{t.devSpike.description}</p>

        <div className="mt-6">
          <LanguageSwitcher />
        </div>

        <p className="mt-6 text-xs text-slate-500">
          {t.common.save} · {t.common.cancel} · {t.common.delete}
        </p>
      </div>
    </main>
  );
}
