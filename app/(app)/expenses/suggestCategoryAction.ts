'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace';
import { pickCategoryFromHistory } from '@/lib/categorySuggest';

const HISTORY_LIMIT = 250;

export async function suggestCategory(description: string): Promise<{ categoryId: string | null }> {
  const trimmed = description.trim();
  if (trimmed.length < 2) return { categoryId: null };

  let ctx;
  try {
    ctx = await getCurrentWorkspace();
  } catch {
    return { categoryId: null };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('expenses')
    .select('description, category_id')
    .eq('workspace_id', ctx.workspaceId)
    .eq('kind', 'expense')
    .not('category_id', 'is', null)
    .not('description', 'is', null)
    .order('expense_date', { ascending: false })
    .limit(HISTORY_LIMIT);

  const categoryId = pickCategoryFromHistory(trimmed, data ?? []);
  return { categoryId };
}
