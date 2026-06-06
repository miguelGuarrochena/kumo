'use client';

// Command palette (Cmd+K / Ctrl+K) — buscador global de Kumo.
// Busca gastos, recordatorios, items de compras y categorías.
// Permite navegar rápido a páginas sin tocar el menú.

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Wallet, Bell, ShoppingCart, Tags, Settings,
  CalendarDays, BarChart3, ArrowRight, Loader2, Plus,
} from 'lucide-react';
import { searchEverywhere, type SearchResult } from '@/app/(app)/searchActions';

type QuickAction = {
  type: 'action';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: typeof Wallet;
};

const QUICK_ACTIONS: QuickAction[] = [
  { type: 'action', id: 'a-expenses',   title: 'Ir a Gastos',         href: '/expenses',  icon: Wallet },
  { type: 'action', id: 'a-calendar',   title: 'Ir a Calendario',     href: '/calendar',  icon: CalendarDays },
  { type: 'action', id: 'a-shopping',   title: 'Ir a Compras',        href: '/shopping',  icon: ShoppingCart },
  { type: 'action', id: 'a-metrics',    title: 'Ir a Métricas',       href: '/metrics',   icon: BarChart3 },
  { type: 'action', id: 'a-reminders',  title: 'Ver recordatorios',   href: '/calendar?view=upcoming', icon: Bell },
  { type: 'action', id: 'a-categories', title: 'Ir a Categorías',     href: '/categories', icon: Tags },
  { type: 'action', id: 'a-settings',   title: 'Ir a Configuración',  href: '/settings',   icon: Settings },
];

const ICON_FOR_TYPE: Record<SearchResult['type'], typeof Wallet> = {
  expense:   Wallet,
  reminder:  Bell,
  shopping:  ShoppingCart,
  category:  Tags,
};

const LABEL_FOR_TYPE: Record<SearchResult['type'], string> = {
  expense:   'Gasto',
  reminder:  'Recordatorio',
  shopping:  'Compra',
  category:  'Categoría',
};

export const CommandPalette = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Atajo de teclado global: Cmd+K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Focus input al abrir
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      setQuery('');
      setResults([]);
      setHighlight(0);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const r = await searchEverywhere(q);
        if (r.ok) {
          setResults(r.results ?? []);
          setHighlight(0);
        }
      });
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Filtramos quick actions por la query
  const matchedActions: QuickAction[] = query.trim().length >= 1
    ? QUICK_ACTIONS.filter((a) =>
        a.title.toLowerCase().includes(query.toLowerCase().trim()),
      )
    : QUICK_ACTIONS.slice(0, 4); // primeros 4 si no hay query

  type Combined = SearchResult | QuickAction;
  const combined: Combined[] = [...matchedActions, ...results];

  const navigate = (item: Combined) => {
    setOpen(false);
    router.push(item.href as never);
  };

  // Keyboard navigation
  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, combined.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = combined[highlight];
      if (picked) navigate(picked);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[70vh]"
      >
        {/* Search input */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 dark:border-slate-700/60">
          {pending ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Buscar gastos, recordatorios, compras..."
            className="flex-1 bg-transparent border-0 focus:outline-none text-base placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="overflow-y-auto py-1">
          {combined.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <>
              {matchedActions.length > 0 && (
                <SectionTitle>Acciones rápidas</SectionTitle>
              )}
              {matchedActions.map((a, i) => (
                <ResultRow
                  key={a.id}
                  active={highlight === i}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => navigate(a)}
                  icon={<a.icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                  title={a.title}
                  subtitle="Navegar"
                />
              ))}

              {results.length > 0 && (
                <SectionTitle>Resultados</SectionTitle>
              )}
              {results.map((r, idx) => {
                const i = matchedActions.length + idx;
                const Icon = ICON_FOR_TYPE[r.type];
                return (
                  <ResultRow
                    key={`${r.type}-${r.id}`}
                    active={highlight === i}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => navigate(r)}
                    icon={<Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                    title={r.title}
                    subtitle={r.subtitle ?? LABEL_FOR_TYPE[r.type]}
                    badge={LABEL_FOR_TYPE[r.type]}
                  />
                );
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-slate-100 dark:border-slate-700/60 px-3 py-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-mono text-[10px]">↑↓</kbd>
              navegar
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-mono text-[10px]">↵</kbd>
              abrir
            </span>
          </div>
          <span className="hidden sm:inline">
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-mono text-[10px]">⌘K</kbd>
            {' '}para abrir
          </span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
    {children}
  </p>
);

const ResultRow = ({
  active,
  onMouseEnter,
  onClick,
  icon,
  title,
  subtitle,
  badge,
}: {
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
      active
        ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40'
    }`}
  >
    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 grid place-items-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{title}</p>
      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>
      )}
    </div>
    {badge && (
      <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 shrink-0">
        {badge}
      </span>
    )}
    {active && <ArrowRight className="w-3.5 h-3.5 shrink-0" />}
  </button>
);

const EmptyState = ({ query }: { query: string }) => (
  <div className="px-6 py-10 text-center">
    {query.trim().length < 2 ? (
      <>
        <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Escribí al menos 2 letras para buscar.
        </p>
      </>
    ) : (
      <>
        <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-slate-100 dark:bg-slate-700 grid place-items-center">
          <Plus className="w-4 h-4 text-slate-400 rotate-45" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sin resultados para &ldquo;<strong>{query}</strong>&rdquo;.
        </p>
      </>
    )}
  </div>
);
