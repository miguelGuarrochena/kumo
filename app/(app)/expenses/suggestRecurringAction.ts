'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace';
import { suggestRecurringForDescription, type ExpenseRecurringRow } from '@/lib/recurringSuggest';

const HISTORY_LIMIT = 300;
const HISTORY_DAYS = 180;

export async function suggestRecurring(description: string) {
  const trimmed = description.trim();
  if (trimmed.length < 2) {
    return { suggest: false as const };
  }

  let ctx;
  try {
    ctx = await getCurrentWorkspace();
  } catch {
    return { suggest: false as const };
  }

  const since = new Date();
  since.setDate(since.getDate() - HISTORY_DAYS);
  const sinceKey = since.toISOString().slice(0, 10);

  const supabase = await createClient();
  const { data } = await supabase
    .from('expenses')
    .select('id, description, amount, expense_date, is_recurring')
    .eq('workspace_id', ctx.workspaceId)
    .eq('kind', 'expense')
    .gte('expense_date', sinceKey)
    .not('description', 'is', null)
    .order('expense_date', { ascending: false })
    .limit(HISTORY_LIMIT);

  const result = suggestRecurringForDescription(trimmed, (data ?? []) as ExpenseRecurringRow[]);
  if (!result) return { suggest: false as const };

  return {
    suggest: true as const,
    recurrenceType: result.recurrenceType,
    matchCount: result.matchCount,
  };
}
