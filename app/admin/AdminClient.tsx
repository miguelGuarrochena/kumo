'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Gift, XCircle, Clock, Sparkles, Loader2 } from 'lucide-react';
import { grantPro, cancelImmediate, cancelAtPeriodEnd, extendTrial } from './actions';

export type AdminRow = {
  id: string;
  email: string;
  name: string | null;
  signupAt: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'free';
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  provider: string | null;
};

type Props = {
  rows: AdminRow[];
  totalUsers: number;
};

export const AdminClient = ({ rows, totalUsers }: Props) => {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && computeTier(r) !== statusFilter) return false;
      if (!needle) return true;
      return r.email.toLowerCase().includes(needle) || (r.name ?? '').toLowerCase().includes(needle);
    });
  }, [rows, q, statusFilter]);

  const stats = useMemo(() => {
    let active = 0, trial = 0, free = 0;
    for (const r of rows) {
      const tier = computeTier(r);
      if (tier === 'active') active++;
      else if (tier === 'trial') trial++;
      else free++;
    }
    return { active, trial, free };
  }, [rows]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {totalUsers} usuarios · {stats.active} pagos · {stats.trial} en trial · {stats.free} free
        </p>
      </header>

      <div className="kumo-card p-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por email o nombre..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        <div className="flex gap-1">
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
              {s === 'all' ? 'Todos' : s === 'active' ? 'Pagos' : s === 'trial' ? 'Trial' : 'Free'}
            </button>
          ))}
        </div>
      </div>

      <div className="kumo-card overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
          <div className="col-span-4">Usuario</div>
          <div className="col-span-2">Estado</div>
          <div className="col-span-3">Vence</div>
          <div className="col-span-3 text-right">Acciones</div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-10">Sin resultados.</p>
          ) : (
            filtered.map((r) => <Row key={r.id} row={r} />)
          )}
        </div>
      </div>
    </div>
  );
};

const computeTier = (r: AdminRow): 'active' | 'trial' | 'free' => {
  const now = Date.now();
  if (r.status === 'active') return 'active';
  if (r.status === 'trialing' && r.trialEndsAt && new Date(r.trialEndsAt).getTime() > now) return 'trial';
  if (r.status === 'canceled' && r.currentPeriodEnd && new Date(r.currentPeriodEnd).getTime() > now) return 'active';
  return 'free';
};

const Row = ({ row }: { row: AdminRow }) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const tier = computeTier(row);
  const venceDate = tier === 'trial' ? row.trialEndsAt : row.currentPeriodEnd;

  const run = (label: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(`${label}: ${row.email}`);
        router.refresh();
      } else {
        toast.error(r.error ?? 'Error');
      }
      setConfirmAction(null);
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 items-center text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <div className="md:col-span-4 min-w-0">
        <p className="font-medium truncate">{row.name ?? row.email.split('@')[0]}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{row.email}</p>
      </div>
      <div className="md:col-span-2">
        <TierBadge tier={tier} />
      </div>
      <div className="md:col-span-3 text-xs text-slate-600 dark:text-slate-300">
        {venceDate ? new Date(venceDate).toLocaleDateString() : '—'}
      </div>
      <div className="md:col-span-3 flex flex-wrap gap-1 md:justify-end">
        <ActionButton
          icon={<Gift className="w-3.5 h-3.5" />}
          label="Regalar 3m"
          loading={pending && confirmAction === 'grant-3'}
          onClick={() => { setConfirmAction('grant-3'); run('Pro x3 meses concedido', () => grantPro(row.email, 3)); }}
        />
        <ActionButton
          icon={<Sparkles className="w-3.5 h-3.5" />}
          label="Lifetime"
          loading={pending && confirmAction === 'grant-life'}
          onClick={() => { setConfirmAction('grant-life'); run('Lifetime concedido', () => grantPro(row.email, 1200)); }}
        />
        <ActionButton
          icon={<Clock className="w-3.5 h-3.5" />}
          label="+30 trial"
          loading={pending && confirmAction === 'trial-ext'}
          onClick={() => { setConfirmAction('trial-ext'); run('Trial extendido +30 días', () => extendTrial(row.email, 30)); }}
        />
        <ActionButton
          icon={<XCircle className="w-3.5 h-3.5" />}
          label="Cancelar ya"
          danger
          loading={pending && confirmAction === 'cancel-now'}
          onClick={() => {
            if (!confirm(`Cancelar Pro INMEDIATAMENTE para ${row.email}?`)) return;
            setConfirmAction('cancel-now');
            run('Pro cancelado', () => cancelImmediate(row.email));
          }}
        />
        <ActionButton
          icon={<XCircle className="w-3.5 h-3.5" />}
          label="Cancelar fin"
          loading={pending && confirmAction === 'cancel-end'}
          onClick={() => {
            setConfirmAction('cancel-end');
            run('Cancelará al fin del período', () => cancelAtPeriodEnd(row.email));
          }}
        />
      </div>
    </div>
  );
};

const TierBadge = ({ tier }: { tier: 'active' | 'trial' | 'free' }) => {
  const styles =
    tier === 'active' ? 'bg-mint-100 text-mint-700 dark:bg-mint-500/20 dark:text-mint-200'
    : tier === 'trial' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
    : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  const label = tier === 'active' ? 'Pro' : tier === 'trial' ? 'Trial' : 'Free';
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
