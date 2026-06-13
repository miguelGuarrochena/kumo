/** Detecta si el texto del command palette parece un gasto en lenguaje natural. */
const stripDiacritics = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');

const EXPENSE_STOPWORDS = new Set([
  'de', 'en', 'el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'del', 'al',
  'the', 'at', 'on', 'for', 'in', 'a', 'an', 'to',
]);

/** Monto + lugar/comercio (ej. "5000 supermercado", "5000 de luz"). */
const hasMeaningfulContext = (s: string): boolean => {
  const meaningful = s.split(/\s+/).filter((w) => {
    const n = stripDiacritics(w).toLowerCase();
    if (EXPENSE_STOPWORDS.has(n)) return false;
    if (/^\d[\d.,]*$/.test(n)) return false;
    return n.length >= 2;
  });
  return meaningful.length >= 1;
};

export const looksExpenseIntent = (query: string): boolean => {
  const s = query.trim();
  if (s.length < 4) return false;
  const hasAmount = /\d[\d.,]*/.test(s);
  if (!hasAmount) return false;
  const normalized = stripDiacritics(s);
  const hasVerb =
    /\b(gaste|gasto|pague|pago|compre|compra|spent|paid|pay|buy|bought)\b/i.test(normalized);
  const wordCount = s.split(/\s+/).length;
  return hasVerb || wordCount >= 4 || hasMeaningfulContext(s);
};

export const NLP_EXPENSE_STORAGE_KEY = 'kumo-nlp-expense';
