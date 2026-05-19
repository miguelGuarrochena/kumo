'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Check, Wallet, Search, SlidersHorizontal, X,
  Camera, Loader2, Sparkles,
} from 'lucide-react';
import { upsertExpense, deleteExpense, togglePaid } from './actions';
import { Sheet } from '@/components/Sheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Select, type SelectOption } from '@/components/Select';
import { FiltersSheet, type Filters } from './FiltersSheet';
import type { ExpensesView, ArchiveYear } from './page';
import type { ExtractedExpense } from '@/lib/ocr/types';
import { CURRENCIES, formatMoney, type Currency } from '@/lib/currency';
import { Archive } from 'lucide-react';
import { track } from '@/lib/analytics';

type CategoryLite = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

type ContactLite = {
  id: string;
  name: string;
  relationship: string;
  is_self: boolean;
  phone: string | null;
};

type Expense = {
  id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  description: string | null;
  expense_date: string;
  due_date: string | null;
  paid: boolean;
  is_recurring: boolean;
  recurrence_type: string | null;
  notify_contact_ids: string[];
  categories: CategoryLite | null;
};

type Props = {
  view: ExpensesView;
  monthStr: string;
  expenses: Expense[];
  archiveYears: ArchiveYear[];
  categories: CategoryLite[];
  contacts: ContactLite[];
  defaultCurrency: Currency;   // moneda preferida del user (de settings)
  displayCurrency: Currency;   // moneda en la que se muestra el TOTAL ahora
  rates: Partial<Record<Currency, number>>;
  filters: Filters;
};

const COLOR_DOT: Record<string, string> = {
  sky: 'bg-sky-400',
  lavender: 'bg-lavender-400',
  peach: 'bg-peach-300',
  mint: 'bg-mint-400',
  rose: 'bg-rose-300',
};

export function ExpensesClient({
  view,
  monthStr,
  expenses,
  archiveYears,
  categories,
  contacts,
  defaultCurrency,
  displayCurrency,
  rates,
  filters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.q);

  // --- OCR (cargar desde foto) ---
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<ExtractedExpense | null>(null);

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // permite re-elegir el mismo archivo
    setOcrLoading(true);
    const fd = new FormData();
    fd.set('image', file);
    try {
      const res = await fetch('/api/ocr', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo procesar la imagen');
        track('photo_ocr_used', { success: false });
        return;
      }
      setAiSuggestion(data as ExtractedExpense);
      setCreating(true);
      toast.success('Ticket procesado — revisá los datos');
      track('photo_ocr_used', { success: true });
    } catch {
      toast.error('Error de red al procesar la imagen');
      track('photo_ocr_used', { success: false });
    } finally {
      setOcrLoading(false);
    }
  };

  const convertToDisplay = (amount: number, currency: string): number => {
    if (currency === displayCurrency) return amount;
    const fromRate = rates[currency as Currency];
    const toRate = rates[displayCurrency];
    if (!fromRate || !toRate) return 0;
    return (amount / fromRate) * toRate;
  };

  const totalInDisplay = expenses.reduce(
    (sum, e) => sum + convertToDisplay(Number(e.amount), e.currency),
    0,
  );

  const [year, month] = monthStr.split('-').map(Number) as [number, number];
  const prevMonth = monthShift(year, month, -1);
  const nextMonth = monthShift(year, month, 1);
  const monthLabel = formatMonth(year, month);

  const switchView = (next: ExpensesView) => {
    const params = new URLSearchParams();
    if (next !== 'month') params.set('view', next);
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
      toast.success('Gasto eliminado');
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gastos</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            {view === 'month'
              ? 'Cargá lo que gastás y mirá totales por mes.'
              : view === 'all'
                ? 'Mirá todos tus gastos con filtros.'
                : 'Histórico por año.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Botón cargar desde foto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPhotoSelected}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={ocrLoading}
            title="Cargar desde foto del ticket"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:border-sky-300 dark:hover:border-sky-500 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-wait"
          >
            {ocrLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            <span className="hidden sm:inline text-sm">
              {ocrLoading ? 'Leyendo...' : 'Foto'}
            </span>
          </button>

          <button
            onClick={() => {
              setAiSuggestion(null);
              setCreating(true);
            }}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl kumo-gradient text-white font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo gasto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </header>

      {/* --- Toggle de vista --- */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-full sm:w-auto sm:inline-flex">
        <button
          onClick={() => switchView('month')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'month' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Por mes
        </button>
        <button
          onClick={() => switchView('all')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => switchView('archive')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'archive' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Histórico
        </button>
      </div>

      {view === 'archive' ? (
        // ============== VISTA HISTÓRICO ==============
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
        // ============== VISTA MES ==============
        <>
          <div className="kumo-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => router.push(`/expenses?month=${prevMonth}`)}
                className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-500"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="font-semibold capitalize">{monthLabel}</h2>
              <button
                onClick={() => router.push(`/expenses?month=${nextMonth}`)}
                className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-500"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Total del mes</p>
              <p className="text-3xl sm:text-4xl font-bold kumo-gradient-text break-all">
                {formatMoney(totalInDisplay, displayCurrency)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 inline-flex items-center gap-1">
                {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'} · en
                <CurrencyInlineSelect
                  value={displayCurrency}
                  onChange={(v) => setUrlParam('asCurrency', v)}
                />
              </p>
            </div>
          </div>
        </>
      ) : (
        // ============== VISTA TODOS ==============
        <>
          <form onSubmit={onSearchSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar por descripción..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Filtros</span>
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
                    {cat.name}
                  </FilterChip>
                );
              })}
              {filters.from && (
                <FilterChip onRemove={() => setUrlParam('from', null)}>Desde {filters.from}</FilterChip>
              )}
              {filters.to && (
                <FilterChip onRemove={() => setUrlParam('to', null)}>Hasta {filters.to}</FilterChip>
              )}
              {filters.min && (
                <FilterChip onRemove={() => setUrlParam('min', null)}>≥ {filters.min}</FilterChip>
              )}
              {filters.max && (
                <FilterChip onRemove={() => setUrlParam('max', null)}>≤ {filters.max}</FilterChip>
              )}
              {filters.paid && (
                <FilterChip onRemove={() => setUrlParam('paid', null)}>
                  {filters.paid === 'paid' ? 'Pagados' : 'Pendientes'}
                </FilterChip>
              )}
              {filters.rec && (
                <FilterChip onRemove={() => setUrlParam('rec', null)}>
                  {filters.rec === 'recurring' ? 'Recurrentes' : 'Una vez'}
                </FilterChip>
              )}
              {filters.cur && (
                <FilterChip onRemove={() => setUrlParam('cur', null)}>{filters.cur}</FilterChip>
              )}
              <button
                onClick={() => router.push('/expenses?view=all')}
                className="text-xs text-slate-500 hover:text-rose-500 font-medium ml-1"
              >
                Limpiar todo
              </button>
            </div>
          )}

          {/* Resumen agregado */}
          {expenses.length > 0 && (
            <div className="kumo-card p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                  {expenses.length} {expenses.length === 1 ? 'gasto' : 'gastos'} · en
                  <CurrencyInlineSelect
                    value={displayCurrency}
                    onChange={(v) => setUrlParam('asCurrency', v)}
                  />
                </p>
                <p className="text-xl font-bold kumo-gradient-text">
                  {formatMoney(totalInDisplay, displayCurrency)}
                </p>
              </div>
              <Select
                value={filters.sort}
                onChange={(v) => setUrlParam('sort', v)}
                options={[
                  { value: 'date-desc',   label: 'Más nuevos primero' },
                  { value: 'date-asc',    label: 'Más viejos primero' },
                  { value: 'amount-desc', label: 'Monto mayor' },
                  { value: 'amount-asc',  label: 'Monto menor' },
                ]}
                ariaLabel="Ordenar"
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
            {view === 'month' ? 'Sin gastos este mes' : 'No hay gastos con esos filtros'}
          </h3>
          <p className="text-sm text-slate-500">
            {view === 'month'
              ? 'Cargá tu primer gasto con el botón de arriba.'
              : 'Probá ajustar los filtros o cargar nuevos gastos.'}
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
                await togglePaid(exp.id, !exp.paid);
                toast.success(exp.paid ? 'Marcado pendiente' : 'Marcado pagado');
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
        title="Borrar gasto"
        description={`¿Borrar "${toDelete?.description ?? toDelete?.categories?.name ?? 'este gasto'}"? No se puede deshacer.`}
      />
    </div>
  );
}

// ===================================================================
function ExpenseRow({
  expense,
  displayCurrency,
  convertedAmount,
  onEdit,
  onDelete,
  onTogglePaid,
  showFullDate = false,
}: {
  expense: Expense;
  displayCurrency: Currency;
  convertedAmount: number;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePaid: () => void;
  showFullDate?: boolean;
}) {
  const cat = expense.categories;
  const dotColor = cat ? COLOR_DOT[cat.color] ?? 'bg-slate-300' : 'bg-slate-300';
  const isPending = expense.due_date && !expense.paid;
  const isDifferentCurrency = expense.currency !== displayCurrency;

  return (
    <div className="p-3.5 flex items-center gap-3 group active:bg-slate-50/80">
      <div className={`w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-medium text-sm truncate">
            {expense.description || cat?.name || 'Gasto'}
          </p>
          {isPending && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-peach-100 text-peach-400 font-medium">
              Pendiente
            </span>
          )}
          {expense.is_recurring && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lavender-100 text-lavender-500 font-medium">
              {expense.recurrence_type === 'monthly' ? 'Mensual' : expense.recurrence_type === 'weekly' ? 'Semanal' : 'Anual'}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {cat?.name ?? 'Sin categoría'} · {showFullDate ? formatFullDate(expense.expense_date) : formatDate(expense.expense_date)}
          {expense.due_date && ` · vence ${formatDate(expense.due_date)}`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold text-sm whitespace-nowrap">
          {formatMoney(
            isDifferentCurrency ? convertedAmount : Number(expense.amount),
            displayCurrency,
          )}
        </p>
        {isDifferentCurrency && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 whitespace-nowrap">
            ≈ {formatMoney(Number(expense.amount), expense.currency as Currency)}
          </p>
        )}
      </div>
      <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
        {expense.due_date && (
          <button
            onClick={onTogglePaid}
            className={`p-2 rounded-lg ${
              expense.paid ? 'text-mint-500 hover:bg-mint-50' : 'text-slate-400 hover:bg-slate-100'
            }`}
            title={expense.paid ? 'Marcar pendiente' : 'Marcar pagado'}
          >
            <Check className="w-4 h-4" />
          </button>
        )}
        <button onClick={onEdit} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-2 rounded-lg hover:bg-rose-100 text-rose-500">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ===================================================================
function ExpenseSheet({
  open,
  expense,
  aiSuggestion,
  categories,
  contacts,
  defaultCurrency,
  rates,
  onClose,
}: {
  open: boolean;
  expense: Expense | null;
  aiSuggestion?: ExtractedExpense | null;
  categories: CategoryLite[];
  contacts: ContactLite[];
  defaultCurrency: Currency;
  rates: Partial<Record<Currency, number>>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [hasDueDate, setHasDueDate] = useState(false);
  const [paid, setPaid] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<string>('monthly');
  const [notifyContactIds, setNotifyContactIds] = useState<string[]>([]);

  // Reset / hidrata el form cada vez que se abre (creación, edición o AI).
  useEffect(() => {
    if (!open) return;

    if (expense) {
      // Edición de gasto existente
      setAmount(expense.amount?.toString() ?? '');
      setCurrency((expense.currency as Currency) ?? defaultCurrency);
      setCategoryId(expense.category_id ?? '');
      setDescription(expense.description ?? '');
      setExpenseDate(expense.expense_date ?? new Date().toISOString().slice(0, 10));
      setDueDate(expense.due_date ?? '');
      setHasDueDate(!!expense.due_date);
      setPaid(expense.paid ?? true);
      setIsRecurring(expense.is_recurring ?? false);
      setRecurrenceType(expense.recurrence_type ?? 'monthly');
      setNotifyContactIds(expense.notify_contact_ids ?? []);
    } else if (aiSuggestion) {
      // Creación con datos extraídos del ticket
      setAmount(aiSuggestion.total ? aiSuggestion.total.toString() : '');
      const cur = (aiSuggestion.currency?.toUpperCase() ?? defaultCurrency) as Currency;
      setCurrency(CURRENCIES.some((c) => c.code === cur) ? cur : defaultCurrency);
      setDescription(aiSuggestion.description ?? aiSuggestion.merchant ?? '');
      setExpenseDate(aiSuggestion.date ?? new Date().toISOString().slice(0, 10));
      setDueDate('');
      setHasDueDate(false);
      setPaid(true);
      setIsRecurring(false);
      setRecurrenceType('monthly');
      // Intentar matchear categoría sugerida con las existentes
      const sugg = aiSuggestion.categorySuggestion?.toLowerCase().trim();
      const matched = sugg
        ? categories.find(
            (c) =>
              c.name.toLowerCase() === sugg ||
              c.name.toLowerCase().includes(sugg) ||
              sugg.includes(c.name.toLowerCase()),
          )
        : null;
      setCategoryId(matched?.id ?? '');
      const selfId = contacts.find((c) => c.is_self)?.id;
      setNotifyContactIds(selfId ? [selfId] : []);
    } else {
      // Creación vacía
      setAmount('');
      setCurrency(defaultCurrency);
      setCategoryId('');
      setDescription('');
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setDueDate('');
      setHasDueDate(false);
      setPaid(true);
      setIsRecurring(false);
      setRecurrenceType('monthly');
      const selfId = contacts.find((c) => c.is_self)?.id;
      setNotifyContactIds(selfId ? [selfId] : []);
    }
  }, [open, expense?.id, aiSuggestion, defaultCurrency, contacts, categories]);

  const toggleContact = (id: string) => {
    setNotifyContactIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const convertedAmount = useMemo(() => {
    const amt = parseFloat(amount);
    if (!amt || isNaN(amt) || currency === defaultCurrency) return null;
    const fromRate = rates[currency];
    const toRate = rates[defaultCurrency];
    if (!fromRate || !toRate) return null;
    return (amt / fromRate) * toRate;
  }, [amount, currency, defaultCurrency, rates]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    if (expense?.id) fd.set('id', expense.id);
    if (categoryId) fd.set('category_id', categoryId);
    fd.set('amount', amount);
    fd.set('currency', currency);
    fd.set('description', description);
    fd.set('expense_date', expenseDate);
    if (hasDueDate && dueDate) fd.set('due_date', dueDate);
    fd.set('paid', String(paid));
    fd.set('is_recurring', String(isRecurring));
    if (isRecurring) fd.set('recurrence_type', recurrenceType);
    // Solo mandamos contactos si hay vencimiento (sino no tiene sentido notificar)
    if (hasDueDate) {
      notifyContactIds.forEach((id) => fd.append('notify_contact_ids', id));
    }

    startTransition(async () => {
      const result = await upsertExpense({ ok: false }, fd);
      if (result.ok) {
        toast.success(expense ? 'Gasto actualizado' : 'Gasto creado');
        if (!expense) {
          track('expense_created', { currency, has_due_date: hasDueDate, via: aiSuggestion ? 'ocr' : 'manual' });
        }
        router.refresh();
        onClose();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title={expense ? 'Editar gasto' : 'Nuevo gasto'}>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Banner cuando vienen datos del OCR */}
        {!expense && aiSuggestion && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-gradient-to-br from-sky-50 to-lavender-50 dark:from-sky-900/20 dark:to-lavender-900/20 border border-sky-200 dark:border-sky-800/60">
            <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-medium text-sky-700 dark:text-sky-300">
                Datos extraídos por IA
              </p>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Revisá monto, fecha y categoría antes de guardar.
                {aiSuggestion.merchant && (
                  <> Comercio detectado: <strong>{aiSuggestion.merchant}</strong>.</>
                )}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto</label>
            <input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
              autoFocus
              required
            />
          </div>
          <div className="w-28">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Moneda</label>
            <Select
              value={currency}
              onChange={(v) => setCurrency(v as Currency)}
              options={CURRENCIES.map((c) => ({ value: c.code, label: c.code, hint: c.symbol }))}
              ariaLabel="Moneda"
              buttonClassName="py-3 rounded-xl"
            />
          </div>
        </div>

        {convertedAmount !== null && (
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-sm flex items-center justify-between">
            <span className="text-sky-700">Equivalente:</span>
            <span className="font-semibold text-sky-900">
              {formatMoney(convertedAmount, defaultCurrency)}
            </span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Categoría</label>
          <Select
            value={categoryId}
            onChange={setCategoryId}
            options={[
              { value: '', label: 'Sin categoría' } as SelectOption,
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            ariaLabel="Categoría"
            buttonClassName="py-3 rounded-xl"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Suscripción Netflix"
            className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Fecha</label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className="w-full px-3 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Estado</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaid(true)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-colors text-sm font-medium ${
                paid
                  ? 'border-mint-400 bg-mint-50 dark:bg-mint-500/10 text-mint-600 dark:text-mint-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Check className="w-4 h-4" />
              Pagado
            </button>
            <button
              type="button"
              onClick={() => setPaid(false)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 transition-colors text-sm font-medium ${
                !paid
                  ? 'border-peach-400 bg-peach-50 dark:bg-peach-500/10 text-peach-500'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-peach-400" />
              Pendiente
            </button>
          </div>
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasDueDate}
              onChange={(e) => {
                setHasDueDate(e.target.checked);
                if (e.target.checked && paid) setPaid(false);
              }}
              className="rounded text-sky-600 w-4 h-4"
            />
            <span className="font-medium">Tiene vencimiento</span>
            <span className="ml-auto text-[11px] text-slate-400">para alertas</span>
          </label>
          {hasDueDate && (
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            />
          )}
        </div>

        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded text-sky-600 w-4 h-4"
            />
            <span className="font-medium">Es recurrente</span>
          </label>
          {isRecurring && (
            <Select
              value={recurrenceType}
              onChange={setRecurrenceType}
              options={[
                { value: 'weekly',  label: 'Semanal' },
                { value: 'monthly', label: 'Mensual' },
                { value: 'yearly',  label: 'Anual' },
              ]}
              ariaLabel="Recurrencia"
            />
          )}
        </div>

        {/* Selector "Avisar a" — solo aparece si hay vencimiento */}
        {hasDueDate && contacts.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Avisar a</label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              A quién mandamos WhatsApp cuando se acerque el vencimiento.
            </p>
            <div className="space-y-1.5">
              {contacts.map((c) => {
                const selected = notifyContactIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleContact(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-colors text-left ${
                      selected
                        ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 grid place-items-center transition-all shrink-0 ${
                        selected ? 'kumo-gradient border-transparent' : 'border-slate-300'
                      }`}
                    >
                      {selected && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.phone ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">+{c.phone}</p>
                      ) : (
                        <p className="text-xs text-rose-400">Sin número — no recibirá WhatsApp</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 sticky bottom-0 bg-white dark:bg-slate-800 pb-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending || !amount}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Guardando...' : expense ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function monthShift(year: number, month: number, delta: number): string {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function FilterChip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-medium">
      {children}
      <button
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-sky-200"
        aria-label="Quitar filtro"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// =====================================================================
// Vista Histórico: cards por año
// =====================================================================
function ArchiveView({
  years,
  displayCurrency,
  onSelectYear,
  onChangeCurrency,
}: {
  years: ArchiveYear[];
  displayCurrency: Currency;
  onSelectYear: (year: number) => void;
  onChangeCurrency: (v: string) => void;
}) {
  const currentYear = new Date().getFullYear();

  if (years.length === 0) {
    return (
      <div className="kumo-card p-10 text-center">
        <Archive className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <h3 className="font-semibold mb-1">Sin histórico todavía</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cuando tengas gastos cargados, vas a poder navegar por año desde acá.
        </p>
      </div>
    );
  }

  const grandTotal = years.reduce((s, y) => s + y.total, 0);

  return (
    <div className="space-y-4">
      <div className="kumo-card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
            Histórico total · en
            <CurrencyInlineSelect value={displayCurrency} onChange={onChangeCurrency} />
          </p>
          <p className="text-2xl font-bold kumo-gradient-text">
            {formatMoney(grandTotal, displayCurrency)}
          </p>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {years.length} {years.length === 1 ? 'año' : 'años'} con datos
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {years.map((y) => {
          const isCurrent = y.year === currentYear;
          const yearsAgo = currentYear - y.year;
          return (
            <button
              key={y.year}
              onClick={() => onSelectYear(y.year)}
              className="kumo-card p-5 text-left hover:scale-[1.01] active:scale-[0.99] transition-transform group"
            >
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-2xl font-bold tracking-tight">{y.year}</h3>
                {isCurrent ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 font-medium">
                    Activo
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                    {yearsAgo === 1 ? 'Año pasado' : `Hace ${yearsAgo} años`}
                  </span>
                )}
              </div>
              <p className="text-xl font-bold kumo-gradient-text mb-1">
                {formatMoney(y.total, displayCurrency)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>{y.count} {y.count === 1 ? 'gasto' : 'gastos'}</span>
                <span className="text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver detalle →
                </span>
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Select inline minimalista — se ve como texto subrayado punteado, no como caja.
function CurrencyInlineSelect({
  value,
  onChange,
}: {
  value: Currency;
  onChange: (v: string) => void;
}) {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={CURRENCIES.map((c) => ({ value: c.code, label: c.code, hint: c.symbol }))}
      ariaLabel="Moneda de visualización"
      className="inline-block"
      renderTrigger={(_current, open) => (
        <span
          className={`font-medium cursor-pointer underline decoration-dotted underline-offset-2 transition-colors ${
            open
              ? 'text-sky-600 decoration-sky-400'
              : 'text-slate-500 dark:text-slate-300 decoration-slate-300 dark:decoration-slate-600 hover:text-sky-600 hover:decoration-sky-400'
          }`}
        >
          {value}
        </span>
      )}
    />
  );
}
