'use client';

import { X } from 'lucide-react';
import { useT } from '@/lib/i18n/client';

type FilterChipProps = {
  children: React.ReactNode;
  onRemove: () => void;
};

export const FilterChip = ({ children, onRemove }: FilterChipProps) => {
  const { t } = useT();
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-medium">
      {children}
      <button
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-sky-200"
        aria-label={t.expenses.filter_remove}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
};
