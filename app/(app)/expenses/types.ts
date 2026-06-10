// Tipos compartidos por los componentes de la feature de gastos.

export type CategoryLite = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type ContactLite = {
  id: string;
  name: string;
  relationship: string;
  is_self: boolean;
  phone: string | null;
  is_split_only: boolean;
};

export type Expense = {
  id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  description: string | null;
  expense_date: string;
  due_date: string | null;
  paid: boolean;
  is_recurring: boolean;
  recurrence_type: string | null;
  notify_contact_ids: string[];
  categories: CategoryLite | null;
};

export type SplitDetail = {
  contact_id: string;
  contact_name: string;
  amount: number | null;
  percentage: number | null;
};

// Algunos gastos vienen con sus splits adjuntos para previsualizar en la lista.
export type ExpenseWithSplits = Expense & { _splits?: SplitDetail[] };
