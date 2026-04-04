import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useCurrency } from '../context/CurrencyContext';
import { useMonth } from '../context/MonthContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Printer,
  ChevronDown,
  ChevronUp,
  LineChart as LineChartIcon
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'sonner';

export const ReportsPage = () => {
  const [reports, setReports] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comparisonMonths, setComparisonMonths] = useState('3');
  const [exporting, setExporting] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const { selectedMonth, getMonthLabel } = useMonth();
  const { formatCurrency, currency } = useCurrency();

  useEffect(() => {
    fetchReports();
  }, [selectedMonth]);

  useEffect(() => {
    if (showComparison) {
      fetchComparison();
    }
  }, [comparisonMonths, showComparison]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/reports', {
        params: { month: selectedMonth }
      });
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async () => {
    try {
      const response = await api.get('/analytics/monthly-comparison', {
        params: { months: parseInt(comparisonMonths) }
      });
      setComparison(response.data);
    } catch (error) {
      console.error('Error fetching comparison:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getChangeIcon = (value) => {
    if (value > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (value < 0) return <ArrowDownRight className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getChangeColor = (value, isExpense = false) => {
    if (value === 0) return 'text-slate-500';
    if (isExpense) {
      return value > 0 ? 'text-red-600' : 'text-emerald-600';
    }
    return value > 0 ? 'text-emerald-600' : 'text-red-600';
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!reports) {
      toast.error('No report data to export');
      return;
    }
    
    setExporting(true);
    try {
      let csvContent = "";
      
      // Header
      csvContent += `KitaTracker Financial Report\n`;
      csvContent += `Period: ${getMonthLabel(selectedMonth)}\n`;
      csvContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;
      
      // Income by Product
      csvContent += "INCOME BY PRODUCT\n";
      csvContent += "Product,Sales Count,Amount\n";
      if (reports?.income_by_product && reports.income_by_product.length > 0) {
        reports.income_by_product.forEach(item => {
          csvContent += `"${item.name}",${item.count},${item.amount}\n`;
        });
        const totalProductIncome = reports.income_by_product.reduce((sum, item) => sum + item.amount, 0);
        csvContent += `"TOTAL",,${totalProductIncome}\n`;
      } else {
        csvContent += "No data\n";
      }
      csvContent += "\n";
      
      // Income by Customer
      csvContent += "INCOME BY CUSTOMER\n";
      csvContent += "Customer,Transactions,Amount\n";
      if (reports?.income_by_person && reports.income_by_person.length > 0) {
        reports.income_by_person.forEach(item => {
          csvContent += `"${item.name}",${item.count},${item.amount}\n`;
        });
        const totalCustomerIncome = reports.income_by_person.reduce((sum, item) => sum + item.amount, 0);
        csvContent += `"TOTAL",,${totalCustomerIncome}\n`;
      } else {
        csvContent += "No data\n";
      }
      csvContent += "\n";
      
      // Expenses by Category
      csvContent += "EXPENSES BY CATEGORY\n";
      csvContent += "Category,Count,Amount\n";
      if (reports?.expenses_by_category && reports.expenses_by_category.length > 0) {
        reports.expenses_by_category.forEach(item => {
          csvContent += `"${item.name}",${item.count},${item.amount}\n`;
        });
        const totalExpenses = reports.expenses_by_category.reduce((sum, item) => sum + item.amount, 0);
        csvContent += `"TOTAL",,${totalExpenses}\n`;
      } else {
        csvContent += "No data\n";
      }
      csvContent += "\n";
      
      // Monthly Comparison (if loaded)
      if (comparison?.months && comparison.months.length > 0) {
        csvContent += "MONTHLY COMPARISON\n";
        csvContent += "Month,Income,Expenses,Profit,Transactions\n";
        comparison.months.forEach(month => {
          csvContent += `"${month.label}",${month.income},${month.expenses},${month.profit},${month.income_count + month.expense_count}\n`;
        });
      }
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `KitaTracker_Report_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!reports) {
      toast.error('No report data to export');
      return;
    }
    
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(30, 58, 138);
      doc.text('KitaTracker Financial Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(getMonthLabel(selectedMonth), pageWidth / 2, 28, { align: 'center' });
      
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 34, { align: 'center' });
      
      let yPos = 45;
      
      // Monthly Comparison Summary (if loaded)
      if (comparison?.comparison && Object.keys(comparison.comparison).length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Monthly Comparison', 14, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        const comp = comparison.comparison;
        doc.text(`${comp.current_month} vs ${comp.previous_month}`, 14, yPos);
        yPos += 6;
        doc.text(`Income: ${comp.income_change >= 0 ? '+' : ''}${comp.income_change}%`, 14, yPos);
        yPos += 5;
        doc.text(`Expenses: ${comp.expense_change >= 0 ? '+' : ''}${comp.expense_change}%`, 14, yPos);
        yPos += 5;
        doc.text(`Profit: ${comp.profit_change >= 0 ? '+' : ''}${comp.profit_change}%`, 14, yPos);
        yPos += 12;
      }
      
      // Income by Product
      if (reports?.income_by_product && reports.income_by_product.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Income by Product', 14, yPos);
        yPos += 4;
        
        const productTotal = reports.income_by_product.reduce((sum, item) => sum + item.amount, 0);
        
        doc.autoTable({
          startY: yPos,
          head: [['Product', 'Sales', `Amount (${currency})`]],
          body: [
            ...reports.income_by_product.map(item => [
              item.name,
              item.count.toString(),
              formatCurrency(item.amount)
            ]),
            ['TOTAL', '', formatCurrency(productTotal)]
          ],
          theme: 'striped',
          headStyles: { fillColor: [5, 150, 105] },
          footStyles: { fillColor: [240, 253, 244], textColor: [5, 150, 105], fontStyle: 'bold' },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.lastAutoTable.finalY + 12;
      }
      
      // Income by Customer
      if (reports?.income_by_person && reports.income_by_person.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Income by Customer', 14, yPos);
        yPos += 4;
        
        const customerTotal = reports.income_by_person.reduce((sum, item) => sum + item.amount, 0);
        
        doc.autoTable({
          startY: yPos,
          head: [['Customer', 'Transactions', `Amount (${currency})`]],
          body: [
            ...reports.income_by_person.map(item => [
              item.name,
              item.count.toString(),
              formatCurrency(item.amount)
            ]),
            ['TOTAL', '', formatCurrency(customerTotal)]
          ],
          theme: 'striped',
          headStyles: { fillColor: [30, 58, 138] },
          margin: { left: 14, right: 14 }
        });
        
        yPos = doc.lastAutoTable.finalY + 12;
      }
      
      // Expenses by Category
      if (reports?.expenses_by_category && reports.expenses_by_category.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('Expenses by Category', 14, yPos);
        yPos += 4;
        
        const expenseTotal = reports.expenses_by_category.reduce((sum, item) => sum + item.amount, 0);
        
        doc.autoTable({
          startY: yPos,
          head: [['Category', 'Count', `Amount (${currency})`]],
          body: [
            ...reports.expenses_by_category.map(item => [
              item.name,
              item.count.toString(),
              formatCurrency(item.amount)
            ]),
            ['TOTAL', '', formatCurrency(expenseTotal)]
          ],
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38] },
          margin: { left: 14, right: 14 }
        });
      }
      
      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `KitaTracker - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      doc.save(`KitaTracker_Report_${selectedMonth}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Reports
          </h1>
          <p className="text-slate-600 mt-1">Financial breakdown for {getMonthLabel(selectedMonth)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              setShowComparison(!showComparison);
              if (!showComparison && !comparison) {
                fetchComparison();
              }
            }}
            variant={showComparison ? "default" : "outline"}
            className={`rounded-xl ${showComparison ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
            data-testid="toggle-comparison-button"
          >
            <LineChartIcon className="w-4 h-4 mr-2" />
            Monthly Comparison
            {showComparison ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="rounded-xl"
            data-testid="print-report-button"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button
            onClick={exportToCSV}
            variant="outline"
            className="rounded-xl"
            disabled={exporting}
            data-testid="export-csv-button"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button
            onClick={exportToPDF}
            variant="outline"
            className="rounded-xl"
            disabled={exporting}
            data-testid="export-pdf-button"
          >
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Monthly Comparison Section (Collapsible) */}
      {showComparison && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] mb-6 sm:mb-8" data-testid="monthly-comparison-section">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Monthly Comparison
            </h3>
            <Select value={comparisonMonths} onValueChange={setComparisonMonths}>
              <SelectTrigger className="w-[140px]" data-testid="comparison-months-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">Last 2 months</SelectItem>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="4">Last 4 months</SelectItem>
                <SelectItem value="5">Last 5 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Comparison Cards */}
          {comparison?.comparison && Object.keys(comparison.comparison).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-emerald-600 font-semibold mb-1">Income</p>
                    <div className={`flex items-center gap-1 text-xl font-bold ${getChangeColor(comparison.comparison.income_change)}`}>
                      {getChangeIcon(comparison.comparison.income_change)}
                      <span>{comparison.comparison.income_change >= 0 ? '+' : ''}{comparison.comparison.income_change}%</span>
                    </div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-xs text-emerald-600 mt-2">vs {comparison.comparison.previous_month}</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-red-600 font-semibold mb-1">Expenses</p>
                    <div className={`flex items-center gap-1 text-xl font-bold ${getChangeColor(comparison.comparison.expense_change, true)}`}>
                      {getChangeIcon(comparison.comparison.expense_change)}
                      <span>{comparison.comparison.expense_change >= 0 ? '+' : ''}{comparison.comparison.expense_change}%</span>
                    </div>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-xs text-red-600 mt-2">vs {comparison.comparison.previous_month}</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-1">Profit</p>
                    <div className={`flex items-center gap-1 text-xl font-bold ${getChangeColor(comparison.comparison.profit_change)}`}>
                      {getChangeIcon(comparison.comparison.profit_change)}
                      <span>{comparison.comparison.profit_change >= 0 ? '+' : ''}{comparison.comparison.profit_change}%</span>
                    </div>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-xs text-blue-600 mt-2">vs {comparison.comparison.previous_month}</p>
              </div>
            </div>
          )}

          {/* Monthly Trend Chart */}
          {comparison?.months && comparison.months.length > 0 && (
            <div className="w-full h-[280px] sm:h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparison.months} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 10 }} 
                    tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px'
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="income" fill="#059669" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#DC2626" name="Expenses" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#1E3A8A" name="Profit" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Monthly Data Table */}
          {comparison?.months && comparison.months.length > 0 && (
            <div className="mt-6 overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Month</th>
                    <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Income</th>
                    <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Expenses</th>
                    <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Profit</th>
                    <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.months.map((month, index) => (
                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-2 text-sm font-medium text-slate-900">{month.label}</td>
                      <td className="py-3 px-2 text-right text-sm font-medium text-emerald-600">{formatCurrency(month.income)}</td>
                      <td className="py-3 px-2 text-right text-sm font-medium text-red-600">{formatCurrency(month.expenses)}</td>
                      <td className={`py-3 px-2 text-right text-sm font-medium ${month.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatCurrency(month.profit)}
                      </td>
                      <td className="py-3 px-2 text-right text-sm text-slate-700">{month.income_count + month.expense_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!comparison && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      )}

      {/* Main Report Sections */}
      <div className="space-y-6 sm:space-y-8">
        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="income-by-product-section">
          <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-slate-800 mb-4 sm:mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Income by Product
          </h3>
          {reports?.income_by_product && reports.income_by_product.length > 0 ? (
            <>
              <div className="w-full h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.income_by_product} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 10 }} 
                      tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px'
                      }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Bar dataKey="amount" fill="#059669" name="Amount" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 sm:mt-6 overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[400px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Product</th>
                      <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Sales</th>
                      <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.income_by_product.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-2 text-sm text-slate-900">{item.name}</td>
                        <td className="py-3 px-2 text-right text-sm text-slate-700">{item.count}</td>
                        <td className="py-3 px-2 text-right text-sm font-medium text-emerald-600">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-center py-8">No product data available</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="income-by-person-section">
          <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-slate-800 mb-4 sm:mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Income by Customer
          </h3>
          {reports?.income_by_person && reports.income_by_person.length > 0 ? (
            <>
              <div className="w-full h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.income_by_person} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px'
                      }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Bar dataKey="amount" fill="#1E3A8A" name="Amount" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 sm:mt-6 overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[400px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Customer</th>
                      <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Transactions</th>
                      <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.15em] font-semibold text-slate-400">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.income_by_person.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-2 text-sm text-slate-900">{item.name}</td>
                        <td className="py-3 px-2 text-right text-sm text-slate-700">{item.count}</td>
                        <td className="py-3 px-2 text-right text-sm font-medium text-blue-600">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-center py-8">No customer data available</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="expenses-by-category-section">
          <h3 className="text-xl sm:text-2xl font-medium text-slate-800 mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Expenses by Category
          </h3>
          {reports?.expenses_by_category && reports.expenses_by_category.length > 0 ? (
            <>
              <div className="w-full h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reports.expenses_by_category} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'white',
                        border: '1px solid #E2E8F0',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px'
                      }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Bar dataKey="amount" fill="#DC2626" name="Amount" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[400px]">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Category</th>
                      <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Count</th>
                      <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.expenses_by_category.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-2 text-sm text-slate-900">{item.name}</td>
                        <td className="py-3 px-2 text-right text-sm text-slate-700">{item.count}</td>
                        <td className="py-3 px-2 text-right text-sm font-medium text-red-600">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-center py-8">No expense data available</p>
          )}
        </div>
      </div>
    </div>
  );
};
