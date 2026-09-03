/**
 * Legacy mock data support
 * TODO: Replace all mock data usage with real API data
 */

// Currency formatter
export function inr(amount: number): string {
  return `₹${(amount / 100000).toFixed(1)}L`;
}

// Minimal mock data for pages that haven't been refactored yet
export const REVENUE_TREND = [
  { month: "Jan", revenue: 0, target: 0, expenses: 0 },
  { month: "Feb", revenue: 0, target: 0, expenses: 0 },
  { month: "Mar", revenue: 0, target: 0, expenses: 0 },
];

export const HEALTH = [
  { area: "Sales", score: 50 },
  { area: "Marketing", score: 50 },
  { area: "Development", score: 50 },
  { area: "Finance", score: 50 },
];

export const PRODUCTS = [
  { name: "Product 1", mrr: 0 },
];
