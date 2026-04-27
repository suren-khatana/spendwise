import type { DeduplicationResult, Transaction } from '@/types';

function dedupKey(tx: Transaction): string {
  // JSON.stringify gives an unambiguous key — a description containing the
  // separator character cannot collide with a different (date, amount, description).
  return JSON.stringify([tx.date, tx.amount, tx.description]);
}

export function deduplicate(
  existing: Transaction[],
  incoming: Transaction[],
): DeduplicationResult {
  const keySet = new Set<string>();

  for (const tx of existing) {
    keySet.add(dedupKey(tx));
  }

  const unique: Transaction[] = [];
  const duplicates: Transaction[] = [];

  for (const tx of incoming) {
    if (keySet.has(dedupKey(tx))) {
      duplicates.push(tx);
    } else {
      unique.push(tx);
    }
  }

  return { unique, duplicates };
}
