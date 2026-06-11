import { WA_MAX_RECIPIENTS } from '@/lib/notifications/waLimitsClient';

export const toggleNotifyContactId = (
  prev: string[],
  id: string,
  opts?: { max?: number; enforceMax?: boolean; onBlocked?: () => void },
): string[] => {
  if (prev.includes(id)) return prev.filter((c) => c !== id);
  const max = opts?.max ?? WA_MAX_RECIPIENTS;
  if (opts?.enforceMax && prev.length >= max) {
    opts.onBlocked?.();
    return prev;
  }
  return [...prev, id];
};
