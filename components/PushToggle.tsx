'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Bell, BellOff, Loader2, Send } from 'lucide-react';
import {
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
} from '@/lib/push/client';
import { useT } from '@/lib/i18n/client';

type Props = { vapidPublicKey: string };

export const PushToggle = ({ vapidPublicKey }: Props) => {
  const { t } = useT();
  const tp = t.push;
  const [mounted, setMounted] = useState(false);
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
    const isSupported = pushSupported();
    setSupported(isSupported);
    if (!isSupported) {
      setEnabled(false);
      return;
    }
    isSubscribed().then(setEnabled);
  }, []);

  // Durante SSR / antes de hidratar: nada. Evita mismatch.
  if (!mounted) return null;

  const enable = () => {
    if (!vapidPublicKey) {
      toast.error(tp.not_configured);
      return;
    }
    startTransition(async () => {
      try {
        const sub = await subscribeToPush(vapidPublicKey);
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub),
        });
        if (!res.ok) throw new Error('Server error');
        setEnabled(true);
        toast.success(tp.enabled);
      } catch (e) {
        const msg = e instanceof Error && e.message === 'Permission denied'
          ? tp.permission_denied
          : tp.enable_failed;
        toast.error(msg);
      }
    });
  };

  const disable = () => {
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
            method: 'DELETE',
          });
        }
        await unsubscribeFromPush();
        setEnabled(false);
        toast.success(tp.disabled);
      } catch {
        toast.error(tp.disable_failed);
      }
    });
  };

  const sendTest = () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/push/test', { method: 'POST' });
        const data = await res.json();
        if (res.ok) toast.success(tp.test_sent.replace('{n}', String(data.sent ?? 0)));
        else toast.error(data.error ?? tp.test_failed);
      } catch {
        toast.error(tp.test_failed);
      }
    });
  };

  if (!supported) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 text-sm text-slate-500 dark:text-slate-400 flex items-start gap-2">
        <BellOff className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{tp.unsupported}</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600 dark:text-slate-300">{tp.description}</p>
      <div className="flex flex-wrap gap-2">
        {enabled === null ? (
          <button disabled className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm text-slate-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t.common.loading}
          </button>
        ) : enabled ? (
          <>
            <button
              type="button"
              onClick={disable}
              disabled={pending}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
              {tp.disable}
            </button>
            <button
              type="button"
              onClick={sendTest}
              disabled={pending}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {tp.test}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={enable}
            disabled={pending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {tp.enable}
          </button>
        )}
      </div>
    </div>
  );
};
