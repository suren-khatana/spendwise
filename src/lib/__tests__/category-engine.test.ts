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
});
