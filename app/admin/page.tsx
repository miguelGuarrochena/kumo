import { createServiceClient } from '@/lib/supabase/service';
import { AdminClient, type AdminRow } from './AdminClient';

// El layout (app/admin/layout.tsx) ya valida que el user sea admin y redirige
// si no. Acá solo cargamos data.

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

const AdminPage = async () => {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usersResp } = await (supabase as any).auth.admin.listUsers({ page: 1, perPage: 200 });
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id, status, trial_ends_at, current_period_end, provider, updated_at');

  type AuthUser = { id: string; email: string | null; created_at: string; user_metadata?: { full_name?: string } };
  type SubRow = {
    user_id: string;
    status: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    provider: string;
    updated_at: string;
  };

  const subsByUser = new Map<string, SubRow>(
    ((subs ?? []) as SubRow[]).map((s) => [s.user_id, s]),
  );

  const rows: AdminRow[] = ((usersResp?.users ?? []) as AuthUser[])
    .map((u) => {
      const s = subsByUser.get(u.id);
      return {
        id: u.id,
        email: u.email ?? '',
        name: u.user_metadata?.full_name ?? null,
        signupAt: u.created_at,
        status: (s?.status ?? 'free') as AdminRow['status'],
        trialEndsAt: s?.trial_ends_at ?? null,
        currentPeriodEnd: s?.current_period_end ?? null,
        provider: s?.provider ?? null,
      };
    })
    .sort((a, b) => new Date(b.signupAt).getTime() - new Date(a.signupAt).getTime());

  return <AdminClient rows={rows} totalUsers={rows.length} />;
};

export default AdminPage;
