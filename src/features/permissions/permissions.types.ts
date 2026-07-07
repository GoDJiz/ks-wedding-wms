export type PermissionEntry = {
  id: string;
  role: string;
  capabilityKey: string;
  allowed: boolean;
};

export const ROLES = [
  "owner",
  "admin",
  "finance",
  "organizer",
  "viewer",
] as const;
