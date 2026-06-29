'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus, ChevronLeft, ChevronRight, Wallet, Search, SlidersHorizontal,
  Camera, Loader2, Scale,
} from 'lucide-react';
import { deleteExpense, togglePaid } from './actions';
import { toggleSplitPaid } from './splitsActions';
import { SaldosTab } from '../split/SaldosTab';
import type { BalanceRow, PaymentRow } from '../split/types';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Select } from '@/components/Select';
import { FiltersSheet, type Filters } from './FiltersSheet';
import { useT } from '@/lib/i18n/client';
import { categoryDisplayName } from '@/lib/categoryLabels';
import type { ExpensesView, ArchiveYear, ExpenseListSummary } from './page';
import { Pagination } from '@/components/Pagination';
import type { ExtractedExpense } from '@/lib/ocr/types';
import { formatMoney, convertAmount, type Currency } from '@/lib/currency';
import { track } from '@/lib/analytics';
import { startBillingCheckout } from '@/lib/billing/startCheckout';
import type { CategoryLite, ContactLite, Expense, ExpenseWithSplits } from './types';
import { monthShift, formatMonth } from './utils';
import { ExpenseRow } from './ExpenseRow';
import { ExpenseSheet } from './ExpenseSheet';
import { ArchiveView } from './ArchiveView';
import { CurrencyInlineSelect } from './CurrencyInlineSelect';
import { FilterChip } from './FilterChip';
import { ExportMenu } from './ExportMenu';
import { OcrPaywallSheet } from '@/components/OcrPaywallSheet';
import { PaymentQuickSheet, type PaymentQuickCreditor } from '@/components/PaymentQuickSheet';
import { NLP_EXPENSE_STORAGE_KEY } from '@/lib/nlp/detect';
import { openCommandPalette } from '@/lib/commandPalette';
import { RecurringSuggestionsBanner } from './RecurringSuggestionsBanner';
import type { RecurringSuggestion } from '@/lib/recurringSuggest';

type ExpensesSection = 'gastos' | 'saldos';

type Props = {
  section: ExpensesSection;
  expensesDataLoaded: boolean;
  clientFilter: boolean;
  view: ExpensesView;
  monthStr: string;
  expenses: Expense[];
  expensePage: number;
  expensePageSize: number;
  expenseSummary: ExpenseListSummary;
  archiveYears: ArchiveYear[];
  categories: CategoryLite[];
  contacts: ContactLite[];
  balances: BalanceRow[];
  payments: PaymentRow[];
  defaultCurrency: Currency;   // moneda preferida del user (de settings)
  displayCurrency: Currency;   // moneda en la que se muestra el TOTAL ahora
  rates: Partial<Record<Currency, number>>;
  filters: Filters;
  hasOcrAccess: boolean;
  hasWa: boolean;
  trialDaysLeft: number | null;
  pricing: import('@/lib/pricing').Pricing;
  recurringSuggestions: RecurringSuggestion[];
};

export const ExpensesClient = ({
  section,
  expensesDataLoaded,
  clientFilter,
  view,
  monthStr,
  expenses,
  expensePage,
  expensePageSize,
  expenseSummary,
  archiveYears,
  categories,
  contacts,
  balances,
  payments,
  defaultCurrency,
  displayCurrency,
  rates,
  filters,
  hasOcrAccess,
  hasWa,
  trialDaysLeft,
  pricing,
  recurringSuggestions,
}: Props) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useT();
  const [activeSection, setActiveSection] = useState<ExpensesSection>(section);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.q);
  // Resalta el chip de tipo al instante (antes de que responda el server).
  const [optimisticKind, setOptimisticKind] = useState(filters.kind);
  useEffect(() => { setOptimisticKind(filters.kind); }, [filters.kind]);
  // Paginación del lado del cliente (la lista se filtra/busca en memoria).
  const [clientPage, setClientPage] = useState(1);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [ocrPaywallOpen, setOcrPaywallOpen] = useState(false);
  const [ocrCheckoutLoading, setOcrCheckoutLoading] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<ExtractedExpense | null>(null);
  const [aiSource, setAiSource] = useState<'ocr' | 'nlp' | null>(null);
  const [splitPay, setSplitPay] = useState<{
    creditor: PaymentQuickCreditor;
    amount: number;
    currency: string;
    debtorName: string;
    concept: string;
  } | null>(null);

  const selfContact = useMemo(
    () => contacts.find((c) => c.is_self) ?? null,
    [contacts],
  );

  useEffect(() => {
    setActiveSection(section);
  }, [section]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveSection(params.get('section') === 'saldos' ? 'saldos' : 'gastos');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (searchParams.get('nlp') !== '1') return;
    const raw = sessionStorage.getItem(NLP_EXPENSE_STORAGE_KEY);
    if (!raw) return;
    sessionStorage.removeItem(NLP_EXPENSE_STORAGE_KEY);
    try {
      const parsed = JSON.parse(raw) as ExtractedExpense;
      setAiSuggestion(parsed);
      setAiSource('nlp');
      setCreating(true);
      toast.success(t.expenses.nlp_done);
    } catch {
      toast.error(t.expenses.nlp_failed);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete('nlp');
    const qs = params.toString();
    router.replace(qs ? `/expenses?${qs}` : '/expenses', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const resolveCreditor = (expense: Expense): PaymentQuickCreditor | null => {
    const payerId = expense.paid_by_contact_id ?? selfContact?.id;
    if (!payerId) return null;
    const c = contacts.find((x) => x.id === payerId);
    if (!c) return null;
    return {
      id: c.id,
      name: c.name,
      mp_alias: c.mp_alias,
      mp_payment_link: c.mp_payment_link,
      phone: c.phone,
    };
  };

  const onScanClick = () => {
    if (!hasOcrAccess) {
      setOcrPaywallOpen(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const previewUrl = URL.createObjectURL(file);
    setOcrPreviewUrl(previewUrl);
    setOcrLoading(true);
    const { resizeImage } = await import('@/lib/image');
    const compressed = await resizeImage(file);
    const fd = new FormData();
    fd.set('image', compressed, 'ticket.jpg');
    try {
      const res = await fetch('/api/ocr', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t.expenses.ocr_failed);
        track('photo_ocr_used', { success: false });
        return;
      }
      setAiSuggestion(data as ExtractedExpense);
      setAiSource('ocr');
      setCreating(true);
      toast.success(t.expenses.ocr_done);
      track('photo_ocr_used', { success: true });
    } catch {
      toast.error(t.expenses.ocr_network_error);
      track('photo_ocr_used', { success: false });
    } finally {
      setOcrLoading(false);
      URL.revokeObjectURL(previewUrl);
      setOcrPreviewUrl(null);
    }
  };

  const convertToDisplay = (amount: number, currency: string): number | null =>
    convertAmount(amount, currency as Currency, displayCurrency, rates);

  // En "Por mes" (clientFilter) el tipo activo es el chip local (sin navegar).
  const activeKind = clientFilter ? optimisticKind : filters.kind;

  // Lista visible: en cliente filtramos por tipo + texto en memoria (instantáneo).
  const searchLower = searchInput.trim().toLowerCase();
  const visibleRows = useMemo(() => {
    if (!clientFilter) return expenses;
    return expenses.filter((e) => {
      if (activeKind && e.kind !== activeKind) return false;
      if (searchLower) {
        const desc = (e.description ?? '').toLowerCase();
        const cat = e.categories?.name ?? '';
        if (
          !desc.includes(searchLower) &&
          !cat.toLowerCase().includes(searchLower) &&
          !categoryDisplayName(cat, t).toLowerCase().includes(searchLower)
        ) return false;
      }
      return true;
    });
  }, [clientFilter, expenses, activeKind, searchLower, t]);

  // Volvemos a página 1 cuando cambia el conjunto filtrado.
  useEffect(() => { setClientPage(1); }, [activeKind, searchLower, monthStr, view]);

  // Página visible (paginación client-side sobre lo filtrado).
  const pagedRows = useMemo(() => {
    if (!clientFilter) return expenses;
    const start = (clientPage - 1) * expensePageSize;
    return visibleRows.slice(start, start + expensePageSize);
  }, [clientFilter, expenses, visibleRows, clientPage, expensePageSize]);

  // Agregados sobre lo visible (ya filtrado por tipo + texto) para el encabezado.
  // Los gastos NO pagados no suman al total: aparecen igual en la lista con
  // badge "Pendiente / Vencido / Vence hoy", pero recién impactan el total
  // cuando el usuario los marca como pagados.
  const clientAgg = useMemo(() => {
    if (!clientFilter) return null;
    let inc = 0, exp = 0, incCount = 0, expCount = 0, rateMissing = false;
    let pendingCount = 0, pendingTotal = 0;
    const curCounts = new Map<string, number>();
    for (const e of visibleRows) {
      const conv = convertAmount(Number(e.amount), e.currency as Currency, displayCurrency, rates);
      curCounts.set(e.currency, (curCounts.get(e.currency) ?? 0) + 1);
      const isInc = e.kind === 'income';
      // Ingresos no se "pagan", suman siempre. Gastos sólo si están pagados.
      const isUnpaidExpense = !isInc && !e.paid;
      if (isInc) incCount++; else expCount++;
      if (conv === null) {
        rateMissing = true;
        if (isUnpaidExpense) pendingCount++;
        continue;
      }
      if (isInc) {
        inc += conv;
      } else if (isUnpaidExpense) {
        pendingCount++;
        pendingTotal += conv;
      } else {
        exp += conv;
      }
    }
    return {
      inc, exp, net: inc - exp, incCount, expCount, rateMissing,
      pendingCount, pendingTotal,
      currencyBreakdown: Array.from(curCounts.entries())
        .map(([currency, count]) => ({ currency, count }))
        .sort((a, b) => b.count - a.count),
    };
  }, [clientFilter, visibleRows, displayCurrency, rates]);

  // Valores efectivos del encabezado (cliente en "Por mes", server en "Todos").
  const totalInDisplay = clientAgg ? clientAgg.exp : expenseSummary.totalInDisplay;
  const incomeInDisplay = clientAgg ? clientAgg.inc : expenseSummary.incomeInDisplay;
  const netInDisplay = clientAgg ? clientAgg.net : expenseSummary.netInDisplay;
  const someRateMissing = clientAgg ? clientAgg.rateMissing : expenseSummary.someRateMissing;
  const currencyBreakdown = clientAgg ? clientAgg.currencyBreakdown : expenseSummary.currencyBreakdown;
  const totalCount = clientAgg ? clientAgg.incCount + clientAgg.expCount : expenseSummary.totalCount;
  const headlineCountNum = clientAgg
    ? activeKind === 'income' ? clientAgg.incCount
      : activeKind === 'expense' ? clientAgg.expCount
      : clientAgg.incCount + clientAgg.expCount
    : totalCount;

  // Modo del encabezado según el tipo activo: gastos / ingresos / neto.
  // "Todos" muestra el neto sólo si hay ingresos en el período. Cuando no hay
  // ingresos, "Todos" es funcionalmente lo mismo que "Gastos" — mostrarlo en
  // rojo con signo negativo era confuso ("estás −$X" sugiere deuda cuando en
  // realidad sólo es lo que gastaste). Lo tratamos como modo gasto puro:
  // número sin signo, color de marca, sin desglose redundante.
  const rawMode: 'expense' | 'income' | 'net' =
    activeKind === 'income' ? 'income'
    : activeKind === 'expense' ? 'expense'
    : 'net';
  const headlineMode: 'expense' | 'income' | 'net' =
    rawMode === 'net' && incomeInDisplay === 0 ? 'expense' : rawMode;

  const headlineValue =
    headlineMode === 'income' ? incomeInDisplay
    : headlineMode === 'expense' ? totalInDisplay
    : netInDisplay;
  const headlineLabel =
    headlineMode === 'income' ? t.expenses.income_month_label
    : headlineMode === 'expense' ? t.expenses.expenses_month_label
    : t.expenses.net_month_label;
  // Sin "+": solo mostramos "−" cuando el neto es negativo (pérdida real).
  const headlinePrefix = headlineMode === 'net' && netInDisplay < 0 ? '−' : '';
  // Cada modo, su color: ingresos verde, gastos violeta (marca), neto teal
  // (positivo) o rojo suave (negativo, sólo si hay ingresos en el período).
  const headlineColorClass =
    headlineMode === 'income'
      ? 'text-mint-600 dark:text-mint-400'
      : headlineMode === 'net'
        ? netInDisplay < 0
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-teal-600 dark:text-teal-400'
        : 'kumo-gradient-text';
  const headlineAbs = headlineMode === 'net' ? Math.abs(netInDisplay) : headlineValue;
  const headlineCount =
    headlineMode === 'income' ? t.expenses.n_income.replace('{n}', String(headlineCountNum))
    : headlineMode === 'expense' ? t.expenses.n_expenses.replace('{n}', String(headlineCountNum))
    : t.expenses.n_movements.replace('{n}', String(headlineCountNum));
  // El desglose Ingresos/Gastos solo tiene sentido en modo neto real.
  const showBreakdown = headlineMode === 'net';

  // Mini-link "X pendientes este mes" debajo del total: aparece en cualquier
  // modo que no sea 'income' (los ingresos no tienen estado pendiente).
  const pendingCount = clientAgg?.pendingCount ?? 0;
  const showPendingHint = headlineMode !== 'income' && pendingCount > 0;
  const pendingHintLabel = pendingCount === 1
    ? t.expenses.pending_count_one
    : t.expenses.pending_count_many.replace('{n}', String(pendingCount));

  // Filtros para exportar: en vista "Por mes" acotamos al mes visible; en
  // "Todos" usamos los filtros activos. Siempre respeta el tipo (chip).
  const exportFilters: Filters = view === 'month'
    ? (() => {
        const [y, m] = monthStr.split('-').map(Number) as [number, number];
        const lastDay = new Date(y, m, 0).getDate();
        return { ...filters, kind: activeKind, from: `${monthStr}-01`, to: `${monthStr}-${String(lastDay).padStart(2, '0')}` };
      })()
    : filters;

  const [year, month] = monthStr.split('-').map(Number) as [number, number];
  const prevMonth = monthShift(year, month, -1);
  const nextMonth = monthShift(year, month, 1);
  const monthLabel = formatMonth(year, month, locale);

  // Navegación con transición: mantiene la UI actual visible (sin flash de
  // skeleton) mientras el server responde → el switch se siente instantáneo.
  const [isNavPending, startNav] = useTransition();
  const pushParams = (params: URLSearchParams) => {
    startNav(() => router.push(`/expenses?${params.toString()}`, { scroll: false }));
  };

  // Prefetch de las navegaciones reales que quedan (cambiar de vista y de mes).
  // Tipos y búsqueda ya no navegan (son client-side), así que no los precargamos.
  useEffect(() => {
    if (activeSection !== 'gastos') return;
    const targets = new Set<string>();
    const add = (mut: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(searchParams.toString());
      p.delete('page');
      mut(p);
      targets.add(`/expenses?${p.toString()}`);
    };
    // Pestañas de vista (Por mes / Todos)
    add((p) => p.delete('view'));
    add((p) => p.set('view', 'all'));
    // Meses vecinos (solo en vista por mes)
    if (view === 'month') {
      add((p) => p.set('month', prevMonth));
      add((p) => p.set('month', nextMonth));
    }
    targets.forEach((url) => router.prefetch(url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, activeSection, view, prevMonth, nextMonth]);

  const switchView = (next: ExpensesView) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next !== 'month') params.set('view', next);
    else params.delete('view');
    params.delete('page');
    pushParams(params);
  };

  const switchSection = (next: ExpensesSection) => {
    if (next === activeSection) return;
    if (next === 'gastos' && !expensesDataLoaded) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('section');
      router.push(`/expenses?${params.toString()}`);
      return;
    }
    setActiveSection(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'saldos') params.set('section', 'saldos');
    else params.delete('section');
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `/expenses?${qs}` : '/expenses');
  };

  const setUrlParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    pushParams(params);
  };

  const onExpensePageChange = (next: number) => {
    setUrlParam('page', next <= 1 ? null : String(next));
  };

  // Buscar: si hay texto, mostramos resultados en la vista "Todos".
  const runSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const v = value.trim();
    if (v) {
      params.set('view', 'all');
      params.set('q', v);
    } else {
      params.delete('q');
    }
    params.delete('page');
    pushParams(params);
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // En "Por mes" la búsqueda ya filtra en memoria; no navegamos.
    if (clientFilter) return;
    runSearch(searchInput);
  };

  // Búsqueda en vivo: en "Por mes" filtra en memoria (sin navegar). En "Todos"
  // navega con un pequeño retardo para que el server busque y pagine.
  useEffect(() => {
    if (clientFilter) return; // el filtrado por texto es client-side
    const v = searchInput.trim();
    if (v === (filters.q ?? '')) return;
    const handler = setTimeout(() => runSearch(searchInput), 350);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, clientFilter, filters.q]);

  // Cantidad de filtros activos
  const activeFilterCount =
    filters.cat.length +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0) +
    (filters.min ? 1 : 0) +
    (filters.max ? 1 : 0) +
    (filters.paid ? 1 : 0) +
    (filters.rec ? 1 : 0) +
    (filters.cur ? 1 : 0);

  const onDelete = async () => {
    if (!toDelete) return;
    const result = await deleteExpense(toDelete.id);
    if (result.ok) {
      toast.success(t.expenses.deleted);
      track('expense_deleted');
      router.refresh();
    } else {
      toast.error(result.error ?? 'Error');
    }
  };

  return (
    <div className="space-y-5">
      {/* --- Header --- */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.expenses.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {activeSection === 'saldos' ? t.expenses.saldos_subtitle : t.expenses.subtitle}
          </p>
        </div>
        {activeSection === 'gastos' && (
        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhotoSelected}
            className="hidden"
          />
          <button
            onClick={onScanClick}
            disabled={ocrLoading}
            title={hasOcrAccess ? t.expenses.scan : t.expenses.scan_pro_only}
            className="relative flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:border-sky-300 dark:hover:border-sky-500 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-wait"
          >
            {ocrLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            <span className="hidden sm:inline text-sm">
              {ocrLoading ? t.common.loading : t.expenses.scan}
            </span>
            {!hasOcrAccess && (
              <span className="absolute -top-1.5 -right-1.5 text-[9px] px-1 py-0.5 rounded-full bg-amber-500 text-white font-bold shadow-sm">
                {t.ocr.badge_paid}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setAiSuggestion(null);
              setCreating(true);
            }}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl kumo-gradient text-white font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.expenses.new}</span>
          </button>
        </div>
        )}
      </header>

      {activeSection === 'gastos' && (
        <button
          type="button"
          onClick={() => openCommandPalette()}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 text-left hover:border-sky-300 dark:hover:border-sky-600 transition-colors"
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex-1 min-w-0 leading-snug">
            {t.expenses.search_nlp_hint}
          </span>
          <span className="hidden sm:inline text-xs font-medium text-sky-600 dark:text-sky-400 shrink-0">
            ⌘K
          </span>
        </button>
      )}

      {activeSection === 'gastos' && recurringSuggestions.length > 0 && (
        <RecurringSuggestionsBanner suggestions={recurringSuggestions} />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-full sm:w-auto sm:min-w-[14rem]">
          <button
            type="button"
            onClick={() => switchSection('gastos')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'gastos'
                ? 'bg-white dark:bg-slate-700 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Wallet className="w-4 h-4" />
            {t.expenses.tab_expenses}
          </button>
          <button
            type="button"
            onClick={() => switchSection('saldos')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === 'saldos'
                ? 'bg-white dark:bg-slate-700 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Scale className="w-4 h-4" />
            {t.expenses.tab_balances}
          </button>
        </div>

        {activeSection === 'gastos' && (
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto sm:ml-auto">
            <button
              type="button"
              onClick={() => switchView('month')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'month' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.expenses.view_month}
            </button>
            <button
              type="button"
              onClick={() => switchView('all')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.expenses.view_all}
            </button>
            <button
              type="button"
              onClick={() => switchView('archive')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === 'archive' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {t.expenses.view_archive}
            </button>
          </div>
        )}
      </div>

      {activeSection === 'saldos' ? (
        <SaldosTab balances={balances} contacts={contacts} payments={payments} />
      ) : (
      <>

      {/* Filtro por tipo: Todos / Gastos / Ingresos + exportar */}
      {view !== 'archive' && (
        <div className="flex items-center gap-2">
          <div className={`flex-1 flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl transition-opacity ${isNavPending ? 'opacity-60' : ''}`}>
            {([
              ['', t.expenses.filter_kind_all],
              ['expense', t.expenses.filter_kind_expense],
              ['income', t.expenses.filter_kind_income],
            ] as const).map(([value, label]) => (
              <button
                key={value || 'all'}
                type="button"
                onClick={() => {
                  if (optimisticKind === value) return;
                  setOptimisticKind(value);
                  // En "Por mes" el filtrado es client-side (instantáneo); en
                  // "Todos" navegamos para que el server filtre/pagine.
                  if (!clientFilter) setUrlParam('kind', value || null);
                }}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  optimisticKind === value
                    ? value === 'income'
                      ? 'bg-white dark:bg-slate-700 text-mint-600 dark:text-mint-400 shadow-sm'
                      : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <ExportMenu filters={exportFilters} label={t.expenses.export} />
        </div>
      )}

      {view === 'archive' ? (
        <ArchiveView
          years={archiveYears}
          displayCurrency={displayCurrency}
          onSelectYear={(year) => {
            const params = new URLSearchParams();
            params.set('view', 'all');
            params.set('from', `${year}-01-01`);
            params.set('to', `${year}-12-31`);
            router.push(`/expenses?${params.toString()}`);
          }}
          onChangeCurrency={(v) => {
            const params = new URLSearchParams(searchParams.toString());
            if (v) params.set('asCurrency', v);
            else params.delete('asCurrency');
            router.push(`/expenses?${params.toString()}`);
          }}
        />
      ) : view === 'month' ? (
        <>
        <form onSubmit={onSearchSubmit}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t.expenses.search_placeholder}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            />
          </div>
        </form>
        <div className="kumo-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                const p = new URLSearchParams(searchParams.toString());
                p.set('month', prevMonth);
                p.delete('page');
                router.push(`/expenses?${p.toString()}`);
              }}
              className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-500"
              aria-label={t.expenses.prev_month}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold capitalize">{monthLabel}</h2>
            <button
              onClick={() => {
                const p = new URLSearchParams(searchParams.toString());
                p.set('month', nextMonth);
                p.delete('page');
                router.push(`/expenses?${p.toString()}`);
              }}
              className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-500"
              aria-label={t.expenses.next_month}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{headlineLabel}</p>
            <p className={`text-3xl sm:text-4xl font-bold break-all ${headlineColorClass}`}>
              {headlinePrefix}{formatMoney(headlineAbs, displayCurrency, locale)}
            </p>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 inline-flex items-center gap-1 flex-wrap justify-center">
              <span>{headlineCount} · {t.expenses.in_currency}</span>
              <CurrencyInlineSelect
                value={displayCurrency}
                onChange={(v) => setUrlParam('asCurrency', v)}
              />
            </div>
            {showBreakdown && (
              <div className="mt-3 flex items-center justify-center gap-3 text-xs sm:text-sm flex-wrap">
                <span className="text-mint-600 dark:text-mint-400 font-medium">
                  {t.expenses.total_income}: +{formatMoney(incomeInDisplay, displayCurrency, locale)}
                </span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {t.expenses.expenses_label}: −{formatMoney(totalInDisplay, displayCurrency, locale)}
                </span>
              </div>
            )}
            {showPendingHint && (
              <button
                type="button"
                onClick={() => setUrlParam('paid', 'pending')}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-peach-600 dark:text-peach-300 hover:underline"
                title={t.expenses.pending_excluded_hint}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-peach-400" />
                {pendingHintLabel}
              </button>
            )}
            {currencyBreakdown.length > 1 && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                {currencyBreakdown.map((b, i) => (
                  <span key={b.currency}>
                    {i > 0 && <span className="opacity-50"> · </span>}
                    {b.count} en {b.currency}
                  </span>
                ))}
              </p>
            )}
            {someRateMissing && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">
                {t.expenses.rate_unavailable}
              </p>
            )}
          </div>
        </div>
        </>
      ) : (
        <>
          <form onSubmit={onSearchSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t.expenses.search_placeholder}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">{t.common.filters}</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full kumo-gradient text-white text-[10px] font-bold grid place-items-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </form>

          {/* Chips de filtros activos */}
          {(filters.q || activeFilterCount > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {filters.q && (
                <FilterChip onRemove={() => { setSearchInput(''); setUrlParam('q', null); }}>
                  &ldquo;{filters.q}&rdquo;
                </FilterChip>
              )}
              {filters.cat.map((catId) => {
                const cat = categories.find((c) => c.id === catId);
                if (!cat) return null;
                return (
                  <FilterChip
                    key={catId}
                    onRemove={() => {
                      const next = filters.cat.filter((c) => c !== catId);
                      setUrlParam('cat', next.length > 0 ? next.join(',') : null);
                    }}
                  >
                    {categoryDisplayName(cat.name, t)}
                  </FilterChip>
                );
              })}
              {filters.from && (
                <FilterChip onRemove={() => setUrlParam('from', null)}>{t.expenses.filter_from.replace('{date}', filters.from)}</FilterChip>
              )}
              {filters.to && (
                <FilterChip onRemove={() => setUrlParam('to', null)}>{t.expenses.filter_to.replace('{date}', filters.to)}</FilterChip>
              )}
              {filters.min && (
                <FilterChip onRemove={() => setUrlParam('min', null)}>{t.expenses.filter_min.replace('{amount}', filters.min)}</FilterChip>
              )}
              {filters.max && (
                <FilterChip onRemove={() => setUrlParam('max', null)}>{t.expenses.filter_max.replace('{amount}', filters.max)}</FilterChip>
              )}
              {filters.paid && (
                <FilterChip onRemove={() => setUrlParam('paid', null)}>
                  {filters.paid === 'paid' ? t.expenses.filter_paid : t.expenses.filter_pending}
                </FilterChip>
              )}
              {filters.rec && (
                <FilterChip onRemove={() => setUrlParam('rec', null)}>
                  {filters.rec === 'recurring' ? t.expenses.filter_recurring : t.expenses.filter_one_time}
                </FilterChip>
              )}
              {filters.cur && (
                <FilterChip onRemove={() => setUrlParam('cur', null)}>{filters.cur}</FilterChip>
              )}
              <button
                onClick={() => router.push('/expenses?view=all')}
                className="text-xs text-slate-500 hover:text-rose-500 font-medium ml-1"
              >
                {t.expenses.filter_clear_all}
              </button>
            </div>
          )}

          {/* Resumen agregado */}
          {totalCount > 0 && (
            <div className="kumo-card p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                  <span>{headlineLabel} · {headlineCount} · {t.expenses.in_currency}</span>
                  <CurrencyInlineSelect
                    value={displayCurrency}
                    onChange={(v) => setUrlParam('asCurrency', v)}
                  />
                </div>
                <p className={`text-xl font-bold ${headlineColorClass}`}>
                  {headlinePrefix}{formatMoney(headlineAbs, displayCurrency, locale)}
                </p>
                {currencyBreakdown.length > 1 && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {currencyBreakdown.map((b, i) => (
                      <span key={b.currency}>
                        {i > 0 && <span className="opacity-50"> · </span>}
                        {b.count} en {b.currency}
                      </span>
                    ))}
                  </p>
                )}
                {someRateMissing && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                    {t.expenses.rate_unavailable}
                  </p>
                )}
                {showBreakdown && (
                  <p className="text-[11px] sm:text-xs mt-1 flex items-center gap-2 flex-wrap">
                    <span className="text-mint-600 dark:text-mint-400 font-medium">
                      {t.expenses.total_income}: +{formatMoney(incomeInDisplay, displayCurrency, locale)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      {t.expenses.expenses_label}: −{formatMoney(totalInDisplay, displayCurrency, locale)}
                    </span>
                  </p>
                )}
                {showPendingHint && (
                  <button
                    type="button"
                    onClick={() => setUrlParam('paid', 'pending')}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-peach-600 dark:text-peach-300 hover:underline"
                    title={t.expenses.pending_excluded_hint}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-peach-400" />
                    {pendingHintLabel}
                  </button>
                )}
              </div>
              <Select
                value={filters.sort}
                onChange={(v) => setUrlParam('sort', v)}
                options={[
                  { value: 'date-desc',   label: t.expenses.sort_newest },
                  { value: 'date-asc',    label: t.expenses.sort_oldest },
                  { value: 'amount-desc', label: t.expenses.sort_amount_desc },
                  { value: 'amount-asc',  label: t.expenses.sort_amount_asc },
                ]}
                ariaLabel="Sort"
                className="w-48"
                buttonClassName="py-2"
              />
            </div>
          )}
        </>
      )}

      {/* --- Lista (no aplica a archive) --- */}
      {view === 'archive' ? null : (clientFilter ? visibleRows.length === 0 : totalCount === 0) ? (
        <div className="kumo-card p-10 text-center">
          <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-semibold mb-1">
            {view !== 'month'
              ? t.expenses.no_expenses_filters_title
              : activeKind === 'income'
                ? t.expenses.no_income_month_title
                : activeKind === 'expense'
                  ? t.expenses.no_expenses_month_title
                  : t.expenses.no_movements_month_title}
          </h3>
          <p className="text-sm text-slate-500">
            {view !== 'month'
              ? t.expenses.no_expenses_filters_desc
              : activeKind === 'income'
                ? t.expenses.no_income_desc
                : activeKind === 'expense'
                  ? t.expenses.no_expenses_desc
                  : t.expenses.no_movements_desc}
          </p>
        </div>
      ) : (
        <div className="kumo-card overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {pagedRows.map((exp) => (
              <ExpenseRow
                key={exp.id}
                expense={exp}
                displayCurrency={displayCurrency}
                convertedAmount={convertToDisplay(Number(exp.amount), exp.currency)}
                showFullDate={view === 'all'}
                onEdit={() => setEditing(exp)}
                onDelete={() => setToDelete(exp)}
                onTogglePaid={async () => {
                  const result = await togglePaid(exp.id, !exp.paid);
                  if (!result.ok) {
                    toast.error(result.error ?? t.common.error);
                    return;
                  }
                  toast.success(exp.paid ? t.expenses.mark_pending_toast : t.expenses.mark_paid_toast);
                  router.refresh();
                }}
                onToggleSplitPaid={async (contactId, paid) => {
                  const result = await toggleSplitPaid(exp.id, contactId, paid);
                  if (!result.ok) {
                    toast.error(result.error ?? t.common.error);
                    return;
                  }
                  router.refresh();
                }}
                onPaySplit={(contactId, amount) => {
                  const creditor = resolveCreditor(exp);
                  if (!creditor) return;
                  const split = (exp as ExpenseWithSplits)._splits?.find((s) => s.contact_id === contactId);
                  setSplitPay({
                    creditor,
                    amount,
                    currency: exp.currency,
                    debtorName: split?.contact_name ?? '—',
                    concept: exp.description ?? t.expenses.default_name,
                  });
                }}
              />
            ))}
          </div>
          {clientFilter ? (
            <Pagination
              page={clientPage}
              pageSize={expensePageSize}
              totalCount={visibleRows.length}
              onPageChange={setClientPage}
            />
          ) : (
            <Pagination
              page={expensePage}
              pageSize={expensePageSize}
              totalCount={totalCount}
              onPageChange={onExpensePageChange}
            />
          )}
        </div>
      )}

      <FiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        categories={categories}
      />

      {/* --- Modal de alta/edición --- */}
      <ExpenseSheet
        open={!!editing || creating}
        expense={editing}
        aiSuggestion={aiSuggestion}
        aiSource={aiSource}
        categories={categories}
        contacts={contacts}
        defaultCurrency={defaultCurrency}
        rates={rates}
        hasWa={hasWa}
        onClose={() => {
          setEditing(null);
          setCreating(false);
          setAiSuggestion(null);
          setAiSource(null);
        }}
      />

      {/* --- Confirmación de borrado --- */}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={onDelete}
        title={t.expenses.delete_confirm_title}
        description={t.expenses.delete_confirm_desc.replace(
          '{name}',
          toDelete?.description
            ?? (toDelete?.categories?.name ? categoryDisplayName(toDelete.categories.name, t) : null)
            ?? 'este gasto',
        )}
      />

      <PaymentQuickSheet
        open={!!splitPay}
        onClose={() => setSplitPay(null)}
        creditor={splitPay?.creditor ?? null}
        amount={splitPay?.amount ?? 0}
        currency={splitPay?.currency ?? 'ARS'}
        concept={splitPay?.concept}
        debtorName={splitPay?.debtorName}
      />

      <OcrPaywallSheet
        open={ocrPaywallOpen}
        onClose={() => setOcrPaywallOpen(false)}
        pricing={pricing}
        product="ocr"
        loadingKey={ocrCheckoutLoading}
        trialDaysLeft={trialDaysLeft}
        onCheckout={async (product, interval) => {
          const key = `${product}-${interval}`;
          setOcrCheckoutLoading(key);
          try {
            const data = await startBillingCheckout(product, interval);
            if (data.url) window.location.href = data.url;
            else toast.error(data.error ?? t.billing.checkout_error);
          } catch {
            toast.error(t.billing.connect_error);
          } finally {
            setOcrCheckoutLoading(null);
          }
        }}
      />

      </>
      )}

      {ocrLoading && ocrPreviewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm grid place-items-center p-6">
          <div className="max-w-sm w-full text-center space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ocrPreviewUrl}
              alt="Ticket"
              className="w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl border-2 border-white/20"
            />
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">{t.expenses.ocr_processing}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
