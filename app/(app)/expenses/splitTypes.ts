// Tipos y estado del editor de división (split) de un gasto.

export type ContactLite = {
  id: string;
  name: string;
  is_self: boolean;
  is_split_only?: boolean;
};

export type SplitMode = 'equal' | 'percentage' | 'fixed' | 'items' | null;

export type SplitItem = { name: string; price: number; contact_ids: string[] };

export type SplitState = {
  mode: SplitMode;
  paidById: string | null;
  participantIds: string[];
  values: Record<string, string>;
  items: SplitItem[];
};

export const emptySplitState = (): SplitState => ({
  mode: null,
  paidById: null,
  participantIds: [],
  values: {},
  items: [],
});
