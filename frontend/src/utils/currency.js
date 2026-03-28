export const formatCurrency = (amount) => {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
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
