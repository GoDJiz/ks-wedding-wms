import Link from "next/link";
import { PageLayout } from "@/shared/ui/PageLayout";

const settingsLinks = [
  { href: "/settings/project", label: "Wedding Project" },
  { href: "/settings/users", label: "Users" },
  { href: "/settings/permissions", label: "Permissions" },
];

export default function SettingsIndexPage() {
  return (
    <PageLayout title="Settings">
      <ul className="space-y-2">
        {settingsLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-2xl bg-white/70 px-4 py-4 text-sm font-medium text-slate-700 hover:bg-white"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </PageLayout>
  );
}
