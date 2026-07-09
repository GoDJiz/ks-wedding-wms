import { z } from "zod";

export const createIncomeSchema = z.object({
  projectId: z.string().uuid(),
  paymentAccountId: z.string().uuid("invalid_input"),
  type: z.enum([
    "envelope",
    "transfer",
    "cash",
    "sponsor",
    "gift",
    "gold",
    "cheque",
    "other",
  ]),
  amount: z.coerce.number().gt(0, "amount_required"),
  date: z.string().min(1, "date_required"),
  remark: z.string().max(500).optional().or(z.literal("")),
});
export type CreateIncomeInput = z.input<typeof createIncomeSchema>;
