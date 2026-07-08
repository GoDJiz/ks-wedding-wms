/**
 * Formats a number as THB currency, e.g. 12500.5 -> "฿12,500.50".
 * Centralized here since Budget, Expense, and Dashboard all need identical
 * formatting — per DEVELOPMENT_RULES.md §9 (refactor duplicated code).
 */
export function formatCurrency(amount: number, currency = "THB"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
