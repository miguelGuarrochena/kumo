import { createServiceClient } from '@/lib/supabase/service';
import { ADMIN_PAGE_SIZE } from '@/lib/pagination';
import { parsePlanType } from '@/lib/plans';
import { AdminClient, type AdminRow } from './AdminClient';

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

type SearchParams = { page?: string };

const AdminPage = async ({ searchParams }: { searchParams: Promise<SearchParams> }) => {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: usersResp } = await (supabase as any).auth.admin.listUsers({
    page,
    perPage: ADMIN_PAGE_SIZE,
  });
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id, status, trial_ends_at, current_period_end, provider, plan_type, updated_at');

  type AuthUser = { id: string; email: string | null; created_at: string; user_metadata?: { full_name?: string } };
  type SubRow = {
    user_id: string;
    status: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
    provider: string;
    plan_type: string | null;
    updated_at: string;
  };

  const subsByUser = new Map<string, SubRow>(
    ((subs ?? []) as SubRow[]).map((s) => [s.user_id, s]),
  );

  const pageUsers = ((usersResp?.users ?? []) as AuthUser[]);
  const hasMore = pageUsers.length === ADMIN_PAGE_SIZE;

  const rows: AdminRow[] = pageUsers
    .map((u) => {
      const s = subsByUser.get(u.id);
      return {
        id: u.id,
        email: u.email ?? '',
        name: u.user_metadata?.full_name ?? null,
        signupAt: u.created_at,
        status: (s?.status ?? 'free') as AdminRow['status'],
        planType: parsePlanType(s?.plan_type),
        trialEndsAt: s?.trial_ends_at ?? null,
        currentPeriodEnd: s?.current_period_end ?? null,
        provider: s?.provider ?? null,
      };
    })
    .sort((a, b) => new Date(b.signupAt).getTime() - new Date(a.signupAt).getTime());

  let active = 0;
  let trial = 0;
  const now = Date.now();
  for (const s of (subs ?? []) as SubRow[]) {
    if (s.status === 'active') active++;
    else if (s.status === 'trialing' && s.trial_ends_at && new Date(s.trial_ends_at).getTime() > now) trial++;
    else if (s.status === 'canceled' && s.current_period_end && new Date(s.current_period_end).getTime() > now) active++;
  }
  const estimatedTotal = hasMore
    ? page * ADMIN_PAGE_SIZE + 1
    : (page - 1) * ADMIN_PAGE_SIZE + rows.length;
  const free = hasMore ? 0 : Math.max(0, estimatedTotal - active - trial);

  return (
    <AdminClient
      rows={rows}
      page={page}
      pageSize={ADMIN_PAGE_SIZE}
      totalCount={estimatedTotal}
      hasMore={hasMore}
      stats={{ active, trial, free }}
    />
  );
};

export default AdminPage;
