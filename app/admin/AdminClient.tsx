'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Gift, XCircle, Clock, Sparkles, Loader2, Camera } from 'lucide-react';
import { grantPro, cancelAtPeriodEnd, extendTrial, adjustPlan } from './actions';
import { planIncludesOcr, planIncludesWa } from '@/lib/plans';
import type { PlanProduct } from '@/lib/plans';
import { Pagination } from '@/components/Pagination';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useT } from '@/lib/i18n/client';

export type AdminRow = {
  id: string;
  email: string;
  name: string | null;
  signupAt: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'free';
  planType: PlanProduct | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  provider: string | null;
  waMessagesThisMonth: number;
};

type Props = {
  rows: AdminRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
  stats: { active: number; trial: number; free: number };
  searchQuery?: string;
  waMonthlyCap?: number;
};

type PendingGrant = 'grant-3' | 'grant-life' | 'trial-ext' | 'cancel-end' | null;

type ConfirmDlg = {
  description: string;
  successLabel: string;
  action: () => Promise<{ ok: boolean; error?: string }>;
};

// Solo otorgamos OCR (que incluye agregar gastos desde la búsqueda / NLP).
// WA y Bundle quedan fuera del grant para no activar WhatsApp por error.
const PLAN_OPTIONS: { id: PlanProduct; icon: typeof Camera }[] = [
  { id: 'ocr', icon: Camera },
];

export const AdminClient = ({ rows, page, pageSize, totalCount, hasMore, stats, searchQuery = '', waMonthlyCap = 200 }: Props) => {
  const { t } = useT();
  const a = t.admin;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchQuery);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [grantPlan, setGrantPlan] = useState<PlanProduct>('ocr');
  const serverSearch = searchQuery.length > 0;

  useEffect(() => {
    setQ(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const trimmed = q.trim();
      if (trimmed === searchQuery) return;
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) params.set('q', trimmed);
      else params.delete('q');
      params.delete('page');
      router.replace(`/admin?${params.toString()}`);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [q, searchQuery, searchParams, router]);

  const filtered = useMemo(() => {
    const needle = serverSearch ? '' : q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && computeTier(r) !== statusFilter) return false;
      if (!needle) return true;
      return r.email.toLowerCase().includes(needle) || (r.name ?? '').toLowerCase().includes(needle);
    });
  }, [rows, q, statusFilter, serverSearch]);

  const filterLabel = (s: 'all' | 'active' | 'trial' | 'free') =>
    s === 'all' ? a.filter_all
    : s === 'active' ? a.filter_active
    : s === 'trial' ? a.filter_trial
    : a.filter_free;

  const planLabel = (p: PlanProduct | null) =>
    p === 'ocr' ? a.plan_ocr
    : p === 'wa' ? a.plan_wa
    : p === 'bundle' ? a.plan_bundle
    : null;

  const onPageChange = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    router.push(`/admin?${params.toString()}`);
  };

  const displayTotal = statusFilter !== 'all' ? filtered.length : totalCount;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{a.title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {a.subtitle
            .replace('{total}', hasMore ? `${totalCount}+` : String(totalCount))
            .replace('{active}', String(stats.active))
            .replace('{trial}', String(stats.trial))
            .replace('{free}', String(stats.free))}
        </p>
      </header>

      <div className="kumo-card p-3 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={a.search_placeholder}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['all', 'active', 'trial', 'free'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium ${
                  statusFilter === s
                    ? 'kumo-gradient text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {filterLabel(s)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/50">
          <span className="text-xs text-slate-500 dark:text-slate-400 w-full sm:w-auto">{a.grant_plan_label}</span>
          {PLAN_OPTIONS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setGrantPlan(id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                grantPlan === id
                  ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {planLabel(id)}
            </button>
          ))}
          <span className="text-[11px] text-slate-400 dark:text-slate-500 w-full">{a.grant_plan_hint}</span>
        </div>
      </div>

      <div className="kumo-card overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
          <div className="col-span-3">{a.col_user}</div>
          <div className="col-span-2">{a.col_status}</div>
          <div className="col-span-2">{a.col_plan}</div>
          <div className="col-span-2">{a.col_expires}</div>
          <div className="col-span-3 text-right">{a.col_actions}</div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-10">{a.no_results}</p>
          ) : (
            filtered.map((r) => (
              <Row key={r.id} row={r} grantPlan={grantPlan} planLabel={planLabel} waMonthlyCap={waMonthlyCap} />
            ))
          )}
        </div>
        {statusFilter === 'all' && (serverSearch || !q.trim()) && (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={displayTotal}
            hasMore={hasMore}
            onPageChange={onPageChange}
          />
        )}
      </div>
    </div>
  );
};

const computeTier = (r: AdminRow): 'active' | 'trial' | 'free' => {
  const now = Date.now();
  if (r.status === 'free') return 'free';
  if (r.status === 'active') return 'active';
  if (r.status === 'trialing') {
    if (r.trialEndsAt && new Date(r.trialEndsAt).getTime() > now) return 'trial';
    return 'free';
  }
  if (r.status === 'canceled' && r.currentPeriodEnd && new Date(r.currentPeriodEnd).getTime() > now) {
    return 'active';
  }
  return 'free';
};

const Row = ({
  row,
  grantPlan,
  planLabel,
  waMonthlyCap,
}: {
  row: AdminRow;
  grantPlan: PlanProduct;
  planLabel: (p: PlanProduct | null) => string | null;
  waMonthlyCap: number;
}) => {
  const { t } = useT();
  const a = t.admin;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingGrant, setPendingGrant] = useState<PendingGrant>(null);
  const [confirmDlg, setConfirmDlg] = useState<ConfirmDlg | null>(null);
  const [dialogPending, setDialogPending] = useState(false);

  const tier = computeTier(row);
  const plan = row.planType;
  const venceDate = tier === 'trial' ? row.trialEndsAt : row.currentPeriodEnd;

  const runAction = (
    successLabel: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
    onDone?: () => void,
  ) => {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(`${successLabel}: ${row.email}`);
        onDone?.();
        router.refresh();
      } else {
        toast.error(result.error ?? t.common.error);
      }
      setPendingGrant(null);
    });
  };

  const runGrant = (key: PendingGrant, successLabel: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setPendingGrant(key);
    runAction(successLabel, fn);
  };

  const openConfirm = (description: string, successLabel: string, action: () => Promise<{ ok: boolean; error?: string }>) => {
    setConfirmDlg({ description, successLabel, action });
  };

  const onConfirmDialog = async () => {
    if (!confirmDlg) return;
    const dlg = confirmDlg;
    setDialogPending(true);
    try {
      const result = await dlg.action();
      if (result.ok) {
        toast.success(`${dlg.successLabel}: ${row.email}`);
        setConfirmDlg(null);
        router.refresh();
      } else {
        toast.error(result.error ?? t.common.error);
      }
    } finally {
      setDialogPending(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 items-center text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
        <div className="md:col-span-3 min-w-0">
          <p className="font-medium truncate">{row.name ?? row.email.split('@')[0]}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{row.email}</p>
        </div>
        <div className="md:col-span-2">
          <TierBadge tier={tier} />
        </div>
        <div className="md:col-span-2">
          {tier !== 'free' && plan ? (
            <div className="space-y-1">
              <div className="flex flex-wrap gap-1">
                <FeatureChip on={planIncludesOcr(plan)} label="OCR" />
                <FeatureChip on={planIncludesWa(plan)} label="WA" />
              </div>
              {planIncludesWa(plan) && (
                <p className={`text-[10px] font-medium ${
                  row.waMessagesThisMonth >= waMonthlyCap * 0.85
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>
                  {a.wa_usage_month
                    .replace('{used}', String(row.waMessagesThisMonth))
                    .replace('{cap}', String(waMonthlyCap))}
                </p>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
        <div className="md:col-span-2 text-xs text-slate-600 dark:text-slate-300">
          {venceDate ? new Date(venceDate).toLocaleDateString() : '—'}
        </div>
        <div className="md:col-span-3 space-y-1.5 md:text-right">
          <div className="flex flex-wrap gap-1 md:justify-end">
            <span className="text-[10px] text-slate-400 w-full md:w-auto md:mr-1 self-center">{a.grant_row_label}</span>
            <ActionButton
              icon={<Gift className="w-3.5 h-3.5" />}
              label={a.grant_3m.replace('{plan}', planLabel(grantPlan) ?? '')}
              loading={pending && pendingGrant === 'grant-3'}
              onClick={() => runGrant('grant-3', a.toast_grant_3m, () => grantPro(row.email, 3, grantPlan))}
            />
            <ActionButton
              icon={<Sparkles className="w-3.5 h-3.5" />}
              label={a.lifetime.replace('{plan}', planLabel(grantPlan) ?? '')}
              loading={pending && pendingGrant === 'grant-life'}
              onClick={() => runGrant('grant-life', a.toast_lifetime, () => grantPro(row.email, 1200, grantPlan))}
            />
            <ActionButton
              icon={<Clock className="w-3.5 h-3.5" />}
              label={a.trial_ext.replace('{plan}', planLabel(grantPlan) ?? '')}
              loading={pending && pendingGrant === 'trial-ext'}
              onClick={() => runGrant('trial-ext', a.toast_trial_ext, () => extendTrial(row.email, 30, grantPlan))}
            />
          </div>
          {tier !== 'free' && (
            <div className="flex flex-wrap gap-1 md:justify-end">
              <span className="text-[10px] text-slate-400 w-full md:w-auto md:mr-1 self-center">{a.revoke_row_label}</span>
              {plan && planIncludesOcr(plan) && (
                <ActionButton
                  icon={<XCircle className="w-3.5 h-3.5" />}
                  label={plan === 'bundle' ? a.revoke_ocr_combo : a.revoke_ocr}
                  danger
                  loading={false}
                  onClick={() => openConfirm(
                    (plan === 'bundle' ? a.confirm_revoke_ocr_combo : a.confirm_revoke_ocr).replace('{email}', row.email),
                    a.toast_revoke_ocr,
                    () => adjustPlan(row.email, 'remove_ocr'),
                  )}
                />
              )}
              {plan && planIncludesWa(plan) && (
                <ActionButton
                  icon={<XCircle className="w-3.5 h-3.5" />}
                  label={plan === 'bundle' ? a.revoke_wa_combo : a.revoke_wa}
                  danger
                  loading={false}
                  onClick={() => openConfirm(
                    (plan === 'bundle' ? a.confirm_revoke_wa_combo : a.confirm_revoke_wa).replace('{email}', row.email),
                    a.toast_revoke_wa,
                    () => adjustPlan(row.email, 'remove_wa'),
                  )}
                />
              )}
              <ActionButton
                icon={<XCircle className="w-3.5 h-3.5" />}
                label={a.cancel_now}
                danger
                loading={false}
                onClick={() => openConfirm(
                  a.confirm_cancel.replace('{email}', row.email),
                  a.toast_cancel_now,
                  () => adjustPlan(row.email, 'remove_all'),
                )}
              />
              <ActionButton
                icon={<XCircle className="w-3.5 h-3.5" />}
                label={a.cancel_end}
                loading={pending && pendingGrant === 'cancel-end'}
                onClick={() => runGrant('cancel-end', a.toast_cancel_end, () => cancelAtPeriodEnd(row.email))}
              />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDlg !== null}
        onClose={() => { if (!dialogPending) setConfirmDlg(null); }}
        onConfirm={onConfirmDialog}
        title={a.confirm_title}
        description={confirmDlg?.description ?? ''}
        confirmLabel={a.confirm_button}
        loading={dialogPending}
        closeOnConfirm={false}
      />
    </>
  );
};

const FeatureChip = ({ on, label }: { on: boolean; label: string }) => (
  <span
    className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold ${
      on
        ? 'bg-mint-100 text-mint-700 dark:bg-mint-500/20 dark:text-mint-200'
        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 line-through'
    }`}
  >
    {label}
  </span>
);

const TierBadge = ({ tier }: { tier: 'active' | 'trial' | 'free' }) => {
  const { t } = useT();
  const a = t.admin;
  const styles =
    tier === 'active' ? 'bg-mint-100 text-mint-700 dark:bg-mint-500/20 dark:text-mint-200'
    : tier === 'trial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  const label = tier === 'active' ? a.tier_pro : tier === 'trial' ? a.tier_trial : a.tier_free;
  return <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${styles}`}>{label}</span>;
};

const ActionButton = ({
  icon, label, loading, danger, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  loading: boolean;
  danger?: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border disabled:opacity-50 ${
      danger
        ? 'border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20'
        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
    {label}
  </button>
);
