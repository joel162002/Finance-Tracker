import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, Upload, Database, Trash2 } from 'lucide-react';
import axios from 'axios';
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const BackupRestore = () => {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const handleExportBackup = async () => {
    try {
      setExporting(true);
      
      // Fetch all data
      const [incomeRes, expenseRes, productsRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/income`),
        axios.get(`${API}/expenses`),
        axios.get(`${API}/products`),
        axios.get(`${API}/categories`)
      ]);

      const backup = {
        version: '1.0',
        exported_at: new Date().toISOString(),
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

      // Download as JSON
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`;
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

  const handleImportBackup = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup file format');
      }

      let importedIncome = 0;
      let importedExpenses = 0;

      // Import income
      if (backup.data.income) {
        for (const entry of backup.data.income) {
          try {
            await axios.post(`${API}/income`, {
              date: entry.date,
              day: entry.day,
              amount: entry.amount,
              product_name: entry.product_name,
              person_name: entry.person_name,
              notes: entry.notes || '',
              payment_status: entry.payment_status,
              reference_number: entry.reference_number || ''
            });
            importedIncome++;
          } catch (err) {
            console.error('Failed to import income entry:', err);
          }
        }
      }

      // Import expenses
      if (backup.data.expenses) {
        for (const entry of backup.data.expenses) {
          try {
            await axios.post(`${API}/expenses`, {
              date: entry.date,
              day: entry.day,
              amount: entry.amount,
              description: entry.description,
              category_name: entry.category_name,
              notes: entry.notes || '',
              payment_method: entry.payment_method || 'Cash',
              reference_number: entry.reference_number || ''
            });
            importedExpenses++;
          } catch (err) {
            console.error('Failed to import expense entry:', err);
          }
        }
      }

      toast.success(`Restored ${importedIncome} income + ${importedExpenses} expense entries`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to restore backup. Please check file format.');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleClearAllData = async () => {
    try {
      // Use bulk delete endpoint for efficiency and reliability
      const response = await axios.delete(`${API}/data/clear-all`);
      
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
              Upload a previously exported backup file to restore your data
            </p>
            <div>
              <input
                type="file"
                id="backup-file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
                disabled={importing}
              />
              <Label htmlFor="backup-file">
                <Button
                  as="span"
                  disabled={importing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
                  data-testid="import-backup-button"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {importing ? 'Restoring...' : 'Restore Backup'}
                </Button>
              </Label>
            </div>
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
