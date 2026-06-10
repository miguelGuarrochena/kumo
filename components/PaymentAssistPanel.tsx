'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Link2, MessageCircle, QrCode } from 'lucide-react';
import { OpenMercadoPagoButton } from '@/components/OpenMercadoPagoButton';
import QRCode from 'qrcode';
import { useT } from '@/lib/i18n/client';
import { formatMoney, type Currency } from '@/lib/currency';
import {
  buildPaymentQrPayload,
  copyPaymentDetails,
  hasPaymentAssist,
  openPaymentLink,
  type PaymentAssistInfo,
} from '@/lib/paymentAssist';

type Props = {
  creditorName: string;
  mpAlias?: string | null;
  mpPaymentLink?: string | null;
  amount: number;
  currency: string;
  concept?: string;
  /** Si hay teléfono, WhatsApp abre chat directo; si no, compartir genérico. */
  whatsappPhone?: string | null;
  compact?: boolean;
};

export const PaymentAssistPanel = ({
  creditorName,
  mpAlias,
  mpPaymentLink,
  amount,
  currency,
  concept,
  whatsappPhone,
  compact = false,
}: Props) => {
  const { t, locale } = useT();
  const [qrOpen, setQrOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const info: PaymentAssistInfo = {
    creditorName,
    mpAlias,
    mpPaymentLink,
    amount,
    currency,
    concept,
    locale,
  };

  const ready = amount > 0;
  const hasMp = hasPaymentAssist(info);
  const showQr = !!(mpAlias?.trim() && ready);

  useEffect(() => {
    if (!qrOpen || !showQr || !canvasRef.current) return;
    const payload = buildPaymentQrPayload(info);
    QRCode.toCanvas(canvasRef.current, payload, {
      width: compact ? 160 : 200,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).catch(() => {});
  }, [qrOpen, showQr, mpAlias, amount, concept, compact]);

  if (!ready) return null;

  const onCopy = async () => {
    const ok = await copyPaymentDetails(info, t);
    if (ok) toast.success(t.split.pay_copied);
    else toast.error(t.split.copy_failed);
  };

  const onWhatsApp = () => {
    const amountStr = formatMoney(amount, currency as Currency, locale);
    const lines = [
      t.split.pay_wa_intro
        .replace('{name}', creditorName)
        .replace('{amount}', amountStr),
    ];
    if (concept) lines.push(concept);
    if (mpAlias?.trim()) lines.push(t.split.pay_wa_alias.replace('{alias}', mpAlias.trim()));
    if (mpPaymentLink?.trim()) lines.push(t.split.pay_wa_link.replace('{link}', mpPaymentLink.trim()));

    const text = encodeURIComponent(lines.join('\n'));
    const phone = whatsappPhone?.replace(/\D/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50/80 dark:bg-sky-500/10 ${
        compact ? 'p-3 space-y-2' : 'p-4 space-y-3'
      }`}
    >
      <div>
        <p className={`font-semibold text-sky-900 dark:text-sky-100 ${compact ? 'text-xs' : 'text-sm'}`}>
          {t.split.pay_title.replace('{amount}', formatMoney(amount, currency as Currency, locale))}
        </p>
        <p className="text-[11px] text-sky-700/80 dark:text-sky-300/80 mt-0.5">
          {t.split.pay_subtitle.replace('{name}', creditorName)}
        </p>
        {mpAlias?.trim() && (
          <p className="text-xs font-mono mt-1.5 text-sky-800 dark:text-sky-200 truncate">
            {mpAlias.trim()}
          </p>
        )}
      </div>

      {!hasMp && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.split.pay_no_alias_hint}
        </p>
      )}

      <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Copy className="w-3.5 h-3.5 shrink-0" />
          {t.split.pay_copy_btn}
        </button>
        <OpenMercadoPagoButton compact className="w-full" />
        <button
          type="button"
          onClick={onWhatsApp}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-mint-200 dark:border-mint-500/30 text-mint-700 dark:text-mint-300 text-xs font-medium hover:bg-mint-50 dark:hover:bg-mint-500/10"
        >
          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
          {t.split.whatsapp}
        </button>
        {mpPaymentLink?.trim() && (
          <button
            type="button"
            onClick={() => openPaymentLink(mpPaymentLink)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Link2 className="w-3.5 h-3.5 shrink-0" />
            {t.split.pay_link_btn}
          </button>
        )}
      </div>

      {showQr && (
        <div>
          <button
            type="button"
            onClick={() => setQrOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-300 hover:underline"
          >
            <QrCode className="w-3.5 h-3.5" />
            {qrOpen ? t.split.pay_qr_hide : t.split.pay_qr_show}
          </button>
          {qrOpen && (
            <div className="mt-3 flex flex-col items-center gap-2">
              <canvas ref={canvasRef} className="rounded-lg bg-white p-2" />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center max-w-[14rem]">
                {t.split.pay_qr_hint}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
