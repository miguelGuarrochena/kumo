import { NextResponse } from 'next/server';
export const POST = async () => NextResponse.json({ error: 'Endpoint reemplazado por /api/billing/checkout' }, { status: 410 });
