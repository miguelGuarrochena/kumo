import type { OcrProvider } from './types';
import { GeminiOcrProvider } from './gemini';

let _provider: OcrProvider | null = null;

export function getOcrProvider(): OcrProvider {
  if (_provider) return _provider;

  const id = process.env.OCR_PROVIDER ?? 'gemini';

  switch (id) {
    case 'gemini':
      _provider = new GeminiOcrProvider();
      break;
    default:
      throw new Error(`Unknown OCR_PROVIDER: ${id}`);
  }

  return _provider;
}

export type { OcrProvider, ExtractedExpense } from './types';
