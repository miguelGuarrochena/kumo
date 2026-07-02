'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Camera, Upload, TrendingUp, Sparkles } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { QUICK_ADD_OPEN_EVENT, quickAddHref, type QuickAddIntent } from '@/lib/quickAdd';
import { openCommandPalette } from '@/lib/commandPalette';
import { useT } from '@/lib/i18n/client';
import { track } from '@/lib/analytics';

/**
 * Sheet global de carga rápida: se abre desde el "+" del nav mobile, el FAB
 * de desktop o cualquier componente vía openQuickAdd(). Cada acción navega a
 * /expenses con un intent (?new=1 / ?new=income / ?scan=1) que ExpensesClient
 * resuelve abriendo el modal o el flujo de escaneo.
 */
export const QuickAddSheet = () => {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  // Táctil → "Escanear ticket" (cámara); desktop → "Subir ticket" (archivo).
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(QUICK_ADD_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(QUICK_ADD_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const go = (intent: QuickAddIntent) => {
    setOpen(false);
    track('quick_add_action', { intent });
    router.push(quickAddHref(intent) as never);
  };

  const actions = [
    {
      id: 'new',
      icon: Wallet,
      iconClass: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300',
      title: t.quickAdd.new_expense,
      desc: t.quickAdd.new_expense_desc,
      onClick: () => go('new'),
    },
    {
      id: 'scan',
      icon: isTouch ? Camera : Upload,
      iconClass: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300',
      title: isTouch ? t.quickAdd.scan : t.quickAdd.scan_upload,
      desc: isTouch ? t.quickAdd.scan_desc : t.quickAdd.scan_upload_desc,
      onClick: () => go('scan'),
    },
    {
      id: 'income',
      icon: TrendingUp,
      iconClass: 'bg-mint-100 dark:bg-mint-500/20 text-mint-700 dark:text-mint-300',
      title: t.quickAdd.new_income,
      desc: t.quickAdd.new_income_desc,
      onClick: () => go('income'),
    },
    {
      id: 'nlp',
      icon: Sparkles,
      iconClass: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
      title: t.quickAdd.nlp,
      desc: t.quickAdd.nlp_desc,
      onClick: () => {
        setOpen(false);
        track('quick_add_action', { intent: 'nlp' });
        openCommandPalette();
      },
    },
  ] as const;

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title={t.quickAdd.title}>
      <div className="space-y-2 -mx-2">
        {actions.map(({ id, icon: Icon, iconClass, title, desc, onClick }) => (
          <button
            key={id}
            type="button"
            onClick={onClick}
            className="w-full flex items-center gap-3.5 px-3 py-3 rounded-2xl text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 active:scale-[0.99] transition-all"
          >
            <span className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${iconClass}`}>
              <Icon className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-slate-900 dark:text-slate-100">{title}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</span>
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
};
