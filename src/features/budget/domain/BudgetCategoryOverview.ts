export type BudgetCategoryOverview = {
  categoryId: string;
  name: string;
  sortOrder: number;
  budgetedAmount: number;
  spentAmount: number;
  remaining: number;
  isOverBudget: boolean;
};
