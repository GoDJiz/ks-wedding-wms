"use client";

import { signInWithGoogle } from "@/shared/session/clientAuth";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { Button } from "@/shared/ui/Button";

export default function LoginPage() {
  const { t } = useLanguage();

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 to-white p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white/70 p-8 text-center shadow-sm backdrop-blur">
        <div className="mb-6 flex justify-center">
          <LanguageSwitcher />
        </div>

        <h1 className="text-xl font-semibold text-slate-800">
          {t.login.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t.login.subtitle}</p>

        <Button onClick={handleGoogleLogin} className="mt-8 w-full">
          {t.common.signIn}
        </Button>

        <p className="mt-4 text-xs text-slate-500">{t.login.whitelistNotice}</p>
      </div>
    </main>
  );
}
