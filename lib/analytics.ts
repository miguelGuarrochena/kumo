import posthog from 'posthog-js';

export type AnalyticsEvent =
  | { name: 'expense_created'; props?: { currency?: string; has_due_date?: boolean; via?: 'manual' | 'ocr' | 'nlp' } }
  | { name: 'expense_deleted'; props?: Record<string, unknown> }
  | { name: 'category_created'; props?: { color?: string } }
  | { name: 'reminder_created'; props?: { type?: string; contacts_count?: number } }
  | { name: 'photo_ocr_used'; props?: { success?: boolean } }
  | { name: 'nlp_expense_used'; props?: { success?: boolean } }
  | { name: 'theme_changed'; props: { theme: 'light' | 'dark' | 'system' } }
  | { name: 'currency_changed'; props: { from: string; to: string } }
  | { name: 'onboarding_step_completed'; props: { step: 1 | 2 | 3 | 4 } }
  | { name: 'onboarding_skipped' }
  | { name: 'calendar_feed_subscribe' }
  | { name: 'calendar_feed_share' }
  | { name: 'calendar_feed_rotated' }
  | { name: 'google_calendar_connected' }
  | { name: 'google_calendar_disconnected' }
  | { name: 'shopping_item_added' }
  | { name: 'whatsapp_configured' }
  | { name: 'pwa_install_dismissed' }
  | { name: 'pwa_install_clicked' }
  | { name: 'pwa_install_result'; props: { outcome: 'accepted' | 'dismissed' } }
  | { name: 'pwa_install_ios_help_shown' };

export function track<T extends AnalyticsEvent>(
  event: T['name'],
  props?: T extends { props: infer P } ? P : Record<string, unknown> | undefined,
) {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.capture(event, (props ?? {}) as Record<string, unknown>);
  } catch {
    /* noop */
  }
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.identify(userId, traits);
  } catch {
    /* noop */
  }
}

export function resetAnalytics() {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.reset();
  } catch {
    /* noop */
  }
}
