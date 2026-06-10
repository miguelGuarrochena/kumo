'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useT } from '@/lib/i18n/client';

type DeleteWorkspaceSheetProps = {
  open: boolean;
  onClose: () => void;
  workspaceName: string;
  isLastSpace: boolean;
  onConfirm: () => void;
};

export const DeleteWorkspaceSheet = ({
  open,
  onClose,
  workspaceName,
  isLastSpace,
  onConfirm,
}: DeleteWorkspaceSheetProps) => {
  const { t } = useT();
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (!open) setConfirmText('');
  }, [open]);

  const matches = confirmText === workspaceName;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.workspace.delete_title}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!matches}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t.workspace.delete}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/40">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700 dark:text-rose-200">
            {t.workspace.delete_confirm.replace('{name}', workspaceName)}
          </p>
        </div>
        {isLastSpace && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
            Es tu único espacio. Si lo borrás vas a tener que crear uno nuevo.
          </p>
        )}
        <div>
          <label className="block text-sm font-medium mb-1.5">
            {t.workspace.delete_confirm_text}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={workspaceName}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400 text-base"
            autoFocus
          />
        </div>
      </div>
    </Sheet>
  );
};
