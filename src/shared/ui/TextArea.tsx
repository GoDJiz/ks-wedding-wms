import { forwardRef } from "react";

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={`min-h-24 w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 ${className}`}
      {...props}
    />
  )
);
TextArea.displayName = "TextArea";
