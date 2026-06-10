'use client';

import { useMemo } from 'react';
import { useT } from '@/lib/i18n/client';
import type { Holiday } from '@/lib/holidays';
import type { EventsByDate } from './types';
import { buildGrid, formatMonthLabel, localeTag, weekdayInitials } from './utils';

type YearViewProps = {
  year: number;
  eventsByDate: EventsByDate;
  holidayIndex: Map<string, Holiday>;
  today: string;
  onMonthClick: (month: number) => void;
  onDayClick: (dateStr: string) => void;
};

export const YearView = ({ year, eventsByDate, holidayIndex, today, onMonthClick, onDayClick }: YearViewProps) => {
  const { t } = useT();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-xl font-bold">{year}</h2>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {t.calendar.year_hint}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {months.map((m) => (
          <MiniMonth
            key={m}
            year={year}
            month={m}
            eventsByDate={eventsByDate}
            holidayIndex={holidayIndex}
            today={today}
            onMonthClick={() => onMonthClick(m)}
            onDayClick={onDayClick}
          />
        ))}
      </div>
    </div>
  );
};

type MiniMonthProps = {
  year: number;
  month: number;
  eventsByDate: EventsByDate;
  holidayIndex: Map<string, Holiday>;
  today: string;
  onMonthClick: () => void;
  onDayClick: (dateStr: string) => void;
};

const MiniMonth = ({ year, month, eventsByDate, holidayIndex, today, onMonthClick, onDayClick }: MiniMonthProps) => {
  const { locale } = useT();
  const tag = localeTag(locale);
  const grid = useMemo(() => buildGrid(year, month), [year, month]);
  const monthLabel = formatMonthLabel(year, month, tag, false);
  const weekdays = useMemo(() => weekdayInitials(tag), [tag]);

  return (
    <div className="kumo-card p-3">
      <button
        type="button"
        onClick={onMonthClick}
        className="text-sm font-semibold capitalize mb-2 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
      >
        {monthLabel}
      </button>
      <div className="grid grid-cols-7 gap-0.5 text-[8px] text-slate-400 dark:text-slate-500 uppercase mb-1">
        {weekdays.map((d, i) => (
          <div key={i} className="text-center font-semibold">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {grid.map((cell) => {
          const isCurrentMonth = cell.month === month;
          const isToday = cell.dateStr === today;
          const events = eventsByDate.get(cell.dateStr);
          const totalEvents = (events?.expenses.length ?? 0) + (events?.reminders.length ?? 0);
          const hasEvents = totalEvents > 0;
          const holiday = holidayIndex.get(cell.dateStr) ?? null;

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() => onDayClick(cell.dateStr)}
              className={`relative aspect-square text-[9px] grid place-items-center rounded transition-colors ${
                !isCurrentMonth
                  ? 'text-slate-300 dark:text-slate-700'
                  : isToday
                    ? 'bg-sky-500 text-white font-bold'
                    : hasEvents
                      ? 'text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-slate-700'
                      : holiday
                        ? 'text-amber-700 dark:text-amber-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title={holiday ? holiday.name : undefined}
            >
              {cell.day}
              {hasEvents && isCurrentMonth && !isToday && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-500" />
              )}
              {holiday && isCurrentMonth && !isToday && !hasEvents && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
