"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { TextInput } from "@/shared/ui/TextInput";
import { EmptyState, InlineError } from "@/shared/ui/StateViews";
import type { SyncSettings, SyncRunSummary } from "../domain/SyncRun";
import type { SyncMetadata } from "../infrastructure/syncRepository";
import type { PreviewItem } from "../infrastructure/csvGuestSync";
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
  initialMetadata,
}: {
  projectId: string;
  initialSettings: SyncSettings;
  initialRuns: SyncRunSummary[];
  initialMetadata: SyncMetadata;
}) {
  const { t, tError } = useLanguage();
  const [csvUrl, setCsvUrl] = useState(initialSettings.csvUrl ?? "");
  const [mappings, setMappings] = useState(initialSettings.fieldMappings);
  const [allowOverwrite, setAllowOverwriteState] = useState(
    initialSettings.allowOverwriteManual
  );
  const [runs, setRuns] = useState(initialRuns);
  const [metadata, setMetadata] = useState(initialMetadata);
  const [lastSummary, setLastSummary] = useState<
    (SyncRunSummary & { preview: PreviewItem[] }) | null
  >(null);
  const [isDryRunResult, setIsDryRunResult] = useState(false);
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
  const actionLabel = (a: PreviewItem["action"]) =>
    ({
      insert: t.sync.actionInsert,
      update: t.sync.actionUpdate,
      skip: t.sync.actionSkip,
      fail: t.sync.actionFail,
    })[a];
  const actionColor = (a: PreviewItem["action"]) =>
    ({
      insert: "text-emerald-600",
      update: "text-sky-600",
      skip: "text-amber-600",
      fail: "text-rose-600",
    })[a];

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

  const runSync = (dryRun: boolean) => {
    setError(null);
    setLastSummary(null);
    setIsDryRunResult(dryRun);
    startTransition(async () => {
      const result = await triggerGuestSync(projectId, dryRun);
      if (result.ok) {
        setLastSummary(result.data);
        if (!dryRun) {
          setRuns((prev) => [result.data, ...prev].slice(0, 10));
          setMetadata((prev) => ({
            lastSuccessfulSync:
              result.data.status !== "failed"
                ? result.data.startedAt
                : prev.lastSuccessfulSync,
            lastAttemptedSync: result.data.startedAt,
            totalRowsProcessed:
              prev.totalRowsProcessed + result.data.rowsProcessed,
            currentCsvHash: prev.currentCsvHash,
          }));
        }
      } else {
        setError(tError(result.code));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white/70 p-4">
        <p className="mb-2 text-sm font-medium text-slate-600">
          {t.sync.metadataTitle}
        </p>
        <div className="grid grid-cols-1 gap-2 text-xs text-slate-600 sm:grid-cols-2">
          <span>
            {t.sync.lastSuccessfulSync}:{" "}
            {metadata.lastSuccessfulSync
              ? new Date(metadata.lastSuccessfulSync).toLocaleString()
              : t.sync.never}
          </span>
          <span>
            {t.sync.lastAttemptedSync}:{" "}
            {metadata.lastAttemptedSync
              ? new Date(metadata.lastAttemptedSync).toLocaleString()
              : t.sync.never}
          </span>
          <span>
            {t.sync.totalRowsProcessed}: {metadata.totalRowsProcessed}
          </span>
          <span className="font-mono">
            {t.sync.currentCsvVersion}: {metadata.currentCsvHash ?? "—"}
          </span>
        </div>
      </div>

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

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => runSync(true)}
            disabled={isPending}
            className="flex-1"
          >
            {isPending && isDryRunResult ? t.sync.syncing : t.sync.dryRun}
          </Button>
          <Button
            onClick={() => runSync(false)}
            disabled={isPending}
            className="flex-1"
          >
            {isPending && !isDryRunResult ? t.sync.syncing : t.sync.syncNow}
          </Button>
        </div>

        {error && <InlineError message={error} />}

        {lastSummary && (
          <div className="rounded-2xl bg-sky-50 p-3 text-sm">
            <div className="mb-2 flex items-center gap-2">
              {isDryRunResult && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {t.sync.dryRun}
                </span>
              )}
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(lastSummary.status)}`}
              >
                {statusLabel(lastSummary.status)}
              </span>
            </div>
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

            {lastSummary.preview.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-slate-600">
                  {t.sync.dryRunPreview}
                </p>
                <div className="max-h-64 overflow-y-auto rounded-xl bg-white">
                  <table className="w-full text-left text-xs">
                    <tbody>
                      {lastSummary.preview.map((p, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-sky-50 last:border-none"
                        >
                          <td className="px-2 py-1 text-slate-400">#{p.row}</td>
                          <td className="px-2 py-1 text-slate-700">{p.name}</td>
                          <td
                            className={`px-2 py-1 font-medium ${actionColor(p.action)}`}
                          >
                            {actionLabel(p.action)}
                          </td>
                          <td className="px-2 py-1 text-slate-400">
                            {p.reason ?? ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
