/**
 * Resize + recompress de una imagen del browser antes de subirla.
 * - Lado largo máximo: 1600px (suficiente para OCR de tickets, Gemini no necesita más).
 * - JPEG calidad 0.85 (bajada ~5x respecto a la original sin perder legibilidad).
 * - Usa OffscreenCanvas si está disponible (más rápido), fallback a Canvas tradicional.
 */
export const resizeImage = async (
  file: File,
  maxSide = 1600,
  quality = 0.85,
): Promise<Blob> => {
  if (typeof window === 'undefined') return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const ratio = Math.min(maxSide / bitmap.width, maxSide / bitmap.height, 1);
  if (ratio === 1) {
    bitmap.close?.();
    return file;
  }

  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);

  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      return await canvas.convertToBlob({ type: 'image/jpeg', quality });
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', quality);
    });
  } catch {
    bitmap.close?.();
    return file;
  }
};
