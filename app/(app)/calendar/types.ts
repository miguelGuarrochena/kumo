// Tipos compartidos por los componentes del calendario.

export type ReminderType = 'medical' | 'birthday' | 'generic';

export type ViewMode = 'month' | 'year' | 'upcoming' | 'past';

export type ExpenseCal = {
  id: string;
  description: string | null;
  amount: number;
  currency: string;
  due_date: string | null;
  expense_date: string;
  paid: boolean;
  categories: { name: string; color: string } | null;
};

export type ReminderCal = {
  id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_time: string | null;
  reminder_type: ReminderType;
  is_recurring: boolean;
  notify_days_before: number;
  notify_contact_ids: string[];
};

export type ContactLite = {
  id: string;
  name: string;
  relationship: string;
  is_self: boolean;
  phone: string | null;
};

export type WorkspaceLite = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type DayEvents = { expenses: ExpenseCal[]; reminders: ReminderCal[] };

export type EventsByDate = Map<string, DayEvents>;
