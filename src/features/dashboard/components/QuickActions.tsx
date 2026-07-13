"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";
import type { ActionResult } from "@/shared/lib/actionResult";

// Minimal shape QuickActions actually needs from a sync result — avoids
// importing the sync feature's full domain types just for this button.
type SyncAction = (
  projectId: string,
  dryRun?: boolean
) => Promise<ActionResult<{ rowsInserted: number; rowsUpdated: number }>>;

export function QuickActions({
  projectId,
  syncAction,
}: {
  projectId: string;
  syncAction: SyncAction;
}) {
  const { t, tError } = useLanguage();
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/r/${projectId}`;
    await navigator.clipboard.writeText(url);
    setStatus(t.dashboard.linkCopied);
    setTimeout(() => setStatus(null), 2000);
  };

  const handleSyncNow = () => {
    setStatus(null);
    startTransition(async () => {
      const result = await syncAction(projectId, false);
      if (result.ok) {
        setStatus(
          `${result.data.rowsInserted + result.data.rowsUpdated} guests synced`
        );
      } else {
        setStatus(tError(result.code));
      }
    });
  };

  return (
    <div className="rounded-2xl bg-white/70 p-4">
      <p className="mb-3 text-sm font-medium text-slate-600">
        {t.dashboard.quickActions}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Link
          href="/expense"
          className="min-h-14 rounded-2xl bg-sky-100 px-3 py-3 text-center text-sm font-medium text-slate-700 hover:bg-sky-200 flex items-center justify-center"
        >
          ➕ {t.dashboard.quickAddExpense}
        </Link>
        <Link
          href="/guests"
          className="min-h-14 rounded-2xl bg-sky-100 px-3 py-3 text-center text-sm font-medium text-slate-700 hover:bg-sky-200 flex items-center justify-center"
        >
          👤 {t.dashboard.quickAddGuest}
        </Link>
        <Link
          href="/income"
          className="min-h-14 rounded-2xl bg-sky-100 px-3 py-3 text-center text-sm font-medium text-slate-700 hover:bg-sky-200 flex items-center justify-center"
        >
          💰 {t.dashboard.quickAddIncome}
        </Link>
        <Button
          variant="secondary"
          onClick={handleCopyLink}
          className="min-h-14"
        >
          🔗 {t.dashboard.quickReimbursementLink}
        </Button>
        <Button
          variant="secondary"
          onClick={handleSyncNow}
          disabled={isPending}
          className="min-h-14"
        >
          🔄 {t.dashboard.quickSync}
        </Button>
      </div>
      {status && <p className="mt-2 text-xs text-emerald-600">{status}</p>}
    </div>
  );
}
