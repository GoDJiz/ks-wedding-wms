import type { ReactNode } from "react";

export type FormFieldProps = {
  label: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
};

export function FormField({ label, error, children, htmlFor }: FormFieldProps) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1 block text-sm font-medium text-slate-600">
        {label}
      </span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-rose-600">
          {error}
        </span>
      )}
    </label>
  );
}
