'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useT } from '@/lib/i18n/client';
import { deleteAccount } from './workspaceActions';

export const DeleteAccountSection = ({ userEmail }: { userEmail: string }) => {
  const { t } = useT();
  const s = t.settings;
  const c = t.common;
  // Palabra de confirmación: ELIMINAR / DELETE según locale. Lo leemos del
  // diccionario para que el placeholder y validación coincidan con el idioma.
  const CONFIRM_WORD = s.delete_account_word;

  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    if (confirmText !== CONFIRM_WORD) return;
    startTransition(async () => {
      const result = await deleteAccount();
      if (result.ok) {
        toast.success(s.delete_account_done);
        window.location.href = '/';
      } else {
        toast.error(result.error ?? s.delete_account_fail);
      }
    });
  };

  return (
    <>
      <div className="kumo-card p-5 border-rose-100 dark:border-rose-900/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 grid place-items-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">{s.delete_account_title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {s.delete_account_desc}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setConfirmText(''); setOpen(true); }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          {s.delete_account_cta}
        </button>
      </div>

      <Sheet
        open={open}
        onClose={() => { setOpen(false); setConfirmText(''); }}
        title={s.delete_account_title}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setOpen(false); setConfirmText(''); }}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              {c.cancel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmText !== CONFIRM_WORD || pending}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {pending ? s.delete_account_deleting : c.delete}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/40">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-sm text-rose-700 dark:text-rose-200 space-y-1.5">
              <p className="font-medium">{s.delete_account_will_lose_title}</p>
              <ul className="list-disc pl-4 space-y-0.5 text-rose-600/90 dark:text-rose-200/90">
                <li>{s.delete_account_lose_spaces}</li>
                <li>{s.delete_account_lose_shared}</li>
                <li>
                  {s.delete_account_lose_user.split('{email}').map((part, i, arr) =>
                    i < arr.length - 1
                      ? [part, <span key={i} className="font-mono text-xs">{userEmail}</span>]
                      : part,
                  )}
                </li>
              </ul>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {s.delete_account_confirm_label.split('{word}').map((part, i, arr) =>
                i < arr.length - 1
                  ? [part, <span key={i} className="font-mono font-semibold">{CONFIRM_WORD}</span>]
                  : part,
              )}
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400 text-base font-mono"
              autoFocus
            />
          </div>
        </div>
      </Sheet>
    </>
  );
};
