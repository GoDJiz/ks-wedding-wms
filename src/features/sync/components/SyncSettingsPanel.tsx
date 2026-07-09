"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { TextInput } from "@/shared/ui/TextInput";
import { EmptyState, InlineError } from "@/shared/ui/StateViews";
import type { SyncSettings, SyncRunSummary } from "../domain/SyncRun";
import {
  updateCsvUrl,
  updateFieldMapping,
  setAllowOverwrite,
  triggerGuestSync,
} from "../application/syncActions";

export function SyncSettingsPanel({
  projectId,
  initialSettings,
  initialRuns,
}: {
  projectId: string;
  initialSettings: SyncSettings;
  initialRuns: SyncRunSummary[];
}) {
  const { t, tError } = useLanguage();
  const [csvUrl, setCsvUrl] = useState(initialSettings.csvUrl ?? "");
  const [mappings, setMappings] = useState(initialSettings.fieldMappings);
  const [allowOverwrite, setAllowOverwriteState] = useState(
    initialSettings.allowOverwriteManual
  );
  const [runs, setRuns] = useState(initialRuns);
  const [lastSummary, setLastSummary] = useState<SyncRunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const statusLabel = (s: SyncRunSummary["status"]) =>
    ({
      success: t.sync.statusSuccess,
      partial: t.sync.statusPartial,
      failed: t.sync.statusFailed,
    })[s];

  const statusColor = (s: SyncRunSummary["status"]) =>
    ({
      success: "bg-emerald-100 text-emerald-700",
      partial: "bg-amber-100 text-amber-700",
      failed: "bg-rose-100 text-rose-700",
    })[s];

  const handleSaveCsvUrl = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateCsvUrl(projectId, csvUrl);
      if (!result.ok) setError(tError(result.code));
    });
  };

  const handleMappingChange = (id: string, sourceField: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, sourceField } : m))
    );
  };

  const handleMappingBlur = (id: string, sourceField: string) => {
    startTransition(async () => {
      await updateFieldMapping(id, sourceField);
    });
  };

  const handleToggleOverwrite = () => {
    const next = !allowOverwrite;
    setAllowOverwriteState(next);
    startTransition(async () => {
      const result = await setAllowOverwrite(projectId, next);
      if (!result.ok) {
        setAllowOverwriteState(!next);
        setError(tError(result.code));
      }
    });
  };

  const handleSyncNow = () => {
    setError(null);
    setLastSummary(null);
    startTransition(async () => {
      const result = await triggerGuestSync(projectId);
      if (result.ok) {
        setLastSummary(result.data);
        setRuns((prev) => [result.data, ...prev].slice(0, 10));
      } else {
        setError(tError(result.code));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl bg-white/70 p-4">
        <FormField label={t.sync.csvUrl}>
          <TextInput
            value={csvUrl}
            onChange={(e) => setCsvUrl(e.target.value)}
            onBlur={handleSaveCsvUrl}
            placeholder="https://docs.google.com/.../pub?output=csv"
          />
        </FormField>

        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={allowOverwrite}
            onChange={handleToggleOverwrite}
            className="h-5 w-5 accent-sky-400"
          />
          {t.sync.allowOverwrite}
        </label>

        <Button onClick={handleSyncNow} disabled={isPending} className="w-full">
          {isPending ? t.sync.syncing : t.sync.syncNow}
        </Button>

        {error && <InlineError message={error} />}

        {lastSummary && (
          <div className="rounded-2xl bg-sky-50 p-3 text-sm">
            <span
              className={`mb-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(lastSummary.status)}`}
            >
              {statusLabel(lastSummary.status)}
            </span>
            <div className="grid grid-cols-2 gap-1 text-xs text-slate-600 sm:grid-cols-4">
              <span>
                {t.sync.summaryProcessed}: {lastSummary.rowsProcessed}
              </span>
              <span>
                {t.sync.summaryInserted}: {lastSummary.rowsInserted}
              </span>
              <span>
                {t.sync.summaryUpdated}: {lastSummary.rowsUpdated}
              </span>
              <span>
                {t.sync.summarySkipped}: {lastSummary.rowsSkipped}
              </span>
              <span>
                {t.sync.summaryFailed}: {lastSummary.rowsFailed}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white/70 p-4">
        <p className="mb-2 text-sm font-medium text-slate-600">
          {t.sync.fieldMapping}
        </p>
        <div className="space-y-2">
          {mappings.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="w-32 shrink-0 text-xs text-slate-500">
                {m.targetField}
              </span>
              <TextInput
                value={m.sourceField}
                onChange={(e) => handleMappingChange(m.id, e.target.value)}
                onBlur={(e) => handleMappingBlur(m.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-600">
          {t.sync.lastRuns}
        </p>
        {runs.length === 0 ? (
          <EmptyState message={t.sync.noRuns} />
        ) : (
          <ul className="space-y-2">
            {runs.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl bg-white/70 px-4 py-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(r.status)}`}
                  >
                    {statusLabel(r.status)}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(r.startedAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {t.sync.summaryProcessed}: {r.rowsProcessed} ·{" "}
                  {t.sync.summaryInserted}: {r.rowsInserted} ·{" "}
                  {t.sync.summaryUpdated}: {r.rowsUpdated} ·{" "}
                  {t.sync.summarySkipped}: {r.rowsSkipped} ·{" "}
                  {t.sync.summaryFailed}: {r.rowsFailed}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
