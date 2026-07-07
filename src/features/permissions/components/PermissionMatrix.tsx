"use client";

import { useState, useTransition } from "react";
import type { PermissionEntry } from "../permissions.types";
import { ROLES } from "../permissions.types";
import { togglePermission } from "../application/permissionsActions";

export function PermissionMatrix({
  initialEntries,
}: {
  initialEntries: PermissionEntry[];
}) {
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
        setError(result.message);
        // revert on failure
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, allowed: entry.allowed } : e
          )
        );
      }
    });
  };

  if (capabilityKeys.length === 0) {
    return (
      <p className="text-sm text-slate-400">No permissions configured yet.</p>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="overflow-x-auto rounded-2xl bg-white/70">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-sky-100">
              <th className="p-3 font-medium text-slate-500">Capability</th>
              {ROLES.map((role) => (
                <th
                  key={role}
                  className="p-3 text-center font-medium text-slate-500 capitalize"
                >
                  {role}
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
                      <input
                        type="checkbox"
                        checked={entry.allowed}
                        onChange={() => handleToggle(entry)}
                        disabled={role === "owner"} // Owner is always fully permitted
                        className="h-5 w-5 accent-sky-400"
                      />
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
