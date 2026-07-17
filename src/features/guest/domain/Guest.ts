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
  /**
   * Derived from the existing incomes table (joined in guestRepository),
   * not a new database column — the amount of this guest's linked
   * type='transfer' income row, or null if none exists yet. Powers the
   * Guest Income Sync indicator on /guests (see guestIncomeSyncStatus in
   * shared/lib/guestIncomeSync.ts).
   */
  linkedTransferIncomeAmount: number | null;
};
