import type { CategorizedTransaction, CategoryConfig, Transaction } from '@/types';
import { getDefaultCategories } from './category-engine';

const KEYS = {
  transactions: 'expense-tracker-transactions',
  categories: 'expense-tracker-categories',
  duplicateLog: 'expense-tracker-duplicate-log',
} as const;

export class StorageQuotaError extends Error {
  constructor() {
    super(
      'Browser storage is full. Export your data to CSV and use "Clear All Data" to free space.',
    );
    this.name = 'StorageQuotaError';
  }
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  // Different browsers report quota errors with different names/codes.
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    if (isQuotaError(err)) throw new StorageQuotaError();
    throw err;
  }
}

// Runtime validators. localStorage is shared with anything else on the same
// origin, so trust nothing on load — type guards keep malformed data out of
// the React render path.
function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.date === 'string' &&
    typeof v.amount === 'number' &&
    Number.isFinite(v.amount) &&
    typeof v.description === 'string' &&
    typeof v.source === 'string' &&
    (typeof v.searchableText === 'string' || typeof v.rawRow === 'string')
  );
}

function migrateTransaction(value: Transaction & { rawRow?: string }): Transaction {
  // Older versions persisted `rawRow`; rename to `searchableText` on load.
  if (typeof value.searchableText !== 'string' && typeof value.rawRow === 'string') {
    const { rawRow, ...rest } = value;
    return { ...rest, searchableText: rawRow };
  }
  return value;
}

function isCategoryConfig(value: unknown): value is CategoryConfig {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === 'string' &&
    Array.isArray(v.keywords) &&
    v.keywords.every((k) => typeof k === 'string') &&
    typeof v.isProtected === 'boolean'
  );
}

function loadValidatedArray<T>(key: string, isValid: (v: unknown) => v is T): T[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isValid);
  } catch {
    return null;
  }
}

export function loadTransactions(): Transaction[] {
  const loaded = loadValidatedArray(KEYS.transactions, isTransaction);
  return loaded ? loaded.map(migrateTransaction) : [];
}

export function saveTransactions(txs: Transaction[]): void {
  safeSetItem(KEYS.transactions, JSON.stringify(txs));
}

export function loadCategories(): CategoryConfig[] {
  const loaded = loadValidatedArray(KEYS.categories, isCategoryConfig);
  return loaded && loaded.length > 0 ? loaded : getDefaultCategories();
}

export function saveCategories(cats: CategoryConfig[]): void {
  safeSetItem(KEYS.categories, JSON.stringify(cats));
}

export function loadDuplicateLog(): Transaction[] {
  const loaded = loadValidatedArray(KEYS.duplicateLog, isTransaction);
  return loaded ? loaded.map(migrateTransaction) : [];
}

export function saveDuplicateLog(dupes: Transaction[]): void {
  safeSetItem(KEYS.duplicateLog, JSON.stringify(dupes));
}

export function appendDuplicateLog(dupes: Transaction[]): void {
  const existing = loadDuplicateLog();
  saveDuplicateLog([...existing, ...dupes]);
}

export function clearAllData(): void {
  localStorage.removeItem(KEYS.transactions);
  localStorage.removeItem(KEYS.categories);
  localStorage.removeItem(KEYS.duplicateLog);
}

function escapeCsvField(value: string): string {
  // Defuse spreadsheet formula injection: a leading =, +, -, @, tab, or CR
  // in a CSV cell is interpreted as a formula by Excel/Sheets. Prefixing with
  // a single quote neutralizes it without changing the displayed value.
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (guarded.includes(',') || guarded.includes('"') || guarded.includes('\n')) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

export function exportToCsv(transactions: CategorizedTransaction[]): string {
  const header = 'Date,Amount,Description,Category,Source';
  const rows = transactions.map(
    (tx) =>
      `${escapeCsvField(tx.date)},${tx.amount},${escapeCsvField(tx.description)},${escapeCsvField(tx.category)},${escapeCsvField(tx.source)}`,
  );
  return [header, ...rows].join('\n');
}
