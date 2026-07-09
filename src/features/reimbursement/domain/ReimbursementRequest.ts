export type ReimbursementStatus =
  | "submitted"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "paid"
  | "completed"
  | "cancelled";

export type PaymentMethod =
  "cash" | "bank_transfer" | "promptpay" | "qr_payment";

export type ReimbursementRequest = {
  id: string;
  requesterName: string;
  phone: string;
  categoryId: string | null;
  categoryName: string | null;
  description: string | null;
  purchaseDate: string;
  requestedAmount: number;
  approvedAmount: number | null;
  paymentMethod: PaymentMethod;
  bankInfo: string | null;
  status: ReimbursementStatus;
  rejectReason: string | null;
  partialApprovalReason: string | null;
  createdAt: string;
};

export type ReimbursementFileInfo = {
  id: string;
  fileType: "receipt" | "product" | "slip" | "cash_photo";
  storagePath: string;
};
