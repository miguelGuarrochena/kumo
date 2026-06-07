'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/workspace';

export type SplitInput = {
  contactId: string;
  amount?: number;
  percentage?: number;
};

type Result = { ok: boolean; error?: string };

export type ItemBreakdown = {
  name: string;
  price: number;
  contact_ids: string[];
};

export const saveSplits = async (params: {
  expenseId: string;
  mode: 'equal' | 'percentage' | 'fixed' | 'items' | null;
  paidByContactId: string | null;
  splits: SplitInput[];
  items?: ItemBreakdown[];
}): Promise<Result> => {
  try { await requireAdmin(); } catch (e) { return { ok: false, error: (e as Error).message }; }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updErr } = await (supabase.from('expenses') as any)
    .update({
      split_mode: params.mode,
      paid_by_contact_id: params.paidByContactId,
      items_breakdown: params.mode === 'items' ? (params.items ?? null) : null,
    })
    .eq('id', params.expenseId);
  if (updErr) return { ok: false, error: updErr.message };

  await supabase.from('expense_splits').delete().eq('expense_id', params.expenseId);

  // Modo 'items': generamos los splits derivados de la asignación de items.
  // Cada item con N personas se divide en partes iguales entre ellas.
  let rowsToInsert: Array<{ expense_id: string; contact_id: string; amount: number | null; percentage: number | null }> = [];

  if (params.mode === 'items' && params.items && params.items.length > 0) {
    const totals = new Map<string, number>();
    for (const it of params.items) {
      if (it.contact_ids.length === 0) continue;
      const portion = it.price / it.contact_ids.length;
      for (const cid of it.contact_ids) {
        totals.set(cid, (totals.get(cid) ?? 0) + portion);
      }
    }
    rowsToInsert = [...totals.entries()].map(([cid, amt]) => ({
      expense_id: params.expenseId,
      contact_id: cid,
      amount: Math.round(amt * 100) / 100,
      percentage: null,
    }));
  } else if (params.mode && params.splits.length > 0) {
    rowsToInsert = params.splits.map((s) => ({
      expense_id: params.expenseId,
      contact_id: s.contactId,
      amount: s.amount ?? null,
      percentage: s.percentage ?? null,
    }));
  }

  if (rowsToInsert.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insErr } = await (supabase.from('expense_splits') as any).insert(rowsToInsert);
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePath('/expenses');
  revalidatePath('/dividir');
  return { ok: true };
};

export const recordPayment = async (params: {
  fromContactId: string;
  toContactId: string;
  amount: number;
  currency: string;
  note?: string;
}): Promise<Result> => {
  let ctx;
  try { ctx = await requireAdmin(); } catch (e) { return { ok: false, error: (e as Error).message }; }
  if (params.amount <= 0) return { ok: false, error: 'Monto inválido' };
  if (params.fromContactId === params.toContactId) return { ok: false, error: 'No podés pagarte a vos mismo' };

  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('payments') as any).insert({
    workspace_id: ctx.workspaceId,
    from_contact_id: params.fromContactId,
    to_contact_id: params.toContactId,
    amount: params.amount,
    currency: params.currency,
    note: params.note ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/dividir');
  return { ok: true };
};

export const deletePayment = async (paymentId: string): Promise<Result> => {
  try { await requireAdmin(); } catch (e) { return { ok: false, error: (e as Error).message }; }
  const supabase = await createClient();
  const { error } = await supabase.from('payments').delete().eq('id', paymentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/dividir');
  return { ok: true };
};
