'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';
import { bootstrapWorkspace } from '@/app/(app)/settings/workspaceActions';
import { CloudLogo } from './CloudLogo';
import { useT } from '@/lib/i18n/client';

type Props = {
  userEmail?: string;
  userName?: string | null;
};

export const WorkspaceSetup = ({ userEmail, userName }: Props) => {
  const { t } = useT();
  const [name, setName] = useState('');
  const [pending, startTransition] = useTransition();

  const greeting = userName?.split(' ')[0] ?? userEmail?.split('@')[0] ?? '';

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await bootstrapWorkspace(name.trim() || 'Mi espacio');
      if (result.ok) {
        toast.success('Espacio creado');
        // Hard navigation para garantizar que el layout (server) se rehidrate
        // con el nuevo workspace en lugar de quedarse en el setup screen.
        window.location.href = '/dashboard';
      } else {
        toast.error(result.error ?? 'No se pudo crear el espacio');
      }
    });
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="kumo-card p-6 sm:p-8 max-w-md w-full space-y-5">
        <div className="flex items-center gap-3">
          <CloudLogo className="w-10 h-10" />
          <div>
            <h1 className="font-bold text-xl kumo-gradient-text">Kumo</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {greeting ? `¡Hola ${greeting}! 👋` : '¡Hola! 👋'}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-500" />
            Creá tu primer espacio
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Un <strong>espacio</strong> es donde viven tus gastos, recordatorios y compras.
            Podés tener uno personal y, si querés, compartir uno con tu pareja o familia más
            adelante.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Nombre del espacio
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mi espacio, Casa, Familia..."
              maxLength={60}
              autoFocus
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
              Si lo dejás vacío, se llamará &quot;Mi espacio&quot;.
            </p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl kumo-gradient text-white font-medium hover:opacity-90 disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando…
              </>
            ) : (
              <>{t.workspace.create_workspace}</>
            )}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
            Vas a ser el dueño y admin. Después podés invitar a otras personas desde Configuración.
          </p>
        </div>
      </div>
    </div>
  );
};
