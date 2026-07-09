"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { TextInput } from "@/shared/ui/TextInput";
import { Select } from "@/shared/ui/Select";
import { EmptyState, InlineError, PageSkeleton } from "@/shared/ui/StateViews";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import type { SelectOption } from "@/shared/lib/SelectOption";
import type { Income, IncomeType } from "../domain/Income";
import { getIncomes, createIncome } from "../application/incomeActions";

const TYPES: IncomeType[] = [
  "envelope",
  "transfer",
  "cash",
  "sponsor",
  "gift",
  "gold",
  "cheque",
  "other",
];

export function IncomePageClient({
  projectId,
  initialIncomes,
  initialTotalCount,
  pageSize,
  accounts,
}: {
  projectId: string;
  initialIncomes: Income[];
  initialTotalCount: number;
  pageSize: number;
  accounts: SelectOption[];
}) {
  const { t, tError } = useLanguage();
  const [incomes, setIncomes] = useState(initialIncomes);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [page, setPage] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<IncomeType>("envelope");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const typeLabel = (ty: IncomeType) =>
    ({
      envelope: t.income.typeEnvelope,
      transfer: t.income.typeTransfer,
      cash: t.income.typeCash,
      sponsor: t.income.typeSponsor,
      gift: t.income.typeGift,
      gold: t.income.typeGold,
      cheque: t.income.typeCheque,
      other: t.income.typeOther,
    })[ty];

  const fetchPage = (nextPage: number) => {
    setError(null);
    startTransition(async () => {
      const result = await getIncomes(projectId, nextPage);
      if (result.ok) {
        setIncomes(result.data.incomes);
        setTotalCount(result.data.totalCount);
        setPage(nextPage);
      } else {
        setError(tError(result.code));
      }
    });
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createIncome({
        projectId,
        paymentAccountId: accountId,
        type,
        amount,
        date,
      });
      if (result.ok) {
        setShowForm(false);
        setAmount("");
        fetchPage(0);
      } else {
        setError(tError(result.code));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm((s) => !s)}>
          {t.income.addIncome}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="space-y-3 rounded-2xl bg-white/70 p-4"
        >
          <FormField label={t.income.type}>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as IncomeType)}
            >
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {typeLabel(ty)}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t.income.amount}>
            <TextInput
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </FormField>
          <FormField label={t.income.date}>
            <TextInput
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormField>
          <FormField label={t.income.account}>
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
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? t.common.saving : t.common.save}
          </Button>
        </form>
      )}

      {error && <InlineError message={error} />}

      {isPending && !showForm ? (
        <PageSkeleton />
      ) : incomes.length === 0 ? (
        <EmptyState message={t.income.noIncome} />
      ) : (
        <>
          <ul className="space-y-2">
            {incomes.map((i) => (
              <li key={i.id} className="rounded-2xl bg-white/70 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">
                    {typeLabel(i.type)} {i.guestName ? `· ${i.guestName}` : ""}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatCurrency(i.amount)}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  {i.date} · {i.accountName}
                </p>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={() => fetchPage(page - 1)}
              disabled={page === 0 || isPending}
            >
              ←
            </Button>
            <span className="text-xs text-slate-500">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="secondary"
              onClick={() => fetchPage(page + 1)}
              disabled={page + 1 >= totalPages || isPending}
            >
              →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
