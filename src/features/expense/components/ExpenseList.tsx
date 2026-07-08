"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/StateViews";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import type { Expense } from "../domain/Expense";

export function ExpenseList({
  expenses,
  page,
  totalPages,
  isLoading,
  onPageChange,
}: {
  expenses: Expense[];
  page: number;
  totalPages: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}) {
  const { t } = useLanguage();

  const methodLabel = (m: Expense["paymentMethod"]) =>
    ({
      cash: t.expense.methodCash,
      bank_transfer: t.expense.methodBankTransfer,
      promptpay: t.expense.methodPromptpay,
      qr_payment: t.expense.methodQrPayment,
    })[m];

  if (expenses.length === 0) {
    return <EmptyState message={t.expense.noExpenses} />;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl bg-white/70">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-sky-100 text-slate-500">
              <th className="p-3 font-medium">{t.expense.date}</th>
              <th className="p-3 font-medium">{t.expense.category}</th>
              <th className="p-3 font-medium">{t.expense.vendor}</th>
              <th className="p-3 font-medium">{t.expense.account}</th>
              <th className="p-3 font-medium">{t.expense.paymentMethod}</th>
              <th className="p-3 text-right font-medium">
                {t.expense.netTotal}
              </th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr
                key={e.id}
                className="border-b border-sky-50 last:border-none"
              >
                <td className="p-3 text-xs text-slate-500">{e.date}</td>
                <td className="p-3 text-slate-700">{e.categoryName}</td>
                <td className="p-3 text-slate-700">
                  {e.vendorName ?? t.expense.noVendor}
                </td>
                <td className="p-3 text-slate-700">{e.paymentAccountName}</td>
                <td className="p-3 text-xs text-slate-500">
                  {methodLabel(e.paymentMethod)}
                </td>
                <td className="p-3 text-right font-medium text-slate-800">
                  {formatCurrency(e.netTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0 || isLoading}
        >
          ←
        </Button>
        <span className="text-xs text-slate-500">
          {page + 1} / {totalPages}
        </span>
        <Button
          variant="secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page + 1 >= totalPages || isLoading}
        >
          →
        </Button>
      </div>
    </div>
  );
}
