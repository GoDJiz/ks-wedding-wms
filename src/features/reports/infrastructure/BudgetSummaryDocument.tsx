import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// Report-local shape — deliberately not importing BudgetCategoryOverview
// from the budget feature's domain. The Route Handler (Presentation layer,
// which may legitimately compose any feature) maps that feature's data
// into this shape before handing it to the document — keeps this report
// module decoupled from the budget feature's internals, same reasoning as
// shared/lib/SelectOption.ts.
export type BudgetReportRow = {
  categoryId: string;
  name: string;
  budgetedAmount: number;
  spentAmount: number;
  remaining: number;
  isOverBudget: boolean;
};
const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10 },
  title: { fontSize: 18, marginBottom: 4, fontWeight: 700 },
  subtitle: { fontSize: 10, marginBottom: 16, color: "#666666" },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0f2fe",
    paddingVertical: 6,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#0284c7",
    paddingBottom: 6,
    fontWeight: 700,
  },
  colName: { width: "30%" },
  colAmount: { width: "17.5%", textAlign: "right" },
  overBudget: { color: "#e11d48" },
  totalsRow: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#0284c7",
    fontWeight: 700,
  },
});

function money(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function BudgetSummaryDocument({
  projectName,
  categories,
  generatedAt,
}: {
  projectName: string;
  // Note: renders in Helvetica (react-pdf's default, no font registered).
  // Thai category/project names will not render correctly without bundling
  // and registering a Thai-supporting font file — a known limitation,
  // documented rather than silently shipped as "full Thai report support."
  // English numbers/labels render correctly regardless.
  categories: BudgetReportRow[];
  generatedAt: string;
}) {
  const totalBudgeted = categories.reduce(
    (sum, c) => sum + c.budgetedAmount,
    0
  );
  const totalSpent = categories.reduce((sum, c) => sum + c.spentAmount, 0);
  const totalRemaining = totalBudgeted - totalSpent;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Budget Summary</Text>
        <Text style={styles.subtitle}>
          {projectName} — Generated {generatedAt}
        </Text>

        <View style={styles.headerRow}>
          <Text style={styles.colName}>Category</Text>
          <Text style={styles.colAmount}>Budgeted</Text>
          <Text style={styles.colAmount}>Spent</Text>
          <Text style={styles.colAmount}>Remaining</Text>
        </View>

        {categories.map((c) => (
          <View key={c.categoryId} style={styles.row}>
            <Text style={styles.colName}>{c.name}</Text>
            <Text style={styles.colAmount}>{money(c.budgetedAmount)}</Text>
            <Text style={styles.colAmount}>{money(c.spentAmount)}</Text>
            <Text
              style={[
                styles.colAmount,
                c.isOverBudget ? styles.overBudget : {},
              ]}
            >
              {money(c.remaining)}
            </Text>
          </View>
        ))}

        <View style={styles.totalsRow}>
          <Text style={styles.colName}>Total</Text>
          <Text style={styles.colAmount}>{money(totalBudgeted)}</Text>
          <Text style={styles.colAmount}>{money(totalSpent)}</Text>
          <Text style={styles.colAmount}>{money(totalRemaining)}</Text>
        </View>
      </Page>
    </Document>
  );
}
