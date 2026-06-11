import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from './SettingsClient';
import { ContactsSection } from './ContactsSection';
import { WorkspaceSection, type Member, type Invite } from './WorkspaceSection';
import { PlanSection } from './PlanSection';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getSubscription } from '@/lib/subscription';
import { getPricing } from '@/lib/pricing';
import { isAdmin } from '@/lib/admin';
import { buildCalendarFeedUrl } from '@/lib/calendar/feedToken';
import { CalendarFeedSection } from './CalendarFeedSection';
import { getMessages } from '@/lib/i18n/server';
import { isWhatsAppConfigured } from '@/lib/notifications/whatsapp';
import { currentWaMonthKey, WA_MONTHLY_CAP } from '@/lib/notifications/waLimits';
import { WhatsAppPendingBanner } from './WhatsAppPendingBanner';

const SettingsPage = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const ctx = await getCurrentWorkspace();
  const [subscription, pricing, t] = await Promise.all([
    getSubscription(),
    getPricing(),
    getMessages(),
  ]);
  const whatsappPending =
    !isWhatsAppConfigured() || process.env.NEXT_PUBLIC_WHATSAPP_PENDING === 'true';

  await supabase.rpc('cleanup_duplicate_self_contacts', { ws_id: ctx.workspaceId });

  const [
    { data: settings },
    { data: contacts },
    { data: membersRaw },
    { data: invitesRaw },
    { count: spacesCount },
  ] = await Promise.all([
    supabase.from('user_settings').select('*').eq('user_id', user!.id).single(),
    supabase
      .from('notification_contacts')
      .select('*')
      .eq('workspace_id', ctx.workspaceId)
      .eq('is_split_only', false)
      .order('created_at', { ascending: true }),
    supabase.rpc('get_workspace_members', { ws_id: ctx.workspaceId }),
    ctx.role === 'admin'
      ? supabase
          .from('workspace_invites')
          .select('id, email, role, token, expires_at, created_at')
          .eq('workspace_id', ctx.workspaceId)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from('workspace_members')
      .select('workspace_id', { count: 'exact', head: true })
      .eq('user_id', user!.id),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberRows = (membersRaw ?? []) as any[];

  const members: Member[] = memberRows.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    email: m.email ?? null,
    full_name: m.full_name ?? null,
    is_owner: m.user_id === ctx.ownerId,
    is_me: m.user_id === user!.id,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invites: Invite[] = ((invitesRaw ?? []) as any[]).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    expires_at: i.expires_at,
    token: i.token,
    created_at: i.created_at,
  }));

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'kumo-app.com';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;
  const feedVersion = (settings as { calendar_feed_version?: number } | null)?.calendar_feed_version ?? 0;

  let waUsageMonth = 0;
  if (subscription.hasWa) {
    const { data: waRow } = await supabase
      .from('wa_usage')
      .select('count')
      .eq('user_id', user!.id)
      .eq('month', currentWaMonthKey())
      .maybeSingle();
    waUsageMonth = waRow?.count ?? 0;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.settings.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          {t.settings.subtitle}
        </p>
      </header>

      <PlanSection
        sub={subscription}
        pricing={pricing}
        waUsageMonth={waUsageMonth}
        waMonthlyCap={WA_MONTHLY_CAP}
      />

      <WorkspaceSection
        members={members}
        invites={invites}
        isAdmin={ctx.role === 'admin'}
        origin={origin}
        workspaceId={ctx.workspaceId}
        workspaceName={ctx.workspaceName}
        workspaceIcon={ctx.workspaceIcon}
        workspaceColor={ctx.workspaceColor}
        isOwner={ctx.ownerId === user!.id}
        totalSpaces={spacesCount ?? 1}
      />

      {whatsappPending && <WhatsAppPendingBanner />}

      <ContactsSection contacts={contacts ?? []} hasWa={subscription.hasWa} />

      <CalendarFeedSection
        feedUrl={buildCalendarFeedUrl(user!.id, origin, feedVersion)}
        feedVersion={feedVersion}
      />

      <SettingsClient
        initialSettings={settings}
        userEmail={user?.email ?? ''}
        initialDisplayName={user?.user_metadata?.full_name ?? ''}
        selfContact={(contacts ?? []).find(
          (c) => c.is_self && c.user_id === user!.id,
        ) ?? null}
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''}
        isAdmin={isAdmin(user?.email)}
        isOnboarded={(settings as { onboarded?: boolean } | null)?.onboarded ?? false}
      />
    </div>
  );
};

export default SettingsPage;
