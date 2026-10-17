'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { apiClient } from '../../lib/api';
import { useSettings } from '../../context/SettingsContext';

export default function SettingsPage() {
  const { settings, refreshSettings } = useSettings();

  const [storeName, setStoreName] = useState('');
  const [taxRate, setTaxRate] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('');
  const [staffMaxDiscountPercent, setStaffMaxDiscountPercent] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (settings) {
      setStoreName(settings.storeName || 'Greenfield Grocers');
      setTaxRate(String(settings.taxRate ?? 5));
      setCurrencySymbol(settings.currencySymbol || '₹');
      setStaffMaxDiscountPercent(String(settings.staffMaxDiscountPercent ?? 10));
    }
  }, [settings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      await apiClient('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          storeName: storeName.trim(),
          taxRate: parseFloat(taxRate),
          currencySymbol: currencySymbol.trim(),
          staffMaxDiscountPercent: parseFloat(staffMaxDiscountPercent)
        })
      });
      setSuccessMsg('Store settings updated successfully.');
      refreshSettings();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <div className="max-w-xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">System settings</h1>
          <p className="text-xs text-[#64748b]">
            Configure store defaults, taxation, currency formatting, and staff discount limits.
          </p>
        </div>

        {successMsg && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-[3px]">
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
            {errorMsg}
          </div>
        )}

        <div className="bg-white border border-[#cbd5e1] rounded-[3px] p-5">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-[#334155] mb-1">Store / Business Name</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Greenfield Grocers"
                className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#15803d]"
              />
              <span className="text-[10px] text-[#64748b]">
                Displayed on navbar branding, receipts, and invoices.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#334155] mb-1">Default Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="5"
                  className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#15803d]"
                />
                <span className="text-[10px] text-[#64748b]">Applied on taxable sale amounts.</span>
              </div>

              <div>
                <label className="block font-medium text-[#334155] mb-1">Currency Symbol</label>
                <input
                  type="text"
                  required
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="₹"
                  className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#15803d]"
                />
                <span className="text-[10px] text-[#64748b]">Prefix symbol for monetary amounts.</span>
              </div>
            </div>

            <div>
              <label className="block font-medium text-[#334155] mb-1">
                Staff Maximum Discount Ceiling (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                required
                value={staffMaxDiscountPercent}
                onChange={(e) => setStaffMaxDiscountPercent(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-1.5 border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#15803d]"
              />
              <span className="text-[10px] text-[#64748b]">
                Sales by Staff role exceeding this discount percentage are rejected with 403 Forbidden.
              </span>
            </div>

            <div className="pt-2 border-t border-[#e2e8f0] flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#15803d] hover:bg-[#166534] disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-[3px] transition-colors"
              >
                {isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
