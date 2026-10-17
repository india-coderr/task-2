'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { apiClient } from '../../../lib/api';
import { formatCurrency } from '../../../lib/money';
import { useSettings } from '../../../context/SettingsContext';

export default function NewSalePage() {
  const router = useRouter();
  const { settings, refreshLowStockCount } = useSettings();

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]); // [{ product, quantity }]
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerName, setCustomerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [insufficientStockErrors, setInsufficientStockErrors] = useState(null);
  const [generalError, setGeneralError] = useState('');

  // Fetch available products
  const fetchProducts = useCallback(async () => {
    try {
      setIsLoadingProducts(true);
      const res = await apiClient('/products?limit=100');
      // Only active products
      setProducts(res.data.filter((p) => p.isActive));
    } catch (err) {
      setGeneralError(err.message || 'Failed to load products');
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter products by search term (case-insensitive on name or SKU)
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase().trim();
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Add item to cart
  const handleAddToCart = (product) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          return prev; // cannot exceed available stock
        }
        return prev.map((item) =>
          item.product._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setInsufficientStockErrors(null);
    setGeneralError('');
  };

  // Quick enter key search add
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts.length > 0) {
        const topProduct = filteredProducts[0];
        if (topProduct.stock > 0) {
          handleAddToCart(topProduct);
          setSearchTerm('');
        }
      }
    }
  };

  // Adjust cart item quantity
  const handleUpdateQuantity = (productId, delta) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product._id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.stock) return item; // cap at stock
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean);
    });
    setInsufficientStockErrors(null);
    setGeneralError('');
  };

  // Calculate live preview bill
  const billSummary = useMemo(() => {
    let subtotal = 0;
    for (const item of cart) {
      subtotal += item.product.sellingPrice * item.quantity;
    }

    let discountAmount = 0;
    const numDiscVal = parseFloat(discountValue) || 0;
    if (discountType === 'percent') {
      discountAmount = (subtotal * numDiscVal) / 100;
    } else if (discountType === 'fixed') {
      discountAmount = numDiscVal;
    }
    if (discountAmount > subtotal) discountAmount = subtotal;
    if (discountAmount < 0) discountAmount = 0;

    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxRate = settings?.taxRate || 5;
    const taxAmount = (taxableAmount * taxRate) / 100;
    const total = taxableAmount + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxRate,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }, [cart, discountType, discountValue, settings?.taxRate]);

  // Submit Sale to Server
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setGeneralError('Please add at least one product to the sale.');
      return;
    }

    setGeneralError('');
    setInsufficientStockErrors(null);
    setIsSubmitting(true);

    try {
      const payload = {
        items: cart.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity
        })),
        discountType: discountType === 'none' ? 'none' : discountType,
        discountValue: parseFloat(discountValue) || 0,
        paymentMethod,
        customerName: customerName.trim()
      };

      const res = await apiClient('/sales', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      refreshLowStockCount();
      // Redirect to invoice page
      const saleId = res.data.sale._id;
      router.push(`/sales/${saleId}`);
    } catch (err) {
      if (err.code === 'INSUFFICIENT_STOCK' && Array.isArray(err.details)) {
        setInsufficientStockErrors(err.details);
      } else {
        setGeneralError(err.message || 'Failed to complete sale');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-4">
        {/* Error Banners */}
        {generalError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
            {generalError}
          </div>
        )}

        {insufficientStockErrors && (
          <div className="p-3.5 bg-red-50 border border-red-300 text-red-800 text-xs rounded-[3px] space-y-1.5">
            <div className="font-semibold text-red-900">
              Sale Rejected: Insufficient Stock Available
            </div>
            <p className="text-[11px] text-red-700">
              The following requested quantities exceed current available warehouse stock:
            </p>
            <ul className="list-disc pl-5 space-y-0.5">
              {insufficientStockErrors.map((item) => (
                <li key={item.productId} className="tabular-nums">
                  <span className="font-semibold">{item.name}</span> ({item.sku}): Requested{' '}
                  <span className="font-bold">{item.requested}</span>, only{' '}
                  <span className="font-bold">{item.available}</span> available.
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 2-Column POS Layout - Image 2 Match */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Panel: New Sale Product Search (Green Border) */}
          <div className="lg:col-span-7 bg-white border border-[#16a34a] rounded-[3px] p-4">
            <h1 className="text-[17px] font-bold text-[#0f172a] mb-3">New sale</h1>

            {/* Search Input from Image 2 */}
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by name or SKU, Enter to add"
                className="w-full px-3 py-2 text-xs border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#15803d]"
              />
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-[#64748b] font-medium sticky top-0 bg-white">
                    <th className="pb-2 font-medium">SKU</th>
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 text-right font-medium">Price</th>
                    <th className="pb-2 text-center font-medium">Stock</th>
                    <th className="pb-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => {
                      const isOutOfStock = p.stock <= 0;
                      const isLowStock = p.stock <= p.reorderLevel && p.stock > 0;
                      const cartItem = cart.find((i) => i.product._id === p._id);
                      const cartQty = cartItem ? cartItem.quantity : 0;
                      const canAddMore = cartQty < p.stock;

                      return (
                        <tr key={p._id} className="hover:bg-[#f8fafc]">
                          <td className="py-2.5 font-mono text-[#475569]">{p.sku}</td>
                          <td className="py-2.5 font-medium text-[#0f172a]">{p.name}</td>
                          <td className="py-2.5 text-right tabular-nums text-[#0f172a] font-medium">
                            {formatCurrency(p.sellingPrice, settings?.currencySymbol)}
                          </td>
                          <td className="py-2.5 text-center tabular-nums">
                            {isOutOfStock ? (
                              <span className="text-red-600 font-semibold inline-flex items-center space-x-1">
                                <span>●</span>
                                <span>Out</span>
                              </span>
                            ) : isLowStock ? (
                              <span className="text-[#b45309] font-medium inline-flex items-center space-x-1">
                                <span>●</span>
                                <span>{p.stock} Low</span>
                              </span>
                            ) : (
                              <span className="text-[#15803d] font-semibold">{p.stock}</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleAddToCart(p)}
                              disabled={isOutOfStock || !canAddMore}
                              className={`text-xs font-semibold px-3 py-1 rounded-[3px] transition-colors ${
                                isOutOfStock || !canAddMore
                                  ? 'border border-[#cbd5e1] text-[#94a3b8] cursor-not-allowed bg-[#f8fafc]'
                                  : 'bg-[#15803d] hover:bg-[#166534] text-white'
                              }`}
                            >
                              Add
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#94a3b8]">
                        {isLoadingProducts ? 'Loading products...' : 'No products matched your search.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Panel: Current Sale (Amber Border) */}
          <div className="lg:col-span-5 bg-white border border-[#d97706] rounded-[3px] p-4 flex flex-col space-y-4">
            <h2 className="text-[17px] font-bold text-[#0f172a]">Current sale</h2>

            {/* Cart Items List */}
            <div className="divide-y divide-[#f1f5f9] min-h-[140px] max-h-[280px] overflow-y-auto">
              {cart.length > 0 ? (
                cart.map((item) => (
                  <div key={item.product._id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex-1 pr-2">
                      <div className="font-medium text-[#0f172a]">{item.product.name}</div>
                      <div className="text-[11px] text-[#64748b] tabular-nums">
                        {formatCurrency(item.product.sellingPrice, settings?.currencySymbol)}
                      </div>
                    </div>

                    {/* Stepper [- 1 +] */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleUpdateQuantity(item.product._id, -1)}
                        className="w-6 h-6 border border-[#cbd5e1] hover:bg-[#f1f5f9] rounded-[3px] flex items-center justify-center font-bold text-xs text-[#334155]"
                      >
                        -
                      </button>
                      <span className="w-7 text-center font-semibold tabular-nums text-xs">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.product._id, 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-6 h-6 border border-[#cbd5e1] hover:bg-[#f1f5f9] disabled:opacity-40 disabled:cursor-not-allowed rounded-[3px] flex items-center justify-center font-bold text-xs text-[#334155]"
                      >
                        +
                      </button>
                    </div>

                    <div className="w-20 text-right font-semibold text-[#0f172a] tabular-nums">
                      {formatCurrency(item.product.sellingPrice * item.quantity, settings?.currencySymbol)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-xs text-[#94a3b8]">
                  Cart is empty. Select products from the left to start sale.
                </div>
              )}
            </div>

            {/* Discount and Customer Input Row from Image 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-[#e2e8f0]">
              <div className="sm:col-span-4">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-[#cbd5e1] rounded-[3px] bg-white focus:outline-none focus:border-[#15803d]"
                >
                  <option value="none">No discount</option>
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <input
                  type="number"
                  min="0"
                  step="any"
                  disabled={discountType === 'none'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'percent' ? 'e.g. 5' : 'e.g. 50'}
                  className="w-full px-2 py-1.5 text-xs border border-[#cbd5e1] rounded-[3px] disabled:bg-[#f8fafc] focus:outline-none focus:border-[#15803d]"
                />
              </div>

              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer (optional)"
                  className="w-full px-2 py-1.5 text-xs border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#15803d]"
                />
              </div>
            </div>

            {/* Payment Method Selector Buttons from Image 2 */}
            <div className="grid grid-cols-3 gap-2">
              {['Cash', 'UPI', 'Card'].map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-1.5 text-xs font-semibold rounded-[3px] transition-colors border ${
                      isSelected
                        ? 'bg-[#15803d] text-white border-[#15803d]'
                        : 'bg-white text-[#334155] border-[#cbd5e1] hover:bg-[#f8fafc]'
                    }`}
                  >
                    {method}
                  </button>
                );
              })}
            </div>

            {/* Bill Financial Summary Box from Image 2 */}
            <div className="border border-[#15803d] rounded-[3px] p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#475569]">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-[#0f172a]">
                  {formatCurrency(billSummary.subtotal, settings?.currencySymbol)}
                </span>
              </div>

              {billSummary.discountAmount > 0 && (
                <div className="flex justify-between text-[#b45309]">
                  <span>
                    Discount {discountType === 'percent' ? `(${discountValue}%)` : ''}
                  </span>
                  <span className="tabular-nums font-medium">
                    -{formatCurrency(billSummary.discountAmount, settings?.currencySymbol)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-[#475569]">
                <span>Tax ({billSummary.taxRate}%)</span>
                <span className="tabular-nums font-medium text-[#0f172a]">
                  {formatCurrency(billSummary.taxAmount, settings?.currencySymbol)}
                </span>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-[#e2e8f0]">
                <span className="text-sm font-bold text-[#0f172a]">Total</span>
                <span className="text-xl font-bold text-[#0f172a] tabular-nums">
                  {formatCurrency(billSummary.total, settings?.currencySymbol)}
                </span>
              </div>
            </div>

            {/* Complete Sale CTA Button */}
            <button
              type="button"
              onClick={handleCompleteSale}
              disabled={isSubmitting || cart.length === 0}
              className="w-full bg-[#15803d] hover:bg-[#166534] disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-[3px] transition-colors"
            >
              {isSubmitting ? 'Processing sale...' : 'Complete sale'}
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
