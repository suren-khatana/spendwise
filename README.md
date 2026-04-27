# Spendwise

A privacy-focused personal expense tracker that runs entirely in the browser. Import CSV bank statements from multiple supported Finnish banks, automatically categorize transactions, and visualize your spending with interactive charts.

**No backend, no accounts, no data leaving your device** — everything is stored in localStorage.

## Features

- **Multi-bank CSV import** — supports 5 Finnish bank formats (S-Pankki, Nordea FI, Nordea EN, OP Bank, credit card statements) with automatic format detection
- **Automatic categorization** — transactions are categorized by keyword matching into Supermarket, Travel, Shopping, Utilities, Education, Income, Rent, and more
- **Interactive dashboard** — summary cards, bar chart (income/expenses/balance), and donut chart (expense breakdown by category with amounts)
- **Filterable transaction table** — sort by date or amount, filter by category or source bank
- **Customizable categories** — add/remove keywords, create new categories, or delete custom ones
- **Data export** — download categorized transactions as CSV
- **Transfer & credit card payment exclusion** — inter-account transfers (Transfer, Tilisiirto, Pikasiirto) and credit card payments are excluded from expense calculations
- **Smart Miscellaneous handling** — positive Miscellaneous transactions (refunds, cashback) are excluded from expense totals

## Getting Started

There are three ways to run Spendwise:

### Option 1: Live Demo

Try it instantly — no installation required:

👉 **https://suren-khatana.github.io/spendwise/**

### Option 2: Local Development

Requires [Node.js](https://nodejs.org/) (v18 or later).

```bash
git clone https://github.com/suren-khatana/spendwise.git
cd spendwise
npm install
npm run dev
```

Open **http://localhost:5173/spendwise/** and import CSV-formatted bank statements to try the app. (The dev server serves under `/spendwise/` to match the GitHub Pages deployment path — bare `http://localhost:5173/` redirects there automatically.)

### Option 3: Docker

Requires [Docker](https://www.docker.com/get-started/).

```bash
git clone https://github.com/suren-khatana/spendwise.git
cd spendwise
docker build -t spendwise .
docker run -p 8080:80 spendwise
```

Open **http://localhost:8080**. The container serves the production build via Nginx — no Node.js needed on the host. (The Dockerfile builds with `vite build --base=/`, so unlike the GitHub Pages and dev-server paths, the Docker variant is served from the origin root rather than `/spendwise/`.)

## Supported Bank Formats

| Bank | Language | Date Format | Detected By Header |
|------|----------|-------------|-------------------|
| S-Pankki | Finnish | DD.MM.YYYY | `Kirjauspäivä;Maksupäivä;Summa` |
| Nordea | Finnish | YYYY/MM/DD | `Kirjauspäivä;Määrä;Maksaja` |
| Nordea | English | YYYY/MM/DD | `Booking date;Amount;Sender` |
| OP Bank | Finnish | DD/MM/YYYY | `Kirjauspäivä;Arvopäivä;Määrä EUROA` |
| Nordea Credit Card | English | DD.M.YYYY | `Transaction date;Booking date;Title;Amount` |


## Notes

Spendwise stores all data in your browser's `localStorage`. A few things to be aware of:
- **Same-device, same-browser.** Data does not sync across devices or browsers — clearing site data, switching browsers, or using private/incognito windows starts you over.
- **Use "Clear All Data".** Settings → Clear All Data wipes transactions, categories, and the duplicate log. Browser-level "Clear site data" does the same.


## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) — build tooling
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) — styling and components
- [Recharts](https://recharts.org/) — charts
- [Vitest](https://vitest.dev/) — testing

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Type-check and production build |
| `npm run lint` | Run ESLint |
| `npx vitest run` | Run all tests |
| `npx vitest run src/lib/__tests__/csv-parser.test.ts` | Run a single test file |


## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE) with a [Commons Clause](https://commonsclause.com/) restriction. You are free to use, fork, and modify the software, but you may not sell it. Attribution to the original author is required.
