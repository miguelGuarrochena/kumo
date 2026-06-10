'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useT } from '@/lib/i18n/client';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export const Sheet = ({ open, onClose, title, children, footer }: Props) => {
  const { t } = useT();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          w-full sm:max-w-md
          bg-white dark:bg-slate-800 dark:border dark:border-slate-700
          text-slate-900 dark:text-slate-100
          rounded-t-3xl sm:rounded-2xl
          shadow-2xl
          max-h-[92dvh] sm:max-h-[85vh]
          min-h-0
          flex flex-col
          animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 fade-in
        "
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-600" />
        </div>

        <div className="flex items-center justify-between px-6 pt-3 pb-3 sm:pt-5 shrink-0 border-b border-slate-100 dark:border-slate-700/50">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-6 py-5">{children}</div>

        {footer && (
          <div className="shrink-0 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
