import { forwardRef } from "react";

export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

// min-h-12 keeps the touch target >=48px per accessibility guidelines;
// text-base keeps body text >=16px for elderly readability.
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`min-h-12 w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 ${className}`}
      {...props}
    />
  )
);
TextInput.displayName = "TextInput";
