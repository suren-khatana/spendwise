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
  return transactions.map((tx) => {
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
}
