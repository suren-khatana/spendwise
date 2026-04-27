import { useState, useCallback } from 'react';
import { AppProvider, useAppState } from '@/context/app-context';
import { TopBar } from '@/components/top-bar';
import { ImportDialog } from '@/components/import-dialog';
import { DateRangeSelector } from '@/components/date-range-selector';
import { SummaryCards } from '@/components/summary-cards';
import { Charts } from '@/components/charts';
import { TransactionTable } from '@/components/transaction-table';
import { SettingsPanel } from '@/components/settings-panel';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function AppContent() {
  const { transactions, clearAllData } = useAppState();
  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const hasTransactions = transactions.length > 0;

  const handleClearConfirm = useCallback(() => {
    clearAllData();
    setConfirmClear(false);
  }, [clearAllData]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar
        onImportClick={() => setImportOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
        onClearClick={hasTransactions ? () => setConfirmClear(true) : undefined}
      />
      <main className="container mx-auto p-4 space-y-6">
        {hasTransactions ? (
          <>
            <DateRangeSelector />
            <SummaryCards />
            <Charts />
            <TransactionTable />
          </>
        ) : (
          <EmptyState onImportClick={() => setImportOpen(true)} />
        )}
      </main>
      <footer className="py-6 text-center text-[11px] text-muted-foreground/60">
        Made by Suren with ❤️
      </footer>
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <SettingsPanel open={settingsOpen} onOpenChange={setSettingsOpen} />
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
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
