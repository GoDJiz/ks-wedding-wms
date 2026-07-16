import { z } from "zod";

const publicSubmitBaseSchema = z.object({
  projectId: z.string().uuid(),
  requesterName: z.string().min(1, "name_required").max(200),
  phone: z.string().min(6, "phone_required").max(20),
  purchaseDate: z.string().min(1, "date_required"),
  requestedAmount: z.coerce.number().gt(0, "amount_required"),
  paymentMethod: z.enum(["cash", "bank_transfer", "promptpay", "qr_payment"]),
  bankInfo: z.string().max(500).optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
});

const bankInfoRefinement = (
  data: { paymentMethod: string; bankInfo?: string },
  ctx: z.RefinementCtx
) => {
  if (data.paymentMethod === "bank_transfer" && !data.bankInfo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "bank_info_required",
      path: ["bankInfo"],
    });
  }
};

// Used by useForm/zodResolver — matches exactly the fields the form
// registers. filePaths is intentionally excluded: it isn't collected via
// react-hook-form, it's uploaded separately and appended after validation.
export const publicSubmitFormSchema =
  publicSubmitBaseSchema.superRefine(bankInfoRefinement);

// Used by the server action — validates the full payload actually sent to
// submitReimbursement, including filePaths once upload has completed.
export const publicSubmitSchema = publicSubmitBaseSchema
  .extend({
    filePaths: z.array(z.string()).min(1, "receipt_required"),
  })
  .superRefine(bankInfoRefinement);

export type PublicSubmitFormInput = z.input<typeof publicSubmitFormSchema>;
export type PublicSubmitInput = z.input<typeof publicSubmitSchema>;
export type PublicSubmitOutput = z.output<typeof publicSubmitSchema>;

export const approveRequestSchema = z.object({
  requestId: z.string().uuid(),
  projectId: z.string().uuid(),
  categoryId: z.string().uuid("invalid_input"),
  paymentAccountId: z.string().uuid("invalid_input"),
  approvedAmount: z.coerce.number().gt(0, "amount_required"),
  partialApprovalReason: z.string().max(500).optional().or(z.literal("")),
});
export type ApproveRequestInput = z.input<typeof approveRequestSchema>;

export const rejectRequestSchema = z.object({
  requestId: z.string().uuid(),
  rejectReason: z.string().min(1, "reject_reason_required").max(500),
});
export type RejectRequestInput = z.infer<typeof rejectRequestSchema>;
