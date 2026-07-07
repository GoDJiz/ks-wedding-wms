export type AuditLogEntry = {
  id: string;
  userEmail: string | null;
  action: "insert" | "update" | "delete";
  tableName: string;
  createdAt: string;
};
