<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Kumo. Here is a summary of what was done:

- **Environment variables** set in `.env.local`: `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` (eu.i.posthog.com).
- **PostHog initialization** was already present via `components/PostHogProvider.tsx` (included in the root layout), with pageview tracking and autocapture configured.
- **User identification**: Added `components/UserIdentifier.tsx`, a client component rendered in `app/(app)/layout.tsx` that calls `posthog.identify()` with the authenticated user's ID, email, and name on every app page load.
- **Sign-out reset**: Added `posthog.reset()` to both `Sidebar.tsx` and `MobileHeader.tsx` sign-out handlers.
- **11 events** instrumented across 7 files.

| Event | Description | File |
|---|---|---|
| `expense_created` | User created a new expense (manual or via OCR) | `app/(app)/expenses/ExpensesClient.tsx` |
| `expense_deleted` | User deleted an expense | `app/(app)/expenses/ExpensesClient.tsx` |
| `photo_ocr_used` | User uploaded a photo to scan a receipt via OCR | `app/(app)/expenses/ExpensesClient.tsx` |
| `category_created` | User created a new expense category | `app/(app)/categories/CategoriesClient.tsx` |
| `reminder_created` | User created a new reminder (medical, birthday, generic) | `app/(app)/reminders/RemindersClient.tsx` |
| `shopping_item_added` | User added an item to a shopping list | `app/(app)/shopping/ShoppingClient.tsx` |
| `currency_changed` | User changed their default currency in settings | `app/(app)/settings/SettingsClient.tsx` |
| `whatsapp_configured` | User saved a WhatsApp number in settings | `app/(app)/settings/SettingsClient.tsx` |
| `theme_changed` | User changed the app theme (light / dark / system) | `components/ThemeToggle.tsx` |
| `onboarding_skipped` | User dismissed the onboarding checklist | `components/OnboardingChecklist.tsx` |
| `category_created` | User created an expense category | `app/(app)/categories/CategoriesClient.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/686480)
- [Core feature usage over time](/insights/sTIB48Fs) — daily trend of expenses, reminders and shopping items created
- [Onboarding completion funnel](/insights/Q0Z5zqfC) — conversion from first expense → WhatsApp configured → reminder created
- [OCR feature adoption](/insights/2GwGN3pI) — daily unique users using the photo-to-expense scan feature
- [Settings & personalization adoption](/insights/4VmyVNpY) — users who configure WhatsApp, change currency, or switch theme
- [Onboarding skip rate](/insights/gHcBdeCj) — weekly comparison of skipped vs completed onboarding (churn signal)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
