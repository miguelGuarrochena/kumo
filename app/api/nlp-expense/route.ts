import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSubscription } from '@/lib/subscription';
import { getMessages } from '@/lib/i18n/server';
import { parseExpenseFromText } from '@/lib/nlp/geminiExpense';
import { looksExpenseIntent } from '@/lib/nlp/detect';

export const maxDuration = 15;

const TRIAL_CAP = 50;
const PRO_CAP = 500;

export async function POST(request: Request) {
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

  const cap = sub.status === 'trialing' ? TRIAL_CAP : PRO_CAP;
  const { data: usedRaw } = await supabase.rpc('current_month_ocr_count');
  const used = (usedRaw as number | null) ?? 0;
  if (used >= cap) {
    return NextResponse.json(
      {
        error:
          sub.status === 'trialing'
            ? `Llegaste al límite de ${cap} usos de IA en el trial. Pasate a Pro o esperá al próximo mes.`
            : `Llegaste al límite de ${cap} usos de IA este mes.`,
        code: 'CAP_REACHED',
        used,
        cap,
      },
      { status: 429 },
    );
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const text = (body.text ?? '').trim();
  if (text.length < 4 || text.length > 300) {
    return NextResponse.json({ error: 'Texto inválido' }, { status: 400 });
  }
  if (!looksExpenseIntent(text)) {
    return NextResponse.json(
      { error: 'No parece un gasto. Probá algo como "gasté 5000 en el super".', code: 'NOT_EXPENSE' },
      { status: 400 },
    );
  }

  try {
    const result = await parseExpenseFromText(text);
    await supabase.rpc('increment_ocr_usage');
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    if (message === 'NO_EXPENSE') {
      return NextResponse.json(
        { error: 'No pude interpretar eso como un gasto.', code: 'NOT_EXPENSE' },
        { status: 422 },
      );
    }
    console.error('[NLP expense] error:', error);
    const userError =
      message.includes('503') || message.includes('UNAVAILABLE')
        ? 'El servicio de IA está saturado. Probá de nuevo en unos segundos.'
        : message.includes('429') || message.includes('quota')
          ? 'Límite de uso de IA alcanzado. Probá más tarde.'
          : message.includes('GOOGLE_AI_API_KEY')
            ? 'IA no configurada en el servidor.'
            : 'No pude interpretar el gasto';
    return NextResponse.json({ error: userError, detail: message, code: 'NLP_FAILED' }, { status: 500 });
  }
}
