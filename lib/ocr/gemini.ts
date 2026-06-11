// Implementación con Google Gemini via REST API (sin SDK).

import type { ExtractedExpense, OcrProvider } from './types';

const PROMPT = `Analizá esta foto de un ticket, factura o recibo (incluye facturas de servicios: AySA, Edenor, Metrogas, Telecom, etc.) y extraé la información estructurada.

Instrucciones por campo:
- "merchant": nombre del comercio o proveedor (ej: Coto, AySA, Edenor, YPF).
- "total": monto total a pagar como número. Sin símbolos de moneda. En facturas de servicios usá "Total a pagar". Si hay recargo por mora, usá el monto sin recargo.
- "currency": código ISO de 3 letras. Usá uno de: ARS, USD, EUR, MXN, CLP, COP, BRL, GBP. Si ves "$" en Argentina asumí ARS.
- "date": fecha de emisión en YYYY-MM-DD. Si solo ves DD/MM/YYYY, convertila. Si no es clara, null.
- "dueDate": fecha de vencimiento en YYYY-MM-DD (muy común en facturas de servicios). Si solo ves DD/MM/YYYY, convertila. Si no hay, null.
- "description": descripción corta para el usuario, max 80 caracteres. Ej: "Factura AySA", "Supermercado Coto".
- "categorySuggestion": categoría sugerida. Ej: "Supermercado", "Servicios", "Combustible", "Farmacia", "Salud", "Otros".
- "items": array opcional con productos si es ticket de compra (max 20). En facturas de servicios, null.

Si la imagen NO es un ticket ni factura, devolvé description: "La imagen no parece ser un ticket" y total: null.
Si no podés determinar un campo, devolvé null.
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
    items: {
      type: 'array',
      nullable: true,
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
        },
        required: ['name', 'price'],
      },
    },
  },
  required: ['description'],
} as const;

const RETRYABLE = new Set([429, 500, 503]);

/** Convierte DD/MM/YYYY o DD-MM-YYYY a YYYY-MM-DD. */
export const normalizeOcrDate = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m?.[1] || !m[2] || !m[3]) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class GeminiOcrProvider implements OcrProvider {
  readonly id = 'gemini';
  private apiKey: string;
  private model: string;

  constructor() {
    const key = process.env.GOOGLE_AI_API_KEY;
    if (!key) {
      throw new Error('GOOGLE_AI_API_KEY no está configurada');
    }
    this.apiKey = key;
    // Lite: más rápido y estable para OCR (evita timeouts en Vercel Hobby ~10s).
    this.model = process.env.GOOGLE_AI_MODEL ?? 'gemini-2.5-flash-lite';
  }

  async extractFromImage(buffer: ArrayBuffer, mimeType: string): Promise<ExtractedExpense> {
    const base64 = Buffer.from(buffer).toString('base64');
    const safeMime = mimeType?.startsWith('image/') ? mimeType : 'image/jpeg';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: safeMime, data: base64 } },
            { text: PROMPT },
          ],
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
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const block = data?.candidates?.[0]?.finishReason;
        lastErr = block ? `Gemini bloqueó la respuesta (${block})` : 'Respuesta de Gemini vacía';
        if (attempt < 2) continue;
        throw new Error(lastErr);
      }

      let parsed: ExtractedExpense;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('Respuesta de Gemini no es JSON válido');
      }

      if (parsed.currency) {
        parsed.currency = parsed.currency.toUpperCase();
      }
      parsed.date = normalizeOcrDate(parsed.date);
      parsed.dueDate = normalizeOcrDate(parsed.dueDate);

      return parsed;
    }

    throw new Error(lastErr);
  }
}
