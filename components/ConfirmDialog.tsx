'use client';

import { AlertTriangle } from 'lucide-react';
import { Sheet } from './Sheet';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
};

export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Borrar',
  destructive = true,
}: Props) => (
  <Sheet open={open} onClose={onClose} title={title}>
    <div className="flex flex-col items-center text-center pt-2 pb-4">
      <div
        className={`w-12 h-12 rounded-full grid place-items-center mb-3 ${
          destructive ? 'bg-rose-100 text-rose-500' : 'bg-sky-100 text-sky-700'
        }`}
      >
        <AlertTriangle className="w-6 h-6" />
      </div>
      <p className="text-slate-600 text-sm">{description}</p>
    </div>
    <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={async () => {
          await onConfirm();
          onClose();
        }}
        className={`px-4 py-2.5 rounded-xl text-sm font-medium text-white ${
          destructive ? 'bg-rose-500 hover:bg-rose-600' : 'kumo-gradient hover:opacity-90'
        }`}
      >
        {confirmLabel}
      </button>
    </div>
  </Sheet>
);
