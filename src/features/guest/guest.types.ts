import { z } from "zod";

export const createGuestSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1, "name_required").max(200),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("invalid_email").optional().or(z.literal("")),
  tableNo: z.string().max(20).optional().or(z.literal("")),
  rsvpStatus: z.enum(["pending", "attending", "declined"]).default("pending"),
});
export type CreateGuestInput = z.input<typeof createGuestSchema>;

export const updateGuestSchema = createGuestSchema.extend({
  guestId: z.string().uuid(),
});
export type UpdateGuestInput = z.input<typeof updateGuestSchema>;
