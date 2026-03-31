import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, Upload, Database, Trash2, RefreshCw, X, Loader2 } from 'lucide-react';
import api from '../utils/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Utility to clear all browser caches and force refresh
const clearBrowserCache = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({ type: 'CLEAR_CACHE' });
      }
    }
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

export const BackupRestore = () => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState({ status: '', current: 0, total: 0 });
  const [pendingBackup, setPendingBackup] = useState(null);
  const abortControllerRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleClearCacheAndRefresh = async () => {
    try {
      setRefreshing(true);
      await clearBrowserCache();
      toast.success('Cache cleared! Refreshing page...');
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);
    } catch (error) {
      toast.error('Failed to clear cache');
      setRefreshing(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setExporting(true);
      
      const [incomeRes, expenseRes, productsRes, categoriesRes, settingsRes] = await Promise.all([
        api.get('/income'),
        api.get('/expenses'),
        api.get('/products'),
        api.get('/categories'),
        api.get('/user/settings').catch(() => ({ data: { default_currency: 'PHP' } }))
      ]);

      const backup = {
        version: '2.0',
        exported_at: new Date().toISOString(),
        settings: settingsRes.data,
        data: {
          income: incomeRes.data,
          expenses: expenseRes.data,
          products: productsRes.data,
          categories: categoriesRes.data
        },
        summary: {
          total_income: incomeRes.data.reduce((sum, i) => sum + i.amount, 0),
          total_expenses: expenseRes.data.reduce((sum, e) => sum + e.amount, 0),
          income_count: incomeRes.data.length,
          expense_count: expenseRes.data.length
        }
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kitatracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Backup created! ${backup.summary.income_count} income + ${backup.summary.expense_count} expense entries`);
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Failed to create backup');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup file format');
      }

      // Store backup and open confirmation dialog
      setPendingBackup(backup);
      setRestoreDialogOpen(true);
    } catch (error) {
      console.error('File read error:', error);
      toast.error('Failed to read backup file. Please check file format.');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelRestore = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setImporting(false);
    setRestoreDialogOpen(false);
    setPendingBackup(null);
    setRestoreProgress({ status: '', current: 0, total: 0 });
  };

  const handleConfirmRestore = async () => {
    if (!pendingBackup) return;

    setImporting(true);
    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Clear existing data first
      setRestoreProgress({ status: 'Clearing existing data...', current: 0, total: 0 });
      await api.delete('/data/clear-all');

      // Check if cancelled
      if (abortControllerRef.current.signal.aborted) {
        throw new Error('Restore cancelled');
      }

      let importedIncome = 0;
      let importedExpenses = 0;
      const totalEntries = (pendingBackup.data.income?.length || 0) + (pendingBackup.data.expenses?.length || 0);

      // Step 2: Import income entries
      if (pendingBackup.data.income && pendingBackup.data.income.length > 0) {
        setRestoreProgress({ status: 'Importing income entries...', current: 0, total: totalEntries });
        
        for (const entry of pendingBackup.data.income) {
          if (abortControllerRef.current.signal.aborted) {
            throw new Error('Restore cancelled');
          }

          try {
            await api.post('/income', {
              date: entry.date,
              day: entry.day,
              amount: entry.amount,
              currency: entry.currency || 'PHP',
              product_name: entry.product_name,
              person_name: entry.person_name,
              notes: entry.notes || '',
              payment_status: entry.payment_status || 'Paid',
              reference_number: entry.reference_number || ''
            });
            importedIncome++;
            setRestoreProgress(prev => ({ 
              ...prev, 
              status: `Importing income entries... (${importedIncome}/${pendingBackup.data.income.length})`,
              current: importedIncome 
            }));
          } catch (err) {
            console.error('Failed to import income entry:', err);
          }
        }
      }

      // Step 3: Import expense entries
      if (pendingBackup.data.expenses && pendingBackup.data.expenses.length > 0) {
        setRestoreProgress({ 
          status: 'Importing expense entries...', 
          current: importedIncome, 
          total: totalEntries 
        });
        
        for (const entry of pendingBackup.data.expenses) {
          if (abortControllerRef.current.signal.aborted) {
            throw new Error('Restore cancelled');
          }

          try {
            await api.post('/expenses', {
              date: entry.date,
              day: entry.day,
              amount: entry.amount,
              currency: entry.currency || 'PHP',
              description: entry.description,
              category_name: entry.category_name,
              notes: entry.notes || '',
              payment_method: entry.payment_method || 'Cash',
              reference_number: entry.reference_number || ''
            });
            importedExpenses++;
            setRestoreProgress(prev => ({ 
              ...prev, 
              status: `Importing expense entries... (${importedExpenses}/${pendingBackup.data.expenses.length})`,
              current: importedIncome + importedExpenses 
            }));
          } catch (err) {
            console.error('Failed to import expense entry:', err);
          }
        }
      }

      // Step 4: Restore settings if available
      if (pendingBackup.settings) {
        setRestoreProgress({ status: 'Restoring settings...', current: totalEntries, total: totalEntries });
        try {
          await api.put('/user/settings', pendingBackup.settings);
        } catch (err) {
          console.error('Failed to restore settings:', err);
        }
      }

      setRestoreProgress({ status: 'Complete!', current: totalEntries, total: totalEntries });
      toast.success(`Restored ${importedIncome} income + ${importedExpenses} expense entries`);
      
      setTimeout(() => {
        setRestoreDialogOpen(false);
        setPendingBackup(null);
        setImporting(false);
        setRestoreProgress({ status: '', current: 0, total: 0 });
        window.location.reload();
      }, 1500);

    } catch (error) {
      if (error.message === 'Restore cancelled') {
        toast.info('Restore cancelled');
      } else {
        console.error('Import error:', error);
        toast.error('Failed to restore backup');
      }
      setImporting(false);
      setRestoreProgress({ status: '', current: 0, total: 0 });
    }
  };

  const handleClearAllData = async () => {
    try {
      const response = await api.delete('/data/clear-all');
      const { deleted } = response.data;
      toast.success(`Cleared ${deleted.income_entries} income and ${deleted.expense_entries} expense entries`);
      setClearDialogOpen(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Clear data error:', error);
      toast.error('Failed to clear data');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 border-slate-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Export Backup</h3>
            <p className="text-sm text-slate-600 mb-4">
              Download all your income and expense data as a JSON file
            </p>
            <Button
              onClick={handleExportBackup}
              disabled={exporting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              data-testid="export-backup-button"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export Backup'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-slate-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <Upload className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Restore Backup</h3>
            <p className="text-sm text-slate-600 mb-4">
              Upload a backup file to restore your data. <strong>This will replace all existing data.</strong>
            </p>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                id="backup-file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                disabled={importing}
                data-testid="backup-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer font-medium transition-colors disabled:opacity-50"
                data-testid="import-backup-button"
              >
                <Upload className="w-4 h-4 mr-2" />
                {importing ? 'Restoring...' : 'Restore Backup'}
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-amber-200 bg-amber-50/50">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-amber-900 mb-1">Sync & Refresh</h3>
            <p className="text-sm text-amber-700 mb-4">
              Clear browser cache and reload fresh data from server.
            </p>
            <Button
              onClick={handleClearCacheAndRefresh}
              disabled={refreshing}
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              data-testid="clear-cache-button"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Clear Cache & Refresh'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-red-200 bg-red-50/50">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900 mb-1">Clear All Data</h3>
            <p className="text-sm text-red-700 mb-4">
              Permanently delete all income and expense entries. This cannot be undone!
            </p>
            <Button
              onClick={() => setClearDialogOpen(true)}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
              data-testid="clear-all-data-button"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
          </div>
        </div>
      </Card>

      {/* Restore Confirmation & Progress Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-md" 
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {importing ? 'Restoring Backup...' : 'Confirm Restore'}
            </DialogTitle>
          </DialogHeader>
          
          {!importing ? (
            <>
              <div className="py-4">
                <p className="text-sm text-slate-600 mb-4">
                  This will <strong>replace all your existing data</strong> with the backup file contents:
                </p>
                {pendingBackup && (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm"><strong>Backup Date:</strong> {new Date(pendingBackup.exported_at).toLocaleString()}</p>
                    <p className="text-sm"><strong>Income Entries:</strong> {pendingBackup.data.income?.length || 0}</p>
                    <p className="text-sm"><strong>Expense Entries:</strong> {pendingBackup.data.expenses?.length || 0}</p>
                  </div>
                )}
                <p className="text-sm text-red-600 mt-4">
                  ⚠️ Your current data will be permanently deleted before importing.
                </p>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleCancelRestore}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmRestore} className="bg-emerald-600 hover:bg-emerald-700">
                  Yes, Restore Backup
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="py-6">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                  <p className="text-sm text-slate-600 text-center">{restoreProgress.status}</p>
                  {restoreProgress.total > 0 && (
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(restoreProgress.current / restoreProgress.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={handleCancelRestore}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Restore
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear All Data Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ALL your income and expense entries.
              This action cannot be undone. Make sure you have exported a backup first!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAllData} className="bg-red-600 hover:bg-red-700">
              Yes, Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
