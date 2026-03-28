import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/currency';
import { formatDate, getDayName, getCurrentMonth, formatDateForInput } from '../utils/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus, Edit, Trash2, Search, Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [filters, setFilters] = useState({
    month: '2025-03',
    search: '',
    category_name: ''
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    day: getDayName(new Date().toISOString()),
    amount: '',
    description: '',
    category_name: '',
    notes: '',
    payment_method: 'Cash',
    reference_number: ''
  });

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
  }, [filters]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.month) params.month = filters.month;
      if (filters.search) params.search = filters.search;
      if (filters.category_name) params.category_name = filters.category_name;

      const response = await axios.get(`${API}/expenses`, { params });
      setExpenses(response.data);
    } catch (error) {
      toast.error('Failed to fetch expense data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/suggestions/categories`);
      setCategories(response.data.suggestions);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingItem) {
        await axios.put(`${API}/expenses/${editingItem.id}`, formData);
        toast.success('Expense entry updated successfully');
      } else {
        await axios.post(`${API}/expenses`, formData);
        toast.success('Expense entry added successfully');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to save expense entry');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      date: formatDateForInput(item.date),
      day: item.day,
      amount: item.amount,
      description: item.description,
      category_name: item.category_name,
      notes: item.notes || '',
      payment_method: item.payment_method || 'Cash',
      reference_number: item.reference_number || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/expenses/${itemToDelete.id}`);
      toast.success('Expense entry deleted successfully');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to delete expense entry');
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      day: getDayName(new Date().toISOString()),
      amount: '',
      description: '',
      category_name: '',
      notes: '',
      payment_method: 'Cash',
      reference_number: ''
    });
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      date,
      day: getDayName(date)
    }));
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/export/expenses`, {
        params: { month: filters.month },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `expenses_${filters.month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Expense data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-light text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Expenses
            </h1>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-600">
              Manage and track your expense entries
            </p>
          </div>

          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button
                  className="bg-red-600 text-white hover:bg-red-700 rounded-xl px-4 sm:px-6 py-2.5 text-sm transition-all hover:-translate-y-0.5"
                  data-testid="add-expense-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Expense Entry' : 'Add New Expense'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="rounded-xl bg-slate-50"
                    data-testid="expense-date-input"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="day">Day</Label>
                  <Input
                    id="day"
                    value={formData.day}
                    readOnly
                    className="rounded-xl bg-slate-100"
                    data-testid="expense-day-input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="500"
                  className="rounded-xl bg-slate-50"
                  data-testid="expense-amount-input"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What did you spend on?"
                  className="rounded-xl bg-slate-50"
                  data-testid="expense-description-input"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category_name">Category</Label>
                <Input
                  id="category_name"
                  list="categories"
                  value={formData.category_name}
                  onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                  placeholder="Select or type category"
                  className="rounded-xl bg-slate-50"
                  data-testid="expense-category-input"
                  required
                />
                <datalist id="categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger className="rounded-xl bg-slate-50" data-testid="expense-payment-select">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="GCash">GCash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reference_number">Reference Number (Optional)</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="REF-001"
                  className="rounded-xl bg-slate-50"
                  data-testid="expense-reference-input"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  className="rounded-xl bg-slate-50"
                  data-testid="expense-notes-input"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-red-600 text-white hover:bg-red-700 rounded-xl"
                  data-testid="expense-submit-button"
                >
                  {editingItem ? 'Update' : 'Add'} Expense
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200" data-testid="total-expenses-summary">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Total Expenses</p>
          <p className="text-2xl font-medium text-red-600" style={{ fontFamily: 'Outfit, sans-serif' }}>{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200" data-testid="expense-count-summary">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Total Transactions</p>
          <p className="text-2xl font-medium text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>{expenses.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search expense entries..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 rounded-xl bg-slate-50 text-sm"
                data-testid="expense-search-input"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="month"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm"
              data-testid="expense-month-filter"
            />
            <Button
              onClick={handleExport}
              variant="outline"
              className="rounded-xl text-sm whitespace-nowrap"
              data-testid="export-expense-button"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-600 text-sm">Loading expense data...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">No expense entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full" data-testid="expense-table">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Date</th>
                  <th className="text-right py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Amount</th>
                  <th className="text-left py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Description</th>
                  <th className="text-left py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Category</th>
                  <th className="text-left py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Payment</th>
                  <th className="text-right py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors" data-testid="expense-row">
                    <td className="py-4 px-2 text-sm text-slate-700">{formatDate(item.date)}</td>
                    <td className="py-4 px-2 text-right text-sm font-medium text-red-600">{formatCurrency(item.amount)}</td>
                    <td className="py-4 px-2 text-sm text-slate-900">{item.description}</td>
                    <td className="py-4 px-2">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {item.category_name}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-sm text-slate-700">{item.payment_method}</td>
                    <td className="py-4 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleEdit(item)}
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-slate-900"
                          data-testid="expense-edit-button"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setItemToDelete(item);
                            setDeleteDialogOpen(true);
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          data-testid="expense-delete-button"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this expense entry. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
