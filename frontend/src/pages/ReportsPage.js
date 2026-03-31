import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useCurrency } from '../context/CurrencyContext';
import { getCurrentMonth } from '../utils/date';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
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

export const ReportsPage = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    fetchReports();
  }, [selectedMonth]);

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

  const handlePrint = () => {
    window.print();
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 no-print">
        <div>
          <h1 className="text-4xl sm:text-5xl tracking-tight font-light text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Reports & Analytics
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            Detailed analytics and insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
            data-testid="reports-month-picker"
          />
          <Button
            onClick={handlePrint}
            variant="outline"
            className="rounded-xl"
            data-testid="print-report-button"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="income-by-product-section">
          <h3 className="text-xl sm:text-2xl font-medium text-slate-800 mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Income by Product
          </h3>
          {reports?.income_by_product && reports.income_by_product.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reports.income_by_product}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" fill="#059669" name="Amount" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Product</th>
                      <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Sales Count</th>
                      <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.income_by_product.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100">
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

        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="income-by-person-section">
          <h3 className="text-xl sm:text-2xl font-medium text-slate-800 mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Income by Customer
          </h3>
          {reports?.income_by_person && reports.income_by_person.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reports.income_by_person}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" fill="#1E3A8A" name="Amount" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Customer</th>
                      <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Transactions</th>
                      <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.income_by_person.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100">
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reports.expenses_by_category}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Bar dataKey="amount" fill="#DC2626" name="Amount" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-6 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Category</th>
                      <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Count</th>
                      <th className="text-right py-3 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.expenses_by_category.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100">
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
