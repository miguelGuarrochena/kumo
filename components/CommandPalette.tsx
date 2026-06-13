'use client';

// Command palette (Cmd+K / Ctrl+K) — buscador global de Kumo.
// Busca gastos, recordatorios, items de compras y categorías.
// Permite navegar rápido a páginas sin tocar el menú.

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search, Wallet, Bell, ShoppingCart, Tags, Settings,
  CalendarDays, BarChart3, ArrowRight, Loader2, Plus, Sparkles,
} from 'lucide-react';
import { searchEverywhere, type SearchResult } from '@/app/(app)/searchActions';
import { useT } from '@/lib/i18n/client';
import { looksLikeExpenseIntent, NLP_EXPENSE_STORAGE_KEY } from '@/lib/nlp/detect';
import { COMMAND_PALETTE_OPEN_EVENT, type OpenCommandPaletteOptions } from '@/lib/commandPalette';
import { track } from '@/lib/analytics';

type QuickAction = {
  type: 'action';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  icon: typeof Wallet;
};

type NlpAction = {
  type: 'nlp';
  id: string;
  title: string;
  subtitle: string;
  query: string;
};

type Combined = QuickAction | SearchResult | NlpAction;

const ICON_FOR_TYPE: Record<SearchResult['type'], typeof Wallet> = {
  expense:   Wallet,
  reminder:  Bell,
  shopping:  ShoppingCart,
  category:  Tags,
};

export const CommandPalette = () => {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [pending, startTransition] = useTransition();
  const [nlpLoading, setNlpLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const quickActions: QuickAction[] = useMemo(() => [
    { type: 'action', id: 'a-expenses',   title: t.command.action_expenses,   href: '/expenses',  icon: Wallet },
    { type: 'action', id: 'a-calendar',   title: t.command.action_calendar,   href: '/calendar',  icon: CalendarDays },
    { type: 'action', id: 'a-shopping',   title: t.command.action_shopping,   href: '/shopping',  icon: ShoppingCart },
    { type: 'action', id: 'a-metrics',    title: t.command.action_metrics,    href: '/metrics',   icon: BarChart3 },
    { type: 'action', id: 'a-reminders',  title: t.command.action_reminders,  href: '/calendar?view=upcoming', icon: Bell },
    { type: 'action', id: 'a-categories', title: t.command.action_categories, href: '/categories', icon: Tags },
    { type: 'action', id: 'a-settings',   title: t.command.action_settings,   href: '/settings',   icon: Settings },
  ], [t]);

  const labelForType: Record<SearchResult['type'], string> = useMemo(() => ({
    expense:   t.command.type_expense,
    reminder:  t.command.type_reminder,
    shopping:  t.command.type_shopping,
    category:  t.command.type_category,
  }), [t]);

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

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenCommandPaletteOptions>).detail;
      setOpen(true);
      if (detail?.query) setQuery(detail.query);
    };
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpen);
  }, []);

  // Focus input al abrir
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
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

  const nlpItem: NlpAction | null = useMemo(() => {
    const q = query.trim();
    if (!looksLikeExpenseIntent(q)) return null;
    return {
      type: 'nlp',
      id: 'nlp-expense',
      title: t.command.nlp_add_expense,
      subtitle: q,
      query: q,
    };
  }, [query, t.command.nlp_add_expense]);

  // Filtramos quick actions por la query
  const matchedActions: QuickAction[] = query.trim().length >= 1
    ? quickActions.filter((a) =>
        a.title.toLowerCase().includes(query.toLowerCase().trim()),
      )
    : quickActions.slice(0, 4);

  const combined: Combined[] = useMemo(
    () => [...(nlpItem ? [nlpItem] : []), ...matchedActions, ...results],
    [nlpItem, matchedActions, results],
  );

  const runNlpExpense = async (text: string) => {
    setNlpLoading(true);
    try {
      const res = await fetch('/api/nlp-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'PRO_REQUIRED') {
          setOpen(false);
          toast.error(data.error ?? t.expenses.scan_pro_only);
          router.push('/settings#plans');
          return;
        }
        toast.error(data.error ?? t.expenses.nlp_failed);
        track('nlp_expense_used', { success: false });
        return;
      }
      sessionStorage.setItem(NLP_EXPENSE_STORAGE_KEY, JSON.stringify(data));
      setOpen(false);
      track('nlp_expense_used', { success: true });
      router.push('/expenses?nlp=1');
    } catch {
      toast.error(t.expenses.nlp_failed);
      track('nlp_expense_used', { success: false });
    } finally {
      setNlpLoading(false);
    }
  };

  const navigate = (item: QuickAction | SearchResult) => {
    setOpen(false);
    router.push(item.href as never);
  };

  const pick = async (item: Combined) => {
    if (item.type === 'nlp') {
      await runNlpExpense(item.query);
      return;
    }
    navigate(item);
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
      if (picked) void pick(picked);
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
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 dark:border-slate-700/60">
          {pending || nlpLoading ? (
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
            placeholder={t.command.placeholder}
            className="flex-1 bg-transparent border-0 focus:outline-none text-base placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            ESC
          </kbd>
        </div>

        <div className="overflow-y-auto py-1">
          {combined.length === 0 ? (
            <EmptyState query={query} minChars={t.command.min_chars} noResults={t.command.no_results} />
          ) : (
            <>
              {nlpItem && (
                <ResultRow
                  key="nlp-expense"
                  active={highlight === 0}
                  onMouseEnter={() => setHighlight(0)}
                  onClick={() => void pick(nlpItem)}
                  icon={<Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
                  title={nlpItem.title}
                  subtitle={nlpLoading ? t.command.nlp_processing : nlpItem.subtitle}
                  badge={t.command.nlp_hint}
                />
              )}
              {matchedActions.length > 0 && (
                <SectionTitle>{t.command.quick_actions}</SectionTitle>
              )}
              {matchedActions.map((a, idx) => {
                const i = (nlpItem ? 1 : 0) + idx;
                return (
                <ResultRow
                  key={a.id}
                  active={highlight === i}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => void pick(a)}
                  icon={<a.icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                  title={a.title}
                  subtitle={t.command.navigate}
                />
              );})}

              {results.length > 0 && (
                <SectionTitle>{t.command.results}</SectionTitle>
              )}
              {results.map((r, idx) => {
                const i = (nlpItem ? 1 : 0) + matchedActions.length + idx;
                const Icon = ICON_FOR_TYPE[r.type];
                return (
                  <ResultRow
                    key={`${r.type}-${r.id}`}
                    active={highlight === i}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => void pick(r)}
                    icon={<Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
                    title={r.title}
                    subtitle={r.subtitle ?? labelForType[r.type]}
                    badge={labelForType[r.type]}
                  />
                );
              })}
            </>
          )}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700/60 px-3 py-2 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-mono text-[10px]">↑↓</kbd>
              {t.command.navigate_keys}
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-mono text-[10px]">↵</kbd>
              {t.command.open_key}
            </span>
          </div>
          <span className="hidden sm:inline">
            <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-mono text-[10px]">⌘K</kbd>
            {' '}{t.command.open_shortcut}
          </span>
        </div>
      </div>
    </div>
  );
};

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

const EmptyState = ({
  query,
  minChars,
  noResults,
}: {
  query: string;
  minChars: string;
  noResults: string;
}) => (
  <div className="px-6 py-10 text-center">
    {query.trim().length < 2 ? (
      <>
        <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{minChars}</p>
      </>
    ) : (
      <>
        <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-slate-100 dark:bg-slate-700 grid place-items-center">
          <Plus className="w-4 h-4 text-slate-400 rotate-45" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {noResults.replace('{query}', query)}
        </p>
      </>
    )}
  </div>
);
