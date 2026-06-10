'use client';

import { useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { useT } from '@/lib/i18n/client';
import { Section } from './SettingsSections';
import { CalendarFeedPanel } from '@/components/CalendarFeedPanel';

type Props = {
  feedUrl: string;
};

export const CalendarFeedSection = ({ feedUrl }: Props) => {
  const { t } = useT();

  useEffect(() => {
    if (window.location.hash === '#google-calendar') {
      document.getElementById('google-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div id="google-calendar">
      <Section icon={<Calendar className="w-5 h-5" />} title={t.settings.calendar_feed_title} tone="sky">
        <CalendarFeedPanel feedUrl={feedUrl} variant="card" />
      </Section>
    </div>
  );
};
