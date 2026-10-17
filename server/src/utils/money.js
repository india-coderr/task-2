/**
 * Money calculations and pricing logic using integer minor units (paise).
 * All intermediate arithmetic operates on integers to prevent floating-point inaccuracies.
 * Values are rounded half-up and returned as 2-decimal numbers.
 */

export const toPaise = (rupees) => {
  if (rupees === null || rupees === undefined || isNaN(rupees)) return 0;
  return Math.round(Number(rupees) * 100);
};

export const fromPaise = (paise) => {
  if (paise === null || paise === undefined || isNaN(paise)) return 0;
  return Number((Math.round(Number(paise)) / 100).toFixed(2));
};

export const formatMoney = (amount, symbol = '₹') => {
  const num = Number(amount || 0);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
  return `${symbol}${formatted}`;
};

/**
 * Pure calculation function for sale totals.
 * 
 * @param {Object} params
 * @param {Array} params.items - List of { productId, sku, name, unitPrice, costPrice, quantity }
 * @param {'none'|'percent'|'fixed'} [params.discountType='none']
 * @param {number} [params.discountValue=0]
 * @param {number} [params.taxRate=0] - Percentage e.g. 5 for 5%
 * @returns {Object} Calculated totals and formatted line items
 */
export const calculateSaleTotals = ({
  items = [],
  discountType = 'none',
  discountValue = 0,
  taxRate = 0
}) => {
  let subtotalPaise = 0;
  const warnings = [];

  const processedItems = items.map((item) => {
    const qty = parseInt(item.quantity, 10) || 0;
    const unitPricePaise = toPaise(item.unitPrice);
    const costPricePaise = toPaise(item.costPrice ?? item.costPriceSnapshot ?? 0);
    const lineTotalPaise = unitPricePaise * qty;

    if (item.costPrice !== undefined && item.unitPrice < item.costPrice) {
      warnings.push(`Selling price for ${item.name || item.sku} (₹${item.unitPrice}) is lower than purchase price (₹${item.costPrice}).`);
    }

    subtotalPaise += lineTotalPaise;

    return {
      productId: item.productId,
      skuSnapshot: item.skuSnapshot || item.sku,
      nameSnapshot: item.nameSnapshot || item.name,
      unitPrice: fromPaise(unitPricePaise),
      costPriceSnapshot: fromPaise(costPricePaise),
      quantity: qty,
      lineTotal: fromPaise(lineTotalPaise)
    };
  });

  // Calculate discount in paise
  let discountAmountPaise = 0;
  const numDiscountValue = Number(discountValue) || 0;

  if (discountType === 'percent') {
    discountAmountPaise = Math.round((subtotalPaise * numDiscountValue) / 100);
  } else if (discountType === 'fixed') {
    discountAmountPaise = toPaise(numDiscountValue);
  }

  // Discount cannot exceed subtotal
  if (discountAmountPaise > subtotalPaise) {
    discountAmountPaise = subtotalPaise;
  }
  if (discountAmountPaise < 0) {
    discountAmountPaise = 0;
  }

  // Taxable amount = subtotal - discount
  const taxableAmountPaise = Math.max(0, subtotalPaise - discountAmountPaise);

  // Tax calculation on taxable amount
  const numTaxRate = Number(taxRate) || 0;
  const taxAmountPaise = Math.round((taxableAmountPaise * numTaxRate) / 100);

  // Total = taxable amount + tax
  const totalPaise = taxableAmountPaise + taxAmountPaise;

  return {
    items: processedItems,
    subtotal: fromPaise(subtotalPaise),
    discountType: ['percent', 'fixed'].includes(discountType) ? discountType : 'none',
    discountValue: numDiscountValue,
    discountAmount: fromPaise(discountAmountPaise),
    taxRate: numTaxRate,
    taxAmount: fromPaise(taxAmountPaise),
    total: fromPaise(totalPaise),
    warnings
  };
};
