export type ActivityEntry = {
  id: string;
  actorEmail: string | null;
  action: "insert" | "update" | "delete";
  tableName: string;
  createdAt: string;
};
