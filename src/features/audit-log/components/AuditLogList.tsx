import type { AuditLogEntry } from "../domain/AuditLogEntry";
import { EmptyState } from "@/shared/ui/StateViews";

export function AuditLogList({
  entries,
  labels,
}: {
  entries: AuditLogEntry[];
  labels: {
    noEntries: string;
    who: string;
    when: string;
    action: string;
    table: string;
  };
}) {
  if (entries.length === 0) {
    return <EmptyState message={labels.noEntries} />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white/70">
      <table className="w-full min-w-[500px] text-left text-sm">
        <thead>
          <tr className="border-b border-sky-100 text-slate-500">
            <th className="p-3 font-medium">{labels.when}</th>
            <th className="p-3 font-medium">{labels.who}</th>
            <th className="p-3 font-medium">{labels.action}</th>
            <th className="p-3 font-medium">{labels.table}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-sky-50 last:border-none"
            >
              <td className="p-3 text-xs text-slate-500">
                {new Date(entry.createdAt).toLocaleString()}
              </td>
              <td className="p-3 text-slate-700">{entry.userEmail ?? "—"}</td>
              <td className="p-3 capitalize text-slate-700">{entry.action}</td>
              <td className="p-3 font-mono text-xs text-slate-600">
                {entry.tableName}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
