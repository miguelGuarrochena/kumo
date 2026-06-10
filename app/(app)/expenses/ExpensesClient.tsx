'use client';

import { useMemo, useRef, useState } from 'react';
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
import type { ExpensesView, ArchiveYear } from './page';
import type { ExtractedExpense } from '@/lib/ocr/types';
import { formatMoney, convertAmount, type Currency } from '@/lib/currency';
import { track } from '@/lib/analytics';
import type { CategoryLite, ContactLite, Expense } from './types';
import { monthShift, formatMonth } from './utils';
import { ExpenseRow } from './ExpenseRow';
import { ExpenseSheet } from './ExpenseSheet';
import { ArchiveView } from './ArchiveView';
import { CurrencyInlineSelect } from './CurrencyInlineSelect';
import { FilterChip } from './FilterChip';
import { ExportMenu } from './ExportMenu';
import { OcrPaywallSheet } from '@/components/OcrPaywallSheet';

type ExpensesSection = 'gastos' | 'saldos';

type Props = {
  section: ExpensesSection;
  view: ExpensesView;
  monthStr: string;
  expenses: Expense[];
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
  trialDaysLeft: number | null;
  priceMonthly: string;
  priceYearly: string;
  yearlyPct: number;
};

export const ExpensesClient = ({
  section,
  view,
  monthStr,
  expenses,
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
  trialDaysLeft,
  priceMonthly,
  priceYearly,
  yearlyPct,
}: Props) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useT();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.q);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [ocrPaywallOpen, setOcrPaywallOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<ExtractedExpense | null>(null);

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

  const { totalInDisplay, someRateMissing } = useMemo(() => {
    let total = 0;
    let missing = false;
    for (const e of expenses) {
      const converted = convertToDisplay(Number(e.amount), e.currency);
      if (converted === null) missing = true;
      else total += converted;
    }
    return { totalInDisplay: total, someRateMissing: missing };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, displayCurrency, rates]);

  const currencyBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of expenses) {
      counts.set(e.currency, (counts.get(e.currency) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([currency, count]) => ({ currency, count }))
      .sort((a, b) => b.count - a.count);
  }, [expenses]);

  const [year, month] = monthStr.split('-').map(Number) as [number, number];
  const prevMonth = monthShift(year, month, -1);
  const nextMonth = monthShift(year, month, 1);
  const monthLabel = formatMonth(year, month, locale);

  const switchView = (next: ExpensesView) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next !== 'month') params.set('view', next);
    else params.delete('view');
    router.push(`/expenses?${params.toString()}`);
  };

  const switchSection = (next: ExpensesSection) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'saldos') params.set('section', 'saldos');
    else params.delete('section');
    router.push(`/expenses?${params.toString()}`);
  };

  const setUrlParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/expenses?${params.toString()}`);
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', 'all');
    if (searchInput.trim()) params.set('q', searchInput.trim());
    else params.delete('q');
    router.push(`/expenses?${params.toString()}`);
  };

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
            {section === 'saldos' ? t.expenses.saldos_subtitle : t.expenses.subtitle}
          </p>
        </div>
        {section === 'gastos' && (
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-full sm:w-auto sm:min-w-[14rem]">
          <button
            type="button"
            onClick={() => switchSection('gastos')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              section === 'gastos'
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
              section === 'saldos'
                ? 'bg-white dark:bg-slate-700 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Scale className="w-4 h-4" />
            {t.expenses.tab_balances}
          </button>
        </div>

        {section === 'gastos' && (
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

      {section === 'saldos' ? (
        <SaldosTab balances={balances} contacts={contacts} payments={payments} />
      ) : (
      <>

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
        <div className="kumo-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push(`/expenses?month=${prevMonth}`)}
              className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-500"
              aria-label={t.expenses.prev_month}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold capitalize">{monthLabel}</h2>
            <button
              onClick={() => router.push(`/expenses?month=${nextMonth}`)}
              className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-500"
              aria-label={t.expenses.next_month}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{t.expenses.total_month}</p>
            <p className="text-3xl sm:text-4xl font-bold kumo-gradient-text break-all">
              {formatMoney(totalInDisplay, displayCurrency, locale)}
            </p>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-2 inline-flex items-center gap-1 flex-wrap justify-center">
              <span>{t.expenses.n_expenses.replace('{n}', String(expenses.length))} · {t.expenses.in_currency}</span>
              <CurrencyInlineSelect
                value={displayCurrency}
                onChange={(v) => setUrlParam('asCurrency', v)}
              />
            </div>
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
            <ExportMenu filters={filters} label={t.expenses.export} />
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
          {expenses.length > 0 && (
            <div className="kumo-card p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                  <span>{expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'} · en</span>
                  <CurrencyInlineSelect
                    value={displayCurrency}
                    onChange={(v) => setUrlParam('asCurrency', v)}
                  />
                </div>
                <p className="text-xl font-bold kumo-gradient-text">
                  {formatMoney(totalInDisplay, displayCurrency, locale)}
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
      {view === 'archive' ? null : expenses.length === 0 ? (
        <div className="kumo-card p-10 text-center">
          <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <h3 className="font-semibold mb-1">
            {view === 'month' ? t.expenses.no_expenses_month_title : t.expenses.no_expenses_filters_title}
          </h3>
          <p className="text-sm text-slate-500">
            {view === 'month'
              ? t.expenses.no_expenses_desc
              : t.expenses.no_expenses_filters_desc}
          </p>
        </div>
      ) : (
        <div className="kumo-card divide-y divide-slate-100 overflow-hidden">
          {expenses.map((exp) => (
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
            />
          ))}
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
        categories={categories}
        contacts={contacts}
        defaultCurrency={defaultCurrency}
        rates={rates}
        onClose={() => {
          setEditing(null);
          setCreating(false);
          setAiSuggestion(null);
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

      <OcrPaywallSheet
        open={ocrPaywallOpen}
        onClose={() => setOcrPaywallOpen(false)}
        priceMonthly={priceMonthly}
        priceYearly={priceYearly}
        yearlyPct={yearlyPct}
        trialDaysLeft={trialDaysLeft}
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
