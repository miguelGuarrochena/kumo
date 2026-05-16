// Factory de OCR providers. Switcheable por env var OCR_PROVIDER.
// Hoy: solo Gemini. Más adelante podés agregar Claude, OpenAI, etc.

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
    // case 'claude':
    //   _provider = new ClaudeOcrProvider();
    //   break;
    default:
      throw new Error(`Unknown OCR_PROVIDER: ${id}`);
  }

  return _provider;
}

export type { OcrProvider, ExtractedExpense } from './types';
