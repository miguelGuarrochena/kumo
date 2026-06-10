import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getLocale, getMessages } from '@/lib/i18n/server';
import { localeTag } from '@/lib/i18n/locale';
import * as XLSX from 'xlsx';

type ExpenseRow = {
  expense_date: string;
  due_date: string | null;
  description: string | null;
  category_name: string;
  amount: number;
  currency: string;
  paid: boolean;
  is_recurring: boolean;
  recurrence_type: string | null;
};

export async function GET(request: Request) {
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const dateLocale = localeTag(locale);

  const rowHeaders = [
    t.export.col_date,
    t.export.col_due,
    t.export.col_description,
    t.export.col_category,
    t.export.col_amount,
    t.export.col_currency,
    t.export.col_status,
    t.export.col_recurring,
  ];

  const recurrenceLabel = (type: string | null): string => {
    const map: Record<string, string> = {
      weekly: t.expenses.recurrence_weekly,
      monthly: t.expenses.recurrence_monthly,
      yearly: t.expenses.recurrence_yearly,
    };
    return type ? (map[type] ?? t.common.yes) : t.common.yes;
  };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse(t.export.not_authenticated, { status: 401 });

  const url = new URL(request.url);
  const format = (url.searchParams.get('format') ?? 'xlsx').toLowerCase();
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const currency = url.searchParams.get('currency');
  const paid = url.searchParams.get('paid'); // 'paid' | 'pending' | null

  if (format !== 'xlsx' && format !== 'csv') {
    return new NextResponse(t.export.invalid_format, { status: 400 });
  }

  // Filtramos explícitamente por el workspace activo además de RLS, para no
  // mezclar gastos de varios espacios si el user pertenece a más de uno.
  const ctx = await getCurrentWorkspace();

  let q = supabase
    .from('expenses')
    .select('expense_date, due_date, description, amount, currency, paid, is_recurring, recurrence_type, categories(name)')
    .eq('workspace_id', ctx.workspaceId)
    .order('expense_date', { ascending: false });

  if (from)     q = q.gte('expense_date', from);
  if (to)       q = q.lte('expense_date', to);
  if (currency) q = q.eq('currency', currency);
  if (paid === 'paid')    q = q.eq('paid', true);
  if (paid === 'pending') q = q.eq('paid', false);

  const { data, error } = await q;
  if (error) return new NextResponse(`Error: ${error.message}`, { status: 500 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((data ?? []) as any[]).map<ExpenseRow>((e) => ({
    expense_date: e.expense_date,
    due_date: e.due_date,
    description: e.description,
    category_name: e.categories?.name ?? '—',
    amount: Number(e.amount),
    currency: e.currency,
    paid: e.paid,
    is_recurring: e.is_recurring,
    recurrence_type: e.recurrence_type,
  }));

  const sheetData: (string | number)[][] = [
    rowHeaders,
    ...rows.map((r) => [
      r.expense_date,
      r.due_date ?? '',
      r.description ?? '',
      r.category_name,
      r.amount,
      r.currency,
      r.paid ? t.expenses.paid : t.expenses.pending,
      r.is_recurring ? recurrenceLabel(r.recurrence_type) : t.common.no,
    ]),
  ];

  const today = new Date().toISOString().slice(0, 10);

  // -------- RAMA CSV --------
  if (format === 'csv') {
    const csv = buildCsv(sheetData);
    // BOM al inicio para que Excel detecte UTF-8 (acentos)
    const body = '﻿' + csv;
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="kumo-gastos-${today}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // -------- RAMA XLSX --------

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Anchos de columna razonables (en caracteres aprox.)
  ws['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 12 }, // Vencimiento
    { wch: 30 }, // Descripción
    { wch: 16 }, // Categoría
    { wch: 12 }, // Monto
    { wch: 8 },  // Moneda
    { wch: 10 }, // Estado
    { wch: 10 }, // Recurrente
  ];

  // Negrita en headers
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellAddr]) {
      ws[cellAddr].s = { font: { bold: true } };
    }
  }

  // Format numérico para columna Monto (E)
  for (let r = 1; r <= rows.length; r++) {
    const cellAddr = XLSX.utils.encode_cell({ r, c: 4 });
    if (ws[cellAddr]) ws[cellAddr].z = '#,##0.00';
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t.export.sheet_expenses);

  // Hoja resumen
  const totalsByCurrency = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.currency] = (acc[r.currency] ?? 0) + r.amount;
    return acc;
  }, {});
  const totalsByCategory = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category_name] = (acc[r.category_name] ?? 0) + r.amount;
    return acc;
  }, {});

  const summarySheet: (string | number)[][] = [
    [t.export.summary_title],
    [t.export.generated_at.replace('{at}', new Date().toLocaleString(dateLocale))],
    [t.export.total_rows.replace('{n}', String(rows.length))],
    [],
    [t.export.by_currency],
    [t.export.currency_col, t.export.total_col],
    ...Object.entries(totalsByCurrency).map(([k, v]) => [k, Number(v.toFixed(2))]),
    [],
    [t.export.by_category],
    [t.export.col_category, t.export.category_total_col],
    ...Object.entries(totalsByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [k, Number(v.toFixed(2))]),
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summarySheet);
  summaryWs['!cols'] = [{ wch: 24 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, t.export.sheet_summary);

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `kumo-gastos-${today}.xlsx`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

// ---------------------------------------------------------------------------
// CSV builder — RFC 4180 compatible
// ---------------------------------------------------------------------------

const escapeCsvCell = (value: string | number | undefined | null): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Si tiene coma, comilla, salto de línea, o empieza/termina con espacio,
  // hay que entrecomillar y escapar comillas internas duplicándolas.
  const needsQuoting = /[",\r\n]/.test(str) || /^\s|\s$/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
};

const buildCsv = (rows: (string | number)[][]): string =>
  rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
