'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Check, ExternalLink, Loader2 } from 'lucide-react';
import type { SubscriptionInfo } from '@/lib/subscription';

type Props = { sub: SubscriptionInfo };

export const PlanSection = ({ sub }: Props) => {
  const [loading, setLoading] = useState<'monthly' | 'yearly' | 'portal' | null>(null);

  const openCheckout = async (interval: 'monthly' | 'yearly') => {
    setLoading(interval);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: interval === 'yearly' ? 'year' : 'month' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? 'No se pudo abrir el checkout');
    } catch {
      toast.error('Error al conectar con Stripe');
    } finally {
      setLoading(null);
    }
  };

  const openPortal = async () => {
    setLoading('portal');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.error ?? 'No se pudo abrir el portal');
    } catch {
      toast.error('Error al conectar con Stripe');
    } finally {
      setLoading(null);
    }
  };

  const isPro = sub.tier === 'pro';
  const isTrial = sub.status === 'trialing';
  const isPaying = sub.status === 'active';

  return (
    <div id="plan" className="kumo-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 grid place-items-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">Plan</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isPaying && 'Sos Pro. Gracias por bancar Kumo.'}
            {isTrial && sub.daysLeftInTrial !== null && (
              <>Prueba gratis — {sub.daysLeftInTrial} {sub.daysLeftInTrial === 1 ? 'día restante' : 'días restantes'}.</>
            )}
            {!isPro && 'Tu prueba terminó. Suscribite para reactivar features Pro.'}
          </p>
        </div>
      </div>

      {isPaying ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-mint-200 dark:border-mint-500/30 bg-mint-50 dark:bg-mint-500/10 p-3">
            <div className="flex items-start gap-2 text-sm text-mint-700 dark:text-mint-200">
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Suscripción activa</p>
                {sub.currentPeriodEnd && (
                  <p className="text-xs opacity-80 mt-0.5">
                    Próximo cobro: {sub.currentPeriodEnd.toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={openPortal}
            disabled={loading === 'portal'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {loading === 'portal' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Manejar suscripción
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <PlanCard
            title="Mensual"
            price="USD 3"
            period="/ mes"
            highlight={false}
            loading={loading === 'monthly'}
            onClick={() => openCheckout('monthly')}
          />
          <PlanCard
            title="Anual"
            price="USD 30"
            period="/ año"
            saveLabel="Ahorrás USD 6"
            highlight
            loading={loading === 'yearly'}
            onClick={() => openCheckout('yearly')}
          />
        </div>
      )}

      {!isPaying && (
        <ul className="mt-4 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
          <Feature>OCR de tickets desde foto (extracción automática)</Feature>
          <Feature>Notificaciones por WhatsApp</Feature>
          <Feature>Espacios compartidos ilimitados</Feature>
          <Feature>Soporte prioritario y nuevas funciones primero</Feature>
        </ul>
      )}
    </div>
  );
};

const PlanCard = ({
  title, price, period, saveLabel, highlight, loading, onClick,
}: {
  title: string;
  price: string;
  period: string;
  saveLabel?: string;
  highlight: boolean;
  loading: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className={`relative text-left rounded-xl border-2 p-4 transition-all hover:scale-[1.01] disabled:opacity-50 ${
      highlight
        ? 'border-amber-300 dark:border-amber-500/50 bg-amber-50/60 dark:bg-amber-500/5'
        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
    }`}
  >
    {saveLabel && (
      <span className="absolute -top-2 right-3 text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-medium">
        {saveLabel}
      </span>
    )}
    <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">{title}</p>
    <div className="mt-1.5 flex items-baseline gap-1">
      <span className="text-2xl font-bold">{price}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400">{period}</span>
    </div>
    <div className="mt-3 text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      {loading ? 'Abriendo...' : 'Suscribirme'}
    </div>
  </button>
);

const Feature = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2">
    <Check className="w-4 h-4 mt-0.5 text-mint-500 shrink-0" />
    <span>{children}</span>
  </li>
);
