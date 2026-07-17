import { z } from "zod";

export const createGuestSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1, "name_required").max(200),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("invalid_email").optional().or(z.literal("")),
  tableNo: z.string().max(20).optional().or(z.literal("")),
  rsvpStatus: z.enum(["pending", "attending", "declined"]).default("pending"),
  // Reuses the existing guests.transfer_amount column (was already present
  // in the schema/domain type, just never exposed on the manual/walk-in
  // guest form until now). Defaults to 0 — no transfer recorded.
  transferAmount: z.coerce.number().min(0, "amount_required").default(0),
});
export type CreateGuestInput = z.input<typeof createGuestSchema>;

export const updateGuestSchema = createGuestSchema.extend({
  guestId: z.string().uuid(),
});
export type UpdateGuestInput = z.input<typeof updateGuestSchema>;
