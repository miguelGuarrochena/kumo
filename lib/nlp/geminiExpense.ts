import { normalizeOcrDate } from '@/lib/ocr/gemini';
import type { ExtractedExpense } from '@/lib/ocr/types';

const PROMPT = `Interpretá el mensaje del usuario como un gasto personal y extraé datos estructurados.

Ejemplos:
- "gasté 5000 en el super" → total 5000, currency ARS, description "Supermercado", categorySuggestion "Supermercado"
- "pagué 12000 de luz ayer" → total 12000, ARS, description "Luz", categorySuggestion "Servicios", date ayer
- "paid $50 uber" → total 50, USD, description "Uber", categorySuggestion "Transporte"

Campos:
- "merchant": comercio si se menciona, o null
- "total": monto numérico sin símbolos, o null
- "currency": ARS, USD, EUR, MXN, CLP, COP, BRL, GBP. Si hay "$" sin contexto, ARS
- "date": YYYY-MM-DD. "hoy" = fecha de hoy, "ayer" = ayer. null si no se menciona
- "dueDate": YYYY-MM-DD solo si hay vencimiento explícito, si no null
- "description": resumen corto max 80 caracteres para mostrar al usuario
- "categorySuggestion": Supermercado, Servicios, Transporte, Salud, Alquiler, Otros, etc.

Si el texto NO describe un gasto (es búsqueda, pregunta, recordatorio, etc.), devolvé description: "NO_EXPENSE" y total: null.
Responde SOLO con JSON válido.`;

const SCHEMA = {
  type: 'object',
  properties: {
    merchant: { type: 'string', nullable: true },
    total: { type: 'number', nullable: true },
    currency: { type: 'string', nullable: true },
    date: { type: 'string', nullable: true },
    dueDate: { type: 'string', nullable: true },
    description: { type: 'string' },
    categorySuggestion: { type: 'string', nullable: true },
  },
  required: ['description'],
} as const;

const RETRYABLE = new Set([429, 500, 503]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const parseExpenseFromText = async (text: string): Promise<ExtractedExpense> => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY no está configurada');

  const model = process.env.GOOGLE_AI_MODEL ?? 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const today = new Date().toISOString().slice(0, 10);

  const body = JSON.stringify({
    contents: [
      {
        parts: [{ text: `${PROMPT}\n\nFecha de hoy: ${today}\n\nMensaje del usuario:\n${text.trim()}` }],
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      response_schema: SCHEMA,
      temperature: 0.1,
    },
  });

  let lastErr = 'Error desconocido de Gemini';
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(800 * attempt);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok) {
      const err = await response.text();
      lastErr = `Gemini API ${response.status}: ${err.slice(0, 300)}`;
      if (RETRYABLE.has(response.status) && attempt < 2) continue;
      throw new Error(lastErr);
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      lastErr = 'Respuesta de Gemini vacía';
      if (attempt < 2) continue;
      throw new Error(lastErr);
    }

    let parsed: ExtractedExpense;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Respuesta de Gemini no es JSON válido');
    }

    if (parsed.description === 'NO_EXPENSE' || parsed.total == null || parsed.total <= 0) {
      throw new Error('NO_EXPENSE');
    }

    if (parsed.currency) parsed.currency = parsed.currency.toUpperCase();
    parsed.date = normalizeOcrDate(parsed.date);
    parsed.dueDate = normalizeOcrDate(parsed.dueDate);
    if (!parsed.description?.trim()) {
      parsed.description = parsed.merchant ?? text.trim().slice(0, 80);
    }

    return parsed;
  }

  throw new Error(lastErr);
};
