'use client';

import type { ContactLite } from './types';
import { DividirTab } from './DividirTab';

type Props = {
  contacts: ContactLite[];
  isPro: boolean;
};

export const CompartirClient = ({ contacts, isPro }: Props) => {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Compartir gastos</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Dividí una cuenta al toque y mandalo por WhatsApp o guardalo como gasto del espacio.
        </p>
      </header>

      <DividirTab contacts={contacts} isPro={isPro} />
    </div>
  );
};
