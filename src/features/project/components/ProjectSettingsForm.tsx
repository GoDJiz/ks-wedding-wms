"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { FormActions } from "@/shared/ui/FormActions";
import { FormField } from "@/shared/ui/FormField";
import { TextInput } from "@/shared/ui/TextInput";
import { TextArea } from "@/shared/ui/TextArea";
import type { ErrorCode } from "@/shared/lib/errorCodes";
import type { Project } from "../domain/Project";
import { updateProjectSchema, type UpdateProjectInput } from "../project.types";
import { updateProject } from "../application/projectActions";

export type ProjectSettingsFormProps = {
  project: Project;
};

export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const { t, tError } = useLanguage();
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle"
  );
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      id: project.id,
      name: project.name,
      brideName: project.brideName ?? "",
      groomName: project.groomName ?? "",
      weddingDate: project.weddingDate ?? "",
      venue: project.venue ?? "",
      currency: project.currency,
    },
  });

  const onSubmit = async (values: UpdateProjectInput) => {
    setStatus("saving");
    setErrorCode(null);

    const result = await updateProject(values);

    if (result.ok) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorCode(result.code);
    }
  };

  // Zod validation messages are error codes too (e.g. "name_required") —
  // translate them the same way Server Action errors are translated.
  const fieldError = (code?: string) =>
    code ? tError(code as ErrorCode) : undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label={t.project.name}
        error={fieldError(errors.name?.message)}
      >
        <TextInput {...register("name")} />
      </FormField>

      <FormField label={t.project.bride}>
        <TextInput {...register("brideName")} />
      </FormField>

      <FormField label={t.project.groom}>
        <TextInput {...register("groomName")} />
      </FormField>

      <FormField label={t.project.weddingDate}>
        <TextInput type="date" {...register("weddingDate")} />
      </FormField>

      <FormField label={t.project.venue}>
        <TextArea rows={3} {...register("venue")} />
      </FormField>

      <FormField
        label={t.project.currency}
        error={fieldError(errors.currency?.message)}
      >
        <TextInput className="w-24" {...register("currency")} />
      </FormField>

      {status === "success" && (
        <p role="status" className="text-sm text-emerald-600">
          {t.common.savedSuccessfully}
        </p>
      )}
      {status === "error" && errorCode && (
        <p role="alert" className="text-sm text-rose-600">
          {tError(errorCode)}
        </p>
      )}

      <FormActions
        onCancel={() => reset()}
        saving={status === "saving"}
        saveLabel={t.common.save}
        cancelLabel={t.common.cancel}
      />
    </form>
  );
}
