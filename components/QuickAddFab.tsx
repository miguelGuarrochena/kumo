'use client';

import { Plus } from 'lucide-react';
import { openQuickAdd } from '@/lib/quickAdd';
import { useT } from '@/lib/i18n/client';

/** FAB de desktop (mobile ya tiene el "+" central en el nav inferior). */
export const QuickAddFab = () => {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={openQuickAdd}
      aria-label={t.quickAdd.fab_label}
      title={t.quickAdd.fab_label}
      className="hidden lg:grid fixed bottom-8 right-8 z-30 w-14 h-14 rounded-full kumo-gradient text-white shadow-xl shadow-sky-500/30 place-items-center hover:scale-105 active:scale-95 transition-transform"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
};
