import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useCurrency } from '../context/CurrencyContext';
import { CURRENCY_INFO } from '../utils/currency';
import { getCurrentMonth } from '../utils/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';
import { Plus, Edit, Trash2, PiggyBank, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'Total (All Expenses)',
  'Food',
  'Transportation',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Education',
  'Personal',
  'Other'
];

export const BudgetsPage = () => {
  const { currency, formatCurrency } = useCurrency();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState([]);

  const [formData, setFormData] = useState({
    category: 'total',
    limit_amount: '',
    currency: currency,
    alert_threshold: '80'
  });

  useEffect(() => {
    fetchBudgetStatus();
    fetchExpenseCategories();
  }, [selectedMonth]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, currency }));
  }, [currency]);

  const fetchExpenseCategories = async () => {
    try {
      const response = await api.get('/suggestions/categories');
      const categories = response.data.suggestions || [];
      setExpenseCategories(categories);
    } catch (error) {
      console.error('Failed to fetch expense categories:', error);
    }
  };

  // Combine default and expense categories, remove duplicates
  const allCategories = [...new Set([
    'Total (All Expenses)',
    ...expenseCategories,
    ...DEFAULT_CATEGORIES.filter(c => c !== 'Total (All Expenses)')
  ])];

  const fetchBudgetStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/budgets/status', { params: { month: selectedMonth } });
      setBudgetStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch budget status:', error);
      setBudgetStatus({ budgets: [], alerts: [], total_spending: 0, spending_by_category: {} });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      category: 'total',
      limit_amount: '',
      currency: currency,
      alert_threshold: '80'
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.limit_amount || parseFloat(formData.limit_amount) <= 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        category: formData.category === 'Total (All Expenses)' ? 'total' : formData.category,
        month: selectedMonth,
        limit_amount: parseFloat(formData.limit_amount),
        currency: formData.currency,
        alert_threshold: parseFloat(formData.alert_threshold)
      };
      
      if (editingItem) {
        await api.put(`/budgets/${editingItem.id}`, payload);
        toast.success('Budget updated');
      } else {
        await api.post('/budgets', payload);
        toast.success('Budget created');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchBudgetStatus();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (budget) => {
    setEditingItem(budget);
    setFormData({
      category: budget.category === 'total' ? 'Total (All Expenses)' : budget.category,
      limit_amount: budget.limit_amount.toString(),
      currency: budget.currency || currency,
      alert_threshold: (budget.alert_threshold || 80).toString()
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/budgets/${itemToDelete.id}`);
      toast.success('Budget deleted');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchBudgetStatus();
    } catch (error) {
      toast.error('Failed to delete budget');
    }
  };

  const getProgressColor = (percentage, isOver) => {
    if (isOver || percentage >= 100) return 'bg-red-500';
    if (percentage >= 90) return 'bg-orange-500';
    if (percentage >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const months = [];
  const currentDate = new Date();
  for (let i = -3; i <= 6; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'long', year: 'numeric' })
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Budget Limits
          </h1>
          <p className="text-slate-600 mt-1">Set spending limits and track your budget</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
            data-testid="add-budget-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Budget
          </Button>
        </div>
      </div>

      {/* Alerts Section */}
      {budgetStatus?.alerts && budgetStatus.alerts.length > 0 && (
        <div className="space-y-3">
          {budgetStatus.alerts.map((alert, idx) => (
            <div 
              key={idx}
              className={`p-4 rounded-xl flex items-center gap-3 ${
                alert.type === 'over_budget' 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-amber-50 border border-amber-200'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                alert.type === 'over_budget' ? 'text-red-600' : 'text-amber-600'
              }`} />
              <p className={`text-sm font-medium ${
                alert.type === 'over_budget' ? 'text-red-800' : 'text-amber-800'
              }`}>
                {alert.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        </div>
      ) : !budgetStatus?.budgets || budgetStatus.budgets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <PiggyBank className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No budgets set</h3>
          <p className="text-slate-500 mb-4">Create budget limits to track and control your spending.</p>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Set Your First Budget
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgetStatus.budgets.map((budget) => (
            <div 
              key={budget.id}
              className={`bg-white rounded-2xl border p-6 ${
                budget.is_over_budget 
                  ? 'border-red-200' 
                  : budget.is_alert 
                    ? 'border-amber-200' 
                    : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    budget.is_over_budget 
                      ? 'bg-red-100' 
                      : budget.is_alert 
                        ? 'bg-amber-100' 
                        : 'bg-emerald-100'
                  }`}>
                    {budget.is_over_budget ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : budget.is_alert ? (
                      <TrendingDown className="w-5 h-5 text-amber-600" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {budget.category === 'total' ? 'Total Budget' : budget.category}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {budget.percentage}% used
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(budget)} className="text-slate-600 h-8 w-8 p-0">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setItemToDelete(budget); setDeleteDialogOpen(true); }} className="text-red-600 h-8 w-8 p-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Spent</span>
                  <span className={`font-semibold ${budget.is_over_budget ? 'text-red-600' : 'text-slate-900'}`}>
                    {formatCurrency(budget.spent, budget.currency)}
                  </span>
                </div>
                
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${getProgressColor(budget.percentage, budget.is_over_budget)}`}
                    style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Budget</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(budget.limit_amount, budget.currency)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Remaining</span>
                    <span className={`font-semibold ${budget.remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {budget.remaining < 0 ? '-' : ''}{formatCurrency(Math.abs(budget.remaining), budget.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Spending Summary */}
      {budgetStatus?.spending_by_category && Object.keys(budgetStatus.spending_by_category).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Spending by Category</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(budgetStatus.spending_by_category).map(([category, amount]) => (
              <div key={category} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-700">{category}</span>
                <span className="font-semibold text-slate-900">{formatCurrency(amount, currency)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
            <span className="text-lg font-medium text-slate-700">Total Spending</span>
            <span className="text-xl font-bold text-slate-900">
              {formatCurrency(budgetStatus.total_spending, currency)}
            </span>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Set'} Budget Limit</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Budget Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.limit_amount}
                  onChange={(e) => setFormData({ ...formData, limit_amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData({ ...formData, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CURRENCY_INFO).map(([code, info]) => (
                      <SelectItem key={code} value={code}>{info.symbol} {code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Alert Threshold (%)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                placeholder="80"
                value={formData.alert_threshold}
                onChange={(e) => setFormData({ ...formData, alert_threshold: e.target.value })}
              />
              <p className="text-xs text-slate-500">You'll get a warning when spending reaches this percentage</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this budget limit. You can create a new one anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
