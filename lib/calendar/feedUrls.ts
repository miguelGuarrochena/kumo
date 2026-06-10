export const CALENDAR_FEED_DONE_KEY = 'kumo_calendar_feed_done';
export const CALENDAR_BANNER_DISMISS_KEY = 'kumo_calendar_banner_dismissed';

export const GOOGLE_CALENDAR_ADD_URL =
  'https://calendar.google.com/calendar/u/0/r/settings/addbyurl';

export const toWebcalUrl = (httpsUrl: string): string =>
  httpsUrl.replace(/^https:\/\//i, 'webcal://');

export const copyFeedUrl = async (url: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
};

export const markCalendarFeedDone = (): void => {
  try {
    localStorage.setItem(CALENDAR_FEED_DONE_KEY, '1');
  } catch {
    /* ignore */
  }
};

export const isCalendarFeedDone = (): boolean => {
  try {
    return localStorage.getItem(CALENDAR_FEED_DONE_KEY) === '1';
  } catch {
    return false;
  }
};

export const isCalendarBannerDismissed = (): boolean => {
  try {
    return localStorage.getItem(CALENDAR_BANNER_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

export const dismissCalendarBanner = (): void => {
  try {
    localStorage.setItem(CALENDAR_BANNER_DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
};
