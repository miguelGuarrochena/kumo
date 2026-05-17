// Tipos del schema de Supabase. Después del primer setup podés regenerar con:
//   pnpm db:types

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ---------- categories ----------
type CategoriesRow = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
};
type CategoriesInsert = {
  id?: string;
  user_id: string;
  name: string;
  icon?: string;
  color?: string;
  created_at?: string;
};
type CategoriesUpdate = {
  id?: string;
  user_id?: string;
  name?: string;
  icon?: string;
  color?: string;
  created_at?: string;
};

// ---------- expenses ----------
type ExpensesRow = {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  description: string | null;
  expense_date: string;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_type: 'weekly' | 'monthly' | 'yearly' | null;
  paid: boolean;
  notify_contact_ids: string[];
  created_at: string;
};
type ExpensesInsert = {
  id?: string;
  user_id: string;
  category_id?: string | null;
  amount: number;
  currency?: string;
  description?: string | null;
  expense_date?: string;
  due_date?: string | null;
  is_recurring?: boolean;
  recurrence_type?: 'weekly' | 'monthly' | 'yearly' | null;
  paid?: boolean;
  notify_contact_ids?: string[];
  created_at?: string;
};
type ExpensesUpdate = {
  id?: string;
  user_id?: string;
  category_id?: string | null;
  amount?: number;
  currency?: string;
  description?: string | null;
  expense_date?: string;
  due_date?: string | null;
  is_recurring?: boolean;
  recurrence_type?: 'weekly' | 'monthly' | 'yearly' | null;
  paid?: boolean;
  notify_contact_ids?: string[];
  created_at?: string;
};

// ---------- reminders ----------
type RemindersRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_time: string | null;
  reminder_type: 'medical' | 'birthday' | 'generic';
  is_recurring: boolean;
  notify_days_before: number;
  notify_contact_ids: string[];
  last_notified_at: string | null;
  created_at: string;
};
type RemindersInsert = {
  id?: string;
  user_id: string;
  title: string;
  description?: string | null;
  reminder_date: string;
  reminder_time?: string | null;
  reminder_type?: 'medical' | 'birthday' | 'generic';
  is_recurring?: boolean;
  notify_days_before?: number;
  notify_contact_ids?: string[];
  last_notified_at?: string | null;
  created_at?: string;
};
type RemindersUpdate = {
  id?: string;
  user_id?: string;
  title?: string;
  description?: string | null;
  reminder_date?: string;
  reminder_time?: string | null;
  reminder_type?: 'medical' | 'birthday' | 'generic';
  is_recurring?: boolean;
  notify_days_before?: number;
  notify_contact_ids?: string[];
  last_notified_at?: string | null;
  created_at?: string;
};

// ---------- shopping_items ----------
type ShoppingItemsRow = {
  id: string;
  user_id: string;
  list_name: string;
  name: string;
  quantity: string | null;
  bought: boolean;
  position: number;
  created_at: string;
};
type ShoppingItemsInsert = {
  id?: string;
  user_id: string;
  list_name?: string;
  name: string;
  quantity?: string | null;
  bought?: boolean;
  position?: number;
  created_at?: string;
};
type ShoppingItemsUpdate = {
  id?: string;
  user_id?: string;
  list_name?: string;
  name?: string;
  quantity?: string | null;
  bought?: boolean;
  position?: number;
  created_at?: string;
};

// ---------- user_settings ----------
type UserSettingsRow = {
  user_id: string;
  whatsapp_number: string | null;
  whatsapp_verified: boolean;
  notify_expenses: boolean;
  notify_reminders: boolean;
  default_currency: string;
  timezone: string;
  updated_at: string;
};
type UserSettingsInsert = {
  user_id: string;
  whatsapp_number?: string | null;
  whatsapp_verified?: boolean;
  notify_expenses?: boolean;
  notify_reminders?: boolean;
  default_currency?: string;
  timezone?: string;
  updated_at?: string;
};
type UserSettingsUpdate = {
  user_id?: string;
  whatsapp_number?: string | null;
  whatsapp_verified?: boolean;
  notify_expenses?: boolean;
  notify_reminders?: boolean;
  default_currency?: string;
  timezone?: string;
  updated_at?: string;
};

// ---------- notification_contacts ----------
type ContactsRow = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  relationship: 'self' | 'partner' | 'child' | 'parent' | 'sibling' | 'friend' | 'other';
  is_self: boolean;
  verified: boolean;
  created_at: string;
};
type ContactsInsert = {
  id?: string;
  user_id: string;
  name: string;
  phone?: string | null;
  relationship?: 'self' | 'partner' | 'child' | 'parent' | 'sibling' | 'friend' | 'other';
  is_self?: boolean;
  verified?: boolean;
  created_at?: string;
};
type ContactsUpdate = {
  id?: string;
  user_id?: string;
  name?: string;
  phone?: string | null;
  relationship?: 'self' | 'partner' | 'child' | 'parent' | 'sibling' | 'friend' | 'other';
  is_self?: boolean;
  verified?: boolean;
  created_at?: string;
};

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: CategoriesRow;
        Insert: CategoriesInsert;
        Update: CategoriesUpdate;
        Relationships: [];
      };
      expenses: {
        Row: ExpensesRow;
        Insert: ExpensesInsert;
        Update: ExpensesUpdate;
        Relationships: [];
      };
      reminders: {
        Row: RemindersRow;
        Insert: RemindersInsert;
        Update: RemindersUpdate;
        Relationships: [];
      };
      shopping_items: {
        Row: ShoppingItemsRow;
        Insert: ShoppingItemsInsert;
        Update: ShoppingItemsUpdate;
        Relationships: [];
      };
      user_settings: {
        Row: UserSettingsRow;
        Insert: UserSettingsInsert;
        Update: UserSettingsUpdate;
        Relationships: [];
      };
      notification_contacts: {
        Row: ContactsRow;
        Insert: ContactsInsert;
        Update: ContactsUpdate;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
