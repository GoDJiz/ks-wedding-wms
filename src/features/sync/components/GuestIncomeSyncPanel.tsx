"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { FormField } from "@/shared/ui/FormField";
import { Select } from "@/shared/ui/Select";
import { Button } from "@/shared/ui/Button";
import { InlineError } from "@/shared/ui/StateViews";
import type { GuestIncomeSyncConfig } from "../domain/SyncRun";
import { updateGuestIncomeSyncPaymentAccount } from "../application/syncActions";

/**
 * "Sync Guest to Income" section of /settings/integrations. The field
 * mapping itself (transfer_amount -> amount, guest_id, type: transfer,
 * date: today, source: manual) is fixed by the existing schema and shown
 * here only as a read-only Mapping Summary — the one thing an
 * administrator can actually configure is which Payment Account new/
 * updated income rows use. See src/shared/lib/guestIncomeSync.ts for where
 * this setting is read at sync time, and for why an unconfigured account
 * is a hard stop (descriptive error + "Pending"), never a guess.
 *
 * Selecting an account only updates local state and shows a Preview —
 * nothing is written until Save is pressed (see handleSave).
 */
export function GuestIncomeSyncPanel({
  projectId,
  initialConfig,
}: {
  projectId: string;
  initialConfig: GuestIncomeSyncConfig;
}) {
  const { t, tError } = useLanguage();

  // The account currently persisted in Settings — reflects server truth,
  // only changes after a successful Save. Drives the banner/status.
  const [savedAccountId, setSavedAccountId] = useState(
    initialConfig.paymentAccountId ?? ""
  );
  // The dropdown's current value — may differ from savedAccountId until
  // Save is pressed. Drives the Preview only.
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialConfig.paymentAccountId ?? ""
  );

  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isReady = savedAccountId !== "";
  const isDirty = selectedAccountId !== savedAccountId;
  const selectedAccount = initialConfig.paymentAccountOptions.find(
    (a) => a.id === selectedAccountId
  );

  const handleSave = () => {
    if (!selectedAccountId || !isDirty) return;
    setError(null);
    setSavedNotice(false);
    startTransition(async () => {
      const result = await updateGuestIncomeSyncPaymentAccount(
        projectId,
        selectedAccountId
      );
      if (!result.ok) {
        setError(tError(result.code));
        return;
      }
      setSavedAccountId(selectedAccountId);
      setSavedNotice(true);
    });
  };

  return (
    <div className="rounded-2xl bg-white/70 p-4">
      <p className="mb-3 text-sm font-medium text-slate-600">
        {t.sync.guestIncomeSyncTitle}
      </p>

      {!isReady && (
        <p
          role="alert"
          className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700"
        >
          {t.sync.guestIncomeBanner}
        </p>
      )}

      {/* Mapping Summary — documentation only, not editable. The only
          configurable value in this whole section is the dropdown below. */}
      <div className="mb-4 space-y-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-500">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {t.sync.guestIncomeMappingSummaryTitle}
        </p>
        <div className="text-center">
          <p>{t.sync.guestIncomeMappingRowGuestAmount}</p>
          <p aria-hidden>↓</p>
          <p>{t.sync.guestIncomeMappingRowIncomeAmount}</p>
        </div>
        <div className="text-center">
          <p>{t.sync.guestIncomeMappingRowGuestId}</p>
          <p aria-hidden>↓</p>
          <p>{t.sync.guestIncomeMappingRowIncomeGuestId}</p>
        </div>
        <div className="text-center">
          <p>{t.sync.guestIncomeMappingRowTypeLabel}</p>
          <p aria-hidden>↓</p>
          <p>{t.sync.guestIncomeMappingRowTypeValue}</p>
        </div>
      </div>

      <FormField label={t.sync.guestIncomePaymentAccount}>
        <Select
          value={selectedAccountId}
          disabled={isPending}
          onChange={(e) => {
            setSelectedAccountId(e.target.value);
            setSavedNotice(false);
            setError(null);
          }}
        >
          <option value="">
            {t.sync.guestIncomePaymentAccountPlaceholder}
          </option>
          {initialConfig.paymentAccountOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Preview — reflects the current dropdown selection, even if unsaved.
          No database write happens here; only handleSave writes anything. */}
      {selectedAccount && (
        <div className="mt-4 rounded-2xl bg-sky-50 p-3 text-sm text-slate-600">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {t.sync.guestIncomePreviewTitle}
          </p>
          <p className="mt-2 text-center">
            {t.sync.guestIncomePreviewFutureGuestTransfer}
          </p>
          <p className="text-center" aria-hidden>
            ↓
          </p>
          <p className="text-center font-medium">
            {t.sync.guestIncomePreviewIncome}
          </p>
          <p className="mt-2">
            {t.sync.guestIncomePreviewAmountLabel}:{" "}
            {t.sync.guestIncomePreviewAmountValue}
          </p>
          <p>
            {t.sync.guestIncomePreviewTypeLabel}:{" "}
            {t.sync.guestIncomePreviewTypeValue}
          </p>
          <p>
            {t.sync.guestIncomePreviewAccountLabel}: {selectedAccount.name}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending || !selectedAccountId || !isDirty}
        >
          {isPending ? t.common.saving : t.common.save}
        </Button>
        <p
          className={`text-sm font-medium ${
            isReady ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          {isReady
            ? t.sync.guestIncomeStatusReady
            : t.sync.guestIncomeStatusNotConfigured}
        </p>
      </div>

      {savedNotice && !error && (
        <p className="mt-1 text-xs text-slate-500">
          {t.common.savedSuccessfully}
        </p>
      )}
      {error && <InlineError message={error} />}
    </div>
  );
}
