export type AnalyticsSummary = {
  costPerGuest: number;
  averageEnvelope: number;
  budgetHealthPercent: number; // spent / totalBudget * 100
  pendingRequestsCount: number;
};
