'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Plus, Shield, Eye, X } from 'lucide-react';
import { createWorkspace, switchWorkspace } from '@/app/(app)/settings/workspaceActions';
import type { WorkspaceRole } from '@/lib/supabase/database.types';
import { useT } from '@/lib/i18n/client';

export type WorkspaceOption = {
  id: string;
  name: string;
  role: WorkspaceRole;
};

type Props = {
  workspaces: WorkspaceOption[];
  activeId: string;
};

export const WorkspaceSwitcher = ({ workspaces, activeId }: Props) => {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [, startTransition] = useTransition();

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  if (!active) return null;

  const onSwitch = (id: string) => {
    if (id === activeId) { setOpen(false); return; }
    setOpen(false);
    startTransition(async () => {
      const result = await switchWorkspace(id);
      if (result.ok) {
        toast.success(t.workspace.switched);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const fd = new FormData();
    fd.set('name', newName.trim());
    startTransition(async () => {
      const result = await createWorkspace({ ok: false }, fd);
      if (result.ok) {
        toast.success('✓');
        setCreating(false);
        setNewName('');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className={`w-7 h-7 rounded-md grid place-items-center text-xs font-bold shrink-0 ${
          active.role === 'admin'
            ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        }`}>
          {active.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{active.name}</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {active.role === 'admin' ? t.workspace.role_admin : t.workspace.role_reader}
          </p>
        </div>
        <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setOpen(false); setCreating(false); }}
            aria-hidden="true"
          />
          <div
            role="listbox"
            className="absolute z-50 top-full mt-1 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="py-1 max-h-64 overflow-y-auto">
              {workspaces.map((ws) => {
                const isActive = ws.id === activeId;
                return (
                  <button
                    key={ws.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => onSwitch(ws.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md grid place-items-center text-[10px] font-bold shrink-0 ${
                      ws.role === 'admin'
                        ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 truncate text-left font-medium">{ws.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 shrink-0">
                      {ws.role === 'admin' ? <Shield className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </span>
                    {isActive && <Check className="w-4 h-4 text-sky-500 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700/70">
              {creating ? (
                <form onSubmit={onCreate} className="p-2 flex gap-1.5">
                  <input
                    autoFocus
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t.workspace.create_workspace_placeholder}
                    maxLength={60}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    type="button"
                    onClick={() => { setCreating(false); setNewName(''); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                    aria-label={t.common.cancel}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!newName.trim()}
                    className="px-3 py-1.5 rounded-lg kumo-gradient text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {t.common.new}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="w-6 h-6 rounded-md grid place-items-center bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium">{t.workspace.create_workspace}</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
