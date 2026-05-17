// Endpoint que setea la cookie de locale.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { locale } = await request.json().catch(() => ({ locale: 'es' }));
  if (locale !== 'es' && locale !== 'en') {
    return NextResponse.json({ error: 'invalid locale' }, { status: 400 });
  }
  const c = await cookies();
  c.set('locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 año
    sameSite: 'lax',
  });
  return NextResponse.json({ ok: true });
}
