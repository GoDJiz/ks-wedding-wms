import { z } from "zod";

export const inviteUserSchema = z.object({
  email: z.string().email("invalid_email"),
  role: z.enum(["owner", "admin", "finance", "organizer", "viewer"]),
  projectId: z.string().uuid(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export type WhitelistedUser = {
  id: string;
  email: string;
  invitedRole: string;
  createdAt: string;
};
