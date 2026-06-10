'use client';

import { useState } from 'react';
import { Calendar, Copy, Check, ExternalLink, Share2, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n/client';
import { track } from '@/lib/analytics';
import {
  GOOGLE_CALENDAR_ADD_URL,
  copyFeedUrl,
  markCalendarFeedDone,
  toWebcalUrl,
} from '@/lib/calendar/feedUrls';

type Props = {
  feedUrl: string;
  variant?: 'card' | 'banner';
  onSubscribed?: () => void;
  onDismiss?: () => void;
};

export const CalendarFeedPanel = ({
  feedUrl,
  variant = 'card',
  onSubscribed,
  onDismiss,
}: Props) => {
  const { t } = useT();
  const s = t.settings;
  const [copied, setCopied] = useState(false);
  const [webcalCopied, setWebcalCopied] = useState(false);
  const [showSteps, setShowSteps] = useState(variant === 'card');
  const webcalUrl = toWebcalUrl(feedUrl);

  const onSubscribe = async () => {
    const ok = await copyFeedUrl(feedUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success(s.calendar_feed_toast_copied);
    } else {
      toast.error(s.calendar_feed_toast_copy_failed);
    }
    markCalendarFeedDone();
    track('calendar_feed_subscribe');
    onSubscribed?.();
    window.open(GOOGLE_CALENDAR_ADD_URL, '_blank', 'noopener,noreferrer');
  };

  const onCopyWebcal = async () => {
    const ok = await copyFeedUrl(webcalUrl);
    if (ok) {
      setWebcalCopied(true);
      setTimeout(() => setWebcalCopied(false), 2500);
      toast.success(s.calendar_feed_webcal_copied);
    } else {
      toast.error(s.calendar_feed_toast_copy_failed);
    }
  };

  const onCopyOnly = async () => {
    const ok = await copyFeedUrl(feedUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast.success(s.calendar_feed_copied);
    } else {
      toast.error(s.calendar_feed_toast_copy_failed);
    }
  };

  const onShare = async () => {
    if (!navigator.share) {
      await onCopyOnly();
      return;
    }
    try {
      await navigator.share({
        title: 'Kumo Calendar',
        text: s.calendar_feed_share_text,
        url: feedUrl,
      });
      markCalendarFeedDone();
      onSubscribed?.();
      track('calendar_feed_share');
    } catch {
      /* user cancelled */
    }
  };

  const steps = (
    <ol className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 list-decimal list-inside">
      <li>{s.calendar_feed_step1}</li>
      <li>{s.calendar_feed_step2}</li>
      <li>{s.calendar_feed_step3}</li>
    </ol>
  );

  const actions = (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onSubscribe}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl kumo-gradient text-white font-semibold text-sm shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
      >
        <Calendar className="w-4 h-4" />
        {s.calendar_feed_cta}
        <ExternalLink className="w-3.5 h-3.5 opacity-80" />
      </button>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCopyOnly}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-mint-500" /> : <Copy className="w-4 h-4" />}
          {copied ? s.calendar_feed_copied : s.calendar_feed_copy}
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            type="button"
            onClick={onShare}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            {s.calendar_feed_share}
          </button>
        )}
      </div>
    </div>
  );

  if (variant === 'banner') {
    return (
      <div className="kumo-card p-4 border-sky-200/60 dark:border-sky-500/30 bg-sky-50/40 dark:bg-sky-500/5 relative">
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/60"
            aria-label={s.calendar_feed_dismiss}
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-start gap-3 pr-8">
          <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 grid place-items-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="font-semibold text-sm">{s.calendar_feed_banner_title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {s.calendar_feed_banner_desc}
              </p>
            </div>
            {actions}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">{s.calendar_feed_desc}</p>
      {actions}
      <button
        type="button"
        onClick={() => setShowSteps((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSteps ? 'rotate-180' : ''}`} />
        {showSteps ? s.calendar_feed_hide_steps : s.calendar_feed_show_steps}
      </button>
      {showSteps && steps}
      <details className="group">
        <summary className="text-xs text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 list-none flex items-center gap-1">
          <span className="group-open:hidden">{s.calendar_feed_show_link}</span>
          <span className="hidden group-open:inline">{s.calendar_feed_hide_link}</span>
        </summary>
        <input
          type="text"
          readOnly
          value={feedUrl}
          className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-600 dark:text-slate-300"
          onFocus={(e) => e.target.select()}
        />
      </details>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 flex-1 min-w-[12rem]">
          {s.calendar_feed_ios_hint}
        </p>
        <button
          type="button"
          onClick={onCopyWebcal}
          className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline shrink-0"
        >
          {webcalCopied ? s.calendar_feed_copied : s.calendar_feed_copy_webcal}
        </button>
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500">{s.calendar_feed_note}</p>
    </div>
  );
};
