'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    storeName: 'Greenfield Grocers',
    currencySymbol: '₹',
    taxRate: 5,
    staffMaxDiscountPercent: 10
  });
  const [lowStockCount, setLowStockCount] = useState(0);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiClient('/settings');
      if (res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.warn('Could not load settings:', err.message);
    }
  }, [user]);

  const fetchLowStockCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiClient('/inventory/low-stock');
      if (Array.isArray(res.data)) {
        setLowStockCount(res.data.length);
      }
    } catch (err) {
      console.warn('Could not fetch low-stock count:', err.message);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchLowStockCount();
    }
  }, [user, fetchSettings, fetchLowStockCount]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        lowStockCount,
        refreshSettings: fetchSettings,
        refreshLowStockCount: fetchLowStockCount
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
