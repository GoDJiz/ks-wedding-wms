import { z } from "zod";

export const updateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Project name is required").max(200),
  brideName: z.string().max(200).optional().or(z.literal("")),
  groomName: z.string().max(200).optional().or(z.literal("")),
  weddingDate: z.string().optional().or(z.literal("")),
  venue: z.string().max(500).optional().or(z.literal("")),
  currency: z.string().min(1).max(10),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
