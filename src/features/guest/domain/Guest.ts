export type RsvpStatus = "pending" | "attending" | "declined";

export type Guest = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tableNo: string | null;
  rsvpStatus: RsvpStatus;
  transferAmount: number;
  envelopeAmount: number;
  remark: string | null;
  source: "sheet_sync" | "walk_in";
  isManuallyModified: boolean;
};
