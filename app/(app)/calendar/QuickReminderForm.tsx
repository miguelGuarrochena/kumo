"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Check } from "lucide-react";
import { upsertReminder } from "@/app/(app)/reminders/actions";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/client";
import type { ContactLite, ReminderType } from "./types";
import { TYPE_META, TYPE_LABEL_KEY } from "./constants";
import { formatDateFull, localeTag } from "./utils";
import { toggleNotifyContactId } from "@/lib/notifyContacts";
import { WA_MAX_RECIPIENTS } from "@/lib/notifications/waLimitsClient";

type QuickReminderFormProps = {
  dateStr: string;
  contacts: ContactLite[];
  hasWa: boolean;
  onCancel: () => void;
  onCreated: () => void;
};

export const QuickReminderForm = ({
  dateStr,
  contacts,
  hasWa,
  onCancel,
  onCreated,
}: QuickReminderFormProps) => {
  const router = useRouter();
  const { t, locale } = useT();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ReminderType>("generic");
  const [time, setTime] = useState("");
  const [notifyContactIds, setNotifyContactIds] = useState<string[]>(() => {
    const self = contacts.find((c) => c.is_self);
    return self ? [self.id] : [];
  });

  const toggleContact = (id: string) => {
    setNotifyContactIds((prev) =>
      toggleNotifyContactId(prev, id, {
        enforceMax: hasWa,
        max: WA_MAX_RECIPIENTS,
        onBlocked: () =>
          toast.info(
            t.calendar.wa_contacts_limit_toast.replace(
              "{max}",
              String(WA_MAX_RECIPIENTS),
            ),
          ),
      }),
    );
  };

  // YYYY-MM-DD de hoy en zona local — usado para bloquear reminders en el pasado.
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const isPastDate = dateStr < today;

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isPastDate) {
      toast.error(t.calendar.cannot_create_in_past);
      return;
    }
    const fd = new FormData();
    fd.set("title", title);
    fd.set("reminder_type", type);
    fd.set("reminder_date", dateStr);
    if (time) fd.set("reminder_time", time);
    fd.set("is_recurring", String(type === "birthday"));
    fd.set("notify_days_before", "1");
    notifyContactIds.forEach((id) => fd.append("notify_contact_ids", id));

    startTransition(async () => {
      const result = await upsertReminder({ ok: false }, fd);
      if (result.ok) {
        toast.success(t.calendar.reminder_created);
        if (result.syncWarning) toast.warning(result.syncWarning);
        track("reminder_created", { type });
        router.refresh();
        onCreated();
      } else {
        toast.error(result.error ?? t.common.error);
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div
        className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
          isPastDate
            ? "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"
            : "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300"
        }`}
      >
        <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
        <span>
          {isPastDate
            ? t.calendar.cannot_create_in_past
            : t.calendar.will_create_for}{" "}
          <strong>{formatDateFull(dateStr, localeTag(locale))}</strong>
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          {t.calendar.type_label}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TYPE_META) as Array<ReminderType>).map((key) => {
            const meta = TYPE_META[key];
            const Icon = meta.icon;
            const active = type === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                  active
                    ? "border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">
                  {t.calendar[TYPE_LABEL_KEY[key]]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          {t.calendar.title_label}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            type === "medical"
              ? t.calendar.placeholder_medical
              : type === "birthday"
                ? t.calendar.placeholder_birthday
                : t.calendar.placeholder_generic
          }
          className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
          autoFocus
          required
          maxLength={100}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          {t.calendar.time_label}{" "}
          <span className="text-slate-400 font-normal">
            ({t.common.optional})
          </span>
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
        />
      </div>

      {contacts.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1.5">
            {t.calendar.notify_to}
          </label>
          <div className="space-y-1.5">
            {contacts.map((c) => {
              const selected = notifyContactIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleContact(c.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-colors text-left ${
                    selected
                      ? "border-sky-400 bg-sky-50 dark:bg-sky-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 grid place-items-center transition-all shrink-0 ${
                      selected
                        ? "kumo-gradient border-transparent"
                        : "border-slate-300"
                    }`}
                  >
                    {selected && (
                      <Check
                        className="w-3.5 h-3.5 text-white"
                        strokeWidth={3}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.phone ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        +{c.phone}
                      </p>
                    ) : (
                      <p className="text-xs text-rose-400">
                        {t.calendar.no_phone}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {/* {hasWa && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {t.calendar.wa_contacts_limit_hint.replace('{max}', String(WA_MAX_RECIPIENTS))}
            </p>
          )}
          {!hasWa && notifyContactIds.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
              {t.calendar.wa_auto_note}{' '}
              <a href="/settings#plans" className="underline font-medium">
                {t.settings.contacts_wa_upsell_cta}
              </a>
            </p>
          )} */}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
        >
          {t.common.cancel}
        </button>
        <button
          type="submit"
          disabled={pending || !title.trim() || isPastDate}
          className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending ? t.common.saving : t.calendar.create}
        </button>
      </div>
    </form>
  );
};
