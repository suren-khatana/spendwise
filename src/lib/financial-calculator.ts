import type { CategorizedTransaction, DateRange, FinancialSummary } from '@/types';

export function computeSummary(
  transactions: CategorizedTransaction[],
  dateRange: DateRange,
): FinancialSummary {
  const filtered = transactions.filter(
    (tx) => tx.date >= dateRange.start && tx.date <= dateRange.end,
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  const byCategory: Record<string, number> = {};

  for (const tx of filtered) {
    if (tx.category === 'Exclusions') continue;

    // Skip positive Miscellaneous transactions (refunds, cashback, etc.) entirely
    if (tx.category === 'Miscellaneous' && tx.amount >= 0) continue;

    if (tx.category === 'Income') {
      totalIncome += tx.amount;
    } else {
      totalExpenses += tx.amount;
    }

    byCategory[tx.category] = (byCategory[tx.category] ?? 0) + tx.amount;
  }

  // Round to avoid floating point issues
  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpenses = Math.round(totalExpenses * 100) / 100;
  const balance = Math.round((totalIncome + totalExpenses) * 100) / 100;

  for (const key of Object.keys(byCategory)) {
    byCategory[key] = Math.round(byCategory[key] * 100) / 100;
  }

  return { totalIncome, totalExpenses, balance, byCategory };
}
