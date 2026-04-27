import { describe, it, expect } from 'vitest';
import { deduplicate } from '@/lib/deduplication';
import type { Transaction } from '@/types';

function makeTx(date: string, amount: number, description: string): Transaction {
  return { date, amount, description, searchableText: `${date};${amount};${description}`, source: 'Test' };
}

describe('deduplication', () => {
  it('returns all unique when no duplicates exist', () => {
    const existing = [makeTx('2026-01-01', -10, 'A')];
    const incoming = [makeTx('2026-01-02', -20, 'B')];
    const result = deduplicate(existing, incoming);
    expect(result.unique).toHaveLength(1);
    expect(result.duplicates).toHaveLength(0);
  });

  it('detects all duplicates', () => {
    const existing = [
      makeTx('2026-01-01', -10, 'A'),
      makeTx('2026-01-02', -20, 'B'),
    ];
    const incoming = [
      makeTx('2026-01-01', -10, 'A'),
      makeTx('2026-01-02', -20, 'B'),
    ];
    const result = deduplicate(existing, incoming);
    expect(result.unique).toHaveLength(0);
    expect(result.duplicates).toHaveLength(2);
  });

  it('correctly splits mixed duplicates and unique', () => {
    const existing = [makeTx('2026-01-01', -10, 'A')];
    const incoming = [
      makeTx('2026-01-01', -10, 'A'),
      makeTx('2026-01-03', -30, 'C'),
    ];
    const result = deduplicate(existing, incoming);
    expect(result.unique).toHaveLength(1);
    expect(result.unique[0].description).toBe('C');
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].description).toBe('A');
  });

  it('returns all unique when existing is empty', () => {
    const incoming = [
      makeTx('2026-01-01', -10, 'A'),
      makeTx('2026-01-02', -20, 'B'),
    ];
    const result = deduplicate([], incoming);
    expect(result.unique).toHaveLength(2);
    expect(result.duplicates).toHaveLength(0);
  });

  it('returns empty result when incoming is empty', () => {
    const existing = [makeTx('2026-01-01', -10, 'A')];
    const result = deduplicate(existing, []);
    expect(result.unique).toHaveLength(0);
    expect(result.duplicates).toHaveLength(0);
  });

  it('does not flag as duplicate when 2/3 fields match but not all', () => {
    const existing = [makeTx('2026-01-01', -10, 'A')];
    const incoming = [
      makeTx('2026-01-01', -10, 'B'),   // same date+amount, diff description
      makeTx('2026-01-01', -20, 'A'),   // same date+description, diff amount
      makeTx('2026-01-02', -10, 'A'),   // same amount+description, diff date
    ];
    const result = deduplicate(existing, incoming);
    expect(result.unique).toHaveLength(3);
    expect(result.duplicates).toHaveLength(0);
  });
});
