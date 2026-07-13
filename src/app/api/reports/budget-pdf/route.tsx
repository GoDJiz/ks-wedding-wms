import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireSessionContext } from "@/shared/session/requireSessionContext";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { listBudgetOverview } from "@/features/budget/infrastructure/budgetRepository";
import { fetchProjectById } from "@/features/project/infrastructure/projectRepository";
import { registerReportFonts } from "@/features/reports/infrastructure/registerFonts";
import { BudgetSummaryDocument } from "@/features/reports/infrastructure/BudgetSummaryDocument";

export async function GET() {
  const { projectId } = await requireSessionContext();
  const supabase = await createSupabaseServerClient();
  const { t } = await getDictionary();

  registerReportFonts();

  const [categories, project] = await Promise.all([
    listBudgetOverview(supabase, projectId),
    fetchProjectById(supabase, projectId),
  ]);

  const reportRows = categories.map((c) => ({
    categoryId: c.categoryId,
    name: c.name,
    budgetedAmount: c.budgetedAmount,
    spentAmount: c.spentAmount,
    remaining: c.remaining,
    isOverBudget: c.isOverBudget,
  }));

  const buffer = await renderToBuffer(
    <BudgetSummaryDocument
      projectName={project?.name ?? "Wedding Project"}
      categories={reportRows}
      generatedAt={new Date().toLocaleDateString()}
      labels={{
        title: t.reports.budgetSummaryTitle,
        generatedLabel: t.reports.generatedLabel,
        category: t.budget.category,
        budgeted: t.budget.budgeted,
        spent: t.budget.spent,
        remaining: t.budget.remaining,
        total: t.reports.total,
      }}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="budget-summary.pdf"',
    },
  });
}
