// Interface para providers de OCR. Hoy: Gemini. Futuro: Claude, GPT, etc.

export type ExtractedExpense = {
  merchant: string | null;
  total: number | null;
  currency: string | null; // ARS, USD, EUR, etc.
  date: string | null; // YYYY-MM-DD
  description: string;
  categorySuggestion: string | null;
  items?: Array<{ name: string; price: number }> | null;
};

export interface OcrProvider {
  readonly id: string;
  extractFromImage(buffer: ArrayBuffer, mimeType: string): Promise<ExtractedExpense>;
}
