'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { COUNTRY_LABEL, type Country, type Holiday } from '@/lib/holidays';
import { useT } from '@/lib/i18n/client';
import { categoryDisplayName } from '@/lib/categoryLabels';
import type { EventsByDate } from './types';
import { COLOR_DOT, TYPE_META } from './constants';
import { buildGrid, formatMonthLabel, localeTag, weekdayInitials } from './utils';
import { DayLabel, LegendDot } from './ui';

type MonthViewProps = {
  year: number;
  month: number;
  eventsByDate: EventsByDate;
  holidayIndex: Map<string, Holiday>;
  today: string;
  country: Country;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onDayClick: (dateStr: string) => void;
};

export const MonthView = ({
  year,
  month,
  eventsByDate,
  holidayIndex,
  today,
  country,
  onPrev,
  onNext,
  onToday,
  onDayClick,
}: MonthViewProps) => {
  const { t, locale } = useT();
  const tag = localeTag(locale);
  const grid = useMemo(() => buildGrid(year, month), [year, month]);
  const monthLabel = formatMonthLabel(year, month, tag, true);
  const weekdays = useMemo(() => weekdayInitials(tag), [tag]);

  return (
    <div className="kumo-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onPrev}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
          aria-label={t.calendar.prev_month}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <h2 className="font-semibold capitalize">{monthLabel}</h2>
          <button
            onClick={onToday}
            className="text-[11px] px-2 py-1 rounded-md text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 dark:text-slate-400 dark:hover:text-sky-400"
          >
            {t.calendar.today}
          </button>
        </div>
        <button
          onClick={onNext}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
          aria-label={t.calendar.next_month}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {weekdays.map((d, i) => (
          <div
            key={i}
            className="text-center text-[10px] sm:text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell) => {
          const events = eventsByDate.get(cell.dateStr);
          const isCurrentMonth = cell.month === month;
          const isToday = cell.dateStr === today;
          const totalEvents = (events?.expenses.length ?? 0) + (events?.reminders.length ?? 0);
          const hasEvents = totalEvents > 0;
          const holiday = holidayIndex.get(cell.dateStr) ?? null;

          return (
            <button
              key={cell.dateStr}
              onClick={() => onDayClick(cell.dateStr)}
              className={`relative min-h-[3rem] sm:min-h-[6rem] p-1 sm:p-1.5 rounded-lg text-left transition-colors flex flex-col overflow-hidden ${
                !isCurrentMonth
                  ? 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  : isToday
                    ? 'bg-sky-50 dark:bg-sky-900/30 ring-2 ring-sky-400 dark:ring-sky-500'
                    : holiday && isCurrentMonth
                      ? 'bg-amber-50 dark:bg-amber-900/15 hover:bg-amber-100 dark:hover:bg-amber-900/25'
                      : hasEvents
                        ? 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
              title={holiday ? holiday.name : undefined}
            >
              <span className={`text-xs sm:text-sm font-semibold flex items-center gap-1 ${
                isToday
                  ? 'text-sky-700 dark:text-sky-300'
                  : holiday && isCurrentMonth
                    ? 'text-amber-700 dark:text-amber-400'
                    : ''
              }`}>
                {cell.day}
                {holiday && isCurrentMonth && (
                  <span className="w-1 h-1 rounded-full bg-amber-500" aria-label={t.calendar.holiday} />
                )}
              </span>
              {holiday && isCurrentMonth && (
                <span className="hidden sm:block text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold leading-tight truncate">
                  {holiday.name}
                </span>
              )}

              {events && (
                <>
                  {/* MOBILE: solo dots, sin texto */}
                  <div className="sm:hidden mt-auto flex flex-wrap gap-0.5">
                    {events.reminders.slice(0, 3).map((r) => (
                      <span
                        key={r.id}
                        className={`w-1.5 h-1.5 rounded-full ${TYPE_META[r.reminder_type].dot}`}
                      />
                    ))}
                    {events.expenses.slice(0, 3).map((e) => {
                      const cls = e.due_date && !e.paid
                        ? 'bg-peach-400'
                        : e.categories
                          ? COLOR_DOT[e.categories.color] ?? 'bg-slate-400'
                          : 'bg-slate-400';
                      return <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${cls}`} />;
                    })}
                    {totalEvents > 6 && (
                      <span className="text-[8px] text-slate-500 dark:text-slate-400">
                        +{totalEvents - 6}
                      </span>
                    )}
                  </div>

                  {/* DESKTOP: lista vertical de hasta 3 eventos con nombres */}
                  <div className="hidden sm:flex flex-col gap-0.5 mt-1 w-full">
                    {events.reminders.slice(0, 3).map((r) => (
                      <DayLabel
                        key={r.id}
                        dotCls={TYPE_META[r.reminder_type].dot}
                        text={r.title}
                      />
                    ))}
                    {events.expenses.slice(0, Math.max(0, 3 - events.reminders.length)).map((e) => {
                      const cls = e.due_date && !e.paid
                        ? 'bg-peach-400'
                        : e.categories
                          ? COLOR_DOT[e.categories.color] ?? 'bg-slate-400'
                          : 'bg-slate-400';
                      return (
                        <DayLabel
                          key={e.id}
                          dotCls={cls}
                          text={e.description || (e.categories?.name ? categoryDisplayName(e.categories.name, t) : null) || t.expenses.default_name}
                        />
                      );
                    })}
                    {totalEvents > 3 && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium px-1">
                        {t.calendar.more_count.replace('{n}', String(totalEvents - 3))}
                      </span>
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap gap-3 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
        <LegendDot color="bg-peach-400" label={t.calendar.legend_due} />
        <LegendDot color="bg-rose-500"  label={t.calendar.legend_medical} />
        <LegendDot color="bg-lavender-500" label={t.calendar.legend_birthday} />
        <LegendDot color="bg-sky-500"   label={t.calendar.legend_other} />
        <LegendDot color="bg-amber-500" label={t.calendar.legend_holiday.replace('{country}', COUNTRY_LABEL[country])} />
      </div>
    </div>
  );
};
