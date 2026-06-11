import { createServiceClient } from '@/lib/supabase/service';
import { searchAuthUsers, type AuthUserLite } from '@/lib/admin/users';
import { ADMIN_PAGE_SIZE } from '@/lib/pagination';
import { currentWaMonthKey, WA_MONTHLY_CAP } from '@/lib/notifications/waLimits';
import { parsePlanType } from '@/lib/plans';
import { AdminClient, type AdminRow } from './AdminClient';

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

type SearchParams = { page?: string; q?: string };

type SubRow = {
  user_id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  provider: string;
  plan_type: string | null;
  updated_at: string;
};

const toAdminRow = (
  u: AuthUserLite,
  subsByUser: Map<string, SubRow>,
  waByUser: Map<string, number>,
): AdminRow => {
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
    waMessagesThisMonth: waByUser.get(u.id) ?? 0,
  };
};

const AdminPage = async ({ searchParams }: { searchParams: Promise<SearchParams> }) => {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = (params.q ?? '').trim();

  const supabase = createServiceClient();
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_id, status, trial_ends_at, current_period_end, provider, plan_type, updated_at');

  const subsByUser = new Map<string, SubRow>(
    ((subs ?? []) as SubRow[]).map((s) => [s.user_id, s]),
  );

  let pageUsers: AuthUserLite[] = [];
  let hasMore = false;
  let totalCount = 0;

  if (query) {
    const matches = await searchAuthUsers(query);
    totalCount = matches.length;
    const start = (page - 1) * ADMIN_PAGE_SIZE;
    pageUsers = matches.slice(start, start + ADMIN_PAGE_SIZE);
    hasMore = start + ADMIN_PAGE_SIZE < matches.length;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: usersResp } = await (supabase as any).auth.admin.listUsers({
      page,
      perPage: ADMIN_PAGE_SIZE,
    });
    pageUsers = (usersResp?.users ?? []) as AuthUserLite[];
    hasMore = pageUsers.length === ADMIN_PAGE_SIZE;
    totalCount = hasMore
      ? page * ADMIN_PAGE_SIZE + 1
      : (page - 1) * ADMIN_PAGE_SIZE + pageUsers.length;
  }

  const waMonth = currentWaMonthKey();
  const pageUserIds = pageUsers.map((u) => u.id);
  const { data: waUsageRaw } = pageUserIds.length > 0
    ? await supabase
        .from('wa_usage')
        .select('user_id, count')
        .eq('month', waMonth)
        .in('user_id', pageUserIds)
    : { data: [] };

  const waByUser = new Map<string, number>(
    ((waUsageRaw ?? []) as { user_id: string; count: number }[]).map((r) => [r.user_id, r.count]),
  );

  const rows: AdminRow[] = pageUsers
    .map((u) => toAdminRow(u, subsByUser, waByUser))
    .sort((a, b) => new Date(b.signupAt).getTime() - new Date(a.signupAt).getTime());

  let active = 0;
  let trial = 0;
  const now = Date.now();
  for (const s of (subs ?? []) as SubRow[]) {
    if (s.status === 'active') active++;
    else if (s.status === 'trialing' && s.trial_ends_at && new Date(s.trial_ends_at).getTime() > now) trial++;
    else if (s.status === 'canceled' && s.current_period_end && new Date(s.current_period_end).getTime() > now) active++;
  }
  const free = hasMore && !query ? 0 : Math.max(0, totalCount - active - trial);

  return (
    <AdminClient
      rows={rows}
      page={page}
      pageSize={ADMIN_PAGE_SIZE}
      totalCount={query ? totalCount : totalCount}
      hasMore={hasMore}
      stats={{ active, trial, free }}
      searchQuery={query}
      waMonthlyCap={WA_MONTHLY_CAP}
    />
  );
};

export default AdminPage;
