import { useMemo, useState } from 'react';
import { useAppState } from '@/context/app-context';
import { format as formatDate } from 'date-fns';
import { ArrowUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type SortField = 'date' | 'amount';
type SortDir = 'asc' | 'desc';

const ALL_CATEGORIES = '__all__';
const ALL_SOURCES = '__all_sources__';

const eurFormatter = new Intl.NumberFormat('fi-FI', {
  style: 'currency',
  currency: 'EUR',
});

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  Income: 'bg-green-100 text-green-800',
  Exclusions: 'bg-gray-100 text-gray-500',
  Supermarket: 'bg-orange-100 text-orange-800',
  Travel: 'bg-blue-100 text-blue-800',
  Shopping: 'bg-purple-100 text-purple-800',
  Utilities: 'bg-cyan-100 text-cyan-800',
  Education: 'bg-indigo-100 text-indigo-800',
  Rent: 'bg-rose-100 text-rose-800',
  Miscellaneous: 'bg-yellow-100 text-yellow-800',
};

export function TransactionTable() {
  const { categorizedTransactions, dateRange, categories } = useAppState();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [sourceFilter, setSourceFilter] = useState(ALL_SOURCES);

  const filteredAndSorted = useMemo(() => {
    let items = categorizedTransactions.filter(
      (tx) => tx.date >= dateRange.start && tx.date <= dateRange.end,
    );

    if (categoryFilter !== ALL_CATEGORIES) {
      items = items.filter((tx) => tx.category === categoryFilter);
    }

    if (sourceFilter !== ALL_SOURCES) {
      items = items.filter((tx) => tx.source === sourceFilter);
    }

    items.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'date') {
        return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) * mul;
      }
      return (a.amount - b.amount) * mul;
    });

    return items;
  }, [categorizedTransactions, dateRange, categoryFilter, sourceFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'date' ? 'desc' : 'asc');
    }
  };

  const categoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories],
  );

  const sourceNames = useMemo(() => {
    const sources = new Set(categorizedTransactions.map((tx) => tx.source).filter(Boolean));
    return Array.from(sources).sort();
  }, [categorizedTransactions]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Transactions ({filteredAndSorted.length})
        </h3>
        <div className="flex items-center gap-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SOURCES}>All Sources</SelectItem>
              {sourceNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>All Categories</SelectItem>
              {categoryNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => toggleSort('date')}
                  className="gap-1"
                >
                  Date
                  <ArrowUpDown className="size-3" />
                </Button>
              </TableHead>
              <TableHead>Description</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => toggleSort('amount')}
                  className="gap-1"
                >
                  Amount
                  <ArrowUpDown className="size-3" />
                </Button>
              </TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No transactions in this period
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSorted.map((tx, i) => (
                <TableRow key={`${tx.date}-${tx.amount}-${tx.description}-${i}`}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(new Date(tx.date), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">{tx.description}</TableCell>
                  <TableCell
                    className={tx.amount >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}
                  >
                    {eurFormatter.format(tx.amount)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {tx.source}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={CATEGORY_BADGE_COLORS[tx.category] ?? 'bg-secondary text-secondary-foreground'}
                    >
                      {tx.category}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
