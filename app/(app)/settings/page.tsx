import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from './SettingsClient';
import { ContactsSection } from './ContactsSection';
import { WorkspaceSection, type Member, type Invite } from './WorkspaceSection';
import { PlanSection } from './PlanSection';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getSubscription } from '@/lib/subscription';
import { getPricing } from '@/lib/pricing';

const SettingsPage = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const ctx = await getCurrentWorkspace();
  const subscription = await getSubscription();
  const pricing = getPricing();

  // Limpieza silenciosa: si quedaron contactos "Yo" duplicados por bugs viejos,
  // los borramos sin mostrar nada al user. El unique de DB previene futuros.
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
      .order('created_at', { ascending: true }),
    // RPC con SECURITY DEFINER que trae emails reales de auth.users
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

  // Origin para construir links de invite client-side
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'kumo-app.com';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Contactos, moneda, zona horaria, tema y preferencias de notificación.
        </p>
      </header>

      <PlanSection
        sub={subscription}
        priceMonthly={pricing.monthly}
        priceYearly={pricing.yearly}
        yearlySavingsPct={pricing.yearlyPct}
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

      <ContactsSection contacts={contacts ?? []} />

      <SettingsClient
        initialSettings={settings}
        userEmail={user?.email ?? ''}
        initialDisplayName={user?.user_metadata?.full_name ?? ''}
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''}
      />
    </div>
  );
};

export default SettingsPage;
