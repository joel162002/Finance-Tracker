import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { getDayName } from '../utils/date';

import { BackupRestore } from '../components/BackupRestore';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const SettingsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
  const [parsedEntries, setParsedEntries] = useState([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/products`),
        axios.get(`${API}/categories`)
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
        await axios.put(`${API}/products/${editingProduct.id}`, productForm);
        toast.success('Product updated successfully');
      } else {
        await axios.post(`${API}/products`, productForm);
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
        await axios.put(`${API}/categories/${editingCategory.id}`, categoryForm);
        toast.success('Category updated successfully');
      } else {
        await axios.post(`${API}/categories`, categoryForm);
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
        await axios.delete(`${API}/products/${itemToDelete.id}`);
        toast.success('Product deleted successfully');
      } else {
        await axios.delete(`${API}/categories/${itemToDelete.id}`);
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
      const response = await axios.post(`${API}/import/parse`, {
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
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      const promises = parsedEntries.map(entry => {
        // Use the day from parsed entry, or current day if not available
        const day = entry.day ? parseInt(entry.day) : currentDate.getDate();
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (importType === 'income') {
          return axios.post(`${API}/income`, {
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
          
          return axios.post(`${API}/expenses`, {
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
      toast.success(`Successfully imported ${parsedEntries.length} ${importType} entries`);
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
            <TabsTrigger value="import" data-testid="import-tab" className="text-xs sm:text-sm whitespace-nowrap">Import</TabsTrigger>
            <TabsTrigger value="backup" data-testid="backup-tab" className="text-xs sm:text-sm whitespace-nowrap">Backup</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="products">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Manage Products
              </h3>
              <Button
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({ name: '', description: '' });
                  setProductDialogOpen(true);
                }}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl"
                data-testid="add-product-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>

            <div className="space-y-3">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors" data-testid="product-item">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-slate-500">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        setEditingProduct(product);
                        setProductForm({ name: product.name, description: product.description || '' });
                        setProductDialogOpen(true);
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-slate-600"
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
                      className="text-red-600"
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
                  <div>
                    <Label>Import Type</Label>
                    <div className="flex gap-4 mt-2">
                      <Button
                        type="button"
                        onClick={() => setImportType('income')}
                        variant={importType === 'income' ? 'default' : 'outline'}
                        className="rounded-xl"
                        data-testid="import-type-income"
                      >
                        Income
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setImportType('expense')}
                        variant={importType === 'expense' ? 'default' : 'outline'}
                        className="rounded-xl"
                        data-testid="import-type-expense"
                      >
                        Expense
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="import-text">Paste Your Data</Label>
                    <textarea
                      id="import-text"
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder="Example:\n2- 489 Motionarray (Gian Mendoza)\n849 Adobe All Apps (Rosalyn Caldito)"
                      className="w-full h-32 mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm"
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
                            <span className="font-medium">₱{entry.amount}</span> - {entry.product_or_description}
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
