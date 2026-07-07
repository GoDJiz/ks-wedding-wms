import Link from "next/link";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SignOutButton } from "./SignOutButton";
import { getDictionary } from "@/lib/i18n/getDictionary";

export async function DashboardHeader({
  showBack = false,
}: {
  showBack?: boolean;
}) {
  const { t } = await getDictionary();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-sky-100 bg-white/70 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        {showBack && (
          <Link
            href="/settings"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-500 hover:bg-sky-50"
            aria-label={t.common.back}
          >
            ←
          </Link>
        )}
        <span className="text-sm font-semibold text-slate-700">
          {t.common.appName}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <SignOutButton label={t.common.signOut} />
      </div>
    </header>
  );
}
