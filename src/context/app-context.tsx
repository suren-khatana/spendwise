import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { CategorizedTransaction, CategoryConfig, DateRange, ImportResult, Transaction } from '@/types';
import { categorize } from '@/lib/category-engine';
import { parse } from '@/lib/csv-parser';
import { deduplicate } from '@/lib/deduplication';
import {
  appendDuplicateLog,
  clearAllData as storageClearAll,
  loadCategories,
  loadDuplicateLog,
  loadTransactions,
  saveCategories,
  saveTransactions,
  StorageQuotaError,
} from '@/lib/storage';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface AppState {
  transactions: Transaction[];
  categories: CategoryConfig[];
  categorizedTransactions: CategorizedTransaction[];
  dateRange: DateRange;
  duplicateLog: Transaction[];
  storageError: string | null;

  importTransactions: (files: File[]) => Promise<ImportResult[]>;
  setDateRange: (range: DateRange) => void;
  updateCategories: (categories: CategoryConfig[]) => void;
  clearAllData: () => void;
  dismissStorageError: () => void;
}

const AppContext = createContext<AppState | null>(null);

function monthRangeFromIsoDate(isoDate: string): DateRange {
  // isoDate is "YYYY-MM-DD"; date-fns parses ISO dates as local time which is
  // what we want here (the rest of the app compares ISO date strings directly).
  const date = new Date(isoDate);
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  };
}

function currentMonthRange(): DateRange {
  return monthRangeFromIsoDate(format(new Date(), 'yyyy-MM-dd'));
}

// If any transaction falls inside `range`, use it. Otherwise snap to the
// most recent month that has data — so "open the app, see something" works
// even when imported data is months or years old.
function pickInitialDateRange(transactions: Transaction[], range: DateRange): DateRange {
  if (transactions.length === 0) return range;
  const hasOverlap = transactions.some((tx) => tx.date >= range.start && tx.date <= range.end);
  if (hasOverlap) return range;
  const mostRecent = transactions.reduce(
    (acc, tx) => (tx.date > acc ? tx.date : acc),
    transactions[0].date,
  );
  return monthRangeFromIsoDate(mostRecent);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadTransactions());
  const [categories, setCategories] = useState<CategoryConfig[]>(() => loadCategories());
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    pickInitialDateRange(loadTransactions(), currentMonthRange()),
  );
  const [duplicateLog, setDuplicateLog] = useState<Transaction[]>(() => loadDuplicateLog());
  const [storageError, setStorageError] = useState<string | null>(null);

  const categorizedTransactions = useMemo(
    () => categorize(transactions, categories),
    [transactions, categories],
  );

  // Persistence is performed inline by mutators (importTransactions,
  // updateCategories, clearAll) rather than via a useEffect auto-save.
  // This makes quota errors catchable at the call site and avoids the
  // anti-pattern of calling setState from inside an effect.
  const persist = useCallback(<T,>(save: (value: T) => void, value: T): boolean => {
    try {
      save(value);
      return true;
    } catch (err) {
      if (err instanceof StorageQuotaError) {
        setStorageError(err.message);
        return false;
      }
      throw err;
    }
  }, []);

  const importTransactions = useCallback(
    async (files: File[]): Promise<ImportResult[]> => {
      const results: ImportResult[] = [];

      for (const file of files) {
        const text = await file.text();
        const result = parse(text, file.name);
        results.push(result);
      }

      const allIncoming = results.flatMap((r) => r.transactions);
      const { unique, duplicates } = deduplicate(transactions, allIncoming);

      if (unique.length > 0) {
        const next = [...transactions, ...unique];
        if (persist(saveTransactions, next)) {
          setTransactions(next);
          // If the user's current month has no overlap with the data they
          // just imported, snap to the most recent month with data so the
          // dashboard shows something instead of "0 transactions".
          setDateRange((current) => pickInitialDateRange(next, current));
        }
      }

      if (duplicates.length > 0) {
        appendDuplicateLog(duplicates);
        setDuplicateLog((prev) => [...prev, ...duplicates]);
      }

      return results;
    },
    [transactions, persist],
  );

  const updateCategories = useCallback((cats: CategoryConfig[]) => {
    if (persist(saveCategories, cats)) setCategories(cats);
  }, [persist]);

  const clearAll = useCallback(() => {
    storageClearAll();
    setTransactions([]);
    setCategories(loadCategories());
    setDuplicateLog([]);
    setDateRange(currentMonthRange());
    setStorageError(null);
  }, []);

  const dismissStorageError = useCallback(() => setStorageError(null), []);

  const value = useMemo<AppState>(
    () => ({
      transactions,
      categories,
      categorizedTransactions,
      dateRange,
      duplicateLog,
      storageError,
      importTransactions,
      setDateRange,
      updateCategories,
      clearAllData: clearAll,
      dismissStorageError,
    }),
    [
      transactions,
      categories,
      categorizedTransactions,
      dateRange,
      duplicateLog,
      storageError,
      importTransactions,
      updateCategories,
      clearAll,
      dismissStorageError,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return ctx;
}
