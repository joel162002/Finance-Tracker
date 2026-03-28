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
import { Plus, Edit, Trash2, Search, Filter, Download } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const IncomePage = () => {
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  const [filters, setFilters] = useState({
    month: '2025-03',
    search: '',
    product_name: '',
    person_name: '',
    payment_status: ''
  });

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    day: getDayName(new Date().toISOString()),
    amount: '',
    product_name: '',
    person_name: '',
    notes: '',
    payment_status: 'Paid',
    reference_number: ''
  });

  const [suggestions, setSuggestions] = useState({
    products: [],
    persons: []
  });

  useEffect(() => {
    fetchIncome();
    fetchSuggestions();
  }, [filters]);

  const fetchIncome = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.month) params.month = filters.month;
      if (filters.search) params.search = filters.search;
      if (filters.product_name) params.product_name = filters.product_name;
      if (filters.person_name) params.person_name = filters.person_name;
      if (filters.payment_status) params.payment_status = filters.payment_status;

      const response = await axios.get(`${API}/income`, { params });
      setIncome(response.data);
    } catch (error) {
      toast.error('Failed to fetch income data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const [productsRes, personsRes] = await Promise.all([
        axios.get(`${API}/suggestions/products`),
        axios.get(`${API}/suggestions/persons`)
      ]);
      setSuggestions({
        products: productsRes.data.suggestions,
        persons: personsRes.data.suggestions
      });
    } catch (error) {
      console.error('Failed to fetch suggestions');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingItem) {
        await axios.put(`${API}/income/${editingItem.id}`, formData);
        toast.success('Income entry updated successfully');
      } else {
        await axios.post(`${API}/income`, formData);
        toast.success('Income entry added successfully');
      }
      
      setDialogOpen(false);
      resetForm();
      fetchIncome();
      fetchSuggestions();
    } catch (error) {
      toast.error('Failed to save income entry');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      date: formatDateForInput(item.date),
      day: item.day,
      amount: item.amount,
      product_name: item.product_name,
      person_name: item.person_name,
      notes: item.notes || '',
      payment_status: item.payment_status,
      reference_number: item.reference_number || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/income/${itemToDelete.id}`);
      toast.success('Income entry deleted successfully');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchIncome();
    } catch (error) {
      toast.error('Failed to delete income entry');
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      day: getDayName(new Date().toISOString()),
      amount: '',
      product_name: '',
      person_name: '',
      notes: '',
      payment_status: 'Paid',
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
      const response = await axios.get(`${API}/export/income`, {
        params: { month: filters.month },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `income_${filters.month}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Income data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
  const paidIncome = income.filter(i => i.payment_status === 'Paid').reduce((sum, item) => sum + item.amount, 0);
  const pendingIncome = income.filter(i => i.payment_status === 'Pending').reduce((sum, item) => sum + item.amount, 0);

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-light text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Income
            </h1>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-600">
              Manage and track your income entries
            </p>
          </div>

          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl px-4 sm:px-6 py-2.5 text-sm transition-all hover:-translate-y-0.5"
                  data-testid="add-income-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Income
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Income Entry' : 'Add New Income'}</DialogTitle>
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
                    data-testid="income-date-input"
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
                    data-testid="income-day-input"
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
                  placeholder="1000"
                  className="rounded-xl bg-slate-50"
                  data-testid="income-amount-input"
                  required
                />
              </div>

              <div>
                <Label htmlFor="product_name">Product</Label>
                <Input
                  id="product_name"
                  list="products"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="Select or type product name"
                  className="rounded-xl bg-slate-50"
                  data-testid="income-product-input"
                  required
                />
                <datalist id="products">
                  {suggestions.products.map((product) => (
                    <option key={product} value={product} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label htmlFor="person_name">Customer / Person</Label>
                <Input
                  id="person_name"
                  list="persons"
                  value={formData.person_name}
                  onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                  placeholder="Customer name"
                  className="rounded-xl bg-slate-50"
                  data-testid="income-person-input"
                  required
                />
                <datalist id="persons">
                  {suggestions.persons.map((person) => (
                    <option key={person} value={person} />
                  ))}
                </datalist>
              </div>

              <div>
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select
                  value={formData.payment_status}
                  onValueChange={(value) => setFormData({ ...formData, payment_status: value })}
                >
                  <SelectTrigger className="rounded-xl bg-slate-50" data-testid="income-status-select">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reference_number">Reference Number (Optional)</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  placeholder="INV-001"
                  className="rounded-xl bg-slate-50"
                  data-testid="income-reference-input"
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
                  data-testid="income-notes-input"
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
                  className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl"
                  data-testid="income-submit-button"
                >
                  {editingItem ? 'Update' : 'Add'} Income
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200" data-testid="total-income-summary">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Total Income</p>
          <p className="text-2xl font-medium text-emerald-600" style={{ fontFamily: 'Outfit, sans-serif' }}>{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200" data-testid="paid-income-summary">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Paid</p>
          <p className="text-2xl font-medium text-emerald-600" style={{ fontFamily: 'Outfit, sans-serif' }}>{formatCurrency(paidIncome)}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200" data-testid="pending-income-summary">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Pending</p>
          <p className="text-2xl font-medium text-amber-600" style={{ fontFamily: 'Outfit, sans-serif' }}>{formatCurrency(pendingIncome)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search income entries..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 rounded-xl bg-slate-50 text-sm"
                data-testid="income-search-input"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="month"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-sm"
              data-testid="income-month-filter"
            />
            <Button
              onClick={handleExport}
              variant="outline"
              className="rounded-xl text-sm whitespace-nowrap"
              data-testid="export-income-button"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-600 text-sm">Loading income data...</p>
          </div>
        ) : income.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">No income entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="w-full" data-testid="income-table">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Date</th>
                  <th className="text-right py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Amount</th>
                  <th className="text-left py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Product</th>
                  <th className="text-left py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Person</th>
                  <th className="text-left py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Status</th>
                  <th className="text-right py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {income.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors" data-testid="income-row">
                    <td className="py-4 px-2 text-sm text-slate-700">{formatDate(item.date)}</td>
                    <td className="py-4 px-2 text-right text-sm font-medium text-emerald-600">{formatCurrency(item.amount)}</td>
                    <td className="py-4 px-2 text-sm text-slate-900">{item.product_name}</td>
                    <td className="py-4 px-2 text-sm text-slate-700">{item.person_name}</td>
                    <td className="py-4 px-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        item.payment_status === 'Paid' 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {item.payment_status}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleEdit(item)}
                          variant="ghost"
                          size="sm"
                          className="text-slate-600 hover:text-slate-900"
                          data-testid="income-edit-button"
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
                          data-testid="income-delete-button"
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
              This will permanently delete this income entry. This action cannot be undone.
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
