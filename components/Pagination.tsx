'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { pageWindow, totalPages } from '@/lib/pagination';
import { useT } from '@/lib/i18n/client';

type PaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Si hay más páginas pero el total exacto es desconocido (ej. admin). */
  hasMore?: boolean;
};

export const Pagination = ({
  page,
  pageSize,
  totalCount,
  onPageChange,
  className = '',
  hasMore = false,
}: PaginationProps) => {
  const { t } = useT();
  const p = t.pagination;
  const pages = hasMore ? Math.max(page + 1, 2) : totalPages(totalCount, pageSize);

  if (!hasMore && totalCount <= pageSize) return null;
  if (hasMore && page === 1 && totalCount <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = hasMore && page * pageSize < totalCount ? page * pageSize : Math.min(page * pageSize, totalCount);
  const window = pageWindow(page, pages);
  const firstInWindow = window[0];
  const lastInWindow = window[window.length - 1];

  const go = (next: number) => {
    if (next < 1 || next > pages || next === page) return;
    onPageChange(next);
  };

  const btnBase =
    'min-w-[2.25rem] h-9 px-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:pointer-events-none';
  const btnIdle =
    'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
  const btnActive = 'kumo-gradient text-white shadow-sm';

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 ${className}`}
    >
      <p className="text-xs text-slate-500 dark:text-slate-400 order-2 sm:order-1">
        {hasMore
          ? p.showing_more.replace('{from}', String(from)).replace('{to}', String(to))
          : p.showing.replace('{from}', String(from)).replace('{to}', String(to)).replace('{total}', String(totalCount))}
      </p>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label={p.prev}
          className={`${btnBase} ${btnIdle} flex items-center gap-0.5 pl-2 pr-2.5`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">{p.prev}</span>
        </button>

        {firstInWindow !== undefined && firstInWindow > 1 && (
          <>
            <button type="button" onClick={() => go(1)} className={`${btnBase} ${btnIdle}`}>1</button>
            {firstInWindow > 2 && (
              <span className="w-8 grid place-items-center text-slate-400" aria-hidden>
                <MoreHorizontal className="w-4 h-4" />
              </span>
            )}
          </>
        )}

        {window.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => go(n)}
            aria-current={n === page ? 'page' : undefined}
            className={`${btnBase} ${n === page ? btnActive : btnIdle}`}
          >
            {n}
          </button>
        ))}

        {lastInWindow !== undefined && lastInWindow < pages && (
          <>
            {lastInWindow < pages - 1 && (
              <span className="w-8 grid place-items-center text-slate-400" aria-hidden>
                <MoreHorizontal className="w-4 h-4" />
              </span>
            )}
            <button type="button" onClick={() => go(pages)} className={`${btnBase} ${btnIdle}`}>
              {pages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={!hasMore && page >= pages}
          aria-label={p.next}
          className={`${btnBase} ${btnIdle} flex items-center gap-0.5 pl-2.5 pr-2`}
        >
          <span className="hidden sm:inline text-xs">{p.next}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
