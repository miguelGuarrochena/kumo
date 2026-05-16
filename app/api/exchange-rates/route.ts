// Endpoint público que devuelve las tasas actuales (cacheadas).
// Usado por el form de gastos para mostrar conversión en vivo.

import { NextResponse } from 'next/server';
import { getRates } from '@/lib/currency';

export async function GET() {
  const rates = await getRates();
  return NextResponse.json(rates, {
    headers: { 'Cache-Control': 'public, s-maxage=3600' },
  });
}
