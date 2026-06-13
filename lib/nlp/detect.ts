/** Detecta si el texto del command palette parece un gasto en lenguaje natural. */
const stripDiacritics = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');

export const looksLikeExpenseIntent = (query: string): boolean => {
  const s = query.trim();
  if (s.length < 4) return false;
  const hasAmount = /\d[\d.,]*/.test(s);
  if (!hasAmount) return false;
  const normalized = stripDiacritics(s);
  const hasVerb =
    /\b(gaste|gasto|pague|pago|compre|compra|spent|paid|pay|buy|bought)\b/i.test(normalized);
  const wordCount = s.split(/\s+/).length;
  return hasVerb || wordCount >= 4;
};

export const NLP_EXPENSE_STORAGE_KEY = 'kumo-nlp-expense';
