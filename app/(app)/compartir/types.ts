export type BalanceRow = {
  contact_id: string;
  contact_name: string;
  net_amount: number;
  currency: string;
};

export type ContactLite = {
  id: string;
  name: string;
  is_self: boolean;
};

export type PaymentRow = {
  id: string;
  from_contact_id: string;
  to_contact_id: string;
  amount: number;
  currency: string;
  note: string | null;
  paid_at: string;
};
