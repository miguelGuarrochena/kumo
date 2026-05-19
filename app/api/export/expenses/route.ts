import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

// Exporta los gastos del usuario a un archivo Excel (.xlsx).
//
// Soporta filtros opcionales por query string:
//   ?from=YYYY-MM-DD     fecha desde (expense_date >=)
//   ?to=YYYY-MM-DD       fecha hasta (expense_date <=)
//   ?currency=ARS        filtrar por moneda
//   ?paid=paid|pending   estado
//
// El archivo se descarga directamente desde el browser.

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

const ROW_HEADERS = [
  'Fecha',
  'Vencimiento',
  'Descripción',
  'Categoría',
  'Monto',
  'Moneda',
  'Estado',
  'Recurrente',
];

const RECURRENCE_LABEL: Record<string, string> = {
  weekly:  'Semanal',
  monthly: 'Mensual',
  yearly:  'Anual',
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('No autenticado', { status: 401 });

  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const currency = url.searchParams.get('currency');
  const paid = url.searchParams.get('paid'); // 'paid' | 'pending' | null

  let q = supabase
    .from('expenses')
    .select('expense_date, due_date, description, amount, currency, paid, is_recurring, recurrence_type, categories(name)')
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
    ROW_HEADERS,
    ...rows.map((r) => [
      r.expense_date,
      r.due_date ?? '',
      r.description ?? '',
      r.category_name,
      r.amount,
      r.currency,
      r.paid ? 'Pagado' : 'Pendiente',
      r.is_recurring ? (RECURRENCE_LABEL[r.recurrence_type ?? ''] ?? 'Sí') : 'No',
    ]),
  ];

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
  XLSX.utils.book_append_sheet(wb, ws, 'Gastos');

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
    ['Resumen exportación'],
    [`Generado: ${new Date().toLocaleString('es-AR')}`],
    [`Total de filas: ${rows.length}`],
    [],
    ['Por moneda'],
    ['Moneda', 'Total'],
    ...Object.entries(totalsByCurrency).map(([k, v]) => [k, Number(v.toFixed(2))]),
    [],
    ['Por categoría'],
    ['Categoría', 'Total (suma sin convertir)'],
    ...Object.entries(totalsByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [k, Number(v.toFixed(2))]),
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summarySheet);
  summaryWs['!cols'] = [{ wch: 24 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const today = new Date().toISOString().slice(0, 10);
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
