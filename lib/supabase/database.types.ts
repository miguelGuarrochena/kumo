// Tipos generados desde el schema de Supabase.
// Después del primer setup, regenerá con: pnpm db:types
// Por ahora los escribo a mano para que el proyecto tipoechee.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          color?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      expenses: {
        Row: {
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
        Insert: Omit<
          Database['public']['Tables']['expenses']['Row'],
          'id' | 'created_at' | 'currency' | 'is_recurring' | 'paid' | 'expense_date'
        > & {
          id?: string;
          currency?: string;
          is_recurring?: boolean;
          paid?: boolean;
          expense_date?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>;
      };
      reminders: {
        Row: {
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
        Insert: Omit<
          Database['public']['Tables']['reminders']['Row'],
          'id' | 'created_at' | 'is_recurring' | 'notify_days_before' | 'reminder_type' | 'last_notified_at'
        > & {
          id?: string;
          is_recurring?: boolean;
          notify_days_before?: number;
          reminder_type?: 'medical' | 'birthday' | 'generic';
          last_notified_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reminders']['Insert']>;
      };
      shopping_items: {
        Row: {
          id: string;
          user_id: string;
          list_name: string;
          name: string;
          quantity: string | null;
          bought: boolean;
          position: number;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['shopping_items']['Row'],
          'id' | 'created_at' | 'bought' | 'position' | 'list_name'
        > & {
          id?: string;
          bought?: boolean;
          position?: number;
          list_name?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['shopping_items']['Insert']>;
      };
      notification_contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string | null;
          relationship: 'self' | 'partner' | 'child' | 'parent' | 'sibling' | 'friend' | 'other';
          is_self: boolean;
          verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone?: string | null;
          relationship?: 'self' | 'partner' | 'child' | 'parent' | 'sibling' | 'friend' | 'other';
          is_self?: boolean;
          verified?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notification_contacts']['Insert']>;
      };
      user_settings: {
        Row: {
          user_id: string;
          whatsapp_number: string | null;
          whatsapp_verified: boolean;
          notify_expenses: boolean;
          notify_reminders: boolean;
          default_currency: string;
          timezone: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['user_settings']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['user_settings']['Row']>;
      };
    };
  };
};
