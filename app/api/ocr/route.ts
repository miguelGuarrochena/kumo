// POST /api/ocr — recibe imagen como multipart/form-data field "image",
// devuelve JSON con los datos extraídos del ticket.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOcrProvider } from '@/lib/ocr';
import { getSubscription } from '@/lib/subscription';
import { getMessages } from '@/lib/i18n/server';

export const maxDuration = 30; // segundos — OCR puede tardar varios

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export async function POST(request: Request) {
  // --- Auth -----------------------------------------------------------
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const sub = await getSubscription();
  if (!sub.hasOcr) {
    const messages = await getMessages();
    return NextResponse.json(
      { error: messages.billing.pro_required, code: 'PRO_REQUIRED' },
      { status: 402 },
    );
  }

  // Caps mensuales: trial = 50, Pro pago = 500. Lifetime/courtesy = 500.
  const TRIAL_CAP = 50;
  const PRO_CAP = 500;
  const cap = sub.status === 'trialing' ? TRIAL_CAP : PRO_CAP;

  const { data: usedRaw } = await supabase.rpc('current_month_ocr_count');
  const used = (usedRaw as number | null) ?? 0;
  if (used >= cap) {
    return NextResponse.json(
      {
        error: sub.status === 'trialing'
          ? `Llegaste al límite de ${cap} escaneos en el trial gratis. Pasate a Pro o esperá al próximo mes.`
          : `Llegaste al límite de ${cap} escaneos este mes.`,
        code: 'CAP_REACHED',
        used,
        cap,
      },
      { status: 429 },
    );
  }

  // --- Validación ----------------------------------------------------
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Form data inválida' }, { status: 400 });
  }

  const file = formData.get('image');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Falta el archivo "image"' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: `Tipo no soportado: ${file.type}. Usá JPEG, PNG, WEBP o HEIC.` },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: 'Imagen demasiado grande (máx 10 MB)' },
      { status: 400 },
    );
  }

  // --- OCR -----------------------------------------------------------
  try {
    const provider = getOcrProvider();
    const buffer = await file.arrayBuffer();
    const result = await provider.extractFromImage(buffer, file.type);
    await supabase.rpc('increment_ocr_usage');
    return NextResponse.json(result);
  } catch (error) {
    console.error('[OCR] error:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json(
      { error: 'No se pudo procesar la imagen', detail: message },
      { status: 500 },
    );
  }
}
