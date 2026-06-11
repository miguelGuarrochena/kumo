export type ExtractedExpense = {
  merchant: string | null;
  total: number | null;
  currency: string | null;
  date: string | null;
  dueDate?: string | null;
  description: string;
  categorySuggestion: string | null;
  items?: Array<{ name: string; price: number }> | null;
};

export interface OcrProvider {
  readonly id: string;
  extractFromImage(buffer: ArrayBuffer, mimeType: string): Promise<ExtractedExpense>;
}
