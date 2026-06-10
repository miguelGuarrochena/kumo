'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { useT } from '@/lib/i18n/client';
import {
  WORKSPACE_ICON_KEYS,
  WORKSPACE_COLORS,
  WORKSPACE_COLOR_DOT,
  getWorkspaceIcon,
  getWorkspaceColorClass,
} from '@/lib/workspaceTheme';

type EditWorkspaceSheetProps = {
  open: boolean;
  onClose: () => void;
  workspaceName: string;
  workspaceIcon: string;
  workspaceColor: string;
  onSave: (values: { name: string; icon: string; color: string }) => void;
};

export const EditWorkspaceSheet = ({
  open,
  onClose,
  workspaceName,
  workspaceIcon,
  workspaceColor,
  onSave,
}: EditWorkspaceSheetProps) => {
  const { t } = useT();
  const [name, setName] = useState(workspaceName);
  const [icon, setIcon] = useState(workspaceIcon);
  const [color, setColor] = useState(workspaceColor);

  useEffect(() => {
    if (!open) return;
    setName(workspaceName);
    setIcon(workspaceIcon);
    setColor(workspaceColor);
  }, [open, workspaceName, workspaceIcon, workspaceColor]);

  const PreviewIcon = getWorkspaceIcon(icon);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.common.edit}
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
            onClick={() => onSave({ name: name.trim() || workspaceName, icon, color })}
            disabled={!name.trim()}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
          >
            {t.common.save}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Preview */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
          <div className={`w-11 h-11 rounded-xl ${getWorkspaceColorClass(color)} grid place-items-center shrink-0`}>
            <PreviewIcon className="w-5 h-5" />
          </div>
          <p className="font-medium truncate">{name || workspaceName}</p>
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoFocus
            className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Color</label>
          <div className="grid grid-cols-9 gap-2">
            {WORKSPACE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`aspect-square rounded-lg ${WORKSPACE_COLOR_DOT[c]} grid place-items-center transition-all active:scale-90 ${
                  color === c
                    ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-offset-slate-800 dark:ring-white'
                    : ''
                }`}
                aria-label={c}
              >
                {color === c && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        {/* Icono */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Ícono</label>
          <div className="grid grid-cols-6 gap-2">
            {WORKSPACE_ICON_KEYS.map((iconKey) => {
              const Icon = getWorkspaceIcon(iconKey);
              const active = icon === iconKey;
              return (
                <button
                  key={iconKey}
                  type="button"
                  onClick={() => setIcon(iconKey)}
                  className={`p-2.5 rounded-xl border-2 transition-colors ${
                    active
                      ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                  } active:scale-95`}
                  aria-label={iconKey}
                >
                  <Icon className="w-4 h-4 mx-auto" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Sheet>
  );
};
