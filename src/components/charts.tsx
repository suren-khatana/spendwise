import { useMemo } from 'react';
import { useAppState } from '@/context/app-context';
import { computeSummary } from '@/lib/financial-calculator';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

const CATEGORY_COLOR_MAP: Record<string, string> = {
  Supermarket: '#2563eb',
  Rent: '#dc2626',
  Utilities: '#16a34a',
  Travel: '#7c3aed',
  Shopping: '#ea580c',
  Education: '#0891b2',
  Miscellaneous: '#ca8a04',
};

const FALLBACK_COLORS = [
  '#e11d48', '#65a30d', '#c026d3', '#14b8a6',
  '#6366f1', '#f59e0b', '#06b6d4', '#84cc16',
];

function getCategoryColor(name: string, idx: number): string {
  return CATEGORY_COLOR_MAP[name] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

const eurFormatter = new Intl.NumberFormat('fi-FI', {
  style: 'currency',
  currency: 'EUR',
});

export function Charts() {
  const { categorizedTransactions, dateRange } = useAppState();

  const summary = useMemo(
    () => computeSummary(categorizedTransactions, dateRange),
    [categorizedTransactions, dateRange],
  );

  const barData = useMemo(
    () => [
      { name: 'Income', value: summary.totalIncome, fill: '#16a34a' },
      { name: 'Expenses', value: Math.abs(summary.totalExpenses), fill: '#dc2626' },
      { name: 'Balance', value: summary.balance, fill: '#2563eb' },
    ],
    [summary],
  );

  const pieData = useMemo(() => {
    return Object.entries(summary.byCategory)
      .filter(([name]) => name !== 'Income' && name !== 'Exclusions')
      .map(([name, value]) => ({ name, value: Math.abs(value) }))
      .filter((d) => d.value > 0);
  }, [summary]);

  if (categorizedTransactions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border p-4">
        <h3 className="mb-4 text-sm font-medium">Overview</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              formatter={(value) => eurFormatter.format(Number(value))}
              contentStyle={{ borderRadius: '8px', fontSize: '0.875rem' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {barData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border p-4">
        <h3 className="mb-4 text-sm font-medium">Expenses by Category</h3>
        {pieData.length > 0 ? (
          <div className="flex items-center gap-1">
            <div className="shrink-0">
              <ResponsiveContainer width={260} height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={entry.name} fill={getCategoryColor(entry.name, i)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => eurFormatter.format(Number(value))}
                    contentStyle={{ borderRadius: '8px', fontSize: '0.875rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: getCategoryColor(entry.name, i) }}
                  />
                  <span className="truncate text-muted-foreground">{entry.name}</span>
                  <span className="ml-auto shrink-0 font-medium tabular-nums">
                    {eurFormatter.format(entry.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No expense data for this period
          </div>
        )}
      </div>
    </div>
  );
}
