# Reply to Google OAuth verification — Kumo (project kumo-495918)

> Paste the section below into your reply email. Fill the two bracketed
> placeholders (demo video URL + test account) before sending.

---

Hello,

Thank you for the verification checklist. Below is our point-by-point audit for
project **kumo-495918** (Kumo, https://kumo-app.com).

**1. Scope configuration & justification (least privilege)**

Kumo requests a **single** OAuth scope:

- `https://www.googleapis.com/auth/calendar.events`

This is the narrowest scope that supports the feature. Kumo is a personal
finance and reminders app. The only Google-facing feature is an **optional**
one-way sync: when a user creates a reminder or an expense due-date inside Kumo,
we create/update/delete the corresponding event on **their own** Google Calendar
so they get native calendar alerts.

- We do **not** use `calendar` (full read/write of all calendars). We only need
  `calendar.events`, and we only ever touch events that Kumo itself created
  (matched by a Kumo-generated `iCalUID`). We never read, import, or display the
  user's other calendar events.
- The scope is only requested when the user explicitly connects their account in
  **Settings → Google Calendar**. It is not part of sign-in.
- The scope is production-ready and tied to a live, user-facing feature.

**2. Limited Use compliance**

Google user data obtained via the Calendar API is used solely to provide this
user-facing sync feature. We do not use it for advertising, we do not sell or
transfer it to third parties, and we do not use it to train, develop, or improve
any AI/ML models. Our use of Google user data complies with the Google API
Services User Data Policy, including the Limited Use requirements. This is stated
in our Privacy Policy (https://kumo-app.com/legal/privacy, "Google Calendar API"
section).

**3. Privacy policy disclosures**

Our Privacy Policy (https://kumo-app.com/legal/privacy) discloses:
- **Data access**: which Google data we access (calendar events we create).
- **Data use**: syncing user-selected reminders/due-dates to their calendar.
- **Data transfer**: we do not sell or share Google user data; sub-processors are listed.
- **Data protection**: HTTPS in transit, encryption at rest, Postgres Row Level
  Security, server-side-only secrets, daily backups.
- **Retention & deletion**: users can disconnect at any time (Settings → Google
  Calendar → Disconnect), which stops syncing and deletes the stored OAuth token;
  full account deletion removes all associated data.

**4. Cloud Application Security Assessment (CASA)**

We understand CASA applies only to **Restricted** scopes. `calendar.events` is a
**Sensitive** scope, so we believe CASA is not required for this submission.
Please let us know if you need anything further here.

**5. App access & testing environment**

- There are **no** phone-verification, credit-card, or paywall blockers on the
  Google Calendar feature.
- Testers can sign in using **"Continue with Google"** on the login page with
  their own Google account — no password or magic link needed.
- Step-by-step to reach and exercise the scope:
  1. Go to https://kumo-app.com and click **"Continue with Google"** (or use the
     test account below).
  2. Add a reminder or an expense with a due-date.
  3. Open **Settings → Google Calendar → Connect**. The consent screen shows the
     single `calendar.events` scope (expanded).
  4. After connecting, the reminder/due-date appears as an event on the tester's
     Google Calendar (write). Edit it in Kumo → the event updates. Delete it in
     Kumo → the event is removed from Google Calendar (delete). These source-side
     changes are visible in the tester's Google Calendar.
- Test account (in case sign-in is preferred): **[email + password / or "use your own Google account"]**

**6. Demo video**

Public/unlisted YouTube link: **[YOUR VIDEO URL]**

The video shows: the OAuth consent screen with the `calendar.events` scope fully
expanded, connecting the account, and the full create → update → delete flow with
each change reflected in the Google Calendar source account.

Please let us know if any additional information would help. Thank you.

Best regards,
Miguel — Kumo
