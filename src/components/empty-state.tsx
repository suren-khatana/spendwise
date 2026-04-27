import { Upload, PieChart, Tags, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onImportClick: () => void;
}

const features = [
  {
    icon: Upload,
    title: 'Import Bank Statements',
    description: 'Supports S-Pankki, Nordea, and credit card CSV formats with auto-detection.',
  },
  {
    icon: Tags,
    title: 'Auto-Categorize',
    description: 'Transactions are automatically categorized by keywords. Fully customizable.',
  },
  {
    icon: PieChart,
    title: 'Visual Insights',
    description: 'Interactive charts break down your spending by category and time period.',
  },
  {
    icon: ShieldCheck,
    title: 'Private & Offline',
    description: 'All data stays in your browser. Nothing is sent to any server.',
  },
];

export function EmptyState({ onImportClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col">
      {/* Hero section */}
      <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl lg:min-h-[480px]">
        <img
          src={`${import.meta.env.BASE_URL}hero-finance.jpg`}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
        <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-16 text-center">
          <h2 className="max-w-lg text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Take control of your finances
          </h2>
          <p className="max-w-md text-base text-white/80 sm:text-lg">
            Import your bank statements, auto-categorize transactions, and see exactly where your money goes — all in your browser.
          </p>
          <Button
            size="lg"
            onClick={onImportClick}
            className="mt-2 text-base shadow-lg"
          >
            <Upload className="size-5" data-icon="inline-start" />
            Import CSV to Get Started
          </Button>
        </div>
      </div>

      {/* Feature cards */}
      <div className="grid gap-4 pt-8 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="flex flex-col gap-3 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <f.icon className="size-5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">{f.title}</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {f.description}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
