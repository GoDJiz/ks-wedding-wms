import type { ActivityEntry } from "../domain/ActivityEntry";
import { EmptyState } from "@/shared/ui/StateViews";
import type { Dictionary } from "@/lib/i18n/types";

const actionIcon: Record<ActivityEntry["action"], string> = {
  insert: "➕",
  update: "✏️",
  delete: "🗑️",
};

export function ActivityFeedList({
  entries,
  t,
}: {
  entries: ActivityEntry[];
  t: Dictionary;
}) {
  if (entries.length === 0) {
    return <EmptyState message={t.activity.noActivity} />;
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-start gap-3 rounded-2xl bg-white/70 px-4 py-3"
        >
          <span className="text-lg">{actionIcon[entry.action]}</span>
          <div>
            <p className="text-sm text-slate-700">
              <span className="font-medium">
                {entry.actorEmail ?? "System"}
              </span>{" "}
              <span className="text-slate-500">
                {entry.action === "insert"
                  ? "created"
                  : entry.action === "update"
                    ? "updated"
                    : "deleted"}
              </span>{" "}
              <span className="font-mono text-xs text-slate-500">
                {entry.tableName}
              </span>
            </p>
            <p className="text-xs text-slate-400">
              {new Date(entry.createdAt).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
