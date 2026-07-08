export type PaymentMethod =
  "cash" | "bank_transfer" | "promptpay" | "qr_payment";

export type Expense = {
  id: string;
  date: string;
  categoryId: string;
  categoryName: string;
  paymentAccountId: string;
  paymentAccountName: string;
  vendorId: string | null;
  vendorName: string | null;
  amount: number;
  vat: number;
  discount: number;
  shipping: number;
  withholdingTax: number;
  netTotal: number;
  remark: string | null;
  paymentMethod: PaymentMethod;
  createdAt: string;
};

export type SelectOption = { id: string; name: string };
