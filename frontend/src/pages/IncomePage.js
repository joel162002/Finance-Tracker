import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { useCurrency } from '../context/CurrencyContext';
import { useMonth } from '../context/MonthContext';
import { formatDate, getDayName, getTodayDate, getMonthFromDate } from '../utils/date';
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
import { useDataRefresh } from '../context/DataContext';

export const IncomePage = () => {
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const { triggerRefresh } = useDataRefresh();
  const { formatCurrency } = useCurrency();
  const { selectedMonth } = useMonth();
  
  // User's products from Settings
  const [userProducts, setUserProducts] = useState([]);
  
  // Use refs to prevent input focus loss
  const productInputRef = useRef(null);
  const personInputRef = useRef(null);
  
  const [filters, setFilters] = useState({
    search: '',
    product_name: '',
    person_name: '',
    payment_status: ''
  });

  // Form state with proper initialization using local date
  const getInitialFormData = useCallback(() => ({
    date: getTodayDate(),
    day: getDayName(getTodayDate()),
    amount: '',
    product_name: '',
    person_name: '',
    notes: '',
    payment_status: 'Paid',
    reference_number: ''
  }), []);

  const [formData, setFormData] = useState(getInitialFormData);

  const [suggestions, setSuggestions] = useState({
    products: [],
    persons: []
  });

  // Fetch user's products from Settings
  const fetchUserProducts = async () => {
    try {
      const response = await api.get('/products');
      setUserProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch user products:', error);
    }
  };

  useEffect(() => {
    fetchIncome();
    fetchSuggestions();
    fetchUserProducts();
  }, [selectedMonth, filters.search, filters.product_name, filters.person_name, filters.payment_status]);

  const fetchIncome = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const params = { month: selectedMonth };
      if (filters.search) params.search = filters.search;
      if (filters.product_name) params.product_name = filters.product_name;
      if (filters.person_name) params.person_name = filters.person_name;
      if (filters.payment_status) params.payment_status = filters.payment_status;

      const response = await api.get('/income', { params });
      setIncome(response.data);
    } catch (error) {
      toast.error('Failed to fetch income data');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const [productsRes, personsRes] = await Promise.all([
        api.get('/suggestions/products'),
        api.get('/suggestions/persons')
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
    
    if (!formData.amount || formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      setSaving(true);
      console.log('Submitting income:', editingItem ? 'UPDATE' : 'CREATE', formData);
      
      if (editingItem) {
        const response = await api.put(`/income/${editingItem.id}`, formData);
        console.log('Update response:', response);
      } else {
        const response = await api.post('/income', formData);
        console.log('Create response:', response);
      }
      
      // Await the fetch to ensure data is refreshed before closing dialog
      await fetchIncome(false);
      await fetchSuggestions();
      triggerRefresh(); // Notify other components (Dashboard) to refresh
      
      setDialogOpen(false);
      resetForm();
      toast.success(editingItem ? 'Income entry updated successfully' : 'Income entry added successfully');
    } catch (error) {
      console.error('Submit error:', error);
      console.error('Error response:', error.response);
      toast.error(error.response?.data?.detail || 'Failed to save income entry');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    // Ensure date is properly formatted
    const editDate = item.date ? item.date.split('T')[0] : getTodayDate();
    setFormData({
      date: editDate,
      day: getDayName(editDate),
      amount: item.amount,
      product_name: item.product_name || '',
      person_name: item.person_name || '',
      notes: item.notes || '',
      payment_status: item.payment_status || 'Paid',
      reference_number: item.reference_number || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete || !itemToDelete.id) {
      toast.error('Invalid item selected');
      return;
    }
    
    try {
      console.log('Deleting income entry:', itemToDelete.id);
      const response = await api.delete(`/income/${itemToDelete.id}`);
      console.log('Delete response:', response);
      toast.success('Income entry deleted successfully');
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchIncome();
      triggerRefresh(); // Notify other components (Dashboard) to refresh
    } catch (error) {
      console.error('Delete error:', error);
      console.error('Error response:', error.response);
      toast.error(error.response?.data?.detail || 'Failed to delete income entry');
    }
  };

  const resetForm = useCallback(() => {
    setEditingItem(null);
    setFormData(getInitialFormData());
  }, [getInitialFormData]);

  const handleDateChange = useCallback((date) => {
    setFormData(prev => ({
      ...prev,
      date,
      day: getDayName(date)
    }));
  }, []);
  
  // Stable handler for text inputs to prevent focus loss
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Handle select without affecting text input
  const handleSelectChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleExport = async () => {
    try {
      const response = await api.get('/export/income', {
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
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="1000"
                  className="rounded-xl bg-slate-50"
                  data-testid="income-amount-input"
                  required
                />
              </div>

              <div>
                <Label htmlFor="product_name">Product / Service</Label>
                {/* User products from Settings */}
                {userProducts.length > 0 && (
                  <>
                    <Select
                      key="product-settings-select"
                      value={userProducts.some(p => p.name === formData.product_name) ? formData.product_name : undefined}
                      onValueChange={(value) => handleSelectChange('product_name', value)}
                    >
                      <SelectTrigger className="rounded-xl bg-slate-50 mt-1.5" data-testid="income-product-select">
                        <SelectValue placeholder="Select from your products" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {userProducts.filter(p => p.is_active).map((product) => (
                          <SelectItem key={product.id} value={product.name}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">Or type a new product name below</p>
                  </>
                )}
                {/* Show suggestions if no user products */}
                {userProducts.length === 0 && suggestions.products.length > 0 && (
                  <>
                    <Select
                      key="product-suggest-select"
                      value={suggestions.products.includes(formData.product_name) ? formData.product_name : undefined}
                      onValueChange={(value) => handleSelectChange('product_name', value)}
                    >
                      <SelectTrigger className="rounded-xl bg-slate-50 mt-1.5" data-testid="income-product-select">
                        <SelectValue placeholder="Select from existing products" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {suggestions.products.map((product) => (
                          <SelectItem key={product} value={product}>
                            {product}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">Or type a new product name below</p>
                  </>
                )}
                <Input
                  ref={productInputRef}
                  id="product_name_custom"
                  value={formData.product_name}
                  onChange={(e) => handleInputChange('product_name', e.target.value)}
                  placeholder="Type product name"
                  className="rounded-xl bg-slate-50 mt-2"
                  data-testid="income-product-input"
                  autoComplete="off"
                />
              </div>

              <div>
                <Label htmlFor="person_name">Customer / Person</Label>
                {suggestions.persons.length > 0 && (
                  <>
                    <Select
                      key="person-select"
                      value={suggestions.persons.includes(formData.person_name) ? formData.person_name : undefined}
                      onValueChange={(value) => handleSelectChange('person_name', value)}
                    >
                      <SelectTrigger className="rounded-xl bg-slate-50 mt-1.5" data-testid="income-person-select">
                        <SelectValue placeholder="Select from existing customers" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {suggestions.persons.map((person) => (
                          <SelectItem key={person} value={person}>
                            {person}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-1">Or type a new customer name below</p>
                  </>
                )}
                <Input
                  ref={personInputRef}
                  id="person_name"
                  value={formData.person_name}
                  onChange={(e) => handleInputChange('person_name', e.target.value)}
                  placeholder="Type customer name"
                  className="rounded-xl bg-slate-50 mt-2"
                  data-testid="income-person-input"
                  autoComplete="off"
                />
              </div>

              <div>
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select
                  value={formData.payment_status}
                  onValueChange={(value) => handleSelectChange('payment_status', value)}
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
                  onChange={(e) => handleInputChange('reference_number', e.target.value)}
                  placeholder="INV-001"
                  className="rounded-xl bg-slate-50"
                  data-testid="income-reference-input"
                  autoComplete="off"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes"
                  className="rounded-xl bg-slate-50"
                  data-testid="income-notes-input"
                  autoComplete="off"
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
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl disabled:opacity-70"
                  data-testid="income-submit-button"
                >
                  {saving ? 'Saving...' : (editingItem ? 'Update' : 'Add')} {!saving && 'Income'}
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
