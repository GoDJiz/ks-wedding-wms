"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EmptyState, InlineError } from "@/shared/ui/StateViews";
import type { PermissionEntry } from "../permissions.types";
import { ROLES } from "../permissions.types";
import { togglePermission } from "../application/permissionsActions";

export function PermissionMatrix({
  initialEntries,
}: {
  initialEntries: PermissionEntry[];
}) {
  const { t, tError } = useLanguage();
  const [entries, setEntries] = useState(initialEntries);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const capabilityKeys = Array.from(
    new Set(entries.map((e) => e.capabilityKey))
  ).sort();

  const findEntry = (capabilityKey: string, role: string) =>
    entries.find((e) => e.capabilityKey === capabilityKey && e.role === role);

  const handleToggle = (entry: PermissionEntry) => {
    const nextAllowed = !entry.allowed;
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, allowed: nextAllowed } : e))
    );

    startTransition(async () => {
      const result = await togglePermission(entry.id, nextAllowed);
      if (!result.ok) {
        setError(tError(result.code));
        // revert on failure
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, allowed: entry.allowed } : e
          )
        );
      }
    });
  };

  const roleLabel = (r: string) =>
    ({
      owner: t.users.roleOwner,
      admin: t.users.roleAdmin,
      finance: t.users.roleFinance,
      organizer: t.users.roleOrganizer,
      viewer: t.users.roleViewer,
    })[r] ?? r;

  if (capabilityKeys.length === 0) {
    return <EmptyState message={t.permissions.noPermissions} />;
  }

  return (
    <div className="space-y-4">
      {error && <InlineError message={error} />}
      <p className="text-xs text-slate-500">{t.permissions.ownerNote}</p>

      <div className="overflow-x-auto rounded-2xl bg-white/70">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-sky-100">
              <th className="p-3 font-medium text-slate-500">
                {t.permissions.capability}
              </th>
              {ROLES.map((role) => (
                <th
                  key={role}
                  className="p-3 text-center font-medium text-slate-500"
                >
                  {roleLabel(role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {capabilityKeys.map((capabilityKey) => (
              <tr
                key={capabilityKey}
                className="border-b border-sky-50 last:border-none"
              >
                <td className="p-3 font-mono text-xs text-slate-600">
                  {capabilityKey}
                </td>
                {ROLES.map((role) => {
                  const entry = findEntry(capabilityKey, role);
                  if (!entry)
                    return (
                      <td key={role} className="p-3 text-center">
                        —
                      </td>
                    );
                  return (
                    <td key={role} className="p-3 text-center">
                      {/* 44px+ tappable label around the checkbox, not just the
                          20px input itself — accessibility/elderly touch target */}
                      <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          checked={entry.allowed}
                          onChange={() => handleToggle(entry)}
                          disabled={role === "owner"}
                          aria-label={`${capabilityKey} — ${roleLabel(role)}`}
                          className="h-5 w-5 accent-sky-400"
                        />
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
