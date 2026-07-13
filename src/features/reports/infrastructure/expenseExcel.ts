import * as XLSX from "xlsx";

// Report-local shape, same reasoning as BudgetSummaryDocument's
// BudgetReportRow — decouples this report module from the expense
// feature's domain internals.
export type ExpenseReportRow = {
  date: string;
  categoryName: string;
  vendorName: string | null;
  paymentAccountName: string;
  amount: number;
  vat: number;
  discount: number;
  shipping: number;
  withholdingTax: number;
  netTotal: number;
  paymentMethod: string;
  remark: string | null;
};

export function buildExpenseWorkbook(expenses: ExpenseReportRow[]): Buffer {
  const rows = expenses.map((e) => ({
    Date: e.date,
    Category: e.categoryName,
    Vendor: e.vendorName ?? "",
    Account: e.paymentAccountName,
    Amount: e.amount,
    VAT: e.vat,
    Discount: e.discount,
    Shipping: e.shipping,
    "Withholding Tax": e.withholdingTax,
    "Net Total": e.netTotal,
    "Payment Method": e.paymentMethod,
    Remark: e.remark ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
