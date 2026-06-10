'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Loader2, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type ProfileSectionProps = {
  initialName: string;
  userEmail: string;
};

export const ProfileSection = ({ initialName, userEmail }: ProfileSectionProps) => {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const firstRender = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

    const trimmed = name.trim();
    if (trimmed === initialName) {
      setStatus('idle');
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setStatus('saving');
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed || null },
      });
      if (error) {
        setStatus('error');
        toast.error('No se pudo guardar');
        return;
      }
      setStatus('saved');
      savedTimerRef.current = setTimeout(() => setStatus('idle'), 1800);
      router.refresh();
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const initial = (name.trim() || userEmail).charAt(0).toUpperCase();

  return (
    <div className="kumo-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 grid place-items-center">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold">Tu perfil</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Así te van a ver en el dashboard y los miembros de tu espacio.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full kumo-gradient text-white grid place-items-center text-lg font-medium shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <label htmlFor="profile-name" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
            Nombre que ven los demás
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            maxLength={60}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
          />
        </div>
        <div className="w-16 text-right shrink-0">
          {status === 'saving' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              ...
            </span>
          )}
          {status === 'saved' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-mint-500 font-medium">
              <Check className="w-3 h-3" />
              ✓
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
