export interface Transaction {
  date: string;
  amount: number;
  description: string;
  // Concatenation of CSV row fields used for keyword matching. Not displayed
  // in the UI. Persisted in localStorage so categorization can re-run when
  // the user edits keywords.
  searchableText: string;
  source: string;
}

export interface CategorizedTransaction extends Transaction {
  category: string;
}

export interface CategoryConfig {
  name: string;
  keywords: string[];
  isProtected: boolean;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  byCategory: Record<string, number>;
}

export interface ImportResult {
  fileName: string;
  bankFormat: string;
  transactions: Transaction[];
  errors: string[];
}

export interface DeduplicationResult {
  unique: Transaction[];
  duplicates: Transaction[];
}
