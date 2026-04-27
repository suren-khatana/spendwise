import { useState, useCallback } from 'react';
import type { CategoryConfig } from '@/types';
import { useAppState } from '@/context/app-context';
import { exportToCsv } from '@/lib/storage';
import { X, Plus, Download, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { categories, updateCategories, categorizedTransactions, clearAllData } = useAppState();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [keywordInputs, setKeywordInputs] = useState<Record<string, string>>({});
  const [confirmClear, setConfirmClear] = useState(false);

  const addCategory = useCallback(() => {
    const name = newCategoryName.trim();
    if (!name || categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;

    const misc = categories.find((c) => c.name === 'Miscellaneous');
    const withoutMisc = categories.filter((c) => c.name !== 'Miscellaneous');
    const newCat: CategoryConfig = { name, keywords: [], isProtected: false };
    updateCategories([...withoutMisc, newCat, ...(misc ? [misc] : [])]);
    setNewCategoryName('');
  }, [newCategoryName, categories, updateCategories]);

  const deleteCategory = useCallback(
    (name: string) => {
      updateCategories(categories.filter((c) => c.name !== name));
    },
    [categories, updateCategories],
  );

  const addKeyword = useCallback(
    (categoryName: string) => {
      const keyword = (keywordInputs[categoryName] ?? '').trim();
      if (!keyword) return;

      updateCategories(
        categories.map((c) =>
          c.name === categoryName
            ? { ...c, keywords: [...c.keywords, keyword] }
            : c,
        ),
      );
      setKeywordInputs((prev) => ({ ...prev, [categoryName]: '' }));
    },
    [categories, updateCategories, keywordInputs],
  );

  const removeKeyword = useCallback(
    (categoryName: string, keyword: string) => {
      updateCategories(
        categories.map((c) =>
          c.name === categoryName
            ? { ...c, keywords: c.keywords.filter((k) => k !== keyword) }
            : c,
        ),
      );
    },
    [categories, updateCategories],
  );

  const handleExport = useCallback(() => {
    const csv = exportToCsv(categorizedTransactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'expenses.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, [categorizedTransactions]);

  const handleClearConfirm = useCallback(() => {
    clearAllData();
    setConfirmClear(false);
  }, [clearAllData]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
            <SheetDescription>Manage categories and data.</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-8">
            {/* Add new category */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Add New Category</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCategory();
                  }}
                />
                <Button size="sm" onClick={addCategory}>
                  <Plus className="size-4" data-icon="inline-start" />
                  Add
                </Button>
              </div>
            </div>

            {/* Category list */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Categories</h4>
              {categories.map((cat) => (
                <div key={cat.name} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{cat.name}</span>
                    {!cat.isProtected && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => deleteCategory(cat.name)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {cat.name === 'Miscellaneous' ? (
                    <span className="text-xs text-muted-foreground">
                      Catch-all for uncategorized transactions
                    </span>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1">
                        {cat.keywords.map((kw) => (
                          <Badge key={kw} variant="secondary" className="gap-1">
                            {kw}
                            <button
                              type="button"
                              onClick={() => removeKeyword(cat.name, kw)}
                              className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                        {cat.keywords.length === 0 && (
                          <span className="text-xs text-muted-foreground">No keywords</span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Add keyword"
                          className="h-7 text-xs"
                          value={keywordInputs[cat.name] ?? ''}
                          onChange={(e) =>
                            setKeywordInputs((prev) => ({
                              ...prev,
                              [cat.name]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addKeyword(cat.name);
                          }}
                        />
                        <Button size="xs" variant="outline" onClick={() => addKeyword(cat.name)}>
                          Add
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Data Management */}
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-medium">Data Management</h4>
              <Button variant="outline" className="w-full" onClick={handleExport}>
                <Download className="size-4" data-icon="inline-start" />
                Export to CSV
              </Button>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setConfirmClear(true)}
              >
                <Trash2 className="size-4" data-icon="inline-start" />
                Clear All Data
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear All Data?</DialogTitle>
            <DialogDescription>
              This will permanently delete all transactions, categories, and settings. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearConfirm}>
              Clear Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
