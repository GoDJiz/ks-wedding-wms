"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { EmptyState, InlineError, PageSkeleton } from "@/shared/ui/StateViews";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import type {
  ReimbursementRequest,
  ReimbursementStatus,
} from "../domain/ReimbursementRequest";
import { getReimbursements } from "../application/adminReimbursementActions";

const TABS: (ReimbursementStatus | "all")[] = [
  "all",
  "submitted",
  "approved",
  "paid",
  "completed",
  "rejected",
];

export function ReimbursementAdminList({
  initialRequests,
}: {
  initialRequests: ReimbursementRequest[];
}) {
  const { t, tError } = useLanguage();
  const [tab, setTab] = useState<ReimbursementStatus | "all">("all");
  const [requests, setRequests] = useState(initialRequests);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tabLabel = (s: ReimbursementStatus | "all") =>
    ({
      all: t.reimbursementAdmin.statusAll,
      submitted: t.reimbursementAdmin.statusSubmitted,
      pending_approval: t.reimbursementAdmin.statusSubmitted,
      approved: t.reimbursementAdmin.statusApproved,
      rejected: t.reimbursementAdmin.statusRejected,
      paid: t.reimbursementAdmin.statusPaid,
      completed: t.reimbursementAdmin.statusCompleted,
      cancelled: t.reimbursementAdmin.statusCancelled,
    })[s];

  const statusBadgeColor = (s: ReimbursementStatus) =>
    ({
      submitted: "bg-amber-100 text-amber-700",
      pending_approval: "bg-amber-100 text-amber-700",
      approved: "bg-sky-100 text-sky-700",
      rejected: "bg-rose-100 text-rose-700",
      paid: "bg-emerald-100 text-emerald-700",
      completed: "bg-emerald-100 text-emerald-700",
      cancelled: "bg-slate-100 text-slate-500",
    })[s];

  const handleTabChange = (nextTab: ReimbursementStatus | "all") => {
    setTab(nextTab);
    setError(null);
    startTransition(async () => {
      const result = await getReimbursements(nextTab);
      if (result.ok) {
        setRequests(result.data);
      } else {
        setError(tError(result.code));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((s) => (
          <button
            key={s}
            onClick={() => handleTabChange(s)}
            className={`min-h-10 whitespace-nowrap rounded-full px-4 text-sm font-medium transition ${
              tab === s ? "bg-sky-400 text-white" : "bg-sky-100 text-slate-600"
            }`}
          >
            {tabLabel(s)}
          </button>
        ))}
      </div>

      {error && <InlineError message={error} />}

      {isPending ? (
        <PageSkeleton />
      ) : requests.length === 0 ? (
        <EmptyState message={t.reimbursementAdmin.noRequests} />
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/reimbursement/${r.id}`}
                className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-4 hover:bg-white"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {r.requesterName}
                  </p>
                  <p className="text-xs text-slate-500">{r.purchaseDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">
                    {formatCurrency(r.approvedAmount ?? r.requestedAmount)}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeColor(r.status)}`}
                  >
                    {tabLabel(r.status)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
