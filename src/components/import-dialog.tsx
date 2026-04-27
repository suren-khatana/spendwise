import { useState, useCallback, useRef } from 'react';
import type { ImportResult } from '@/types';
import { useAppState } from '@/context/app-context';
import { parse } from '@/lib/csv-parser';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STEP_SELECT = 'select' as const;
const STEP_PREVIEW = 'preview' as const;
const STEP_DONE = 'done' as const;

type Step = typeof STEP_SELECT | typeof STEP_PREVIEW | typeof STEP_DONE;

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { importTransactions, storageError, dismissStorageError } = useAppState();
  const [step, setStep] = useState<Step>(STEP_SELECT);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [oversizedFiles, setOversizedFiles] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep(STEP_SELECT);
    setFiles([]);
    setResults([]);
    setOversizedFiles([]);
    setImporting(false);
    setImportedCount(0);
    setDuplicateCount(0);
    setIsDragging(false);
    dismissStorageError();
  }, [dismissStorageError]);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value) {
        reset();
      }
      onOpenChange(value);
    },
    [onOpenChange, reset],
  );

  const handleFiles = useCallback(
    async (selectedFiles: File[]) => {
      const csvFiles = selectedFiles.filter((f) => f.name.endsWith('.csv'));
      if (csvFiles.length === 0) return;

      const tooLarge = csvFiles.filter((f) => f.size > MAX_FILE_BYTES);
      const acceptable = csvFiles.filter((f) => f.size <= MAX_FILE_BYTES);
      setOversizedFiles(tooLarge.map((f) => f.name));
      setFiles(acceptable);

      const parseResults: ImportResult[] = [];
      for (const file of acceptable) {
        const text = await file.text();
        parseResults.push(parse(text, file.name));
      }
      setResults(parseResults);
      setStep(STEP_PREVIEW);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      void handleFiles(droppedFiles);
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      void handleFiles(selected);
    },
    [handleFiles],
  );

  const handleImport = useCallback(async () => {
    setImporting(true);
    const importResults = await importTransactions(files);
    const total = importResults.reduce((sum, r) => sum + r.transactions.length, 0);
    const errors = importResults.reduce((sum, r) => sum + r.errors.length, 0);
    const successCount = total - errors;
    setImportedCount(successCount);

    // Duplicates are handled internally by importTransactions;
    // we compute dupes from the preview vs what was actually added
    const totalParsed = results.reduce((sum, r) => sum + r.transactions.length, 0);
    setDuplicateCount(totalParsed - successCount);
    setStep(STEP_DONE);
    setImporting(false);
  }, [files, importTransactions, results]);

  const hasErrors = results.some((r) => r.errors.length > 0);
  const totalTransactions = results.reduce((sum, r) => sum + r.transactions.length, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import CSV Files</DialogTitle>
          <DialogDescription>
            {step === STEP_SELECT && 'Select bank statement CSV files to import.'}
            {step === STEP_PREVIEW && 'Review the files before importing.'}
            {step === STEP_DONE && 'Import complete.'}
          </DialogDescription>
        </DialogHeader>

        {step === STEP_SELECT && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          >
            <Upload className="size-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Drop CSV files here</p>
              <p className="text-sm text-muted-foreground">or click to browse</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
          </div>
        )}

        {step === STEP_PREVIEW && (
          <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      {r.fileName}
                    </TableCell>
                    <TableCell>{r.bankFormat || '—'}</TableCell>
                    <TableCell className="text-right">{r.transactions.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {hasErrors && (
              <div className="space-y-1">
                {results
                  .filter((r) => r.errors.length > 0)
                  .map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>
                        {r.fileName}: {r.errors.join(', ')}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {oversizedFiles.length > 0 && (
              <div className="space-y-1">
                {oversizedFiles.map((name) => (
                  <div key={name} className="flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{name}: file exceeds the 10 MB import limit and was skipped.</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === STEP_DONE && (
          <div className="flex flex-col items-center gap-3 py-4">
            {storageError ? (
              <>
                <AlertCircle className="size-10 text-destructive" />
                <div className="text-center">
                  <p className="font-medium">Storage error</p>
                  <p className="text-sm text-muted-foreground">{storageError}</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-10 text-green-600" />
                <div className="text-center">
                  <p className="font-medium">{importedCount} transactions imported</p>
                  {duplicateCount > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {duplicateCount} duplicates skipped
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {step === STEP_PREVIEW && (
            <>
              <Button variant="outline" onClick={() => reset()}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={importing || totalTransactions === 0}>
                {importing ? 'Importing…' : `Import ${totalTransactions} transactions`}
              </Button>
            </>
          )}
          {step === STEP_DONE && (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
