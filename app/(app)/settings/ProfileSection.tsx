'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Loader2, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateSelfMpInfo } from './contactsActions';
import { useT } from '@/lib/i18n/client';

type ProfileSectionProps = {
  initialName: string;
  userEmail: string;
  selfContactId?: string | null;
  initialMpAlias?: string | null;
  initialMpPaymentLink?: string | null;
};

export const ProfileSection = ({
  initialName,
  userEmail,
  selfContactId,
  initialMpAlias,
  initialMpPaymentLink,
}: ProfileSectionProps) => {
  const router = useRouter();
  const { t } = useT();
  const [, startMpTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [mpAlias, setMpAlias] = useState(initialMpAlias ?? '');
  const [mpPaymentLink, setMpPaymentLink] = useState(initialMpPaymentLink ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [mpStatus, setMpStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const firstRender = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mpDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mpSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMpAlias(initialMpAlias ?? '');
    setMpPaymentLink(initialMpPaymentLink ?? '');
  }, [initialMpAlias, initialMpPaymentLink]);

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

  useEffect(() => {
    if (!selfContactId) return;
    if (mpDebounceRef.current) clearTimeout(mpDebounceRef.current);
    if (mpSavedTimerRef.current) clearTimeout(mpSavedTimerRef.current);

    const alias = mpAlias.trim() || null;
    const link = mpPaymentLink.trim() || null;
    const initialAlias = initialMpAlias?.trim() || null;
    const initialLink = initialMpPaymentLink?.trim() || null;
    if (alias === initialAlias && link === initialLink) {
      setMpStatus('idle');
      return;
    }

    mpDebounceRef.current = setTimeout(() => {
      startMpTransition(async () => {
        setMpStatus('saving');
        const result = await updateSelfMpInfo({
          contactId: selfContactId,
          mp_alias: alias,
          mp_payment_link: link,
        });
        if (!result.ok) {
          setMpStatus('error');
          toast.error(result.error ?? t.common.error);
          return;
        }
        setMpStatus('saved');
        mpSavedTimerRef.current = setTimeout(() => setMpStatus('idle'), 1800);
        router.refresh();
      });
    }, 700);

    return () => {
      if (mpDebounceRef.current) clearTimeout(mpDebounceRef.current);
    };
  }, [mpAlias, mpPaymentLink, selfContactId, initialMpAlias, initialMpPaymentLink, router, t.common.error]);

  const initial = (name.trim() || userEmail).charAt(0).toUpperCase();

  return (
    <div className="kumo-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 grid place-items-center">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold">{t.settings.profile_title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.settings.profile_subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full kumo-gradient text-white grid place-items-center text-lg font-medium shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <label htmlFor="profile-name" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
            {t.settings.profile_name_label}
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.settings.profile_name_placeholder}
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

      {selfContactId && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
          <div>
            <p className="text-sm font-medium">{t.settings.profile_mp_title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.settings.profile_mp_desc}
            </p>
          </div>
          <div>
            <label htmlFor="profile-mp-alias" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              {t.settings.profile_mp_alias}
            </label>
            <input
              id="profile-mp-alias"
              type="text"
              value={mpAlias}
              onChange={(e) => setMpAlias(e.target.value)}
              placeholder={t.settings.profile_mp_alias_placeholder}
              maxLength={80}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            />
          </div>
          <div>
            <label htmlFor="profile-mp-link" className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              {t.settings.profile_mp_link}
            </label>
            <input
              id="profile-mp-link"
              type="url"
              value={mpPaymentLink}
              onChange={(e) => setMpPaymentLink(e.target.value)}
              placeholder="https://mpago.la/..."
              maxLength={200}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            />
          </div>
          <div className="min-h-[1.25rem] text-right">
            {mpStatus === 'saving' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t.common.saving}
              </span>
            )}
            {mpStatus === 'saved' && (
              <span className="inline-flex items-center gap-1 text-[11px] text-mint-500 font-medium">
                <Check className="w-3 h-3" />
                {t.common.saved}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
