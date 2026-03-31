import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useCurrency } from '../context/CurrencyContext';
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
import { useDataRefresh } from '../context/DataContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const INCOME_COLOR = '#059669';
const EXPENSE_COLOR = '#DC2626';
const COLORS = ['#1E3A8A', '#059669', '#D97706', '#DC2626', '#6366F1', '#8B5CF6', '#EC4899'];

export const DashboardPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [quickSummary, setQuickSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const navigate = useNavigate();
  const { refreshTrigger } = useDataRefresh();
  const { formatCurrency } = useCurrency();

  // Fast initial load with quick summary
  const fetchQuickSummary = useCallback(async () => {
    try {
      const response = await api.get('/analytics/quick-summary', {
        params: { month: selectedMonth }
      });
      setQuickSummary(response.data);
    } catch (error) {
      console.error('Error fetching quick summary:', error);
    }
  }, [selectedMonth]);

  // Full analytics load (for charts and detailed data)
  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await api.get('/analytics/dashboard', {
        params: { month: selectedMonth }
      });
      setAnalytics(response.data);
      // Update quick summary with full data
      setQuickSummary({
        total_income: response.data.total_income,
        total_expenses: response.data.total_expenses,
        net_profit: response.data.net_profit,
        income_count: response.data.income_count,
        expense_count: response.data.expense_count
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  // Initial load: fetch quick summary first, then full analytics
  useEffect(() => {
    setLoading(true);
    fetchQuickSummary();
    fetchAnalytics();
    
    // Auto-generate recurring entries on dashboard load (once per session)
    const hasGeneratedThisSession = sessionStorage.getItem('recurring_generated');
    if (!hasGeneratedThisSession) {
      api.post('/recurring/generate')
        .then(response => {
          const { income_count, expense_count } = response.data;
          if (income_count > 0 || expense_count > 0) {
            // If entries were generated, refresh the data
            fetchQuickSummary();
            fetchAnalytics();
          }
          sessionStorage.setItem('recurring_generated', 'true');
        })
        .catch(err => {
          // Silently handle error - don't disrupt user experience
          console.log('Auto-generate recurring skipped:', err.message);
        });
    }
  }, [selectedMonth, fetchQuickSummary, fetchAnalytics]);

  // Auto-refresh when data changes (from other pages)
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchQuickSummary();
      fetchAnalytics();
    }
  }, [refreshTrigger, fetchQuickSummary, fetchAnalytics]);

  // Use quick summary data if full analytics not loaded yet
  const displayData = analytics || (quickSummary ? {
    total_income: quickSummary.total_income,
    total_expenses: quickSummary.total_expenses,
    net_profit: quickSummary.net_profit,
    income_count: quickSummary.income_count,
    expense_count: quickSummary.expense_count,
    daily_data: [],
    top_customers: [],
    product_data: [],
    category_data: [],
    recent_income: [],
    recent_expenses: []
  } : null);

  if (loading && !quickSummary) {
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
      value: displayData?.total_income || 0,
      icon: TrendingUp,
      color: 'emerald',
      testId: 'total-income-card'
    },
    {
      title: 'Total Expenses',
      value: displayData?.total_expenses || 0,
      icon: TrendingDown,
      color: 'red',
      testId: 'total-expenses-card'
    },
    {
      title: 'Net Profit',
      value: displayData?.net_profit || 0,
      icon: DollarSign,
      color: (displayData?.net_profit || 0) >= 0 ? 'blue' : 'red',
      testId: 'net-profit-card'
    },
    {
      title: 'Transactions',
      value: `${displayData?.income_count || 0} / ${displayData?.expense_count || 0}`,
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="income-expense-chart">
          <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-slate-800 mb-4 sm:mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Income vs Expenses
          </h3>
          <div className="w-full h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.daily_data || []} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 10 }} 
                  width={50}
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
                <Legend 
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke={INCOME_COLOR} 
                  strokeWidth={2}
                  name="Income"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke={EXPENSE_COLOR} 
                  strokeWidth={2}
                  name="Expenses"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="product-chart">
          <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-slate-800 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Income by Product
          </h3>
          {analytics?.product_data && analytics.product_data.length > 0 ? (
            <>
              <div className="w-full aspect-square max-h-[280px] sm:max-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.product_data.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      innerRadius="35%"
                      outerRadius="70%"
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
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
                        padding: '8px 12px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                {analytics.product_data.slice(0, 6).map((item, index) => {
                  const total = analytics.product_data.reduce((sum, i) => sum + i.value, 0);
                  const percent = ((item.value / total) * 100).toFixed(0);
                  return (
                    <div key={index} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-slate-700 truncate flex-1">
                        {item.name}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {percent}%
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
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <TrendingUp className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No product data yet</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-200 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]" data-testid="category-chart">
          <h3 className="text-lg sm:text-xl md:text-2xl font-medium text-slate-800 mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Expenses by Category
          </h3>
          {analytics?.category_data && analytics.category_data.length > 0 ? (
            <>
              <div className="w-full aspect-square max-h-[280px] sm:max-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.category_data.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      innerRadius="35%"
                      outerRadius="70%"
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
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
                      padding: '8px 12px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                {analytics.category_data.slice(0, 6).map((item, index) => {
                  const total = analytics.category_data.reduce((sum, i) => sum + i.value, 0);
                  const percent = ((item.value / total) * 100).toFixed(0);
                  return (
                    <div key={index} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-slate-700 truncate flex-1">
                        {item.name}
                      </span>
                      <span className="text-slate-500 text-xs">
                        {percent}%
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
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <TrendingDown className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No expense data yet</p>
            </div>
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
