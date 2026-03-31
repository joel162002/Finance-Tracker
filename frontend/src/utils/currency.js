// Currency symbols and formatting info
export const CURRENCY_INFO = {
  PHP: { symbol: '₱', locale: 'en-PH', name: 'Philippine Peso' },
  USD: { symbol: '$', locale: 'en-US', name: 'US Dollar' },
  EUR: { symbol: '€', locale: 'de-DE', name: 'Euro' },
  GBP: { symbol: '£', locale: 'en-GB', name: 'British Pound' },
  JPY: { symbol: '¥', locale: 'ja-JP', name: 'Japanese Yen' },
  CNY: { symbol: '¥', locale: 'zh-CN', name: 'Chinese Yuan' },
  KRW: { symbol: '₩', locale: 'ko-KR', name: 'Korean Won' },
  SGD: { symbol: 'S$', locale: 'en-SG', name: 'Singapore Dollar' },
  AUD: { symbol: 'A$', locale: 'en-AU', name: 'Australian Dollar' },
  CAD: { symbol: 'C$', locale: 'en-CA', name: 'Canadian Dollar' }
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_INFO);

export const formatCurrency = (amount, currency = 'PHP') => {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  
  const currencyInfo = CURRENCY_INFO[currency] || CURRENCY_INFO.PHP;
  
  // For JPY and KRW, no decimal places
  const fractionDigits = ['JPY', 'KRW'].includes(currency) ? 0 : 2;
  
  return new Intl.NumberFormat(currencyInfo.locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(amount);
};

export const getCurrencySymbol = (currency = 'PHP') => {
  return CURRENCY_INFO[currency]?.symbol || '₱';
};

export const parseCurrencyInput = (value) => {
  if (typeof value === 'number') return value;
  
  const stringValue = String(value).toLowerCase().trim();
  
  if (stringValue.endsWith('k')) {
    return parseFloat(stringValue) * 1000;
  }
  
  const cleanedValue = stringValue.replace(/[^0-9.]/g, '');
  return parseFloat(cleanedValue) || 0;
};
