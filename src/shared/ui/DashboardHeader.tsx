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

  const navLinks = [
    { href: "/dashboard", label: t.nav.dashboard },
    { href: "/budget", label: t.nav.budget },
    { href: "/expense", label: t.nav.expense },
    { href: "/reimbursement", label: t.nav.reimbursement },
    { href: "/settings", label: t.nav.settings },
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-sky-100 bg-white/70 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:px-6">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="min-h-10 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium text-slate-600 hover:bg-sky-50"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
