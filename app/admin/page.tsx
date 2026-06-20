import { createServiceClient } from '@/lib/supabase/service';
import { searchAuthUsers, type AuthUserLite } from '@/lib/admin/users';
import { ADMIN_PAGE_SIZE } from '@/lib/pagination';
import { currentWaMonthKey, WA_MONTHLY_CAP } from '@/lib/notifications/waLimits';
import { parsePlanType } from '@/lib/plans';
import { AdminClient, type AdminRow } from './AdminClient';
import { monthUsage, todayUsage } from '@/lib/billing/geminiUsage';
import { Sparkles } from 'lucide-react';

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
    const { data: usersResp } = await supabase.auth.admin.listUsers({
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

  // Uso de Gemini: traemos día actual y mes para mostrar costo estimado al admin
  // (no aparece en otra UI, esto es solo para vos).
  const [todayG, monthG] = await Promise.all([todayUsage(), monthUsage()]);
  const monthlyCap = Number(process.env.ADMIN_GEMINI_MONTHLY_CAP_USD ?? '20');
  const dailyThreshold = Number(process.env.ADMIN_GEMINI_DAILY_THRESHOLD_USD ?? '1');
  const overDaily = todayG.total > dailyThreshold;
  const overMonthly = monthG.total > monthlyCap;

  return (
    <>
      <div className="kumo-card p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 grid place-items-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Gemini usage</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Costo estimado (USD)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`rounded-xl border p-3 ${overDaily ? 'border-rose-300 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Hoy</p>
            <p className="text-2xl font-bold tabular-nums">${todayG.total.toFixed(3)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {todayG.calls.ocr} OCR · {todayG.calls.nlp} NLP · alerta &gt; ${dailyThreshold.toFixed(2)}
            </p>
          </div>
          <div className={`rounded-xl border p-3 ${overMonthly ? 'border-rose-300 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Este mes</p>
            <p className="text-2xl font-bold tabular-nums">${monthG.total.toFixed(2)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {monthG.calls.ocr} OCR · {monthG.calls.nlp} NLP · cap ${monthlyCap.toFixed(0)}
            </p>
          </div>
        </div>
      </div>

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
    </>
  );
};

export default AdminPage;
