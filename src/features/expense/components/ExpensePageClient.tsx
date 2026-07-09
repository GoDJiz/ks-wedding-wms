"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";
import { InlineError, PageSkeleton } from "@/shared/ui/StateViews";
import type { Expense } from "../domain/Expense";
import type { SelectOption } from "@/shared/lib/SelectOption";
import { getExpenses } from "../application/expenseActions";
import { ExpenseList } from "./ExpenseList";
import { ExpenseForm } from "./ExpenseForm";

export function ExpensePageClient({
  projectId,
  initialExpenses,
  initialTotalCount,
  pageSize,
  categories,
  accounts,
  vendors,
}: {
  projectId: string;
  initialExpenses: Expense[];
  initialTotalCount: number;
  pageSize: number;
  categories: SelectOption[];
  accounts: SelectOption[];
  vendors: SelectOption[];
}) {
  const { t, tError } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const fetchPage = (nextPage: number) => {
    setError(null);
    startTransition(async () => {
      const result = await getExpenses(projectId, nextPage);
      if (result.ok) {
        setExpenses(result.data.expenses);
        setTotalCount(result.data.totalCount);
        setPage(nextPage);
      } else {
        setError(tError(result.code));
      }
    });
  };

  if (showForm) {
    return (
      <ExpenseForm
        projectId={projectId}
        categories={categories}
        accounts={accounts}
        vendors={vendors}
        onCreated={() => {
          setShowForm(false);
          fetchPage(0); // re-fetch fresh data from the server, not stale props
        }}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>
          {t.expense.addExpense}
        </Button>
      </div>

      {error && <InlineError message={error} />}

      {isPending ? (
        <PageSkeleton />
      ) : (
        <ExpenseList
          expenses={expenses}
          page={page}
          totalPages={totalPages}
          isLoading={isPending}
          onPageChange={fetchPage}
        />
      )}
    </div>
  );
}
