'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus, ChevronLeft, ChevronRight, Wallet, Search, SlidersHorizontal,
  Camera, Loader2, Scale, Upload, ImageIcon, Sparkles,
} from 'lucide-react';
import { useClickOutside } from '@/lib/useClickOutside';
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
import { ImportSheet } from './ImportSheet';
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
  // Tipo inicial del modal de alta (la carga rápida puede pedir "income").
  const [createKind, setCreateKind] = useState<'expense' | 'income'>('expense');
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  // Dispositivo táctil (celular/tablet) → "Escanear ticket" con cámara.
  // Puntero fino (desktop) → "Subir ticket" desde archivo.
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const [searchInput, setSearchInput] = useState(filters.q);
  // Resalta el chip de tipo al instante (antes de que responda el server).
  const [optimisticKind, setOptimisticKind] = useState(filters.kind);
  useEffect(() => { setOptimisticKind(filters.kind); }, [filters.kind]);
  // Paginación del lado del cliente (la lista se filtra/busca en memoria).
  const [clientPage, setClientPage] = useState(1);
  // Filtros avanzados y orden — client-side (instantáneos en ambas vistas).
  // Se inicializan desde la URL para respetar links compartidos.
  const [adv, setAdv] = useState<Omit<Filters, 'q' | 'kind' | 'sort'>>({
    cat: filters.cat,
    from: filters.from,
    to: filters.to,
    min: filters.min,
    max: filters.max,
    paid: filters.paid,
    rec: filters.rec,
    cur: filters.cur,
  });
  const [sortBy, setSortBy] = useState<string>(filters.sort || 'date-desc');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [scanMenuOpen, setScanMenuOpen] = useState(false);
  const scanWrapRef = useRef<HTMLDivElement>(null);
  useClickOutside(scanWrapRef, scanMenuOpen, () => setScanMenuOpen(false));
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

  // Intents de carga rápida (?new=1 / ?new=income / ?scan=1): llegan desde el
  // "+" del nav mobile, el FAB de desktop o la carga rápida del Dashboard.
  useEffect(() => {
    const intentNew = searchParams.get('new');
    const intentScan = searchParams.get('scan');
    if (!intentNew && !intentScan) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('new');
    params.delete('scan');
    const qs = params.toString();
    router.replace(qs ? `/expenses?${qs}` : '/expenses', { scroll: false });
    if (intentNew) {
      setAiSuggestion(null);
      setAiSource(null);
      setCreateKind(intentNew === 'income' ? 'income' : 'expense');
      setCreating(true);
      return;
    }
    // Escanear: mismo flujo que el botón del header.
    if (!hasOcrAccess) {
      setOcrPaywallOpen(true);
      return;
    }
    const touch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
    if (touch) setScanMenuOpen(true);
    else fileInputRef.current?.click();
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
    // En táctil ofrecemos elegir origen (cámara o archivo); en desktop va
    // directo al selector de archivos.
    if (isTouch) {
      setScanMenuOpen((v) => !v);
      return;
    }
    fileInputRef.current?.click();
  };

  const processImage = async (file: File) => {
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

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processImage(file);
  };

  // Imagen compartida desde el share sheet del teléfono (?shared=1): el
  // service worker la guardó en el Cache API; la levantamos y va directo
  // al mismo flujo OCR que "Escanear ticket".
  useEffect(() => {
    if (searchParams.get('shared') !== '1') return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete('shared');
    const qs = params.toString();
    router.replace(qs ? `/expenses?${qs}` : '/expenses', { scroll: false });
    if (!hasOcrAccess) {
      setOcrPaywallOpen(true);
      return;
    }
    let cancelled = false;
    (async () => {
      if (typeof caches === 'undefined') return;
      // El SW guarda la imagen en paralelo al redirect: reintentamos un rato.
      for (let i = 0; i < 15 && !cancelled; i++) {
        try {
          const cache = await caches.open('kumo-share');
          const res = await cache.match('/shared-ocr-image');
          if (res) {
            await cache.delete('/shared-ocr-image');
            const blob = await res.blob();
            const file = new File([blob], 'shared.jpg', { type: blob.type || 'image/jpeg' });
            if (!cancelled) await processImage(file);
            return;
          }
        } catch {
          return;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const convertToDisplay = (amount: number, currency: string): number | null =>
    convertAmount(amount, currency as Currency, displayCurrency, rates);

  // En "Por mes" (clientFilter) el tipo activo es el chip local (sin navegar).
  const activeKind = clientFilter ? optimisticKind : filters.kind;

  // Lista visible: filtramos por tipo + texto + filtros avanzados y ordenamos,
  // todo en memoria (instantáneo).
  const searchLower = searchInput.trim().toLowerCase();
  const minNum = adv.min ? Number(adv.min) : null;
  const maxNum = adv.max ? Number(adv.max) : null;
  const visibleRows = useMemo(() => {
    if (!clientFilter) return expenses;
    const filtered = expenses.filter((e) => {
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
      if (adv.cat.length > 0 && !(e.category_id && adv.cat.includes(e.category_id))) return false;
      if (adv.from && e.expense_date < adv.from) return false;
      if (adv.to && e.expense_date > adv.to) return false;
      const amt = Number(e.amount);
      if (minNum !== null && amt < minNum) return false;
      if (maxNum !== null && amt > maxNum) return false;
      if (adv.paid === 'paid' && !e.paid) return false;
      if (adv.paid === 'pending' && e.paid) return false;
      if (adv.rec === 'recurring' && !e.is_recurring) return false;
      if (adv.rec === 'one-time' && e.is_recurring) return false;
      if (adv.cur && e.currency !== adv.cur) return false;
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'amount-desc') return Number(b.amount) - Number(a.amount);
      if (sortBy === 'amount-asc') return Number(a.amount) - Number(b.amount);
      if (sortBy === 'date-asc') return a.expense_date.localeCompare(b.expense_date);
      return b.expense_date.localeCompare(a.expense_date); // date-desc (default)
    });
    return sorted;
  }, [clientFilter, expenses, activeKind, searchLower, adv, minNum, maxNum, sortBy, t]);

  // Volvemos a página 1 cuando cambia el conjunto filtrado.
  useEffect(() => { setClientPage(1); }, [activeKind, searchLower, monthStr, view, adv, sortBy]);

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

  // Cantidad de filtros avanzados activos (client-side).
  const activeFilterCount =
    adv.cat.length +
    (adv.from ? 1 : 0) +
    (adv.to ? 1 : 0) +
    (adv.min ? 1 : 0) +
    (adv.max ? 1 : 0) +
    (adv.paid ? 1 : 0) +
    (adv.rec ? 1 : 0) +
    (adv.cur ? 1 : 0);

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
          {/* Input cámara (capture) y archivo/galería (sin capture). */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhotoSelected}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onPhotoSelected}
            className="hidden"
          />
          <div ref={scanWrapRef} className="relative">
            <button
              onClick={onScanClick}
              disabled={ocrLoading}
              aria-haspopup={isTouch ? 'menu' : undefined}
              aria-expanded={isTouch ? scanMenuOpen : undefined}
              className="relative flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:border-sky-300 dark:hover:border-sky-500 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-wait"
            >
              {ocrLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isTouch ? (
                <Camera className="w-4 h-4" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="hidden sm:inline text-sm">
                {ocrLoading ? t.common.loading : isTouch ? t.expenses.scan : t.expenses.scan_upload}
              </span>
              {!hasOcrAccess && (
                <span className="absolute -top-1.5 -right-1.5 text-[9px] px-1 py-0.5 rounded-full bg-amber-500 text-white font-bold shadow-sm">
                  {t.ocr.badge_paid}
                </span>
              )}
            </button>
            {isTouch && scanMenuOpen && (
              <div
                role="menu"
                className="absolute z-50 right-0 top-full mt-1 min-w-[12rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden py-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setScanMenuOpen(false); cameraInputRef.current?.click(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <Camera className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  {t.expenses.scan_take_photo}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setScanMenuOpen(false); fileInputRef.current?.click(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <ImageIcon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  {t.expenses.scan_choose_file}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setAiSuggestion(null);
              setCreateKind('expense');
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
          {activeKind === '' && (
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              title={t.expenses.import_title}
              aria-label={t.expenses.import}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:border-sky-300 dark:hover:border-sky-500 active:scale-95 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">{t.expenses.import}</span>
            </button>
          )}
          <ExportMenu filters={exportFilters} label={t.expenses.export} />
        </div>
      )}

      {/* Toolbar: buscar + filtros avanzados + orden (en ambas vistas) */}
      {view !== 'archive' && (
        <div className="flex flex-wrap gap-2 items-center">
          <form onSubmit={onSearchSubmit} className="flex-1 min-w-[12rem] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t.expenses.search_placeholder}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            />
          </form>
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
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'date-desc',   label: t.expenses.sort_newest },
              { value: 'date-asc',    label: t.expenses.sort_oldest },
              { value: 'amount-desc', label: t.expenses.sort_amount_desc },
              { value: 'amount-asc',  label: t.expenses.sort_amount_asc },
            ]}
            ariaLabel="Sort"
            className="w-44"
            buttonClassName="py-2.5 rounded-xl"
          />
        </div>
      )}

      {/* Chips de filtros activos (client-side) */}
      {view !== 'archive' && activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {adv.cat.map((catId) => {
            const cat = categories.find((c) => c.id === catId);
            if (!cat) return null;
            return (
              <FilterChip key={catId} onRemove={() => setAdv((a) => ({ ...a, cat: a.cat.filter((c) => c !== catId) }))}>
                {categoryDisplayName(cat.name, t)}
              </FilterChip>
            );
          })}
          {adv.from && <FilterChip onRemove={() => setAdv((a) => ({ ...a, from: '' }))}>{t.expenses.filter_from.replace('{date}', adv.from)}</FilterChip>}
          {adv.to && <FilterChip onRemove={() => setAdv((a) => ({ ...a, to: '' }))}>{t.expenses.filter_to.replace('{date}', adv.to)}</FilterChip>}
          {adv.min && <FilterChip onRemove={() => setAdv((a) => ({ ...a, min: '' }))}>{t.expenses.filter_min.replace('{amount}', adv.min)}</FilterChip>}
          {adv.max && <FilterChip onRemove={() => setAdv((a) => ({ ...a, max: '' }))}>{t.expenses.filter_max.replace('{amount}', adv.max)}</FilterChip>}
          {adv.paid && (
            <FilterChip onRemove={() => setAdv((a) => ({ ...a, paid: '' }))}>
              {adv.paid === 'paid' ? t.expenses.filter_paid : t.expenses.filter_pending}
            </FilterChip>
          )}
          {adv.rec && (
            <FilterChip onRemove={() => setAdv((a) => ({ ...a, rec: '' }))}>
              {adv.rec === 'recurring' ? t.expenses.filter_recurring : t.expenses.filter_one_time}
            </FilterChip>
          )}
          {adv.cur && <FilterChip onRemove={() => setAdv((a) => ({ ...a, cur: '' }))}>{adv.cur}</FilterChip>}
          <button
            type="button"
            onClick={() => setAdv({ cat: [], from: '', to: '', min: '', max: '', paid: '', rec: '', cur: '' })}
            className="text-xs text-slate-500 hover:text-rose-500 font-medium ml-1"
          >
            {t.expenses.filter_clear_all}
          </button>
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
        <div className="kumo-card p-5 sm:p-7">
          {/* Topbar del card: navegador de mes a la izquierda, pill de moneda a la derecha */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const p = new URLSearchParams(searchParams.toString());
                  p.set('month', prevMonth);
                  p.delete('page');
                  router.push(`/expenses?${p.toString()}`);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 text-slate-500"
                aria-label={t.expenses.prev_month}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="font-semibold capitalize text-base sm:text-lg">{monthLabel}</h2>
              <button
                onClick={() => {
                  const p = new URLSearchParams(searchParams.toString());
                  p.set('month', nextMonth);
                  p.delete('page');
                  router.push(`/expenses?${p.toString()}`);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 text-slate-500"
                aria-label={t.expenses.next_month}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <CurrencyInlineSelect
              value={displayCurrency}
              onChange={(v) => setUrlParam('asCurrency', v)}
              variant="pill"
            />
          </div>

          {/* Hero: total grande + label + conteo */}
          <div className="text-center py-1">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 font-medium mb-2">
              {headlineLabel}
            </p>
            <p className={`text-4xl sm:text-5xl font-bold break-all leading-tight ${headlineColorClass}`}>
              {headlinePrefix}{formatMoney(headlineAbs, displayCurrency, locale)}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2.5">
              {headlineCount}
            </p>
          </div>

          {/* Desglose ingresos/gastos cuando hay ingresos */}
          {showBreakdown && (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-xl border border-mint-200/70 dark:border-mint-500/30 bg-mint-50/60 dark:bg-mint-500/10 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-mint-700/80 dark:text-mint-300/80 font-medium mb-0.5">
                  {t.expenses.total_income}
                </p>
                <p className="text-sm font-semibold text-mint-700 dark:text-mint-300 break-all">
                  +{formatMoney(incomeInDisplay, displayCurrency, locale)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium mb-0.5">
                  {t.expenses.expenses_label}
                </p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 break-all">
                  −{formatMoney(totalInDisplay, displayCurrency, locale)}
                </p>
              </div>
            </div>
          )}

          {/* Notas inferiores: pendientes, monedas múltiples, tasa faltante */}
          {(showPendingHint || currencyBreakdown.length > 1 || someRateMissing) && (
            <div className="mt-4 flex flex-col items-center gap-1.5">
              {showPendingHint && (
                <button
                  type="button"
                  onClick={() => setAdv((a) => ({ ...a, paid: a.paid === 'pending' ? '' : 'pending' }))}
                  aria-pressed={adv.paid === 'pending'}
                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-colors ${
                    adv.paid === 'pending'
                      ? 'text-peach-800 dark:text-peach-200 bg-peach-100 dark:bg-peach-500/20 ring-1 ring-peach-300 dark:ring-peach-500/40'
                      : 'text-peach-700 dark:text-peach-300 bg-peach-50 dark:bg-peach-500/10 hover:bg-peach-100 dark:hover:bg-peach-500/20'
                  }`}
                  title={t.expenses.pending_excluded_hint}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-peach-400" />
                  {pendingHintLabel}
                </button>
              )}
              {currencyBreakdown.length > 1 && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {currencyBreakdown.map((b, i) => (
                    <span key={b.currency}>
                      {i > 0 && <span className="opacity-50"> · </span>}
                      {b.count} en {b.currency}
                    </span>
                  ))}
                </p>
              )}
              {someRateMissing && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  {t.expenses.rate_unavailable}
                </p>
              )}
            </div>
          )}
        </div>
      ) : totalCount > 0 ? (
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
                    onClick={() => setAdv((a) => ({ ...a, paid: 'pending' }))}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-peach-600 dark:text-peach-300 hover:underline"
                    title={t.expenses.pending_excluded_hint}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-peach-400" />
                    {pendingHintLabel}
                  </button>
                )}
              </div>
            </div>
          ) : null}

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
          {/* Mes realmente vacío (sin búsqueda/filtros): CTAs de carga directa */}
          {view === 'month' && !searchLower && activeFilterCount === 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => {
                  setAiSuggestion(null);
                  setCreateKind(activeKind === 'income' ? 'income' : 'expense');
                  setCreating(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl kumo-gradient text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                {activeKind === 'income' ? t.expenses.new_income : t.quickAdd.new_expense}
              </button>
              {activeKind !== 'income' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasOcrAccess) { setOcrPaywallOpen(true); return; }
                      (isTouch ? cameraInputRef : fileInputRef).current?.click();
                    }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:border-sky-300 dark:hover:border-sky-500 active:scale-95 transition-all"
                  >
                    {isTouch ? <Camera className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    {isTouch ? t.quickAdd.scan : t.quickAdd.scan_upload}
                  </button>
                  <button
                    type="button"
                    onClick={() => openCommandPalette()}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:border-sky-300 dark:hover:border-sky-500 active:scale-95 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    {t.quickAdd.nlp}
                  </button>
                </>
              )}
            </div>
          )}
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
        value={adv}
        onApply={(next) => setAdv(next)}
        categories={categories}
      />

      <ImportSheet
        open={importOpen}
        onClose={() => setImportOpen(false)}
        defaultCurrency={defaultCurrency}
      />

      {/* --- Modal de alta/edición --- */}
      <ExpenseSheet
        open={!!editing || creating}
        expense={editing}
        initialKind={createKind}
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
          setCreateKind('expense');
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
