import { useMemo } from 'react';
import { useAppState } from '@/context/app-context';
import { computeSummary } from '@/lib/financial-calculator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const eurFormatter = new Intl.NumberFormat('fi-FI', {
  style: 'currency',
  currency: 'EUR',
});

export function SummaryCards() {
  const { categorizedTransactions, dateRange } = useAppState();

  const summary = useMemo(
    () => computeSummary(categorizedTransactions, dateRange),
    [categorizedTransactions, dateRange],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="size-4 text-green-600" />
            Income
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600">
            {eurFormatter.format(summary.totalIncome)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingDown className="size-4 text-red-600" />
            Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-red-600">
            {eurFormatter.format(Math.abs(summary.totalExpenses))}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wallet className="size-4 text-blue-600" />
            Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={`text-2xl font-bold ${
              summary.balance >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {eurFormatter.format(summary.balance)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
