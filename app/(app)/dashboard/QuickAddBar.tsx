'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, Camera, Plus, Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { track } from '@/lib/analytics';
import { looksExpenseIntent, NLP_EXPENSE_STORAGE_KEY } from '@/lib/nlp/detect';
import { openCommandPalette } from '@/lib/commandPalette';
import { quickAddHref } from '@/lib/quickAdd';

/**
 * Carga rápida en el Dashboard: input en lenguaje natural (misma API NLP que
 * el command palette) + accesos directos a escanear ticket y alta manual.
 */
export const QuickAddBar = () => {
  const router = useRouter();
  const { t } = useT();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q || loading) return;
    // Si no parece un gasto ("luz", "notas"...), lo mandamos al buscador.
    if (!looksExpenseIntent(q)) {
      openCommandPalette({ query: q });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/nlp-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'PRO_REQUIRED') {
          toast.error(data.error ?? t.expenses.scan_pro_only);
          router.push('/settings#plans');
          return;
        }
        toast.error(data.error ?? t.expenses.nlp_failed);
        track('nlp_expense_used', { success: false, source: 'dashboard' });
        return;
      }
      sessionStorage.setItem(NLP_EXPENSE_STORAGE_KEY, JSON.stringify(data));
      track('nlp_expense_used', { success: true, source: 'dashboard' });
      setText('');
      router.push('/expenses?nlp=1');
    } catch {
      toast.error(t.expenses.nlp_failed);
      track('nlp_expense_used', { success: false, source: 'dashboard' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kumo-card p-3 sm:p-4">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 focus-within:border-sky-300 dark:focus-within:border-sky-600 transition-colors">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.quickAdd.bar_placeholder}
            className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl kumo-gradient text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>{t.quickAdd.bar_action}</span>}
        </button>
      </form>
      <div className="flex gap-2 mt-2.5">
        <button
          type="button"
          onClick={() => router.push(quickAddHref('scan') as never)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300 dark:hover:border-sky-500 active:scale-95 transition-all"
        >
          <Camera className="w-3.5 h-3.5" />
          {t.quickAdd.bar_scan}
        </button>
        <button
          type="button"
          onClick={() => router.push(quickAddHref('new') as never)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-300 dark:hover:border-sky-500 active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          {t.quickAdd.bar_new}
        </button>
      </div>
    </div>
  );
};
