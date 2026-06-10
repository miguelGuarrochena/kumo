export type Currency = 'ARS' | 'USD' | 'EUR' | 'MXN' | 'CLP' | 'COP' | 'BRL' | 'GBP';

export const CURRENCIES: { code: Currency; label: string; symbol: string }[] = [
  { code: 'ARS', label: 'Peso argentino',     symbol: '$' },
  { code: 'USD', label: 'Dólar',              symbol: 'US$' },
  { code: 'EUR', label: 'Euro',               symbol: '€' },
  { code: 'MXN', label: 'Peso mexicano',      symbol: 'MX$' },
  { code: 'CLP', label: 'Peso chileno',       symbol: 'CLP$' },
  { code: 'COP', label: 'Peso colombiano',    symbol: 'COL$' },
  { code: 'BRL', label: 'Real brasileño',     symbol: 'R$' },
  { code: 'GBP', label: 'Libra',              symbol: '£' },
];

type RatesSnapshot = {
  base: Currency;
  rates: Partial<Record<Currency, number>>;
  fetchedAt: number;
};

let cache: RatesSnapshot | null = null;
const TTL_MS = 60 * 60 * 1000;

async function fetchArsOficial(): Promise<number | null> {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/oficial', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.venta === 'number' ? data.venta : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------
// API: tasas via Frankfurter (base USD)
// ---------------------------------------------------------------------
async function fetchFrankfurterRates(): Promise<Partial<Record<Currency, number>>> {
  try {
    // base USD, todas las principales que nos importan
    const symbols = ['EUR', 'GBP', 'BRL', 'MXN', 'CLP', 'COP'].join(',');
    const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${symbols}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.rates ?? {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------
// Public: obtener todas las tasas (base USD)
// ---------------------------------------------------------------------
export async function getRates(): Promise<RatesSnapshot> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) return cache;

  const [arsOficial, otherRates] = await Promise.all([
    fetchArsOficial(),
    fetchFrankfurterRates(),
  ]);

  const rates: Partial<Record<Currency, number>> = {
    USD: 1, // base
    ...otherRates,
  };
  if (arsOficial) rates.ARS = arsOficial;

  cache = { base: 'USD', rates, fetchedAt: now };
  return cache;
}

// ---------------------------------------------------------------------
// Convertir un monto entre dos monedas con un snapshot de tasas ya cargado.
// Sync: pensado para client/server components que reciben `rates` como prop.
// Devuelve null si falta alguna tasa — el caller decide qué hacer (no sumar
// como 0, mostrar warning, etc.).
// ---------------------------------------------------------------------
export function convertAmount(
  amount: number,
  from: Currency,
  to: Currency,
  rates: Partial<Record<Currency, number>>,
): number | null {
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return null;
  // amount está en `from`. Convertimos a USD primero, después a `to`.
  const inUsd = amount / fromRate;
  return inUsd * toRate;
}

// ---------------------------------------------------------------------
// Convertir un monto entre dos monedas (async, carga las tasas)
// ---------------------------------------------------------------------
export async function convert(
  amount: number,
  from: Currency,
  to: Currency,
): Promise<number | null> {
  if (from === to) return amount;
  const { rates } = await getRates();
  return convertAmount(amount, from, to, rates);
}

// ---------------------------------------------------------------------
// Format
// ---------------------------------------------------------------------
export function formatMoney(
  amount: number,
  currency: Currency,
  locale: 'es' | 'en' = 'es',
): string {
  const cur = CURRENCIES.find((c) => c.code === currency);
  const tag = locale === 'en' ? 'en-US' : 'es-AR';
  const formatter = new Intl.NumberFormat(tag, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${cur?.symbol ?? currency} ${formatter.format(amount)}`;
}
