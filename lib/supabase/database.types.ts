export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ---------- categories ----------
type CategoriesRow = {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  icon: string;
  color: string;
  kind: 'expense' | 'income';
  created_at: string;
};
type CategoriesInsert = {
  id?: string;
  user_id: string;
  workspace_id: string;
  name: string;
  icon?: string;
  color?: string;
  kind?: 'expense' | 'income';
  created_at?: string;
};
type CategoriesUpdate = {
  id?: string;
  user_id?: string;
  workspace_id?: string;
  name?: string;
  icon?: string;
  color?: string;
  kind?: 'expense' | 'income';
  created_at?: string;
};

// ---------- expenses ----------
type ExpensesRow = {
  id: string;
  user_id: string;
  workspace_id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  description: string | null;
  expense_date: string;
  due_date: string | null;
  is_recurring: boolean;
  recurrence_type: 'weekly' | 'monthly' | 'yearly' | null;
  paid: boolean;
  kind: 'expense' | 'income';
  notify_contact_ids: string[];
  next_occurrence: string | null;
  parent_id: string | null;
  split_mode: 'equal' | 'percentage' | 'fixed' | 'items' | null;
  paid_by_contact_id: string | null;
  items_breakdown: Array<{ name: string; price: number; contact_ids: string[] }> | null;
  created_at: string;
};

type ExpenseSplitsRow = {
  id: string;
  expense_id: string;
  contact_id: string;
  amount: number | null;
  percentage: number | null;
  paid: boolean;
  created_at: string;
};
type ExpenseSplitsInsert = Partial<ExpenseSplitsRow> & {
  expense_id: string;
  contact_id: string;
};
type ExpenseSplitsUpdate = Partial<ExpenseSplitsRow>;

type PaymentsRow = {
  id: string;
  workspace_id: string;
  from_contact_id: string;
  to_contact_id: string;
  amount: number;
  currency: string;
  note: string | null;
  paid_at: string;
  created_at: string;
};
type PaymentsInsert = Partial<PaymentsRow> & {
  workspace_id: string;
  from_contact_id: string;
  to_contact_id: string;
  amount: number;
};
type PaymentsUpdate = Partial<PaymentsRow>;
type ExpensesInsert = {
  id?: string;
  user_id: string;
  workspace_id: string;
  category_id?: string | null;
  amount: number;
  currency?: string;
  description?: string | null;
  expense_date?: string;
  due_date?: string | null;
  is_recurring?: boolean;
  recurrence_type?: 'weekly' | 'monthly' | 'yearly' | null;
  paid?: boolean;
  kind?: 'expense' | 'income';
  notify_contact_ids?: string[];
  next_occurrence?: string | null;
  parent_id?: string | null;
  split_mode?: 'equal' | 'percentage' | 'fixed' | 'items' | null;
  paid_by_contact_id?: string | null;
  items_breakdown?: Array<{ name: string; price: number; contact_ids: string[] }> | null;
  created_at?: string;
};
type ExpensesUpdate = {
  id?: string;
  user_id?: string;
  workspace_id?: string;
  category_id?: string | null;
  amount?: number;
  currency?: string;
  description?: string | null;
  expense_date?: string;
  due_date?: string | null;
  is_recurring?: boolean;
  recurrence_type?: 'weekly' | 'monthly' | 'yearly' | null;
  paid?: boolean;
  kind?: 'expense' | 'income';
  notify_contact_ids?: string[];
  next_occurrence?: string | null;
  parent_id?: string | null;
  split_mode?: 'equal' | 'percentage' | 'fixed' | 'items' | null;
  paid_by_contact_id?: string | null;
  items_breakdown?: Array<{ name: string; price: number; contact_ids: string[] }> | null;
  created_at?: string;
};

// ---------- reminders ----------
type RemindersRow = {
  id: string;
  user_id: string;
  workspace_id: string;
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
  workspace_id: string;
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
  workspace_id?: string;
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
  workspace_id: string;
  list_name: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  bought: boolean;
  position: number;
  created_at: string;
};
type ShoppingItemsInsert = {
  id?: string;
  user_id: string;
  workspace_id: string;
  list_name?: string;
  name: string;
  quantity?: string | null;
  unit?: string | null;
  bought?: boolean;
  position?: number;
  created_at?: string;
};
type ShoppingItemsUpdate = {
  id?: string;
  user_id?: string;
  workspace_id?: string;
  list_name?: string;
  name?: string;
  quantity?: string | null;
  unit?: string | null;
  bought?: boolean;
  position?: number;
  created_at?: string;
};

// ---------- user_settings ----------
type UserSettingsRow = {
  user_id: string;
  workspace_id: string;
  whatsapp_number: string | null;
  whatsapp_verified: boolean;
  notify_expenses: boolean;
  notify_reminders: boolean;
  notify_budgets: boolean;
  notify_birthdays: boolean;
  notify_recurring: boolean;
  default_currency: string;
  timezone: string;
  onboarded: boolean;
  calendar_feed_version: number;
  google_calendar_refresh_token: string | null;
  google_calendar_connected_at: string | null;
  google_calendar_last_sync_at: string | null;
  google_calendar_sync_error: string | null;
  updated_at: string;
};
type UserSettingsInsert = {
  user_id: string;
  workspace_id: string;
  whatsapp_number?: string | null;
  whatsapp_verified?: boolean;
  notify_expenses?: boolean;
  notify_reminders?: boolean;
  notify_budgets?: boolean;
  notify_birthdays?: boolean;
  notify_recurring?: boolean;
  default_currency?: string;
  timezone?: string;
  onboarded?: boolean;
  calendar_feed_version?: number;
  google_calendar_refresh_token?: string | null;
  google_calendar_connected_at?: string | null;
  google_calendar_last_sync_at?: string | null;
  google_calendar_sync_error?: string | null;
  updated_at?: string;
};
type UserSettingsUpdate = {
  user_id?: string;
  workspace_id?: string;
  whatsapp_number?: string | null;
  whatsapp_verified?: boolean;
  notify_expenses?: boolean;
  notify_reminders?: boolean;
  notify_budgets?: boolean;
  notify_birthdays?: boolean;
  notify_recurring?: boolean;
  default_currency?: string;
  timezone?: string;
  onboarded?: boolean;
  calendar_feed_version?: number;
  google_calendar_refresh_token?: string | null;
  google_calendar_connected_at?: string | null;
  google_calendar_last_sync_at?: string | null;
  google_calendar_sync_error?: string | null;
  updated_at?: string;
};

// ---------- google_calendar_events ----------
type GoogleCalendarEventsRow = {
  user_id: string;
  kumo_type: 'reminder' | 'expense';
  kumo_id: string;
  google_event_id: string;
  updated_at: string;
};
type GoogleCalendarEventsInsert = {
  user_id: string;
  kumo_type: 'reminder' | 'expense';
  kumo_id: string;
  google_event_id: string;
  updated_at?: string;
};
type GoogleCalendarEventsUpdate = {
  user_id?: string;
  kumo_type?: 'reminder' | 'expense';
  kumo_id?: string;
  google_event_id?: string;
  updated_at?: string;
};

// ---------- notification_contacts ----------
type ContactsRow = {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  phone: string | null;
  mp_alias: string | null;
  mp_payment_link: string | null;
  relationship: 'self' | 'partner' | 'child' | 'parent' | 'sibling' | 'friend' | 'other';
  is_self: boolean;
  is_split_only: boolean;
  verified: boolean;
  created_at: string;
};
type ContactsInsert = {
  id?: string;
  user_id: string;
  workspace_id: string;
  name: string;
  phone?: string | null;
  mp_alias?: string | null;
  mp_payment_link?: string | null;
  relationship?: 'self' | 'partner' | 'child' | 'parent' | 'sibling' | 'friend' | 'other';
  is_self?: boolean;
  is_split_only?: boolean;
  verified?: boolean;
  created_at?: string;
};
type ContactsUpdate = {
  id?: string;
  user_id?: string;
  workspace_id?: string;
  name?: string;
  phone?: string | null;
  mp_alias?: string | null;
  mp_payment_link?: string | null;
  relationship?: 'self' | 'partner' | 'child' | 'parent' | 'sibling' | 'friend' | 'other';
  is_self?: boolean;
  is_split_only?: boolean;
  verified?: boolean;
  created_at?: string;
};

// ---------- workspaces ----------
export type WorkspaceRole = 'admin' | 'reader';

type WorkspacesRow = {
  id: string;
  name: string;
  owner_id: string;
  icon: string;
  color: string;
  created_at: string;
};
type WorkspacesInsert = {
  id?: string;
  name?: string;
  owner_id: string;
  icon?: string;
  color?: string;
  created_at?: string;
};
type WorkspacesUpdate = {
  id?: string;
  name?: string;
  owner_id?: string;
  icon?: string;
  color?: string;
  created_at?: string;
};

// ---------- workspace_members ----------
type WorkspaceMembersRow = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string | null;
  joined_at: string;
};
type WorkspaceMembersInsert = {
  workspace_id: string;
  user_id: string;
  role?: WorkspaceRole;
  invited_by?: string | null;
  joined_at?: string;
};
type WorkspaceMembersUpdate = {
  workspace_id?: string;
  user_id?: string;
  role?: WorkspaceRole;
  invited_by?: string | null;
  joined_at?: string;
};

// ---------- workspace_invites ----------
type WorkspaceInvitesRow = {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};
type WorkspaceInvitesInsert = {
  id?: string;
  workspace_id: string;
  email: string;
  role?: WorkspaceRole;
  token: string;
  invited_by?: string | null;
  expires_at?: string;
  accepted_at?: string | null;
  created_at?: string;
};
type WorkspaceInvitesUpdate = {
  id?: string;
  workspace_id?: string;
  email?: string;
  role?: WorkspaceRole;
  token?: string;
  invited_by?: string | null;
  expires_at?: string;
  accepted_at?: string | null;
  created_at?: string;
};

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'free';

type PushSubscriptionsRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
  last_used_at: string | null;
};
type PushSubscriptionsInsert = Partial<PushSubscriptionsRow> & {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};
type PushSubscriptionsUpdate = Partial<PushSubscriptionsRow>;

type SubscriptionsRow = {
  user_id: string;
  status: SubscriptionStatus;
  plan_type: 'ocr' | 'wa' | 'bundle' | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  provider: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  provider_variant_id: string | null;
  expiry_reminder_30d_at: string | null;
  expiry_reminder_7d_at: string | null;
  created_at: string;
  updated_at: string;
};
type SubscriptionsInsert = Partial<SubscriptionsRow> & { user_id: string };
type SubscriptionsUpdate = Partial<SubscriptionsRow>;

type WaUsageRow = {
  user_id: string;
  month: string;
  count: number;
  updated_at: string;
};
type WaUsageInsert = Partial<WaUsageRow> & { user_id: string; month: string };
type WaUsageUpdate = Partial<WaUsageRow>;

type BillingTermsAcceptancesRow = {
  id: string;
  user_id: string;
  terms_version: string;
  plan_product: string;
  billing_interval: string;
  mp_preapproval_id: string | null;
  accepted_at: string;
};
type BillingTermsAcceptancesInsert = Partial<BillingTermsAcceptancesRow> & {
  user_id: string;
  terms_version: string;
  plan_product: string;
  billing_interval: string;
};
type BillingTermsAcceptancesUpdate = Partial<BillingTermsAcceptancesRow>;

// ---------- budgets ----------
type BudgetsRow = {
  id: string;
  workspace_id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
};
type BudgetsInsert = Partial<BudgetsRow> & { workspace_id: string; amount: number };
type BudgetsUpdate = Partial<BudgetsRow>;

type BudgetAlertsSentRow = {
  id: string;
  budget_id: string;
  month: string;
  threshold: '80' | '100';
  sent_at: string;
};
type BudgetAlertsSentInsert = {
  budget_id: string;
  month: string;
  threshold: '80' | '100';
  sent_at?: string;
};
type BudgetAlertsSentUpdate = Partial<BudgetAlertsSentRow>;

export type Database = {
  public: {
    Tables: {
      budgets: {
        Row: BudgetsRow;
        Insert: BudgetsInsert;
        Update: BudgetsUpdate;
        Relationships: [];
      };
      budget_alerts_sent: {
        Row: BudgetAlertsSentRow;
        Insert: BudgetAlertsSentInsert;
        Update: BudgetAlertsSentUpdate;
        Relationships: [];
      };
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
      google_calendar_events: {
        Row: GoogleCalendarEventsRow;
        Insert: GoogleCalendarEventsInsert;
        Update: GoogleCalendarEventsUpdate;
        Relationships: [];
      };
      notification_contacts: {
        Row: ContactsRow;
        Insert: ContactsInsert;
        Update: ContactsUpdate;
        Relationships: [];
      };
      workspaces: {
        Row: WorkspacesRow;
        Insert: WorkspacesInsert;
        Update: WorkspacesUpdate;
        Relationships: [];
      };
      workspace_members: {
        Row: WorkspaceMembersRow;
        Insert: WorkspaceMembersInsert;
        Update: WorkspaceMembersUpdate;
        Relationships: [];
      };
      workspace_invites: {
        Row: WorkspaceInvitesRow;
        Insert: WorkspaceInvitesInsert;
        Update: WorkspaceInvitesUpdate;
        Relationships: [];
      };
      subscriptions: {
        Row: SubscriptionsRow;
        Insert: SubscriptionsInsert;
        Update: SubscriptionsUpdate;
        Relationships: [];
      };
      wa_usage: {
        Row: WaUsageRow;
        Insert: WaUsageInsert;
        Update: WaUsageUpdate;
        Relationships: [];
      };
      billing_terms_acceptances: {
        Row: BillingTermsAcceptancesRow;
        Insert: BillingTermsAcceptancesInsert;
        Update: BillingTermsAcceptancesUpdate;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionsRow;
        Insert: PushSubscriptionsInsert;
        Update: PushSubscriptionsUpdate;
        Relationships: [];
      };
      expense_splits: {
        Row: ExpenseSplitsRow;
        Insert: ExpenseSplitsInsert;
        Update: ExpenseSplitsUpdate;
        Relationships: [];
      };
      payments: {
        Row: PaymentsRow;
        Insert: PaymentsInsert;
        Update: PaymentsUpdate;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      get_workspace_members: {
        Args: { ws_id: string };
        Returns: {
          user_id: string;
          role: WorkspaceRole;
          joined_at: string;
          email: string | null;
          full_name: string | null;
        }[];
      };
      cleanup_duplicate_self_contacts: {
        Args: { ws_id: string };
        Returns: number;
      };
      delete_my_account: {
        Args: Record<string, never>;
        Returns: void;
      };
      delete_workspace_safe: {
        Args: { ws_id: string };
        Returns: void;
      };
      bootstrap_workspace_safe: {
        Args: { ws_name: string };
        Returns: string;
      };
      is_pro: {
        Args: { uid?: string };
        Returns: boolean;
      };
      current_month_ocr_count: {
        Args: Record<string, never>;
        Returns: number;
      };
      increment_ocr_usage: {
        Args: Record<string, never>;
        Returns: number;
      };
      increment_wa_usage: {
        Args: { p_user_id: string };
        Returns: number;
      };
      current_month_wa_count: {
        Args: { p_user_id: string };
        Returns: number;
      };
      record_billing_terms_acceptance: {
        Args: {
          p_terms_version: string;
          p_plan_product: string;
          p_billing_interval: string;
          p_mp_preapproval_id?: string | null;
        };
        Returns: string;
      };
      workspace_balances: {
        Args: { ws_id: string };
        Returns: {
          contact_id: string;
          contact_name: string;
          net_amount: number;
          currency: string;
        }[];
      };
      generate_recurring_expenses: {
        Args: Record<string, never>;
        Returns: {
          g_id: string;
          g_user_id: string;
          g_workspace_id: string;
          g_description: string | null;
          g_amount: number;
          g_currency: string;
          g_kind: 'expense' | 'income';
          g_expense_date: string;
        }[];
      };
      compute_next_occurrence: {
        Args: { base_date: string; recurrence: string };
        Returns: string | null;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
