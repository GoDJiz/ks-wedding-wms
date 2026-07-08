import { z } from "zod";

export const createPaymentAccountSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1, "name_required").max(100),
  type: z.enum(["bank", "cash"]),
  owner: z.enum(["bride", "groom", "joint"]),
});

export type CreatePaymentAccountInput = z.infer<
  typeof createPaymentAccountSchema
>;
