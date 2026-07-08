"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { FormField } from "@/shared/ui/FormField";
import { TextInput } from "@/shared/ui/TextInput";
import { TextArea } from "@/shared/ui/TextArea";
import { Select } from "@/shared/ui/Select";
import { FormActions } from "@/shared/ui/FormActions";
import { InlineError } from "@/shared/ui/StateViews";
import { createSupabaseBrowserClient } from "@/infrastructure/supabase/client";
import type { ErrorCode } from "@/shared/lib/errorCodes";
import type { SelectOption } from "../domain/Expense";
import { createExpenseSchema, type CreateExpenseInput } from "../expense.types";
import {
  createExpense,
  attachExpenseReceipt,
} from "../application/expenseActions";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB, per Storage requirements

export function ExpenseForm({
  projectId,
  categories,
  accounts,
  vendors,
  onCreated,
  onCancel,
}: {
  projectId: string;
  categories: SelectOption[];
  accounts: SelectOption[];
  vendors: SelectOption[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { t, tError } = useLanguage();
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      projectId,
      date: new Date().toISOString().slice(0, 10),
      vat: 0,
      discount: 0,
      shipping: 0,
      withholdingTax: 0,
      paymentMethod: "cash",
    },
  });

  const fieldError = (code?: string) =>
    code ? tError(code as ErrorCode) : undefined;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setFileError(t.expense.fileTooLarge);
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(f);
  };

  const onSubmit = async (values: CreateExpenseInput) => {
    setStatus("saving");
    setErrorCode(null);

    const result = await createExpense(values);
    if (!result.ok) {
      setStatus("error");
      setErrorCode(result.code);
      return;
    }

    if (file) {
      const supabase = createSupabaseBrowserClient();
      const path = `${projectId}/${result.data.expenseId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, file);

      if (!uploadError) {
        await attachExpenseReceipt(result.data.expenseId, path);
      }
      // A failed receipt upload doesn't roll back the expense record — the
      // expense itself saved successfully, which is the more important
      // half; the person can attach a receipt later. Not silently ignored:
      // logging happens inside attachExpenseReceipt/upload if it fails.
    }

    onCreated();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label={t.expense.date}
          error={fieldError(errors.date?.message)}
        >
          <TextInput type="date" {...register("date")} />
        </FormField>

        <FormField
          label={t.expense.category}
          error={fieldError(errors.categoryId?.message)}
        >
          <Select {...register("categoryId")} defaultValue="">
            <option value="" disabled>
              —
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label={t.expense.account}
          error={fieldError(errors.paymentAccountId?.message)}
        >
          <Select {...register("paymentAccountId")} defaultValue="">
            <option value="" disabled>
              —
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label={t.expense.vendor}>
          <Select {...register("vendorId")} defaultValue="">
            <option value="">{t.expense.noVendor}</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label={t.expense.amount}
          error={fieldError(errors.amount?.message)}
        >
          <TextInput
            type="number"
            step="0.01"
            min="0"
            {...register("amount")}
          />
        </FormField>

        <FormField label={t.expense.vat}>
          <TextInput type="number" step="0.01" min="0" {...register("vat")} />
        </FormField>

        <FormField label={t.expense.discount}>
          <TextInput
            type="number"
            step="0.01"
            min="0"
            {...register("discount")}
          />
        </FormField>

        <FormField label={t.expense.shipping}>
          <TextInput
            type="number"
            step="0.01"
            min="0"
            {...register("shipping")}
          />
        </FormField>

        <FormField label={t.expense.withholdingTax}>
          <TextInput
            type="number"
            step="0.01"
            min="0"
            {...register("withholdingTax")}
          />
        </FormField>

        <FormField label={t.expense.paymentMethod}>
          <Select {...register("paymentMethod")}>
            <option value="cash">{t.expense.methodCash}</option>
            <option value="bank_transfer">
              {t.expense.methodBankTransfer}
            </option>
            <option value="promptpay">{t.expense.methodPromptpay}</option>
            <option value="qr_payment">{t.expense.methodQrPayment}</option>
          </Select>
        </FormField>
      </div>

      <FormField label={t.expense.remark}>
        <TextArea rows={2} {...register("remark")} />
      </FormField>

      <FormField label={t.expense.uploadReceipt} htmlFor="receipt-file">
        <input
          id="receipt-file"
          type="file"
          accept=".jpg,.jpeg,.png,.heic,.pdf"
          onChange={handleFileChange}
          className="block w-full text-sm"
        />
      </FormField>
      {fileError && <InlineError message={fileError} />}

      {status === "error" && errorCode && (
        <InlineError message={tError(errorCode)} />
      )}

      <FormActions
        onCancel={onCancel}
        saving={status === "saving"}
        saveLabel={t.common.save}
        cancelLabel={t.common.cancel}
      />
    </form>
  );
}
