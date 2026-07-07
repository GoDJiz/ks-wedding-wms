"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { FormActions } from "@/shared/ui/FormActions";
import type { Project } from "../domain/Project";
import { updateProjectSchema, type UpdateProjectInput } from "../project.types";
import { updateProject } from "../application/projectActions";

export type ProjectSettingsFormProps = {
  project: Project;
};

export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setErrorMessage(null);

    const result = await updateProject(values);

    if (result.ok) {
      setStatus("success");
    } else {
      setStatus("error");
      setErrorMessage(result.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Project name" error={errors.name?.message}>
        <input
          {...register("name")}
          className="w-full rounded-xl border border-sky-100 bg-white/80 px-4 py-3 text-sm"
        />
      </Field>

      <Field label="Bride" error={errors.brideName?.message}>
        <input
          {...register("brideName")}
          className="w-full rounded-xl border border-sky-100 bg-white/80 px-4 py-3 text-sm"
        />
      </Field>

      <Field label="Groom" error={errors.groomName?.message}>
        <input
          {...register("groomName")}
          className="w-full rounded-xl border border-sky-100 bg-white/80 px-4 py-3 text-sm"
        />
      </Field>

      <Field label="Wedding date" error={errors.weddingDate?.message}>
        <input
          type="date"
          {...register("weddingDate")}
          className="w-full rounded-xl border border-sky-100 bg-white/80 px-4 py-3 text-sm"
        />
      </Field>

      <Field label="Venue" error={errors.venue?.message}>
        <textarea
          {...register("venue")}
          rows={3}
          className="w-full rounded-xl border border-sky-100 bg-white/80 px-4 py-3 text-sm"
        />
      </Field>

      <Field label="Currency" error={errors.currency?.message}>
        <input
          {...register("currency")}
          className="w-24 rounded-xl border border-sky-100 bg-white/80 px-4 py-3 text-sm"
        />
      </Field>

      {status === "success" && (
        <p className="text-sm text-emerald-600">Saved successfully.</p>
      )}
      {status === "error" && errorMessage && (
        <p className="text-sm text-rose-600">{errorMessage}</p>
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-xs text-rose-500">{error}</span>
      )}
    </label>
  );
}
