import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useCurrency } from '../context/CurrencyContext';
import { useNotifications } from '../context/NotificationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Upload, Calendar, Bell } from 'lucide-react';
import { getDayName, getCurrentMonth } from '../utils/date';

import { BackupRestore } from '../components/BackupRestore';

export const SettingsPage = () => {
  const { formatCurrency, getCurrencySymbol } = useCurrency();
  const { preferences, updatePreferences } = useNotifications();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState('');

  const [productForm, setProductForm] = useState({ name: '', description: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  
  const [importText, setImportText] = useState('');
  const [importType, setImportType] = useState('income');
  const [importMonth, setImportMonth] = useState(getCurrentMonth()); // New: Month selector
  const [parsedEntries, setParsedEntries] = useState([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, productForm);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', productForm);
        toast.success('Product added successfully');
      }
      setProductDialogOpen(false);
      setEditingProduct(null);
      setProductForm({ name: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to save product');
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, categoryForm);
        toast.success('Category updated successfully');
      } else {
        await api.post('/categories', categoryForm);
        toast.success('Category added successfully');
      }
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to save category');
    }
  };

  const handleDelete = async () => {
    try {
      if (deleteType === 'product') {
        await api.delete(`/products/${itemToDelete.id}`);
        toast.success('Product deleted successfully');
      } else {
        await api.delete(`/categories/${itemToDelete.id}`);
        toast.success('Category deleted successfully');
      }
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      setDeleteType('');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleParseImport = async () => {
    try {
      setImporting(true);
      const response = await api.post('/import/parse', {
        raw_text: importText,
        entry_type: importType
      });
      setParsedEntries(response.data);
      toast.success(`Parsed ${response.data.length} entries`);
    } catch (error) {
      toast.error('Failed to parse import data');
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    try {
      setImporting(true);
      
      // Parse selected month (YYYY-MM format)
      const [selectedYear, selectedMonth] = importMonth.split('-').map(Number);
      const currentDate = new Date();
      
      const promises = parsedEntries.map(entry => {
        // Use the day from parsed entry, or day 1 if not available
        const day = entry.day ? parseInt(entry.day) : 1;
        // Ensure day is valid for the selected month
        const maxDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const validDay = Math.min(day, maxDay);
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
        
        if (importType === 'income') {
          return api.post('/income', {
            date: dateStr,
            day: getDayName(dateStr),
            amount: entry.amount,
            product_name: entry.product_or_description,
            person_name: entry.person_name || 'Unknown',
            notes: entry.raw_text,
            payment_status: 'Paid',
            reference_number: ''
          });
        } else {
          // Categorize expenses based on description
          const description = entry.product_or_description.toLowerCase();
          let category = 'Miscellaneous';
          
          if (description.includes('food') || description.includes('lunch') || description.includes('dinner') || description.includes('breakfast') || description.includes('meryenda') || description.includes('ulam') || description.includes('hapunan') || description.includes('umagahan')) {
            category = 'Food';
          } else if (description.includes('offering') || description.includes('church')) {
            category = 'Offering';
          } else if (description.includes('gas') || description.includes('fuel')) {
            category = 'Gas';
          } else if (description.includes('grocery') || description.includes('market')) {
            category = 'Grocery';
          } else if (description.includes('utilities') || description.includes('bill') || description.includes('electric') || description.includes('water')) {
            category = 'Utilities';
          } else if (description.includes('transport') || description.includes('taxi') || description.includes('grab') || description.includes('motor')) {
            category = 'Transportation';
          } else if (description.includes('personal') || description.includes('baon')) {
            category = 'Personal';
          } else if (description.includes('load') || description.includes('prepaid')) {
            category = 'Load';
          } else if (description.includes('medical') || description.includes('medicine') || description.includes('doctor')) {
            category = 'Medical';
          }
          
          return api.post('/expenses', {
            date: dateStr,
            day: getDayName(dateStr),
            amount: entry.amount,
            description: entry.product_or_description,
            category_name: category,
            notes: entry.raw_text,
            payment_method: 'Cash',
            reference_number: ''
          });
        }
      });

      await Promise.all(promises);
      toast.success(`Successfully imported ${parsedEntries.length} ${importType} entries to ${importMonth}`);
      setImportDialogOpen(false);
      setImportText('');
      setParsedEntries([]);
      
      // Refresh the page data if needed
      window.location.reload();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import entries');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-light text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Settings
        </h1>
        <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-600">
          Manage your products, categories, and import data
        </p>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="bg-white border border-slate-200 inline-flex min-w-full sm:min-w-0">
            <TabsTrigger value="products" data-testid="products-tab" className="text-xs sm:text-sm whitespace-nowrap">Products</TabsTrigger>
            <TabsTrigger value="categories" data-testid="categories-tab" className="text-xs sm:text-sm whitespace-nowrap">Categories</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="notifications-tab" className="text-xs sm:text-sm whitespace-nowrap">Notifications</TabsTrigger>
            <TabsTrigger value="import" data-testid="import-tab" className="text-xs sm:text-sm whitespace-nowrap">Import</TabsTrigger>
            <TabsTrigger value="backup" data-testid="backup-tab" className="text-xs sm:text-sm whitespace-nowrap">Backup</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="products">
          <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-lg sm:text-xl font-medium text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Manage Products
              </h3>
              <Button
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({ name: '', description: '' });
                  setProductDialogOpen(true);
                }}
                className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-sm"
                data-testid="add-product-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>

            <div className="space-y-3">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 sm:p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors" data-testid="product-item">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <Button
                      onClick={() => {
                        setEditingProduct(product);
                        setProductForm({ name: product.name, description: product.description || '' });
                        setProductDialogOpen(true);
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-slate-600 h-8 w-8 p-0"
                      data-testid="edit-product-button"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        setItemToDelete(product);
                        setDeleteType('product');
                        setDeleteDialogOpen(true);
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 h-8 w-8 p-0"
                      data-testid="delete-product-button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Manage Expense Categories
              </h3>
              <Button
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: '', description: '' });
                  setCategoryDialogOpen(true);
                }}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl"
                data-testid="add-category-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>

            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors" data-testid="category-item">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{category.name}</p>
                    {category.description && (
                      <p className="text-xs text-slate-500">{category.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        setEditingCategory(category);
                        setCategoryForm({ name: category.name, description: category.description || '' });
                        setCategoryDialogOpen(true);
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-slate-600"
                      data-testid="edit-category-button"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        setItemToDelete(category);
                        setDeleteType('category');
                        setDeleteDialogOpen(true);
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      data-testid="delete-category-button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Notifications Preferences Tab */}
        <TabsContent value="notifications">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200">
            <div className="mb-6">
              <h3 className="text-xl font-medium text-slate-800 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Notification Preferences
              </h3>
              <p className="text-sm text-slate-600">
                Configure how and when you receive notifications.
              </p>
            </div>

            <div className="space-y-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-slate-600" />
                  <div>
                    <Label className="text-base font-medium">Enable Notifications</Label>
                    <p className="text-sm text-slate-500">Receive in-app notifications</p>
                  </div>
                </div>
                <Switch
                  checked={preferences.enable_notifications}
                  onCheckedChange={async (checked) => {
                    setSavingPrefs(true);
                    await updatePreferences({ enable_notifications: checked });
                    setSavingPrefs(false);
                    toast.success(checked ? 'Notifications enabled' : 'Notifications disabled');
                  }}
                  disabled={savingPrefs}
                  data-testid="enable-notifications-toggle"
                />
              </div>

              {/* Budget Alerts */}
              <div className={`space-y-4 ${!preferences.enable_notifications ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                  <div>
                    <Label className="text-base font-medium">Budget Alerts</Label>
                    <p className="text-sm text-slate-500">Get notified when spending reaches budget thresholds</p>
                  </div>
                  <Switch
                    checked={preferences.budget_alerts}
                    onCheckedChange={async (checked) => {
                      setSavingPrefs(true);
                      await updatePreferences({ budget_alerts: checked });
                      setSavingPrefs(false);
                      toast.success(checked ? 'Budget alerts enabled' : 'Budget alerts disabled');
                    }}
                    disabled={savingPrefs || !preferences.enable_notifications}
                    data-testid="budget-alerts-toggle"
                  />
                </div>

                {/* Budget Thresholds */}
                {preferences.budget_alerts && (
                  <div className="ml-4 p-4 bg-slate-50 rounded-xl space-y-4">
                    <div>
                      <Label>Warning Threshold (%)</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Input
                          type="number"
                          min="50"
                          max="95"
                          value={preferences.threshold_warning || 80}
                          onChange={async (e) => {
                            const value = parseInt(e.target.value);
                            if (value >= 50 && value <= 95) {
                              setSavingPrefs(true);
                              await updatePreferences({ threshold_warning: value });
                              setSavingPrefs(false);
                            }
                          }}
                          className="w-24 rounded-xl"
                          data-testid="threshold-warning-input"
                        />
                        <span className="text-sm text-amber-600 font-medium">🟡 Warning at {preferences.threshold_warning || 80}%</span>
                      </div>
                    </div>
                    <div>
                      <Label>Danger Threshold (%)</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Input
                          type="number"
                          min="60"
                          max="99"
                          value={preferences.threshold_danger || 90}
                          onChange={async (e) => {
                            const value = parseInt(e.target.value);
                            if (value >= 60 && value <= 99) {
                              setSavingPrefs(true);
                              await updatePreferences({ threshold_danger: value });
                              setSavingPrefs(false);
                            }
                          }}
                          className="w-24 rounded-xl"
                          data-testid="threshold-danger-input"
                        />
                        <span className="text-sm text-orange-600 font-medium">🔴 Danger at {preferences.threshold_danger || 90}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recurring Alerts */}
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                  <div>
                    <Label className="text-base font-medium">Recurring Transaction Alerts</Label>
                    <p className="text-sm text-slate-500">Get notified when recurring transactions are due or created</p>
                  </div>
                  <Switch
                    checked={preferences.recurring_alerts}
                    onCheckedChange={async (checked) => {
                      setSavingPrefs(true);
                      await updatePreferences({ recurring_alerts: checked });
                      setSavingPrefs(false);
                      toast.success(checked ? 'Recurring alerts enabled' : 'Recurring alerts disabled');
                    }}
                    disabled={savingPrefs || !preferences.enable_notifications}
                    data-testid="recurring-alerts-toggle"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-medium text-blue-900 mb-2">How notifications work</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Budget alerts trigger when spending reaches your configured thresholds</li>
                  <li>Recurring alerts notify you when transactions are due or auto-created</li>
                  <li>Notifications are kept for 15 days, then automatically deleted</li>
                  <li>Click the bell icon in the header to view your notifications</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="import">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200">
            <div className="mb-6">
              <h3 className="text-xl font-medium text-slate-800 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Smart Import
              </h3>
              <p className="text-sm text-slate-600">
                Paste your income or expense data and let the system parse it automatically.
              </p>
            </div>

            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <Button
                onClick={() => setImportDialogOpen(true)}
                className="bg-blue-600 text-white hover:bg-blue-700 rounded-xl"
                data-testid="open-import-button"
              >
                <Upload className="w-4 h-4 mr-2" />
                Start Import
              </Button>

              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import Transactions</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Import Type</Label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          onClick={() => setImportType('income')}
                          variant={importType === 'income' ? 'default' : 'outline'}
                          className="rounded-xl flex-1"
                          data-testid="import-type-income"
                        >
                          Income
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setImportType('expense')}
                          variant={importType === 'expense' ? 'default' : 'outline'}
                          className="rounded-xl flex-1"
                          data-testid="import-type-expense"
                        >
                          Expense
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="import-month">Target Month</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <input
                          id="import-month"
                          type="month"
                          value={importMonth}
                          onChange={(e) => setImportMonth(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm"
                          data-testid="import-month-input"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Entries will be imported to this month</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="import-text">Paste Your Data</Label>
                    <textarea
                      id="import-text"
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="Example:\n2- 489 Motionarray (Gian Mendoza)\n849 Adobe All Apps (Rosalyn Caldito)"
                      className="w-full h-32 mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                      data-testid="import-text-input"
                    />
                  </div>

                  <Button
                    onClick={handleParseImport}
                    disabled={!importText || importing}
                    className="w-full rounded-xl"
                    data-testid="parse-import-button"
                  >
                    {importing ? 'Parsing...' : 'Parse Data'}
                  </Button>

                  {parsedEntries.length > 0 && (
                    <div className="border border-slate-200 rounded-xl p-4">
                      <p className="text-sm font-medium text-slate-900 mb-3">
                        Parsed {parsedEntries.length} entries:
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {parsedEntries.map((entry, index) => (
                          <div key={index} className="text-xs bg-slate-50 p-2 rounded">
                            <span className="font-medium">{getCurrencySymbol()}{entry.amount}</span> - {entry.product_or_description}
                            {entry.person_name && ` (${entry.person_name})`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImportDialogOpen(false);
                      setImportText('');
                      setParsedEntries([]);
                    }}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmImport}
                    disabled={parsedEntries.length === 0 || importing}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl"
                    data-testid="confirm-import-button"
                  >
                    {importing ? 'Importing...' : `Import ${parsedEntries.length} Entries`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">Format Examples</p>
              <div className="space-y-1 text-sm text-slate-600">
                <p>Income: <code className="bg-white px-2 py-0.5 rounded">2- 489 Motionarray (Gian Mendoza)</code></p>
                <p>Expense: <code className="bg-white px-2 py-0.5 rounded">100 Offering</code></p>
                <p>With k notation: <code className="bg-white px-2 py-0.5 rounded">1.6k Product Name</code></p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="backup">
          <BackupRestore />
        </TabsContent>
      </Tabs>

      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProductSubmit} className="space-y-4">
            <div>
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="rounded-xl bg-slate-50"
                data-testid="product-name-input"
                required
              />
            </div>
            <div>
              <Label htmlFor="product-description">Description (Optional)</Label>
              <Input
                id="product-description"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                className="rounded-xl bg-slate-50"
                data-testid="product-description-input"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProductDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-slate-900" data-testid="product-submit-button">
                {editingProduct ? 'Update' : 'Add'} Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div>
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                className="rounded-xl bg-slate-50"
                data-testid="category-name-input"
                required
              />
            </div>
            <div>
              <Label htmlFor="category-description">Description (Optional)</Label>
              <Input
                id="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                className="rounded-xl bg-slate-50"
                data-testid="category-description-input"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl bg-slate-900" data-testid="category-submit-button">
                {editingCategory ? 'Update' : 'Add'} Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {deleteType}. This action cannot be undone.
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
