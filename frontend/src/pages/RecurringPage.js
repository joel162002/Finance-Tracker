import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useCurrency } from '../context/CurrencyContext';
import { formatCurrency, CURRENCY_INFO } from '../utils/currency';
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
import { Plus, Edit, Trash2, Repeat, TrendingUp, TrendingDown, Pause, Play } from 'lucide-react';

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' }
];

export const RecurringPage = () => {
  const { currency } = useCurrency();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    currency: currency,
    description: '',
    category_or_product: '',
    frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    setFormData(prev => ({ ...prev, currency }));
  }, [currency]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/recurring');
      setTransactions(response.data);
    } catch (error) {
      toast.error('Failed to fetch recurring transactions');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      amount: '',
      currency: currency,
      description: '',
      category_or_product: '',
      frequency: 'monthly',
      start_date: new Date().toISOString().split('T')[0],
      end_date: ''
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!formData.description) {
      toast.error('Please enter a description');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        end_date: formData.end_date || null
      };
      
      if (editingItem) {
        await api.put(`/recurring/${editingItem.id}`, payload);
        toast.success('Recurring transaction updated');
      } else {
        await api.post('/recurring', payload);
        toast.success('Recurring transaction created');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchTransactions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save recurring transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      amount: item.amount.toString(),
      currency: item.currency || currency,
      description: item.description,
      category_or_product: item.category_or_product,
      frequency: item.frequency,
      start_date: item.start_date,
      end_date: item.end_date || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/recurring/${itemToDelete.id}`);
      toast.success('Recurring transaction deleted');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to delete recurring transaction');
    }
  };

  const handleToggle = async (item) => {
    try {
      const response = await api.post(`/recurring/${item.id}/toggle`);
      toast.success(response.data.is_active ? 'Recurring transaction activated' : 'Recurring transaction paused');
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to toggle recurring transaction');
    }
  };

  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Recurring Transactions
          </h1>
          <p className="text-slate-600 mt-1">Manage your recurring income and expenses</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
          data-testid="add-recurring-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Recurring
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Repeat className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No recurring transactions</h3>
          <p className="text-slate-500 mb-4">Set up recurring income or expenses to track regular transactions automatically.</p>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recurring Income */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Recurring Income</h2>
            </div>
            
            {incomeTransactions.length === 0 ? (
              <p className="text-slate-500 text-sm py-4">No recurring income set up</p>
            ) : (
              <div className="space-y-3">
                {incomeTransactions.map((item) => (
                  <div 
                    key={item.id}
                    className={`p-4 rounded-xl border ${item.is_active ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-slate-50 opacity-60'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-slate-900">{item.description}</p>
                        <p className="text-sm text-slate-500">{item.category_or_product} • {FREQUENCIES.find(f => f.value === item.frequency)?.label}</p>
                      </div>
                      <p className="text-lg font-semibold text-emerald-600">
                        +{formatCurrency(item.amount, item.currency || currency)}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="ghost" onClick={() => handleToggle(item)} className="text-slate-600">
                        {item.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(item)} className="text-slate-600">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setItemToDelete(item); setDeleteDialogOpen(true); }} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recurring Expenses */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Recurring Expenses</h2>
            </div>
            
            {expenseTransactions.length === 0 ? (
              <p className="text-slate-500 text-sm py-4">No recurring expenses set up</p>
            ) : (
              <div className="space-y-3">
                {expenseTransactions.map((item) => (
                  <div 
                    key={item.id}
                    className={`p-4 rounded-xl border ${item.is_active ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-slate-50 opacity-60'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-slate-900">{item.description}</p>
                        <p className="text-sm text-slate-500">{item.category_or_product} • {FREQUENCIES.find(f => f.value === item.frequency)?.label}</p>
                      </div>
                      <p className="text-lg font-semibold text-red-600">
                        -{formatCurrency(item.amount, item.currency || currency)}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="ghost" onClick={() => handleToggle(item)} className="text-slate-600">
                        {item.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(item)} className="text-slate-600">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setItemToDelete(item); setDeleteDialogOpen(true); }} className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add'} Recurring Transaction</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
              <Label>Description</Label>
              <Input
                placeholder="e.g., Monthly Salary, Netflix Subscription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{formData.type === 'income' ? 'Product/Source' : 'Category'}</Label>
              <Input
                placeholder={formData.type === 'income' ? 'e.g., Salary, Freelance' : 'e.g., Subscription, Utilities'}
                value={formData.category_or_product}
                onChange={(e) => setFormData({ ...formData, category_or_product: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={formData.frequency} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
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
            <AlertDialogTitle>Delete Recurring Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this recurring transaction. This action cannot be undone.
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
