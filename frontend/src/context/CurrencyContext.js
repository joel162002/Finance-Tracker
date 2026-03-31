import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { CURRENCY_INFO, SUPPORTED_CURRENCIES, formatCurrency as formatCurrencyUtil } from '../utils/currency';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState('PHP');
  const [loading, setLoading] = useState(true);

  // Load user's currency preference
  useEffect(() => {
    const loadCurrency = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/user/settings');
        if (response.data?.default_currency) {
          setCurrency(response.data.default_currency);
        }
      } catch (error) {
        console.error('Failed to load currency settings');
      } finally {
        setLoading(false);
      }
    };

    loadCurrency();
  }, []);

  const changeCurrency = useCallback(async (newCurrency) => {
    if (!SUPPORTED_CURRENCIES.includes(newCurrency)) {
      console.error('Unsupported currency:', newCurrency);
      return false;
    }

    try {
      await api.put('/user/settings', { default_currency: newCurrency });
      setCurrency(newCurrency);
      return true;
    } catch (error) {
      console.error('Failed to change currency:', error);
      return false;
    }
  }, []);

  const getCurrencySymbol = useCallback(() => {
    return CURRENCY_INFO[currency]?.symbol || '₱';
  }, [currency]);

  const getCurrencyInfo = useCallback(() => {
    return CURRENCY_INFO[currency] || CURRENCY_INFO.PHP;
  }, [currency]);

  // Context-aware formatCurrency function that uses the current currency
  const formatCurrency = useCallback((amount, overrideCurrency = null) => {
    return formatCurrencyUtil(amount, overrideCurrency || currency);
  }, [currency]);

  const value = {
    currency,
    setCurrency: changeCurrency,
    getCurrencySymbol,
    getCurrencyInfo,
    formatCurrency,
    loading,
    supportedCurrencies: SUPPORTED_CURRENCIES,
    currencyInfo: CURRENCY_INFO
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
