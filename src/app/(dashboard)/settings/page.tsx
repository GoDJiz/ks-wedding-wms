import Link from "next/link";
import { PageLayout } from "@/shared/ui/PageLayout";
import { getDictionary } from "@/lib/i18n/getDictionary";

export default async function SettingsIndexPage() {
  const { t } = await getDictionary();

  const settingsLinks = [
    { href: "/settings/project", label: t.nav.project },
    { href: "/settings/payment-accounts", label: t.nav.paymentAccounts },
    { href: "/settings/users", label: t.nav.users },
    { href: "/settings/permissions", label: t.nav.permissions },
    { href: "/settings/audit-log", label: t.nav.auditLog },
  ];

  return (
    <PageLayout title={t.common.settings}>
      <ul className="space-y-2">
        {settingsLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block min-h-14 rounded-2xl bg-white/70 px-4 py-4 text-base font-medium text-slate-700 hover:bg-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </PageLayout>
  );
}
