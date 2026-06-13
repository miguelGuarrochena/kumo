import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { setActiveWorkspace } from '@/lib/workspace';

type SearchParams = { token?: string };

const AcceptInvitePage = async ({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) => {
  const { token } = await searchParams;

  if (!token) {
    return <ErrorScreen title="Link inv?lido" message="Falta el token del invite." />;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`);
  }

  const { data: invite } = await supabase
    .from('workspace_invites')
    .select('id, workspace_id, email, role, expires_at, accepted_at, workspaces(name)')
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    return <ErrorScreen title="Invitaci?n no encontrada" message="El link es inv?lido o fue revocado." />;
  }

  type InviteRow = {
    id: string;
    workspace_id: string;
    email: string;
    role: 'admin' | 'reader';
    expires_at: string;
    accepted_at: string | null;
    workspaces: { name: string } | null;
  };
  const inv = invite as unknown as InviteRow;

  if (inv.accepted_at) {
    return <ErrorScreen title="Ya usado" message="Este link de invitaci?n ya fue aceptado." />;
  }

  if (new Date(inv.expires_at) < new Date()) {
    return (
      <ErrorScreen
        title="Link vencido"
        message="El link de invitaci?n venci?. Pedile al admin que te mande uno nuevo."
      />
    );
  }

  if ((user.email ?? '').toLowerCase() !== inv.email.toLowerCase()) {
    return (
      <ErrorScreen
        title="Email distinto"
        message={`Este invite es para ${inv.email}. Inici? sesi?n con ese email para aceptarlo.`}
      />
    );
  }

  const { error: insErr } = await supabase.from('workspace_members').insert({
    workspace_id: inv.workspace_id,
    user_id: user.id,
    role: inv.role,
  });
  if (insErr && !insErr.message.includes('duplicate')) {
    return <ErrorScreen title="Error" message={insErr.message} />;
  }

  // Contacto "Yo" para el invitee: aparece en "Qui?n pag?" y al dividir gastos.
  const inviteeName =
    user.user_metadata?.full_name?.split(' ')[0] ??
    user.user_metadata?.name?.split(' ')[0] ??
    user.email?.split('@')[0] ??
    'Yo';
  await supabase
    .from('notification_contacts')
    .insert({
      workspace_id: inv.workspace_id,
      user_id: user.id,
      name: inviteeName,
      relationship: 'self',
      is_self: true,
    });

  await supabase
    .from('workspace_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inv.id);

  await setActiveWorkspace(inv.workspace_id);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="kumo-card p-8 max-w-md w-full text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-mint-100 dark:bg-mint-500/20 text-mint-500 grid place-items-center mx-auto text-2xl">
          ?
        </div>
        <h1 className="text-xl font-bold">?Listo!</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Ya sos {inv.role === 'admin' ? 'administrador' : 'lector'} de{' '}
          <strong>{inv.workspaces?.name ?? 'el workspace'}</strong>.
        </p>
        <Link
          href="/dashboard"
          className="inline-block mt-2 px-5 py-2.5 rounded-xl kumo-gradient text-white text-sm font-medium hover:opacity-90"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
};

const ErrorScreen = ({ title, message }: { title: string; message: string }) => (
  <div className="min-h-screen grid place-items-center p-6">
    <div className="kumo-card p-8 max-w-md w-full text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-500 grid place-items-center mx-auto text-2xl">
        !
      </div>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="text-slate-600 dark:text-slate-300">{message}</p>
      <Link
        href="/dashboard"
        className="inline-block mt-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        Volver al inicio
      </Link>
    </div>
  </div>
);

export default AcceptInvitePage;
