/**
 * Format numerical amounts in Indian numbering format (e.g. ₹48,260.00)
 */
export const formatCurrency = (amount, symbol = '₹') => {
  const num = Number(amount || 0);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return `${symbol}${formatted}`;
};

export const formatQuantity = (qty) => {
  return new Intl.NumberFormat('en-IN').format(Number(qty || 0));
};
