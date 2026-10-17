'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (fillEmail, fillPass) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setErrorMsg('');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white border border-[#cbd5e1] rounded-[3px] p-6">
        <div className="mb-5">
          <div className="flex items-center space-x-2 mb-1">
            <h1 className="font-bold text-lg text-[#0f172a]">{settings?.storeName || 'Greenfield Grocers'}</h1>
            <span className="border border-[#cbd5e1] text-[#475569] text-[10px] font-semibold px-1 py-0.5 rounded-[3px]">POS</span>
          </div>
          <p className="text-xs text-[#64748b]">Sign in with your staff or administrator account</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[3px]">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[#334155] mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="e.g. admin@store.com"
              className="w-full px-3 py-1.5 text-xs border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#15803d]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#334155] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-1.5 text-xs border border-[#cbd5e1] rounded-[3px] focus:outline-none focus:border-[#15803d]"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#15803d] hover:bg-[#166534] disabled:opacity-50 text-white font-medium text-xs py-2 rounded-[3px] transition-colors mt-2"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[#e2e8f0]">
          <p className="text-[11px] text-[#64748b] mb-2 font-medium">Quick Fill Demo Accounts:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@store.com', 'Admin@123')}
              className="px-2 py-1.5 border border-[#cbd5e1] hover:bg-[#f8fafc] text-[11px] text-[#334155] rounded-[3px] text-left"
            >
              <div className="font-semibold">Admin</div>
              <div className="text-[#64748b] text-[10px]">admin@store.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('staff@store.com', 'Staff@123')}
              className="px-2 py-1.5 border border-[#cbd5e1] hover:bg-[#f8fafc] text-[11px] text-[#334155] rounded-[3px] text-left"
            >
              <div className="font-semibold">Staff</div>
              <div className="text-[#64748b] text-[10px]">staff@store.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
