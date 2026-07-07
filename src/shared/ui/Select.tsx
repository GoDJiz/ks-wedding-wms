import { forwardRef } from "react";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", ...props }, ref) => (
    <select
      ref={ref}
      className={`min-h-12 w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-slate-800 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 ${className}`}
      {...props}
    />
  )
);
Select.displayName = "Select";
