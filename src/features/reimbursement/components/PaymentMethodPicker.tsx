"use client";

import type { PaymentMethod } from "../domain/ReimbursementRequest";

export function PaymentMethodPicker({
  value,
  onChange,
  labels,
}: {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  labels: Record<PaymentMethod, string>;
}) {
  const methods: PaymentMethod[] = [
    "cash",
    "bank_transfer",
    "promptpay",
    "qr_payment",
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {methods.map((method) => (
        <button
          key={method}
          type="button"
          onClick={() => onChange(method)}
          aria-pressed={value === method}
          className={`min-h-16 rounded-2xl border-2 px-4 text-base font-medium transition ${
            value === method
              ? "border-sky-400 bg-sky-100 text-slate-800"
              : "border-sky-100 bg-white text-slate-600"
          }`}
        >
          {labels[method]}
        </button>
      ))}
    </div>
  );
}
