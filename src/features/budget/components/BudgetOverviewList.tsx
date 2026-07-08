"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Button } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { TextInput } from "@/shared/ui/TextInput";
import { EmptyState, InlineError } from "@/shared/ui/StateViews";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import type { BudgetCategoryOverview } from "../domain/BudgetCategoryOverview";
import {
  createCategory,
  updateBudgetAmount,
} from "../application/budgetActions";

function CategoryRow({
  category,
  projectId,
  onSaved,
}: {
  category: BudgetCategoryOverview;
  projectId: string;
  onSaved: (categoryId: string, newBudgeted: number) => void;
}) {
  const { t, tError } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(category.budgetedAmount));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pct =
    category.budgetedAmount > 0
      ? Math.min(
          100,
          Math.round((category.spentAmount / category.budgetedAmount) * 100)
        )
      : category.spentAmount > 0
        ? 100
        : 0;

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateBudgetAmount({
        categoryId: category.categoryId,
        projectId,
        budgetedAmount: Number(value),
      });
      if (result.ok) {
        onSaved(category.categoryId, Number(value));
        setEditing(false);
      } else {
        setError(tError(result.code));
      }
    });
  };

  return (
    <li className="rounded-2xl bg-white/70 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-700">{category.name}</p>
          <p className="text-xs text-slate-500">
            {t.budget.spent}: {formatCurrency(category.spentAmount)} ·{" "}
            {t.budget.remaining}: {formatCurrency(category.remaining)}
          </p>
        </div>
        {category.isOverBudget && (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
            {t.budget.overBudget}
          </span>
        )}
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sky-100">
        <div
          className={`h-full rounded-full ${category.isOverBudget ? "bg-rose-400" : "bg-sky-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3">
        {editing ? (
          <div className="flex items-end gap-2">
            <FormField
              label={t.budget.budgeted}
              htmlFor={`budget-${category.categoryId}`}
            >
              <TextInput
                id={`budget-${category.categoryId}`}
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </FormField>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? t.common.saving : t.common.save}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              {t.common.cancel}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="min-h-10 text-sm font-medium text-sky-600 underline"
          >
            {t.budget.budgeted}: {formatCurrency(category.budgetedAmount)}
          </button>
        )}
        {error && (
          <div className="mt-2">
            <InlineError message={error} />
          </div>
        )}
      </div>
    </li>
  );
}

export function BudgetOverviewList({
  projectId,
  initialCategories,
}: {
  projectId: string;
  initialCategories: BudgetCategoryOverview[];
}) {
  const { t, tError } = useLanguage();
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const sortOrder = categories.length + 1;
      const result = await createCategory(
        { projectId, name: newName },
        sortOrder
      );
      if (!result.ok) {
        setError(tError(result.code));
        return;
      }
      setCategories((prev) => [
        ...prev,
        {
          categoryId: crypto.randomUUID(),
          name: newName,
          sortOrder,
          budgetedAmount: 0,
          spentAmount: 0,
          remaining: 0,
          isOverBudget: false,
        },
      ]);
      setNewName("");
    });
  };

  const handleSaved = (categoryId: string, newBudgeted: number) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.categoryId === categoryId
          ? {
              ...c,
              budgetedAmount: newBudgeted,
              remaining: newBudgeted - c.spentAmount,
              isOverBudget: c.spentAmount > newBudgeted,
            }
          : c
      )
    );
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAddCategory}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-[200px] flex-1">
          <FormField label={t.budget.categoryName} htmlFor="new-category">
            <TextInput
              id="new-category"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </FormField>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? t.common.saving : t.budget.addCategory}
        </Button>
      </form>

      {error && <InlineError message={error} />}

      {categories.length === 0 ? (
        <EmptyState message={t.budget.noCategories} />
      ) : (
        <ul className="space-y-3">
          {categories.map((c) => (
            <CategoryRow
              key={c.categoryId}
              category={c}
              projectId={projectId}
              onSaved={handleSaved}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
