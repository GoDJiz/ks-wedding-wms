import { forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-sky-400 text-white hover:bg-sky-500",
  secondary: "bg-sky-100 text-slate-700 hover:bg-sky-200",
  danger: "bg-rose-100 text-rose-700 hover:bg-rose-200",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`min-h-12 rounded-2xl px-5 py-3 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
