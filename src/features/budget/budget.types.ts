import { z } from "zod";

export const createCategorySchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1, "name_required").max(100),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateBudgetAmountSchema = z.object({
  categoryId: z.string().uuid(),
  projectId: z.string().uuid(),
  budgetedAmount: z.coerce.number().min(0, "amount_required"),
});
export type UpdateBudgetAmountInput = z.infer<typeof updateBudgetAmountSchema>;
