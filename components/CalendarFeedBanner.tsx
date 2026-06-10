'use client';

import { useEffect, useState } from 'react';
import { CalendarFeedPanel } from './CalendarFeedPanel';
import {
  dismissCalendarBanner,
  isCalendarBannerDismissed,
  isCalendarFeedDone,
} from '@/lib/calendar/feedUrls';

type Props = {
  feedUrl: string;
};

export const CalendarFeedBanner = ({ feedUrl }: Props) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isCalendarFeedDone() && !isCalendarBannerDismissed());
  }, []);

  if (!visible) return null;

  return (
    <CalendarFeedPanel
      feedUrl={feedUrl}
      variant="banner"
      onSubscribed={() => setVisible(false)}
      onDismiss={() => {
        dismissCalendarBanner();
        setVisible(false);
      }}
    />
  );
};
