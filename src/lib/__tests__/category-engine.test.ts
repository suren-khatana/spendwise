import { describe, it, expect } from 'vitest';
import { categorize, getDefaultCategories } from '@/lib/category-engine';
import type { Transaction } from '@/types';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    date: '2026-01-01',
    amount: -10,
    description: 'Test',
    searchableText: overrides.searchableText ?? overrides.description ?? 'Test',
    source: 'Test',
    ...overrides
  };
}

describe('category-engine', () => {
  const defaults = getDefaultCategories();

  it('categorizes S-market as Supermarket', () => {
    const txs = [makeTx({ description: 'S-market Espoo', searchableText: 'S-market Espoo something' })];
    const result = categorize(txs, defaults);
    expect(result[0].category).toBe('Supermarket');
  });

  it('categorizes HSL as Travel', () => {
    const txs = [makeTx({ searchableText: 'HSL MOBIILI;HSL;260414000011' })];
    const result = categorize(txs, defaults);
    expect(result[0].category).toBe('Travel');
  });

  it('categorizes KANSANELÄKELAITOS as Income', () => {
    const txs = [makeTx({ searchableText: 'KANSANELÄKELAITOS;JANE DOE;TYÖMARKKINATUKI' })];
    const result = categorize(txs, defaults);
    expect(result[0].category).toBe('Income');
  });

  it('matches case-insensitively ("lidl" matches "LIDLHELSINKIGRANIITTIT")', () => {
    const txs = [makeTx({ searchableText: '19.4.2026;19.4.2026;Retail FIN HELSINKI LIDLHELSINKIGRANIITTIT;-5.86' })];
    const result = categorize(txs, defaults);
    expect(result[0].category).toBe('Supermarket');
  });

  it('gives Exclusions priority over other categories', () => {
    const txs = [makeTx({ searchableText: 'Tilisiirto;FI5719593168777855;School Transfer' })];
    const result = categorize(txs, defaults);
    expect(result[0].category).toBe('Exclusions');
  });

  it('assigns Miscellaneous when no keyword matches', () => {
    const txs = [makeTx({ searchableText: 'MOB.PAY*Modi ji;HELSINKI' })];
    const result = categorize(txs, defaults);
    expect(result[0].category).toBe('Miscellaneous');
  });

  it('supports custom categories', () => {
    const custom = [
      { name: 'Food', keywords: ['pizza'], isProtected: false },
      { name: 'Miscellaneous', keywords: [], isProtected: true }
    ];
    const txs = [makeTx({ searchableText: 'PIZZA HUT Helsinki' })];
    const result = categorize(txs, custom);
    expect(result[0].category).toBe('Food');
  });

  it('returns empty array for empty transactions', () => {
    const result = categorize([], defaults);
    expect(result).toHaveLength(0);
  });

  it('assigns all to Miscellaneous when categories have empty keywords', () => {
    const cats = [{ name: 'Miscellaneous', keywords: [], isProtected: true }];
    const txs = [makeTx({ searchableText: 'S-market' }), makeTx({ searchableText: 'HSL' })];
    const result = categorize(txs, cats);
    expect(result.every((t) => t.category === 'Miscellaneous')).toBe(true);
  });

  it('categorizes TELIA as Utilities', () => {
    const txs = [makeTx({ searchableText: 'TELIA FINLAND OYJ;6309517544' })];
    const result = categorize(txs, defaults);
    expect(result[0].category).toBe('Utilities');
  });

  it('categorizes Zara as Shopping', () => {
    const txs = [makeTx({ searchableText: 'ZARA ESPOO - 12123' })];
    const result = categorize(txs, defaults);
    expect(result[0].category).toBe('Shopping');
  });

  it('categorizes School as Education', () => {
    const txs = [makeTx({ searchableText: 'H & S INTERNATIONAL SCHOOL OY' })];
    const result = categorize(txs, defaults);
    expect(result[0].category).toBe('Education');
  });

  it('categorizes Rent as Rent', () => {
    const txs = [makeTx({ searchableText: 'Rent for Kamppi flat, tenant' })];
    const result = categorize(txs, defaults);
    expect(result[0].category).toBe('Rent');
  });

  describe('cross-source pair reclassification (credit-card double-count fix)', () => {
    it('reclassifies a bank/CC payment pair as Exclusions even though neither matches an Exclusion keyword', () => {
      // Real-world shape: Nordea bank statement has a -627.33 CC settlement
      // (no Exclusion keyword in its searchableText), and the credit card
      // statement has a corresponding +627.33 "Payment" row on the same date.
      const txs = [
        makeTx({
          date: '2026-03-05',
          amount: -627.33,
          searchableText: 'Nordea Bank Abp FI6085793653525957 371861682652992F1889',
          source: 'Nordea EN',
        }),
        makeTx({
          date: '2026-03-05',
          amount: 627.33,
          searchableText: 'Payment 05.03',
          source: 'Credit Card',
        }),
      ];
      const result = categorize(txs, defaults);
      expect(result[0].category).toBe('Exclusions');
      expect(result[1].category).toBe('Exclusions');
    });

    it('does not flag opposing-sign pairs from the same source', () => {
      // Two same-day same-|amount| opposing-sign rows from the same statement
      // (e.g. an internal transfer + immediate reversal) should keep their
      // keyword-derived categories — there's no payment relationship across
      // sources here.
      const txs = [
        makeTx({
          date: '2026-03-05',
          amount: -100,
          searchableText: 'some vendor',
          source: 'Nordea EN',
        }),
        makeTx({
          date: '2026-03-05',
          amount: 100,
          searchableText: 'some vendor refund',
          source: 'Nordea EN',
        }),
      ];
      const result = categorize(txs, defaults);
      expect(result[0].category).not.toBe('Exclusions');
      expect(result[1].category).not.toBe('Exclusions');
    });

    it('does not flag same-sign pairs across sources', () => {
      // A bank -50 and a CC -50 on the same date are both real expenses,
      // not a payment relationship. They must remain in their normal
      // keyword-derived categories.
      const txs = [
        makeTx({
          date: '2026-03-05',
          amount: -50,
          searchableText: 'LIDL HELSINKI',
          source: 'Nordea EN',
        }),
        makeTx({
          date: '2026-03-05',
          amount: -50,
          searchableText: 'PRISMA HELSINKI',
          source: 'Credit Card',
        }),
      ];
      const result = categorize(txs, defaults);
      expect(result[0].category).toBe('Supermarket');
      expect(result[1].category).toBe('Supermarket');
    });

    it('reclassifies all members of a 3-tx cross-source group with opposing signs', () => {
      const txs = [
        makeTx({ date: '2026-03-05', amount: -300, searchableText: 'a', source: 'Nordea EN' }),
        makeTx({ date: '2026-03-05', amount: 300, searchableText: 'b', source: 'Credit Card' }),
        makeTx({ date: '2026-03-05', amount: -300, searchableText: 'c', source: 'S-Pankki' }),
      ];
      const result = categorize(txs, defaults);
      expect(result[0].category).toBe('Exclusions');
      expect(result[1].category).toBe('Exclusions');
      expect(result[2].category).toBe('Exclusions');
    });

    it('is a no-op when no cross-source pairs exist (regression guard)', () => {
      // Single-source dataset — every keyword categorization should be
      // identical to before the cross-source pass was added.
      const txs = [
        makeTx({ date: '2026-03-05', amount: -50, searchableText: 'LIDL', source: 'Nordea EN' }),
        makeTx({ date: '2026-03-06', amount: -100, searchableText: 'TELIA bill', source: 'Nordea EN' }),
        makeTx({ date: '2026-03-07', amount: 5000, searchableText: 'Payroll', source: 'Nordea EN' }),
      ];
      const result = categorize(txs, defaults);
      expect(result[0].category).toBe('Supermarket');
      expect(result[1].category).toBe('Utilities');
      expect(result[2].category).toBe('Income');
    });
  });
});
