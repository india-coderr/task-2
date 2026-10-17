'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '../../../components/ProtectedRoute';
import { apiClient } from '../../../lib/api';
import { formatCurrency } from '../../../lib/money';
import { formatDisplayDateTime } from '../../../lib/date';
import { useSettings } from '../../../context/SettingsContext';

export default function InvoicePrintPage() {
  const { id } = useParams();
  const { settings } = useSettings();
  const [sale, setSale] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchSale = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await apiClient(`/sales/${id}`);
      setSale(res.data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load invoice details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSale();
  }, [fetchSale]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="py-16 text-center text-xs text-[#64748b]">
          Loading invoice data...
        </div>
      </ProtectedRoute>
    );
  }

  if (errorMsg || !sale) {
    return (
      <ProtectedRoute>
        <div className="max-w-md mx-auto my-10 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
          {errorMsg || 'Invoice not found.'}
          <div className="mt-3">
            <Link href="/sales" className="text-[#15803d] font-semibold underline">
              ← Return to Sales
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Navigation Toolbar (Hidden during print) */}
        <div className="flex items-center justify-between no-print">
          <Link
            href="/sales"
            className="text-xs text-[#475569] hover:text-[#0f172a] font-medium"
          >
            ← Back to sales
          </Link>

          <div className="flex items-center space-x-2">
            <Link
              href="/sales/new"
              className="px-3 py-1.5 border border-[#cbd5e1] hover:bg-white text-xs font-medium text-[#334155] rounded-[3px]"
            >
              + New Sale
            </Link>
            <button
              onClick={handlePrint}
              className="bg-[#15803d] hover:bg-[#166534] text-white text-xs font-semibold px-4 py-1.5 rounded-[3px] transition-colors"
            >
              Print Invoice
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="invoice-container bg-white border border-[#cbd5e1] rounded-[3px] p-8 text-xs text-[#0f172a]">
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b border-[#cbd5e1]">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#0f172a]">
                {settings?.storeName || 'Greenfield Grocers'}
              </h1>
              <p className="text-[#64748b] text-[11px] mt-0.5">
                Retail & Point of Sale System
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold font-mono text-[#0f172a]">
                {sale.invoiceNumber}
              </div>
              <div className="text-[#64748b] text-[11px] mt-0.5">
                {formatDisplayDateTime(sale.createdAt)}
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-[#e2e8f0] text-xs">
            <div>
              <span className="text-[#64748b]">Billed to: </span>
              <span className="font-semibold text-[#0f172a]">
                {sale.customerName ? sale.customerName : 'Walk-in Customer'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#64748b]">Cashier: </span>
              <span className="font-semibold text-[#0f172a]">
                {sale.createdBy?.name || 'Staff Member'}
              </span>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#cbd5e1] text-[#64748b] font-semibold">
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Product Description</th>
                  <th className="pb-2 text-right">Unit Price</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {sale.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 font-mono text-[#64748b]">{item.skuSnapshot}</td>
                    <td className="py-2.5 font-medium text-[#0f172a]">{item.nameSnapshot}</td>
                    <td className="py-2.5 text-right tabular-nums text-[#475569]">
                      {formatCurrency(item.unitPrice, settings?.currencySymbol)}
                    </td>
                    <td className="py-2.5 text-center tabular-nums text-[#0f172a] font-medium">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 text-right tabular-nums font-semibold text-[#0f172a]">
                      {formatCurrency(item.lineTotal, settings?.currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown */}
          <div className="pt-3 border-t border-[#cbd5e1]">
            <div className="w-64 ml-auto space-y-1.5 text-xs">
              <div className="flex justify-between text-[#64748b]">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-[#0f172a]">
                  {formatCurrency(sale.subtotal, settings?.currencySymbol)}
                </span>
              </div>

              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-[#b45309]">
                  <span>
                    Discount {sale.discountType === 'percent' ? `(${sale.discountValue}%)` : ''}
                  </span>
                  <span className="tabular-nums font-medium">
                    -{formatCurrency(sale.discountAmount, settings?.currencySymbol)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-[#64748b]">
                <span>Tax ({sale.taxRate}%)</span>
                <span className="tabular-nums font-medium text-[#0f172a]">
                  {formatCurrency(sale.taxAmount, settings?.currencySymbol)}
                </span>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-[#cbd5e1] text-sm font-bold text-[#0f172a]">
                <span>Grand Total</span>
                <span className="tabular-nums text-base">
                  {formatCurrency(sale.total, settings?.currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer & Payment Info */}
          <div className="mt-8 pt-4 border-t border-[#e2e8f0] flex justify-between items-center text-[11px] text-[#64748b]">
            <div>
              Payment Tendered: <span className="font-semibold text-[#0f172a]">{sale.paymentMethod}</span>
            </div>
            <div>Status: <span className="font-semibold text-[#15803d]">Paid in Full</span></div>
          </div>

          <div className="mt-4 text-center text-[10px] text-[#94a3b8]">
            Thank you for shopping with us! Please retain this invoice for your records.
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
