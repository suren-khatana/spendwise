import type { ImportResult, Transaction } from '@/types';

type BankFormat = 'S-Pankki' | 'Nordea FI' | 'Nordea EN' | 'Credit Card' | 'OP Bank';

interface FormatConfig {
  name: BankFormat;
  separator: string;
  dateCol: number;
  amountCol: number;
  descriptionCols: number[];
  descriptionFormatter?: (parts: string[]) => string;
  dateParser: (raw: string) => string;
  amountParser: (raw: string) => number;
  // Columns to drop when constructing `searchableText`. Use this when a bank's
  // CSV contains a column that's noise for keyword matching (e.g. a generic
  // transaction-type label like OP Bank's "Selitys" — TILISIIRTO/MAKSUPALVELU/
  // PKORTTIMAKSU — which would otherwise cause the default `Tilisiirto`
  // exclusion to match legitimate vendor payments paid via SEPA transfer).
  // When omitted, `searchableText` is the entire raw line.
  searchableTextExcludeCols?: number[];
}

// Strip a single pair of outer double-quotes from a field. No-op if the field
// isn't quoted, so it's safe to apply universally — banks export the same
// schema with or without quote-wrapping (OP Bank does both; Credit Card
// quotes data rows but not the header).
function stripOuterQuotes(field: string): string {
  return field.replace(/^"(.*)"$/, '$1');
}

function parseDDMMYYYY(raw: string): string {
  const [day, month, year] = raw.split('.');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseYYYYMMDD(raw: string): string {
  const [year, month, day] = raw.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseDMYYYY(raw: string): string {
  const [day, month, year] = raw.split('.');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// OP Bank exports dates in two formats depending on the user's locale/export
// settings, on the same schema:
//   - DD/MM/YYYY  (e.g., "01/09/2025")
//   - YYYY-MM-DD  (e.g., "2025-09-01" — already ISO)
function parseOPBankDate(raw: string): string {
  if (raw.includes('-')) {
    const [year, month, day] = raw.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  const [day, month, year] = raw.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function parseCommaAmount(raw: string): number {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.');
  return parseFloat(cleaned);
}

function parseDotAmount(raw: string): number {
  const cleaned = raw.replace(/\s/g, '');
  return parseFloat(cleaned);
}

function detectFormat(header: string): FormatConfig | null {
  // Normalize: strip outer quotes from each header field so the same prefix
  // matches both quoted and unquoted exports of the same schema.
  const normalized = header.split(';').map(stripOuterQuotes).join(';');

  if (normalized.startsWith('Kirjauspäivä;Maksupäivä;Summa')) {
    return {
      name: 'S-Pankki',
      separator: ';',
      dateCol: 0,
      amountCol: 2,
      descriptionCols: [5, 4],
      descriptionFormatter: (parts) =>
        parts.length > 1 ? `${parts[0]} (${parts[1]})` : parts[0] ?? '',
      dateParser: parseDDMMYYYY,
      amountParser: parseCommaAmount,
    };
  }

  if (normalized.startsWith('Kirjauspäivä;Määrä;Maksaja')) {
    return {
      name: 'Nordea FI',
      separator: ';',
      dateCol: 0,
      amountCol: 1,
      descriptionCols: [4, 5],
      dateParser: parseYYYYMMDD,
      amountParser: parseCommaAmount,
    };
  }

  if (normalized.startsWith('Booking date;Amount;Sender')) {
    return {
      name: 'Nordea EN',
      separator: ';',
      dateCol: 0,
      amountCol: 1,
      descriptionCols: [4, 5],
      dateParser: parseYYYYMMDD,
      amountParser: parseCommaAmount,
    };
  }

  if (normalized.startsWith('Kirjauspäivä;Arvopäivä;Määrä EUROA')) {
    return {
      name: 'OP Bank',
      separator: ';',
      dateCol: 0,
      amountCol: 2,
      // Col 5 is Saaja/Maksaja (counterparty name). Col 4 (Selitys) holds the
      // bank's transaction-type label (TILISIIRTO/MAKSUPALVELU/PKORTTIMAKSU)
      // and is excluded from both description and searchableText — see
      // searchableTextExcludeCols below for why.
      descriptionCols: [5],
      searchableTextExcludeCols: [4],
      dateParser: parseOPBankDate,
      amountParser: parseCommaAmount,
    };
  }

  if (normalized.startsWith('Transaction date;Booking date;Title;Amount')) {
    return {
      name: 'Credit Card',
      separator: ';',
      dateCol: 0,
      amountCol: 3,
      descriptionCols: [2],
      dateParser: parseDMYYYY,
      amountParser: parseDotAmount,
    };
  }

  return null;
}

function splitFields(line: string, separator: string): string[] {
  // Strip outer quotes universally — no-op for unquoted fields, correct for
  // quoted ones. See stripOuterQuotes for the rationale.
  return line.split(separator).map(stripOuterQuotes);
}

export function parse(rawCsv: string, fileName = ''): ImportResult {
  const result: ImportResult = {
    fileName,
    bankFormat: '',
    transactions: [],
    errors: [],
  };

  let content = rawCsv;
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) {
    return result;
  }

  const headerLine = lines[0];
  const format = detectFormat(headerLine);
  if (!format) {
    result.errors.push(`Unrecognized CSV format. Header: ${headerLine}`);
    return result;
  }

  result.bankFormat = format.name;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];

    // A malformed row (bad date, missing column, NaN amount) should not crash
    // the whole import — skip it with a per-line error so the user can see
    // exactly which rows were dropped instead of losing their entire upload.
    try {
      const fields = splitFields(line, format.separator);

      const rawDate = fields[format.dateCol]?.trim() ?? '';
      const rawAmount = fields[format.amountCol]?.trim() ?? '';

      if (!rawDate || !rawAmount) continue;

      const date = format.dateParser(rawDate);
      const amount = format.amountParser(rawAmount);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(amount)) {
        result.errors.push(`Line ${i + 1}: could not parse date "${rawDate}" or amount "${rawAmount}"`);
        continue;
      }

      const descParts = format.descriptionCols
        .map((col) => fields[col]?.trim() ?? '')
        .filter(Boolean);
      const uniqueParts = descParts.filter(
        (part, idx) => descParts.indexOf(part) === idx,
      );
      const description = format.descriptionFormatter
        ? format.descriptionFormatter(uniqueParts)
        : uniqueParts.join(' ');

      const excludes = format.searchableTextExcludeCols;
      const searchableText = excludes
        ? fields.filter((_, idx) => !excludes.includes(idx)).join(format.separator)
        : line;

      const transaction: Transaction = {
        date,
        amount,
        description,
        searchableText,
        source: format.name,
      };

      result.transactions.push(transaction);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`Line ${i + 1}: ${message}`);
    }
  }

  return result;
}
