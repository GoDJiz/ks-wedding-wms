import { NextResponse } from "next/server";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { listExpenses } from "@/features/expense/infrastructure/expenseRepository";
import { buildExpenseWorkbook } from "@/features/reports/infrastructure/expenseExcel";

export async function GET() {
  const { projectId } = await requireSessionContext();
  const supabase = await createSupabaseServerClient();

  // Large limit rather than a separate "fetch all" query — appropriate at
  // this project's scale (100-300 expenses per the Scale Requirements).
  const { expenses } = await listExpenses(supabase, projectId, {
    limit: 10000,
    offset: 0,
  });

  const reportRows = expenses.map((e) => ({
    date: e.date,
    categoryName: e.categoryName,
    vendorName: e.vendorName,
    paymentAccountName: e.paymentAccountName,
    amount: e.amount,
    vat: e.vat,
    discount: e.discount,
    shipping: e.shipping,
    withholdingTax: e.withholdingTax,
    netTotal: e.netTotal,
    paymentMethod: e.paymentMethod,
    remark: e.remark,
  }));

  const buffer = buildExpenseWorkbook(reportRows);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="expenses.xlsx"',
    },
  });
}
