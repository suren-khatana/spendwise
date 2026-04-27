import { useMemo, useState } from 'react';
import { useAppState } from '@/context/app-context';
import { format, startOfMonth, endOfMonth, parse } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function DateRangeSelector() {
  const { transactions, dateRange, setDateRange } = useAppState();
  const [mode, setMode] = useState<'monthly' | 'custom'>('monthly');

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    for (const tx of transactions) {
      const d = tx.date.substring(0, 7); // "YYYY-MM"
      monthSet.add(d);
    }
    return Array.from(monthSet).sort().reverse();
  }, [transactions]);

  const currentMonthKey = dateRange.start.substring(0, 7);

  const handleMonthChange = (value: string) => {
    const date = parse(value, 'yyyy-MM', new Date());
    setDateRange({
      start: format(startOfMonth(date), 'yyyy-MM-dd'),
      end: format(endOfMonth(date), 'yyyy-MM-dd'),
    });
  };

  const formatMonthLabel = (key: string) => {
    const date = parse(key, 'yyyy-MM', new Date());
    return format(date, 'MMMM yyyy');
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={mode} onValueChange={(v) => setMode(v as 'monthly' | 'custom')}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="monthly">Monthly</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {mode === 'monthly' && (
        <Select value={currentMonthKey} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {/*
              Always render an item for the currently-selected month, even
              if it has no data. Without this, Radix Select would show the
              placeholder instead of the value when the user (e.g. via custom
              mode → switch back) ends up on a month outside the dataset.
            */}
            {!availableMonths.includes(currentMonthKey) && (
              <SelectItem value={currentMonthKey}>
                {formatMonthLabel(currentMonthKey)} (no data)
              </SelectItem>
            )}
            {availableMonths.map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {mode === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="w-40"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="w-40"
          />
        </div>
      )}
    </div>
  );
}
