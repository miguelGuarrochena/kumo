'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n/client';
import { Section } from './SettingsSections';
import { CalendarFeedPanel } from '@/components/CalendarFeedPanel';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { rotateCalendarFeed } from './calendarFeedActions';
import { track } from '@/lib/analytics';

type Props = {
  feedUrl: string;
  feedVersion: number;
};

export const CalendarFeedSection = ({ feedUrl, feedVersion }: Props) => {
  const router = useRouter();
  const { t } = useT();
  const s = t.settings;
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (window.location.hash === '#google-calendar') {
      document.getElementById('google-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const onRotateConfirm = async () => {
    setPending(true);
    try {
      const result = await rotateCalendarFeed();
      if (result.ok) {
        toast.success(s.calendar_feed_rotate_toast);
        track('calendar_feed_rotated');
        router.refresh();
      } else {
        toast.error(result.error ?? t.common.error);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div id="google-calendar">
      <Section icon={<Calendar className="w-5 h-5" />} title={s.calendar_feed_title} tone="sky">
        <CalendarFeedPanel feedUrl={feedUrl} variant="card" />
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            {s.calendar_feed_rotate_desc}
          </p>
          <button
            type="button"
            onClick={() => setConfirmRotate(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${pending ? 'animate-spin' : ''}`} />
            {s.calendar_feed_rotate_cta}
          </button>
          {feedVersion > 0 && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              {s.calendar_feed_version.replace('{n}', String(feedVersion))}
            </p>
          )}
        </div>
      </Section>

      <ConfirmDialog
        open={confirmRotate}
        title={s.calendar_feed_rotate_confirm_title}
        description={s.calendar_feed_rotate_confirm_desc}
        confirmLabel={s.calendar_feed_rotate_cta}
        destructive={false}
        onConfirm={onRotateConfirm}
        onClose={() => setConfirmRotate(false)}
      />
    </div>
  );
};
