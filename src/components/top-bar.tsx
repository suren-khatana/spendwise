import { Upload, Settings, Wallet, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  onImportClick: () => void;
  onSettingsClick: () => void;
  onClearClick?: () => void;
}

export function TopBar({ onImportClick, onSettingsClick, onClearClick }: TopBarProps) {
  return (
    <div className="border-b bg-card">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Wallet className="size-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">Spendwise</h1>
        </div>
        <div className="flex items-center gap-2">
          {onClearClick && (
            <Button variant="destructive" size="sm" onClick={onClearClick} className="bg-destructive text-white hover:bg-destructive/90">
              <Trash2 className="size-4" data-icon="inline-start" />
              Clear Data
            </Button>
          )}
          <Button size="sm" onClick={onImportClick}>
            <Upload className="size-4" data-icon="inline-start" />
            Import CSV
          </Button>
          <Button variant="outline" size="icon" onClick={onSettingsClick}>
            <Settings className="size-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
