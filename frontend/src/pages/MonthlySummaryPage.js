import { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency } from '../utils/currency';
import { formatDate, getCurrentMonth } from '../utils/date';
import { Button } from '@/components/ui/button';
import { Calendar, TrendingUp, TrendingDown, Award } from 'lucide-react';
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

const INCOME_COLOR = '#059669';
const EXPENSE_COLOR = '#DC2626';

export const MonthlySummaryPage = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  useEffect(() => {
    fetchSummary();
  }, [selectedMonth]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/monthly', {
        params: { month: selectedMonth }
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading monthly summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl tracking-tight font-light text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Monthly Summary
          </h1>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            Detailed financial overview for the selected month
          </p>
        </div>

        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/20"
          data-testid="monthly-summary-month-picker"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200" data-testid="monthly-income-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Total Income</p>
          </div>
          <p className="text-2xl font-medium text-emerald-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {formatCurrency(summary?.total_income || 0)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200" data-testid="monthly-expenses-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Total Expenses</p>
          </div>
          <p className="text-2xl font-medium text-red-600" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {formatCurrency(summary?.total_expenses || 0)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200" data-testid="monthly-profit-card">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-blue-600" />
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Net Profit</p>
          </div>
          <p className={`text-2xl font-medium ${(summary?.net_profit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
            {formatCurrency(summary?.net_profit || 0)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200" data-testid="monthly-savings-card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-slate-600" />
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Savings Rate</p>
          </div>
          <p className="text-2xl font-medium text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {(summary?.savings_rate || 0).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-slate-200" data-testid="best-earning-day-card">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-3">Best Earning Day</p>
          {summary?.best_earning_day ? (
            <div>
              <p className="text-lg font-medium text-slate-900">{formatDate(summary.best_earning_day.date)}</p>
              <p className="text-2xl font-medium text-emerald-600 mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {formatCurrency(summary.best_earning_day.income)}
              </p>
            </div>
          ) : (
            <p className="text-slate-500">No data</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200" data-testid="highest-expense-day-card">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-3">Highest Expense Day</p>
          {summary?.highest_expense_day ? (
            <div>
              <p className="text-lg font-medium text-slate-900">{formatDate(summary.highest_expense_day.date)}</p>
              <p className="text-2xl font-medium text-red-600 mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {formatCurrency(summary.highest_expense_day.expenses)}
              </p>
            </div>
          ) : (
            <p className="text-slate-500">No data</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200" data-testid="top-product-card">
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-3">Top Product</p>
          {summary?.top_product ? (
            <div>
              <p className="text-lg font-medium text-slate-900">{summary.top_product.name}</p>
              <p className="text-2xl font-medium text-emerald-600 mt-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {formatCurrency(summary.top_product.amount)}
              </p>
            </div>
          ) : (
            <p className="text-slate-500">No data</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] mb-8" data-testid="daily-breakdown-chart">
        <h3 className="text-xl sm:text-2xl font-medium text-slate-800 mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Daily Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={summary?.daily_breakdown || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
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
            <Legend />
            <Bar dataKey="income" fill={INCOME_COLOR} name="Income" />
            <Bar dataKey="expenses" fill={EXPENSE_COLOR} name="Expenses" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="daily-breakdown-table">
        <h3 className="text-xl sm:text-2xl font-medium text-slate-800 mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Daily Summary Table
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Date</th>
                <th className="text-right py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Income</th>
                <th className="text-right py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Expenses</th>
                <th className="text-right py-4 px-2 text-xs uppercase tracking-[0.2em] font-semibold text-slate-400">Profit</th>
              </tr>
            </thead>
            <tbody>
              {summary?.daily_breakdown?.map((day, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-2 text-sm text-slate-900">{formatDate(day.date)}</td>
                  <td className="py-4 px-2 text-right text-sm font-medium text-emerald-600">{formatCurrency(day.income)}</td>
                  <td className="py-4 px-2 text-right text-sm font-medium text-red-600">{formatCurrency(day.expenses)}</td>
                  <td className={`py-4 px-2 text-right text-sm font-medium ${day.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(day.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
