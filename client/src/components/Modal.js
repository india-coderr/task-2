'use client';

import React, { useEffect } from 'react';

export const Modal = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white border border-[#cbd5e1] rounded-[3px] p-5 shadow-none animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#e2e8f0]">
          <h3 className="font-semibold text-[15px] text-[#0f172a]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-[#0f172a] text-sm px-1.5 py-0.5 rounded-[3px] border border-transparent hover:border-[#cbd5e1]"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
