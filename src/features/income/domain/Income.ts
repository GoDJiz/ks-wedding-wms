export type IncomeType =
  | "envelope"
  | "transfer"
  | "cash"
  | "sponsor"
  | "gift"
  | "gold"
  | "cheque"
  | "other";

export type Income = {
  id: string;
  type: IncomeType;
  amount: number;
  date: string;
  accountName: string;
  guestName: string | null;
  remark: string | null;
  source: "manual" | "sheet_sync";
};
