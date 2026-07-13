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

export type BudgetReportLabels = {
  title: string;
  generatedLabel: string;
  category: string;
  budgeted: string;
  spent: string;
  remaining: string;
  total: string;
};

// fontFamily: "Sarabun" throughout — registerReportFonts() must be called
// once before rendering (see the Route Handler). Sarabun covers both Thai
// and Latin script, so this single font works for either active language,
// unlike the earlier Helvetica default which only rendered Latin correctly.
const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Sarabun" },
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
  labels,
}: {
  projectName: string;
  categories: BudgetReportRow[];
  generatedAt: string;
  labels: BudgetReportLabels;
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
        <Text style={styles.title}>{labels.title}</Text>
        <Text style={styles.subtitle}>
          {projectName} — {labels.generatedLabel} {generatedAt}
        </Text>

        <View style={styles.headerRow}>
          <Text style={styles.colName}>{labels.category}</Text>
          <Text style={styles.colAmount}>{labels.budgeted}</Text>
          <Text style={styles.colAmount}>{labels.spent}</Text>
          <Text style={styles.colAmount}>{labels.remaining}</Text>
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
          <Text style={styles.colName}>{labels.total}</Text>
          <Text style={styles.colAmount}>{money(totalBudgeted)}</Text>
          <Text style={styles.colAmount}>{money(totalSpent)}</Text>
          <Text style={styles.colAmount}>{money(totalRemaining)}</Text>
        </View>
      </Page>
    </Document>
  );
}
