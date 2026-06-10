'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, Copy, Check, ExternalLink, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet } from '@/components/Sheet';
import { useT } from '@/lib/i18n/client';
import { GOOGLE_CALENDAR_ADD_URL, copyFeedUrl } from '@/lib/calendar/feedUrls';

type Props = {
  open: boolean;
  feedUrl: string;
  onClose: () => void;
  onOpenedGoogle?: () => void;
};

export const CalendarFeedGuideSheet = ({
  open,
  feedUrl,
  onClose,
  onOpenedGoogle,
}: Props) => {
  const { t } = useT();
  const s = t.settings;
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 150);
    return () => clearTimeout(timer);
  }, [open, feedUrl]);

  const onCopy = async () => {
    const ok = await copyFeedUrl(feedUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success(s.calendar_feed_guide_copied);
    } else {
      inputRef.current?.focus();
      inputRef.current?.select();
      toast.error(s.calendar_feed_toast_copy_failed);
    }
  };

  const onOpenGoogle = () => {
    window.open(GOOGLE_CALENDAR_ADD_URL, '_blank', 'noopener,noreferrer');
    onOpenedGoogle?.();
  };

  return (
    <Sheet open={open} onClose={onClose} title={s.calendar_feed_guide_title}>
      <div className="space-y-4 pb-2">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {s.calendar_feed_guide_intro}
        </p>

        <div className="rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200/60 dark:border-sky-500/30 p-3 space-y-2">
          <p className="text-xs font-medium text-sky-800 dark:text-sky-200">
            {s.calendar_feed_guide_link_label}
          </p>
          <input
            ref={inputRef}
            type="text"
            readOnly
            value={feedUrl}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-700 dark:text-slate-200"
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={onCopy}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-white dark:hover:bg-slate-800 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-mint-500" /> : <Copy className="w-4 h-4" />}
            {copied ? s.calendar_feed_copied : s.calendar_feed_copy}
          </button>
        </div>

        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full kumo-gradient text-white text-xs font-bold grid place-items-center shrink-0">1</span>
            <span className="text-slate-600 dark:text-slate-300 pt-0.5">{s.calendar_feed_guide_step1}</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full kumo-gradient text-white text-xs font-bold grid place-items-center shrink-0">2</span>
            <span className="text-slate-600 dark:text-slate-300 pt-0.5">{s.calendar_feed_guide_step2}</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 rounded-full kumo-gradient text-white text-xs font-bold grid place-items-center shrink-0">3</span>
            <span className="text-slate-600 dark:text-slate-300 pt-0.5">{s.calendar_feed_guide_step3}</span>
          </li>
        </ol>

        <button
          type="button"
          onClick={onOpenGoogle}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl kumo-gradient text-white font-semibold text-sm shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <Calendar className="w-4 h-4" />
          {s.calendar_feed_open_google}
          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
        </button>

        <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ClipboardPaste className="w-4 h-4 shrink-0 mt-0.5" />
          {s.calendar_feed_guide_paste_hint}
        </p>
      </div>
    </Sheet>
  );
};
