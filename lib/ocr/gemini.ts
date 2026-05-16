// Implementación con Google Gemini 2.5 Flash via REST API (sin SDK).
// Free tier: 1.500 requests/día. Schema JSON enforced server-side.

import type { ExtractedExpense, OcrProvider } from './types';

const PROMPT = `Analizá esta foto de un ticket, factura o recibo y extraé la información estructurada.

Instrucciones por campo:
- "merchant": nombre del comercio (ej: Coto, Disco, McDonalds, YPF, Mercado Libre).
- "total": monto total a pagar como número. Sin símbolos de moneda. Si hay subtotal y total con propina, usá el total final.
- "currency": código ISO de 3 letras inferido del símbolo o país. Usá uno de: ARS, USD, EUR, MXN, CLP, COP, BRL, GBP. Si ves "$" en Argentina asumí ARS.
- "date": fecha del ticket en formato YYYY-MM-DD. Si no es clara, devolvé null.
- "description": descripción corta para el usuario, max 80 caracteres. Ej: "Supermercado Coto", "Almuerzo en McDonalds", "Nafta YPF".
- "categorySuggestion": categoría sugerida — una sola palabra o frase corta. Ej: "Supermercado", "Restaurante", "Combustible", "Farmacia", "Servicios", "Transporte", "Salud", "Entretenimiento", "Otros".
- "items": array opcional con productos individuales si están claros (max 20). Si no es claro, devolvé null.

Si la imagen NO es un ticket o factura, devolvé description: "La imagen no parece ser un ticket" y total: null.
Si no podés determinar un campo con confianza, devolvé null para ese campo.
Responde SOLO con JSON válido.`;

const SCHEMA = {
  type: 'object',
  properties: {
    merchant: { type: 'string', nullable: true },
    total: { type: 'number', nullable: true },
    currency: { type: 'string', nullable: true },
    date: { type: 'string', nullable: true },
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

export class GeminiOcrProvider implements OcrProvider {
  readonly id = 'gemini';
  private apiKey: string;
  private model: string;

  constructor() {
    const key = process.env.GOOGLE_AI_API_KEY;
    if (!key) {
      throw new Error('GOOGLE_AI_API_KEY no está configurada en .env.local');
    }
    this.apiKey = key;
    this.model = process.env.GOOGLE_AI_MODEL ?? 'gemini-2.5-flash';
  }

  async extractFromImage(buffer: ArrayBuffer, mimeType: string): Promise<ExtractedExpense> {
    const base64 = Buffer.from(buffer).toString('base64');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mimeType, data: base64 } },
              { text: PROMPT },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          response_schema: SCHEMA,
          temperature: 0.1, // determinista para que extraiga lo mismo cada vez
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API ${response.status}: ${err.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Respuesta de Gemini vacía');
    }

    let parsed: ExtractedExpense;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Respuesta de Gemini no es JSON válido');
    }

    // Normalizar
    if (parsed.currency) {
      parsed.currency = parsed.currency.toUpperCase();
    }
    if (parsed.date && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
      parsed.date = null;
    }

    return parsed;
  }
}
