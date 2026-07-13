export type CategoryBreakdownItem = {
  categoryName: string;
  spent: number;
};

export type MonthlyTrendItem = {
  month: string; // "2026-01"
  expense: number;
  income: number;
};

export type TodaySummary = {
  expensesToday: number;
  incomeToday: number;
  newRequestsToday: number;
  newGuestsToday: number;
};

export type DashboardSummary = {
  totalBudget: number;
  spent: number;
  remaining: number;
  income: number;
  profitLoss: number;
  categoryBreakdown: CategoryBreakdownItem[];
  monthlyTrend: MonthlyTrendItem[];
};
