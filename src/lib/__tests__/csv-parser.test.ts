import { describe, it, expect } from 'vitest';
import { parse } from '@/lib/csv-parser';
import { categorize, getDefaultCategories } from '@/lib/category-engine';

describe('csv-parser', () => {
  describe('Profile 1 - S-Pankki', () => {
    const csv = `Kirjauspäivä;Maksupäivä;Summa;Tapahtumalaji;Maksaja;Saajan nimi;Saajan tilinumero;Saajan BIC-tunnus;Viitenumero;Viesti;Arkistointitunnus
22.04.2026;21.04.2026;-25,53;KORTTIOSTO;JANE DOE;S-market Espoo;-;-;-;'431871******8970 260421018392';20260422390000285910
10.04.2026;10.04.2026;+10,99;BONUS;HOK-ELANTO;JANE DOE;FI62 3939 0064 1413 43;SBAN FI HH;-;'-';20260410390004100462
18.03.2026;18.03.2026;+105,08;TUKI/ETUUS;KANSANELÄKELAITOS;JANE DOE;FI62 3939 0064 1413 43 ;SBANFIHH;-;'TYÖMARKKINATUKI';20580319390000121450`;

    it('parses S-Pankki format correctly', () => {
      const result = parse(csv, 'bank1_fi.csv');
      expect(result.bankFormat).toBe('S-Pankki');
      expect(result.transactions).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it('parses dates as DD.MM.YYYY → ISO', () => {
      const result = parse(csv);
      expect(result.transactions[0].date).toBe('2026-04-22');
      expect(result.transactions[1].date).toBe('2026-04-10');
    });

    it('parses amounts with comma decimal and sign', () => {
      const result = parse(csv);
      expect(result.transactions[0].amount).toBe(-25.53);
      expect(result.transactions[1].amount).toBe(10.99);
      expect(result.transactions[2].amount).toBe(105.08);
    });

    it('extracts description from Saajan nimi (Maksaja) cols 5, 4', () => {
      const result = parse(csv);
      expect(result.transactions[0].description).toBe('S-market Espoo (JANE DOE)');
      expect(result.transactions[1].description).toBe('JANE DOE (HOK-ELANTO)');
      expect(result.transactions[2].description).toBe('JANE DOE (KANSANELÄKELAITOS)');
    });

    it('preserves searchableText for later keyword matching', () => {
      const result = parse(csv);
      expect(result.transactions[0].searchableText).toContain('S-market Espoo');
    });
  });

  describe('Profile 2 - Nordea FI', () => {
    const csv = `Kirjauspäivä;Määrä;Maksaja;Maksunsaaja;Nimi;Otsikko;Viesti;Viitenumero;Saldo;Valuutta;
2026/04/24;4500,00;;FI88 3456 5678 5985 78;ACME OY;ACME OY;payroll 2604;;4500,35;EUR;
2026/04/22;-4,65;FI88 3456 5678 5985 78;;Nordea Bank Abp;Nordea Bank Abp;Daily services  3/2026 Mobile Plus package   1 items  4,65;;841,00;EUR;
2026/04/15;-60,10;FI88 3456 5678 5985 78;;HSL MOBIILI;HSL MOBIILI;HSL;260414000011;913,43;EUR;`;

    it('parses Nordea FI format correctly', () => {
      const result = parse(csv, 'bank2_fi.csv');
      expect(result.bankFormat).toBe('Nordea FI');
      expect(result.transactions).toHaveLength(3);
    });

    it('parses dates as YYYY/MM/DD → ISO', () => {
      const result = parse(csv);
      expect(result.transactions[0].date).toBe('2026-04-24');
    });

    it('parses comma-decimal amounts', () => {
      const result = parse(csv);
      expect(result.transactions[0].amount).toBe(4500.0);
      expect(result.transactions[1].amount).toBe(-4.65);
    });

    it('combines Nimi and Otsikko for description, deduplicating identical parts', () => {
      const result = parse(csv);
      expect(result.transactions[0].description).toBe('ACME OY');
      expect(result.transactions[2].description).toBe('HSL MOBIILI');
    });
  });

  describe('Profile 3 - Nordea EN', () => {
    const csv = `Booking date;Amount;Sender;Recipient;Name;Title;Message;Reference number;Balance;Currency;
2026/04/24;4500,00;;FI88 3456 5678 5985 78;ACME OY;ACME OY;payroll 2604;;4500,35;EUR;
2026/04/15;-60,10;FI88 3456 5678 5985 78;;HSL MOBIILI;HSL MOBIILI;HSL;260414000011;913,43;EUR;`;

    it('parses Nordea EN format correctly', () => {
      const result = parse(csv, 'bank3_en.csv');
      expect(result.bankFormat).toBe('Nordea EN');
      expect(result.transactions).toHaveLength(2);
    });

    it('parses dates as YYYY/MM/DD → ISO', () => {
      const result = parse(csv);
      expect(result.transactions[0].date).toBe('2026-04-24');
    });

    it('parses amounts same as Nordea FI', () => {
      const result = parse(csv);
      expect(result.transactions[0].amount).toBe(4500.0);
      expect(result.transactions[1].amount).toBe(-60.1);
    });
  });

  describe('Profile 4 - Credit Card', () => {
    const csv = `Transaction date;Booking date;Title;Amount;Currency;Transaction type;Original amount;Original currency;City;Country;Exchange rate
"24.4.2026";"24.4.2026";"Retail FIN HELSINKI K-CITYMARKET HELSINKI";"-3.9";"EUR";;;;;;
"7.4.2026";"7.4.2026";"Payment 07.04";"564.01";"EUR";;;;;;
"20.4.2026";"20.4.2026";"Retail FIN Vantaa Finnair O754V4P";"-404.5";"EUR";;;;;;`;

    it('parses Credit Card format correctly', () => {
      const result = parse(csv, 'bank4_en.csv');
      expect(result.bankFormat).toBe('Credit Card');
      expect(result.transactions).toHaveLength(3);
    });

    it('parses dates as D.M.YYYY with quotes → ISO', () => {
      const result = parse(csv);
      expect(result.transactions[0].date).toBe('2026-04-24');
      expect(result.transactions[1].date).toBe('2026-04-07');
    });

    it('parses dot-decimal amounts from quoted fields', () => {
      const result = parse(csv);
      expect(result.transactions[0].amount).toBe(-3.9);
      expect(result.transactions[1].amount).toBe(564.01);
      expect(result.transactions[2].amount).toBe(-404.5);
    });

    it('extracts description from Title (col 2), stripping quotes', () => {
      const result = parse(csv);
      expect(result.transactions[0].description).toBe('Retail FIN HELSINKI K-CITYMARKET HELSINKI');
      expect(result.transactions[1].description).toBe('Payment 07.04');
    });
  });

  describe('Profile 5 - OP Bank', () => {
    const csv = `Kirjauspäivä;Arvopäivä;Määrä EUROA;Laji;Selitys;Saaja/Maksaja;Saajan tilinumero;Saajan pankin BIC;Viite;Viesti;Arkistointitunnus
01/09/2025;01/09/2025;-180;106;TILISIIRTO;Paytrail Oyj EnterFinland;FI2650000120480743;OKOYFIHH;ref=00000000008533672237;Lopullinen saaja: Maahanmuuttovirasto;20250901/598479/043198
02/09/2025;02/09/2025;-35,53;129;MAKSUPALVELU;Keskinäinen Eläkevakuutusyhtiö;FI4350000120244339;OKOYFIHH;ref=00000082000100121111;;20250722/5FVT00/088095
08/09/2025;08/09/2025;29,69;506;TILISIIRTO;ACCENTURE TECHNOLOGY SOLUTIONS OY;FI9350920920513569;;ref=;SEPA-MAKSU;20250908/5SCT6E/001947
17/09/2025;17/09/2025;-33,08;162;PKORTTIMAKSU;PRISMA HERTTONIEMI  HELSINKI;;;ref=;Viesti: 401046******9565;20250917/5EQEO1/874669`;

    it('parses OP Bank format correctly', () => {
      const result = parse(csv, 'op-bank_fi.csv');
      expect(result.bankFormat).toBe('OP Bank');
      expect(result.transactions).toHaveLength(4);
      expect(result.errors).toHaveLength(0);
    });

    it('parses dates as DD/MM/YYYY → ISO', () => {
      const result = parse(csv);
      expect(result.transactions[0].date).toBe('2025-09-01');
      expect(result.transactions[3].date).toBe('2025-09-17');
    });

    it('parses amounts: integer (no decimal), comma decimal, positive and negative', () => {
      const result = parse(csv);
      expect(result.transactions[0].amount).toBe(-180);
      expect(result.transactions[1].amount).toBe(-35.53);
      expect(result.transactions[2].amount).toBe(29.69);
      expect(result.transactions[3].amount).toBe(-33.08);
    });

    it('extracts description from Saaja/Maksaja (col 5), not the Selitys type-label column', () => {
      const result = parse(csv);
      expect(result.transactions[0].description).toBe('Paytrail Oyj EnterFinland');
      expect(result.transactions[2].description).toBe('ACCENTURE TECHNOLOGY SOLUTIONS OY');
      expect(result.transactions[3].description).toBe('PRISMA HERTTONIEMI  HELSINKI');
      // Selitys label "TILISIIRTO" is not part of the description even though
      // it appears in the raw CSV row.
      expect(result.transactions[0].description).not.toContain('TILISIIRTO');
    });

    it('drops the Selitys (col 4) type-label from searchableText to avoid false-positive Exclusions matches', () => {
      const result = parse(csv);
      // IBAN, counterparty name, and message remain in searchableText for keyword matching:
      expect(result.transactions[0].searchableText).toContain('FI2650000120480743');
      expect(result.transactions[0].searchableText).toContain('Paytrail Oyj');
      expect(result.transactions[0].searchableText).toContain('Maahanmuuttovirasto');
      // …but the bank's per-transaction type-label (TILISIIRTO etc.) is dropped
      // so legitimate vendor payments paid by SEPA transfer aren't auto-excluded.
      expect(result.transactions[0].searchableText).not.toContain('TILISIIRTO');
      expect(result.transactions[1].searchableText).not.toContain('MAKSUPALVELU');
      expect(result.transactions[3].searchableText).not.toContain('PKORTTIMAKSU');
    });

    it('classifies vendor payments via SEPA transfer using the vendor name, not the TILISIIRTO label', () => {
      // Regression: before searchableTextExcludeCols, every OP Bank row whose
      // Selitys was TILISIIRTO matched the default "Tilisiirto" exclusion and
      // was wrongly dropped from expense totals.
      const vendorTransfersCsv = `Kirjauspäivä;Arvopäivä;Määrä EUROA;Laji;Selitys;Saaja/Maksaja;Saajan tilinumero;Saajan pankin BIC;Viite;Viesti;Arkistointitunnus
08/09/2025;08/09/2025;-22,13;106;TILISIIRTO;Telia Finland Oy;FI3380001601016695;DABAFIHH;ref=00000000125350851826;;20250827/593619/0P3804
15/09/2025;15/09/2025;-24,9;106;TILISIIRTO;DNA OYJ;FI6550000120229587;OKOYFIHH;ref=00664958229202019032;;20250821/593619/0P7577`;
      const result = parse(vendorTransfersCsv);
      const categorized = categorize(result.transactions, getDefaultCategories());
      expect(categorized[0].category).toBe('Utilities'); // Telia
      expect(categorized[1].category).toBe('Utilities'); // DNA
    });
  });

  describe('BOM handling', () => {
    it('strips UTF-8 BOM from beginning of file', () => {
      const csv = `\uFEFFKirjauspäivä;Maksupäivä;Summa;Tapahtumalaji;Maksaja;Saajan nimi;Saajan tilinumero;Saajan BIC-tunnus;Viitenumero;Viesti;Arkistointitunnus
22.04.2026;21.04.2026;-25,53;KORTTIOSTO;JANE DOE;S-market Espoo;-;-;-;'431871******8970 260421018392';20260422390000285910`;
      const result = parse(csv);
      expect(result.bankFormat).toBe('S-Pankki');
      expect(result.transactions).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    it('returns empty result for empty file', () => {
      const result = parse('');
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('returns error for unrecognized format', () => {
      const result = parse('Name,Date,Amount\nJohn,2026-01-01,100');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Unrecognized');
    });

    it('returns empty transactions for header-only file', () => {
      const csv = `Kirjauspäivä;Maksupäivä;Summa;Tapahtumalaji;Maksaja;Saajan nimi;Saajan tilinumero;Saajan BIC-tunnus;Viitenumero;Viesti;Arkistointitunnus`;
      const result = parse(csv);
      expect(result.bankFormat).toBe('S-Pankki');
      expect(result.transactions).toHaveLength(0);
    });

    it('stores fileName in result', () => {
      const result = parse('', 'test.csv');
      expect(result.fileName).toBe('test.csv');
    });
  });
});
