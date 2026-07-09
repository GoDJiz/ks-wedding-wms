"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { TextInput } from "@/shared/ui/TextInput";
import { TextArea } from "@/shared/ui/TextArea";
import { Select } from "@/shared/ui/Select";
import { InlineError } from "@/shared/ui/StateViews";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import type { SelectOption } from "@/shared/lib/SelectOption";
import type {
  ReimbursementRequest,
  ReimbursementFileInfo,
} from "../domain/ReimbursementRequest";
import {
  approveReimbursement,
  rejectReimbursement,
  markReimbursementStatus,
} from "../application/adminReimbursementActions";

export function ReimbursementDetailPanel({
  projectId,
  request,
  files,
  fileUrls,
  isPossibleDuplicate,
  categories,
  accounts,
}: {
  projectId: string;
  request: ReimbursementRequest;
  files: ReimbursementFileInfo[];
  fileUrls: Record<string, string>;
  isPossibleDuplicate: boolean;
  categories: SelectOption[];
  accounts: SelectOption[];
}) {
  const { t, tError } = useLanguage();
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "approve" | "reject">("view");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [approvedAmount, setApprovedAmount] = useState(
    String(request.requestedAmount)
  );
  const [partialReason, setPartialReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPartial = Number(approvedAmount) !== request.requestedAmount;

  const methodLabel = {
    cash: t.reimbursementPublic.methodCash,
    bank_transfer: t.reimbursementPublic.methodBankTransfer,
    promptpay: t.reimbursementPublic.methodPromptpay,
    qr_payment: t.reimbursementPublic.methodQrPayment,
  }[request.paymentMethod];

  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await approveReimbursement({
        requestId: request.id,
        projectId,
        categoryId,
        paymentAccountId: accountId,
        approvedAmount: Number(approvedAmount),
        partialApprovalReason: isPartial ? partialReason : "",
      });
      if (result.ok) {
        router.refresh();
        setMode("view");
      } else {
        setError(tError(result.code));
      }
    });
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await rejectReimbursement({
        requestId: request.id,
        rejectReason,
      });
      if (result.ok) {
        router.refresh();
        setMode("view");
      } else {
        setError(tError(result.code));
      }
    });
  };

  const handleStatus = (status: "paid" | "completed" | "cancelled") => {
    setError(null);
    startTransition(async () => {
      const result = await markReimbursementStatus(request.id, status);
      if (result.ok) {
        router.refresh();
      } else {
        setError(tError(result.code));
      }
    });
  };

  return (
    <div className="space-y-4">
      <Link href="/reimbursement" className="text-sm text-sky-600 underline">
        ← {t.reimbursementAdmin.back}
      </Link>

      <div className="rounded-2xl bg-white/70 p-4">
        <p className="text-lg font-semibold text-slate-800">
          {request.requesterName}
        </p>
        <p className="text-sm text-slate-500">{request.phone}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">{t.expense.date}</p>
            <p className="font-medium text-slate-700">{request.purchaseDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">
              {t.reimbursementAdmin.requestedAmount}
            </p>
            <p className="font-medium text-slate-700">
              {formatCurrency(request.requestedAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">{t.expense.paymentMethod}</p>
            <p className="font-medium text-slate-700">{methodLabel}</p>
          </div>
          {request.approvedAmount !== null && (
            <div>
              <p className="text-xs text-slate-500">
                {t.reimbursementAdmin.approvedAmount}
              </p>
              <p className="font-medium text-slate-700">
                {formatCurrency(request.approvedAmount)}
              </p>
            </div>
          )}
        </div>
        {request.bankInfo && (
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
            {request.bankInfo}
          </p>
        )}
        {request.description && (
          <p className="mt-2 text-sm text-slate-600">{request.description}</p>
        )}
      </div>

      {isPossibleDuplicate && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ {t.reimbursementAdmin.duplicateWarning}
        </div>
      )}

      {files.length > 0 && (
        <div className="rounded-2xl bg-white/70 p-4">
          <p className="mb-2 text-sm font-medium text-slate-600">
            {t.reimbursementAdmin.viewFiles}
          </p>
          <div className="flex flex-wrap gap-2">
            {files.map((f) =>
              fileUrls[f.id] ? (
                <a
                  key={f.id}
                  href={fileUrls[f.id]}
                  target="_blank"
                  rel="noreferrer"
                  className="block h-20 w-20 overflow-hidden rounded-xl border border-sky-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fileUrls[f.id]}
                    alt={f.fileType}
                    className="h-full w-full object-cover"
                  />
                </a>
              ) : null
            )}
          </div>
        </div>
      )}

      {error && <InlineError message={error} />}

      {mode === "view" && request.status === "submitted" && (
        <div className="flex gap-2">
          <Button onClick={() => setMode("approve")} className="flex-1">
            {t.reimbursementAdmin.approve}
          </Button>
          <Button
            variant="danger"
            onClick={() => setMode("reject")}
            className="flex-1"
          >
            {t.reimbursementAdmin.reject}
          </Button>
        </div>
      )}

      {mode === "approve" && (
        <form
          onSubmit={handleApprove}
          className="space-y-3 rounded-2xl bg-white/70 p-4"
        >
          <FormField label={t.reimbursementAdmin.assignCategory}>
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t.reimbursementAdmin.assignAccount}>
            <Select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t.reimbursementAdmin.approvedAmount}>
            <TextInput
              type="number"
              step="0.01"
              min="0"
              value={approvedAmount}
              onChange={(e) => setApprovedAmount(e.target.value)}
            />
          </FormField>
          {isPartial && (
            <FormField label={t.reimbursementAdmin.partialReason}>
              <TextArea
                rows={2}
                value={partialReason}
                onChange={(e) => setPartialReason(e.target.value)}
                required
              />
            </FormField>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMode("view")}
              className="flex-1"
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? t.common.saving : t.reimbursementAdmin.approve}
            </Button>
          </div>
        </form>
      )}

      {mode === "reject" && (
        <form
          onSubmit={handleReject}
          className="space-y-3 rounded-2xl bg-white/70 p-4"
        >
          <FormField label={t.reimbursementAdmin.rejectReason}>
            <TextArea
              rows={2}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              required
            />
          </FormField>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMode("view")}
              className="flex-1"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? t.common.saving : t.reimbursementAdmin.reject}
            </Button>
          </div>
        </form>
      )}

      {mode === "view" && request.status === "approved" && (
        <Button
          onClick={() => handleStatus("paid")}
          disabled={isPending}
          className="w-full"
        >
          {t.reimbursementAdmin.markPaid}
        </Button>
      )}
      {mode === "view" && request.status === "paid" && (
        <Button
          onClick={() => handleStatus("completed")}
          disabled={isPending}
          className="w-full"
        >
          {t.reimbursementAdmin.markCompleted}
        </Button>
      )}
    </div>
  );
}
