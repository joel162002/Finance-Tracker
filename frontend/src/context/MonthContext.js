import { createContext, useContext, useState, useCallback } from 'react';
import { getCurrentMonth } from '../utils/date';

const MonthContext = createContext(null);

export const useMonth = () => {
  const context = useContext(MonthContext);
  if (!context) {
    throw new Error('useMonth must be used within a MonthProvider');
  }
  return context;
};

export const MonthProvider = ({ children }) => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Try to get from localStorage first
    const saved = localStorage.getItem('selectedMonth');
    return saved || getCurrentMonth();
  });

  const changeMonth = useCallback((month) => {
    setSelectedMonth(month);
    localStorage.setItem('selectedMonth', month);
  }, []);

  // Generate month options (last 12 months + next 2 months)
  const getMonthOptions = useCallback(() => {
    const options = [];
    const now = new Date();
    
    // Start from 12 months ago
    for (let i = -12; i <= 2; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    
    return options.reverse(); // Most recent first
  }, []);

  const getMonthLabel = useCallback((monthValue) => {
    if (!monthValue) return '';
    const [year, month] = monthValue.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }, []);

  const getShortMonthLabel = useCallback((monthValue) => {
    if (!monthValue) return '';
    const [year, month] = monthValue.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }, []);

  const value = {
    selectedMonth,
    changeMonth,
    getMonthOptions,
    getMonthLabel,
    getShortMonthLabel
  };

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
};
