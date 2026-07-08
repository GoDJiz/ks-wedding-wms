import { z } from "zod";

export const createExpenseSchema = z.object({
  projectId: z.string().uuid(),
  categoryId: z.string().uuid("invalid_input"),
  paymentAccountId: z.string().uuid("invalid_input"),
  vendorId: z.string().uuid().nullable().optional(),
  date: z.string().min(1, "date_required"),
  amount: z.coerce.number().gt(0, "amount_required"),
  vat: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  shipping: z.coerce.number().min(0).default(0),
  withholdingTax: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["cash", "bank_transfer", "promptpay", "qr_payment"]),
  remark: z.string().max(500).optional().or(z.literal("")),
});

export type CreateExpenseInput = z.input<typeof createExpenseSchema>;
export type CreateExpenseOutput = z.output<typeof createExpenseSchema>;
