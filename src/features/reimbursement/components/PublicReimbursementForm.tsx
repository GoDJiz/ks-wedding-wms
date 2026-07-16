"use client";

import { useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { FormField } from "@/shared/ui/FormField";
import { TextInput } from "@/shared/ui/TextInput";
import { TextArea } from "@/shared/ui/TextArea";
import { Button } from "@/shared/ui/Button";
import { InlineError } from "@/shared/ui/StateViews";
import { createSupabaseBrowserClient } from "@/infrastructure/supabase/client";
import type { ErrorCode } from "@/shared/lib/errorCodes";
import type { PublicProjectInfo } from "../infrastructure/publicProjectRepository";
import {
  publicSubmitFormSchema,
  type PublicSubmitInput,
} from "../reimbursement.types";
import { submitReimbursement } from "../application/publicReimbursementActions";
import { PaymentMethodPicker } from "./PaymentMethodPicker";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB, per Storage requirements

type Status = "idle" | "uploading" | "submitting" | "success" | "error";

export function PublicReimbursementForm({
  project,
}: {
  project: PublicProjectInfo;
}) {
  const { t, tError } = useLanguage();
  const [status, setStatus] = useState<Status>("idle");
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [referenceCode, setReferenceCode] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PublicSubmitInput>({
    resolver: zodResolver(publicSubmitFormSchema),
    defaultValues: {
      projectId: project.id,
      purchaseDate: new Date().toISOString().slice(0, 10),
      paymentMethod: "cash",
    },
  });

  const paymentMethod = useWatch({ control, name: "paymentMethod" });
  const fieldError = (code?: string) =>
    code ? tError(code as ErrorCode) : undefined;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const oversized = selected.find((f) => f.size > MAX_BYTES);
    if (oversized) {
      setFileError(t.expense.fileTooLarge);
      return;
    }
    setFileError(null);
    setFiles(selected);
  };

  const onSubmit = async (values: PublicSubmitInput) => {
    if (files.length === 0) {
      setFileError(tError("receipt_required"));
      return;
    }

    setStatus("uploading");
    setErrorCode(null);

    const supabase = createSupabaseBrowserClient();
    const filePaths: string[] = [];

    for (const file of files) {
      const path = `${project.id}/reimbursements/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(values.paymentMethod === "bank_transfer" ? "slips" : "receipts")
        .upload(path, file);

      if (uploadError) {
        setStatus("error");
        setErrorCode("unknown_error");
        return;
      }
      filePaths.push(path);
    }

    setStatus("submitting");
    const result = await submitReimbursement({ ...values, filePaths });

    if (!result.ok) {
      setStatus("error");
      setErrorCode(result.code);
      return;
    }

    setReferenceCode(result.data.referenceCode);
    setStatus("success");
  };

  const handleReset = () => {
    reset();
    setFiles([]);
    setFileError(null);
    setStatus("idle");
    setReferenceCode(null);
  };

  if (status === "success") {
    return (
      <div className="mx-auto max-w-sm rounded-3xl bg-white/80 p-8 text-center shadow-sm backdrop-blur">
        <p className="text-4xl">✅</p>
        <h1 className="mt-3 text-xl font-semibold text-slate-800">
          {t.reimbursementPublic.successTitle}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t.reimbursementPublic.successMessage}
        </p>
        <p className="mt-4 rounded-2xl bg-sky-50 py-3 text-sm text-slate-500">
          {t.reimbursementPublic.referenceCode}:{" "}
          <span className="font-mono font-semibold text-slate-700">
            {referenceCode}
          </span>
        </p>
        <Button className="mt-6 w-full" onClick={handleReset}>
          {t.reimbursementPublic.addAnother}
        </Button>
      </div>
    );
  }

  const uploadLabel =
    paymentMethod === "bank_transfer"
      ? t.reimbursementPublic.uploadPhotoTransfer
      : t.reimbursementPublic.uploadPhotoCash;

  const isBusy = status === "uploading" || status === "submitting";

  return (
    <div className="mx-auto max-w-sm">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-slate-800">
          {t.reimbursementPublic.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t.reimbursementPublic.subtitle}
        </p>
        {(project.brideName || project.groomName) && (
          <p className="mt-1 text-xs text-slate-400">
            {project.brideName} & {project.groomName}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-24">
        <FormField
          label={t.reimbursementPublic.requesterName}
          error={fieldError(errors.requesterName?.message)}
        >
          <TextInput {...register("requesterName")} autoComplete="name" />
        </FormField>

        <FormField
          label={t.reimbursementPublic.phone}
          error={fieldError(errors.phone?.message)}
        >
          <TextInput type="tel" {...register("phone")} autoComplete="tel" />
        </FormField>

        <FormField
          label={t.reimbursementPublic.purchaseDate}
          error={fieldError(errors.purchaseDate?.message)}
        >
          <TextInput type="date" {...register("purchaseDate")} />
        </FormField>

        <FormField
          label={t.reimbursementPublic.amount}
          error={fieldError(errors.requestedAmount?.message)}
        >
          <TextInput
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className="text-lg font-semibold"
            {...register("requestedAmount")}
          />
        </FormField>

        <FormField label={t.reimbursementPublic.paymentMethod}>
          <Controller
            control={control}
            name="paymentMethod"
            render={({ field }) => (
              <PaymentMethodPicker
                value={field.value}
                onChange={field.onChange}
                labels={{
                  cash: t.reimbursementPublic.methodCash,
                  bank_transfer: t.reimbursementPublic.methodBankTransfer,
                  promptpay: t.reimbursementPublic.methodPromptpay,
                  qr_payment: t.reimbursementPublic.methodQrPayment,
                }}
              />
            )}
          />
        </FormField>

        {paymentMethod === "bank_transfer" && (
          <FormField
            label={t.reimbursementPublic.bankInfo}
            error={fieldError(errors.bankInfo?.message)}
          >
            <TextArea rows={2} {...register("bankInfo")} />
          </FormField>
        )}

        <FormField label={t.reimbursementPublic.description}>
          <TextInput {...register("description")} />
        </FormField>

        <FormField label={uploadLabel} htmlFor="reimbursement-files">
          <input
            id="reimbursement-files"
            type="file"
            accept=".jpg,.jpeg,.png,.heic,.pdf"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm"
          />
          {files.length > 0 && (
            <p className="mt-1 text-xs text-emerald-600">
              {files.length} {files.length === 1 ? "file" : "files"} selected
            </p>
          )}
        </FormField>
        {fileError && <InlineError message={fileError} />}

        {status === "error" && errorCode && (
          <InlineError message={tError(errorCode)} />
        )}

        <div className="fixed inset-x-0 bottom-0 z-10 bg-white/90 p-4 backdrop-blur">
          <Button type="submit" disabled={isBusy} className="w-full">
            {status === "uploading"
              ? t.reimbursementPublic.uploadingFile
              : status === "submitting"
                ? t.reimbursementPublic.submitting
                : t.reimbursementPublic.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
