import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatCurrency } from '../utils/currency';
import { formatDate, getCurrentMonth } from '../utils/date';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText,
  Plus,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const INCOME_COLOR = '#059669';
const EXPENSE_COLOR = '#DC2626';
const COLORS = ['#1E3A8A', '#059669', '#D97706', '#DC2626', '#6366F1', '#8B5CF6', '#EC4899'];

export const DashboardPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnalytics();
  }, [selectedMonth]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/analytics/dashboard`, {
        params: { month: selectedMonth }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const summaryCards = [
    {
      title: 'Total Income',
      value: analytics?.total_income || 0,
      icon: TrendingUp,
      color: 'emerald',
      testId: 'total-income-card'
    },
    {
      title: 'Total Expenses',
      value: analytics?.total_expenses || 0,
      icon: TrendingDown,
      color: 'red',
      testId: 'total-expenses-card'
    },
    {
      title: 'Net Profit',
      value: analytics?.net_profit || 0,
      icon: DollarSign,
      color: (analytics?.net_profit || 0) >= 0 ? 'blue' : 'red',
      testId: 'net-profit-card'
    },
    {
      title: 'Transactions',
      value: `${analytics?.income_count || 0} / ${analytics?.expense_count || 0}`,
      icon: FileText,
      color: 'slate',
      isCount: true,
      testId: 'transactions-card'
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-light text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Dashboard
            </h1>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-slate-600">
              Overview of your financial activity
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20"
              data-testid="month-picker"
            />
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
              <Button
                onClick={() => navigate('/income')}
                className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl px-4 sm:px-6 py-2.5 text-sm transition-all hover:-translate-y-0.5"
                data-testid="quick-add-income-button"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Income</span>
                <span className="sm:hidden">Income</span>
              </Button>
              <Button
                onClick={() => navigate('/expenses')}
                className="bg-red-600 text-white hover:bg-red-700 rounded-xl px-4 sm:px-6 py-2.5 text-sm transition-all hover:-translate-y-0.5"
                data-testid="quick-add-expense-button"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Expense</span>
                <span className="sm:hidden">Expense</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const colorStyles = {
            emerald: 'bg-emerald-50 text-emerald-600',
            red: 'bg-red-50 text-red-600',
            blue: 'bg-blue-50 text-blue-600',
            slate: 'bg-slate-50 text-slate-600'
          };

          return (
            <div
              key={card.title}
              className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(15,23,42,0.1)]"
              data-testid={card.testId}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-[0.2em] font-semibold text-slate-400 mb-2">
                    {card.title}
                  </p>
                  <p className="text-2xl sm:text-3xl font-medium text-slate-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {card.isCount ? card.value : formatCurrency(card.value)}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${colorStyles[card.color]} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="income-expense-chart">
          <h3 className="text-xl sm:text-2xl font-medium text-slate-800 mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Income vs Expenses
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics?.daily_data || []}>
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
              <Line 
                type="monotone" 
                dataKey="income" 
                stroke={INCOME_COLOR} 
                strokeWidth={2}
                name="Income"
              />
              <Line 
                type="monotone" 
                dataKey="expenses" 
                stroke={EXPENSE_COLOR} 
                strokeWidth={2}
                name="Expenses"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="top-customers-list">
          <h3 className="text-xl sm:text-2xl font-medium text-slate-800 mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Top Customers
          </h3>
          <div className="space-y-4">
            {analytics?.top_customers?.slice(0, 5).map((customer, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-slate-700">{customer.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{customer.name}</p>
                  </div>
                </div>
                <p className="text-sm font-medium text-emerald-600">{formatCurrency(customer.amount)}</p>
              </div>
            ))}
            {(!analytics?.top_customers || analytics.top_customers.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-8">No customer data yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="product-chart">
          <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-slate-800 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Income by Product
          </h3>
          {analytics?.product_data && analytics.product_data.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={analytics.product_data.slice(0, 6)}
                    cx="50%"
                    cy="45%"
                    labelLine={false}
                    label={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.product_data.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {analytics.product_data.slice(0, 6).map((item, index) => {
                  const total = analytics.product_data.reduce((sum, i) => sum + i.value, 0);
                  const percent = ((item.value / total) * 100).toFixed(0);
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-slate-700 truncate">
                        {item.name} ({percent}%)
                      </span>
                    </div>
                  );
                })}
              </div>
              {analytics.product_data.length > 6 && (
                <p className="text-xs text-slate-500 text-center mt-3">Showing top 6 products</p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500 text-center py-12">No product data yet</p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="category-chart">
          <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-slate-800 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Expenses by Category
          </h3>
          {analytics?.category_data && analytics.category_data.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={analytics.category_data.slice(0, 6)}
                    cx="50%"
                    cy="45%"
                    labelLine={false}
                    label={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.category_data.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {analytics.category_data.slice(0, 6).map((item, index) => {
                  const total = analytics.category_data.reduce((sum, i) => sum + i.value, 0);
                  const percent = ((item.value / total) * 100).toFixed(0);
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-slate-700 truncate">
                        {item.name} ({percent}%)
                      </span>
                    </div>
                  );
                })}
              </div>
              {analytics.category_data.length > 6 && (
                <p className="text-xs text-slate-500 text-center mt-3">Showing top 6 categories</p>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500 text-center py-12">No expense data yet</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="recent-income-list">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl sm:text-2xl font-medium text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Recent Income
            </h3>
            <Button
              onClick={() => navigate('/income')}
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-900"
            >
              View All
            </Button>
          </div>
          <div className="space-y-4">
            {analytics?.recent_income?.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.product_name}</p>
                    <p className="text-xs text-slate-500">{item.person_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-600">{formatCurrency(item.amount)}</p>
                  <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                </div>
              </div>
            ))}
            {(!analytics?.recent_income || analytics.recent_income.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-8">No recent income</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="recent-expenses-list">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl sm:text-2xl font-medium text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Recent Expenses
            </h3>
            <Button
              onClick={() => navigate('/expenses')}
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-900"
            >
              View All
            </Button>
          </div>
          <div className="space-y-4">
            {analytics?.recent_expenses?.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <ArrowDownRight className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.description}</p>
                    <p className="text-xs text-slate-500">{item.category_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-red-600">{formatCurrency(item.amount)}</p>
                  <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                </div>
              </div>
            ))}
            {(!analytics?.recent_expenses || analytics.recent_expenses.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-8">No recent expenses</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
