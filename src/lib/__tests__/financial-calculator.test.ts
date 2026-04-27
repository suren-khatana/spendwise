import { describe, it, expect } from 'vitest';
import { computeSummary } from '@/lib/financial-calculator';
import type { CategorizedTransaction } from '@/types';

function makeCTx(
  date: string,
  amount: number,
  category: string,
): CategorizedTransaction {
  return {
    date,
    amount,
    description: 'Test',
    searchableText: 'Test',
    source: 'Test',
    category,
  };
}

describe('financial-calculator', () => {
  const range = { start: '2026-01-01', end: '2026-12-31' };

  it('computes income from Income category only', () => {
    const txs = [
      makeCTx('2026-03-01', 5000, 'Income'),
      makeCTx('2026-03-01', -50, 'Supermarket'),
    ];
    const result = computeSummary(txs, range);
    expect(result.totalIncome).toBe(5000);
  });

  it('computes expenses from all categories except Income and Exclusions', () => {
    const txs = [
      makeCTx('2026-03-01', 5000, 'Income'),
      makeCTx('2026-03-01', -50, 'Supermarket'),
      makeCTx('2026-03-01', -100, 'Rent'),
      makeCTx('2026-03-01', -1000, 'Exclusions'),
    ];
    const result = computeSummary(txs, range);
    expect(result.totalExpenses).toBe(-150);
  });

  it('excludes positive Miscellaneous transactions from expenses and byCategory', () => {
    const txs = [
      makeCTx('2026-03-01', -50, 'Miscellaneous'),
      makeCTx('2026-03-01', 15, 'Miscellaneous'),  // refund/cashback — should be ignored
      makeCTx('2026-03-01', -30, 'Supermarket'),
    ];
    const result = computeSummary(txs, range);
    expect(result.totalExpenses).toBe(-80);
    // byCategory should only include negative Miscellaneous amounts
    expect(result.byCategory['Miscellaneous']).toBe(-50);
  });

  it('computes balance as income + expenses', () => {
    const txs = [
      makeCTx('2026-03-01', 5000, 'Income'),
      makeCTx('2026-03-01', -50, 'Supermarket'),
      makeCTx('2026-03-01', -100, 'Rent'),
    ];
    const result = computeSummary(txs, range);
    expect(result.balance).toBe(4850);
  });

  it('filters by date range (inclusive boundaries)', () => {
    const txs = [
      makeCTx('2025-12-31', -10, 'Supermarket'), // before
      makeCTx('2026-01-01', -20, 'Supermarket'), // start boundary
      makeCTx('2026-06-15', -30, 'Supermarket'), // middle
      makeCTx('2026-12-31', -40, 'Supermarket'), // end boundary
      makeCTx('2027-01-01', -50, 'Supermarket'), // after
    ];
    const result = computeSummary(txs, range);
    expect(result.totalExpenses).toBe(-90); // 20+30+40
  });

  it('computes per-category breakdown', () => {
    const txs = [
      makeCTx('2026-03-01', 5000, 'Income'),
      makeCTx('2026-03-01', -50, 'Supermarket'),
      makeCTx('2026-03-02', -30, 'Supermarket'),
      makeCTx('2026-03-01', -100, 'Rent'),
    ];
    const result = computeSummary(txs, range);
    expect(result.byCategory['Income']).toBe(5000);
    expect(result.byCategory['Supermarket']).toBe(-80);
    expect(result.byCategory['Rent']).toBe(-100);
  });

  it('returns zeros when no transactions in range', () => {
    const txs = [makeCTx('2025-06-01', -50, 'Supermarket')];
    const result = computeSummary(txs, range);
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.balance).toBe(0);
    expect(Object.keys(result.byCategory)).toHaveLength(0);
  });

  it('returns zeros when only Exclusions exist', () => {
    const txs = [
      makeCTx('2026-03-01', -5000, 'Exclusions'),
      makeCTx('2026-03-02', -1000, 'Exclusions'),
    ];
    const result = computeSummary(txs, range);
    expect(result.totalIncome).toBe(0);
    expect(result.totalExpenses).toBe(0);
    expect(result.balance).toBe(0);
  });

  it('returns expenses=0 when only Income exists', () => {
    const txs = [
      makeCTx('2026-03-01', 5000, 'Income'),
      makeCTx('2026-04-01', 200, 'Income'),
    ];
    const result = computeSummary(txs, range);
    expect(result.totalIncome).toBe(5200);
    expect(result.totalExpenses).toBe(0);
    expect(result.balance).toBe(5200);
  });

  it('excludes Exclusions from byCategory', () => {
    const txs = [
      makeCTx('2026-03-01', -5000, 'Exclusions'),
      makeCTx('2026-03-01', -50, 'Supermarket'),
    ];
    const result = computeSummary(txs, range);
    expect(result.byCategory['Exclusions']).toBeUndefined();
    expect(result.byCategory['Supermarket']).toBe(-50);
  });
});
