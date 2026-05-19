import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from './SettingsClient';
import { ContactsSection } from './ContactsSection';
import { WorkspaceSection, type Member, type Invite } from './WorkspaceSection';
import { getCurrentWorkspace } from '@/lib/workspace';

const SettingsPage = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const ctx = await getCurrentWorkspace();

  const [{ data: settings }, { data: contacts }, { data: membersRaw }, { data: invitesRaw }] = await Promise.all([
    supabase.from('user_settings').select('*').eq('user_id', user!.id).single(),
    supabase.from('notification_contacts').select('*').order('created_at', { ascending: true }),
    supabase
      .from('workspace_members')
      .select('user_id, role, joined_at')
      .eq('workspace_id', ctx.workspaceId)
      .order('joined_at', { ascending: true }),
    ctx.role === 'admin'
      ? supabase
          .from('workspace_invites')
          .select('id, email, role, token, expires_at, created_at')
          .eq('workspace_id', ctx.workspaceId)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberRows = (membersRaw ?? []) as any[];
  const userIds = memberRows.map((m) => m.user_id);

  // Hidratamos nombres y emails de auth.users. Como no podemos selectear de
  // auth.users directamente con RLS desde el cliente, dependemos del único caso
  // que tenemos: el self. Para el resto, mostramos el id parcial.
  // (Una mejora futura: una function RPC que devuelva email por user_id.)
  const members: Member[] = memberRows.map((m) => ({
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    email: m.user_id === user!.id ? user!.email ?? null : null,
    full_name: m.user_id === user!.id ? user!.user_metadata?.full_name ?? null : null,
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

      <WorkspaceSection
        members={members}
        invites={invites}
        isAdmin={ctx.role === 'admin'}
        origin={origin}
      />

      <ContactsSection contacts={contacts ?? []} />

      <SettingsClient initialSettings={settings} userEmail={user?.email ?? ''} />
    </div>
  );
};

export default SettingsPage;
