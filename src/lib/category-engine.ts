import type { CategoryConfig, CategorizedTransaction, Transaction } from '@/types';

export function getDefaultCategories(): CategoryConfig[] {
  return [
    // FI0821851800032576 is Nordea Bank's general credit-card payment collection
    // account — included so Nordea customers' "pay credit card bill" outflows are
    // excluded from expense totals (otherwise they double-count alongside the
    // credit-card statement's own line items).
    { name: 'Exclusions', keywords: ['Transfer', 'Tilisiirto', 'Pikasiirto', 'FI0821851800032576'], isProtected: true },
    { name: 'Income', keywords: ['Payroll', 'Salary', 'KANSANELÄKELAITOS', 'TYÖMARKKINATUKI', 'HOK-ELANTO'], isProtected: false },
    { name: 'Supermarket', keywords: ['K-CITYMARKET', 'K-SUPERMARKET', 'K-MARKET', 'S-MARKET', 'LIDL', 'SUBIJA', 'ALEPA', 'PRISMA', 'TOKMANNI', 'COOP'], isProtected: false },
    { name: 'Travel', keywords: ['HSL', 'FINNAIR', 'Mob.Pay*Helsingin seud', 'UBER', 'Bolt', 'Arlanda'], isProtected: false },
    { name: 'Shopping', keywords: ['Zara', 'Stadium', 'KappAhl', 'HM', 'FTC HELSINKI', 'Bestseller AS', 'Itis', 'NORMAL'], isProtected: false },
    { name: 'Utilities', keywords: ['DNA', 'TELIA', 'HEHKU', 'HELEN', 'FORTUM'], isProtected: false },
    { name: 'Education', keywords: ['School', 'Language', 'Linguajoy'], isProtected: false },
    { name: 'Rent', keywords: ['Rent'], isProtected: false },
    { name: 'Miscellaneous', keywords: [], isProtected: true }
  ];
}

export function categorize(transactions: Transaction[], categories: CategoryConfig[]): CategorizedTransaction[] {
  const keywordCategorized = transactions.map((tx) => {
    const haystack = tx.searchableText.toLowerCase();
    let matched = 'Miscellaneous';

    for (const cat of categories) {
      if (cat.name === 'Miscellaneous') continue;
      for (const keyword of cat.keywords) {
        if (haystack.includes(keyword.toLowerCase())) {
          matched = cat.name;
          break;
        }
      }
      if (matched !== 'Miscellaneous') break;
    }

    return { ...tx, category: matched };
  });

  return reclassifyCrossSourcePairs(keywordCategorized);
}

// Auto-detect credit-card-payment-style transaction pairs across sources and
// reclassify them as Exclusions. The specific scenario this targets:
//
//   Bank statement:  2026/03/05  -627.33  → "Nordea Bank Abp" (CC settlement)
//   CC statement:    2026/03/05  +627.33  → "Payment 05.03"
//
// Without this pass, the bank's negative row falls into Miscellaneous and is
// counted as an expense, while the credit card's individual purchases — which
// the bank payment was *paying for* — are *also* counted as expenses. The same
// money flows out of the user's totals twice.
//
// A pair is considered a cross-source payment iff all four hold:
//   1. Same date
//   2. Same |amount|
//   3. ≥ 2 distinct `source` values present in the group
//   4. Both a positive and a negative amount present
//
// We use Math.abs(amount).toFixed(2) for the key so float artifacts can't
// disrupt matching. Identity-preserved when no pairs are found, so React's
// useMemo on categorizedTransactions stays stable.
function reclassifyCrossSourcePairs(
  txs: CategorizedTransaction[],
): CategorizedTransaction[] {
  const groups = new Map<string, number[]>();
  for (let i = 0; i < txs.length; i++) {
    const key = `${txs[i].date}|${Math.abs(txs[i].amount).toFixed(2)}`;
    const list = groups.get(key);
    if (list) list.push(i);
    else groups.set(key, [i]);
  }

  const flagged = new Set<number>();
  for (const indexes of groups.values()) {
    if (indexes.length < 2) continue;
    const sources = new Set(indexes.map((i) => txs[i].source));
    if (sources.size < 2) continue;
    const hasPositive = indexes.some((i) => txs[i].amount > 0);
    const hasNegative = indexes.some((i) => txs[i].amount < 0);
    if (!hasPositive || !hasNegative) continue;
    for (const i of indexes) flagged.add(i);
  }

  if (flagged.size === 0) return txs;
  return txs.map((tx, i) => (flagged.has(i) ? { ...tx, category: 'Exclusions' } : tx));
}
