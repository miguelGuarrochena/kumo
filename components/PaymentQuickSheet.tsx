'use client';

import { Sheet } from '@/components/Sheet';
import { PaymentAssistPanel } from '@/components/PaymentAssistPanel';
import { useT } from '@/lib/i18n/client';
import { formatMoney, type Currency } from '@/lib/currency';

export type PaymentQuickCreditor = {
  id: string;
  name: string;
  mp_alias?: string | null;
  mp_payment_link?: string | null;
  phone?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  creditor: PaymentQuickCreditor | null;
  amount: number;
  currency: string;
  concept?: string;
  debtorName?: string;
};

export const PaymentQuickSheet = ({
  open,
  onClose,
  creditor,
  amount,
  currency,
  concept,
  debtorName,
}: Props) => {
  const { t, locale } = useT();

  if (!creditor) return null;

  const title = debtorName
    ? t.split.pay_quick_title_debtor
        .replace('{debtor}', debtorName)
        .replace('{amount}', formatMoney(amount, currency as Currency, locale))
    : t.split.pay_quick_title_collect.replace(
        '{amount}',
        formatMoney(amount, currency as Currency, locale),
      );

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <PaymentAssistPanel
        creditorName={creditor.name}
        mpAlias={creditor.mp_alias}
        mpPaymentLink={creditor.mp_payment_link}
        amount={amount}
        currency={currency}
        concept={concept}
        whatsappPhone={creditor.phone}
      />
    </Sheet>
  );
};
