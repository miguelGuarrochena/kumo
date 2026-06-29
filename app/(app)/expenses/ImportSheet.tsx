'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { Select } from '@/components/Select';
import { useT } from '@/lib/i18n/client';
import { CURRENCIES, type Currency } from '@/lib/currency';
import { importExpenses, type ImportRow } from './importActions';

type Field = 'date' | 'amount' | 'description' | 'category' | 'kind' | 'currency';
type Mapping = Record<Field, number>; // índice de columna, -1 = ninguna

type Props = {
  open: boolean;
  onClose: () => void;
  defaultCurrency: Currency;
};

const pad = (n: number) => String(n).padStart(2, '0');

// Sinónimos de encabezado para auto-detectar columnas.
const SYNONYMS: Record<Field, string[]> = {
  date: ['fecha', 'date', 'dia', 'día', 'fecha gasto', 'fecha movimiento'],
  amount: ['monto', 'importe', 'amount', 'valor', 'total', 'precio', 'gasto', 'debito', 'débito', 'cargo'],
  description: ['descripcion', 'descripción', 'detalle', 'description', 'concepto', 'nombre', 'comentario', 'glosa', 'referencia'],
  category: ['categoria', 'categoría', 'category', 'rubro'],
  kind: ['tipo', 'type', 'kind', 'movimiento'],
  currency: ['moneda', 'currency', 'divisa'],
};

const norm = (s: string) => s.toString().trim().toLowerCase().replace(/[^a-z0-9áéíóúñ ]/g, '');

function toISODate(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date && !isNaN(v.getTime())) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2]!)}-${pad(+m[3]!)}`;
  m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/); // día/mes/año
  if (m) {
    let y = m[3]!;
    if (y.length === 2) y = '20' + y;
    return `${y}-${pad(+m[2]!)}-${pad(+m[1]!)}`;
  }
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  return '';
}

function toAmount(v: unknown): number {
  if (typeof v === 'number') return Math.abs(v);
  let s = String(v ?? '').trim().replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  return Math.abs(Number(s));
}

function toKind(v: unknown, def: 'expense' | 'income'): 'expense' | 'income' {
  const s = String(v ?? '').trim().toLowerCase();
  if (/ingres|income|haber|credit|entrada/.test(s)) return 'income';
  if (/gasto|expense|egreso|debit|salida/.test(s)) return 'expense';
  return def;
}

function toCurrency(v: unknown, def: string): string {
  const s = String(v ?? '').trim().toUpperCase();
  return CURRENCIES.some((c) => c.code === s) ? s : def;
}

export const ImportSheet = ({ open, onClose, defaultCurrency }: Props) => {
  const { t, locale } = useT();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<unknown[][]>([]);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<Mapping>({ date: -1, amount: -1, description: -1, category: -1, kind: -1, currency: -1 });
  const [defKind, setDefKind] = useState<'expense' | 'income'>('expense');
  const [defCur, setDefCur] = useState<Currency>(defaultCurrency);

  const reset = () => {
    setHeaders([]);
    setRows([]);
    setFileName('');
    setMapping({ date: -1, amount: -1, description: -1, category: -1, kind: -1, currency: -1 });
    if (fileRef.current) fileRef.current.value = '';
  };

  const onFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      // Los tipos del bundle de SheetJS son parciales; tipamos lo que usamos.
      const XLSX = (await import('xlsx')) as unknown as {
        read: (data: ArrayBuffer, opts: { type: string; cellDates: boolean }) => { SheetNames: string[]; Sheets: Record<string, unknown> };
        utils: { sheet_to_json: <T>(ws: unknown, opts: { header: 1; raw: boolean; defval: null; blankrows: boolean }) => T[] };
      };
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]!];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: false });
      if (!aoa.length) {
        toast.error(t.expenses.import_empty);
        return;
      }
      const hdr = (aoa[0] as unknown[]).map((h) => (h == null ? '' : String(h)));
      const data = aoa.slice(1).filter((r) => (r as unknown[]).some((c) => c != null && String(c).trim() !== ''));
      // Auto-mapeo por encabezado.
      const auto: Mapping = { date: -1, amount: -1, description: -1, category: -1, kind: -1, currency: -1 };
      (Object.keys(SYNONYMS) as Field[]).forEach((field) => {
        const idx = hdr.findIndex((h) => {
          const n = norm(h);
          return SYNONYMS[field].some((syn) => n === syn || n.includes(syn));
        });
        auto[field] = idx;
      });
      setHeaders(hdr);
      setRows(data);
      setFileName(file.name);
      setMapping(auto);
    } catch {
      toast.error(t.expenses.import_parse_error);
    }
  };

  // Filas parseadas (para preview + import).
  const parsed = useMemo<ImportRow[]>(() => {
    if (!rows.length) return [];
    const at = (r: unknown[], i: number) => (i >= 0 ? r[i] : null);
    return rows.map((r) => ({
      date: toISODate(at(r, mapping.date)),
      amount: toAmount(at(r, mapping.amount)),
      description: mapping.description >= 0 ? String(at(r, mapping.description) ?? '') : null,
      category: mapping.category >= 0 ? String(at(r, mapping.category) ?? '') : null,
      kind: toKind(at(r, mapping.kind), defKind),
      currency: toCurrency(at(r, mapping.currency), defCur),
    }));
  }, [rows, mapping, defKind, defCur]);

  const rowValid = (r: ImportRow) => r.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(r.date);
  const validCount = parsed.filter(rowValid).length;
  const invalidCount = parsed.length - validCount;
  const ready = mapping.date >= 0 && mapping.amount >= 0;

  const colOptions = [
    { value: '-1', label: t.expenses.import_none },
    ...headers.map((h, i) => ({ value: String(i), label: h || `Columna ${i + 1}` })),
  ];
  const fieldRow = (field: Field, label: string, required?: boolean) => (
    <div className="flex items-center gap-2">
      <label className="text-sm w-28 shrink-0">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      <Select
        value={String(mapping[field])}
        onChange={(v) => setMapping((m) => ({ ...m, [field]: Number(v) }))}
        options={colOptions}
        ariaLabel={label}
        className="flex-1"
        buttonClassName="py-2"
      />
    </div>
  );

  const doImport = () => {
    if (!ready) {
      toast.error(t.expenses.import_required_missing);
      return;
    }
    startTransition(async () => {
      const res = await importExpenses(parsed);
      if (res.ok) {
        toast.success(
          res.createdCategories > 0
            ? t.expenses.import_done_cats.replace('{n}', String(res.imported)).replace('{c}', String(res.createdCategories))
            : t.expenses.import_done.replace('{n}', String(res.imported)),
        );
        reset();
        onClose();
        router.refresh();
      } else {
        toast.error(res.error ?? 'Error');
      }
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title={t.expenses.import_title}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.expenses.import_subtitle}</p>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />

        {headers.length === 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 px-4 py-10 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 hover:border-sky-400 hover:text-sky-600 transition-colors"
          >
            <Upload className="w-7 h-7" />
            <span className="text-sm font-medium">{t.expenses.import_choose_file}</span>
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate flex-1">{fileName}</span>
              <button type="button" onClick={reset} className="text-xs text-sky-600 dark:text-sky-400 hover:underline shrink-0">
                {t.expenses.import_change_file}
              </button>
            </div>

            {/* Mapeo de columnas */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
              <p className="text-sm font-semibold">{t.expenses.import_map_title}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.expenses.import_map_hint}</p>
              {fieldRow('date', t.expenses.date, true)}
              {fieldRow('amount', t.expenses.amount, true)}
              {fieldRow('description', t.expenses.description)}
              {fieldRow('category', t.expenses.category)}
              {fieldRow('kind', `${t.expenses.kind_expense}/${t.expenses.kind_income}`)}
              {fieldRow('currency', t.expenses.currency)}
            </div>

            {/* Defaults */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.expenses.import_default_kind}</label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {(['expense', 'income'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setDefKind(k)}
                      className={`px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        defKind === k ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {k === 'expense' ? t.expenses.kind_expense : t.expenses.kind_income}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t.expenses.import_default_currency}</label>
                <Select
                  value={defCur}
                  onChange={(v) => setDefCur(v as Currency)}
                  options={CURRENCIES.map((c) => ({ value: c.code, label: c.code, hint: c.symbol }))}
                  ariaLabel={t.expenses.import_default_currency}
                  buttonClassName="py-2"
                />
              </div>
            </div>

            {/* Vista previa */}
            {ready && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{t.expenses.import_preview}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {t.expenses.import_rows_valid.replace('{n}', String(validCount))}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="text-left font-medium px-2 py-1.5">{t.expenses.date}</th>
                        <th className="text-right font-medium px-2 py-1.5">{t.expenses.amount}</th>
                        <th className="text-left font-medium px-2 py-1.5">{t.expenses.category}</th>
                        <th className="text-left font-medium px-2 py-1.5">{t.expenses.import_default_kind}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {parsed.slice(0, 12).map((r, i) => {
                        const ok = rowValid(r);
                        return (
                          <tr key={i} className={ok ? '' : 'bg-rose-50 dark:bg-rose-900/15'}>
                            <td className="px-2 py-1.5 whitespace-nowrap">{r.date || '—'}</td>
                            <td className={`px-2 py-1.5 text-right tabular-nums ${r.kind === 'income' ? 'text-mint-600 dark:text-mint-400' : ''}`}>
                              {r.amount > 0 ? r.amount.toLocaleString(locale) : '—'}
                            </td>
                            <td className="px-2 py-1.5 truncate max-w-[8rem]">{r.category || '—'}</td>
                            <td className="px-2 py-1.5">{r.kind === 'income' ? t.expenses.kind_income : t.expenses.kind_expense}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {invalidCount > 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    {t.expenses.import_rows_invalid.replace('{n}', String(invalidCount))}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={doImport}
              disabled={pending || !ready || validCount === 0}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? t.expenses.import_importing : t.expenses.import_cta.replace('{n}', String(validCount))}
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
};
