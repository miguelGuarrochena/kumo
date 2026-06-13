import { createClient } from '@/lib/supabase/server';
import { getLocale, getMessages } from '@/lib/i18n/server';
import { getCurrentWorkspace } from '@/lib/workspace';
import { getRates, type Currency } from '@/lib/currency';
import { categoryDisplayName } from '@/lib/categoryLabels';
import { computeSpend, type ExpenseLite } from '@/lib/budgets';
import { BudgetsClient, type BudgetCardData } from './BudgetsClient';

const BudgetsPage = async () => {
  const supabase = await createClient();
  const [t, locale] = await Promise.all([getMessages(), getLocale()]);
  const ctx = await getCurrentWorkspace();

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const [
    { data: categories },
    { data: budgets },
    { data: monthExpenses },
    { data: settings },
    rates,
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, icon, color')
      .eq('workspace_id', ctx.workspaceId)
      .order('name', { ascending: true }),
    supabase
      .from('budgets')
      .select('id, category_id, amount, currency')
      .eq('workspace_id', ctx.workspaceId),
    supabase
      .from('expenses')
      .select('amount, currency, category_id')
      .eq('workspace_id', ctx.workspaceId)
      .gte('expense_date', monthStart),
    supabase.from('user_settings').select('default_currency').eq('user_id', ctx.userId).maybeSingle(),
    getRates(),
  ]);

  const defaultCurrency = ((settings?.default_currency as string | undefined) ?? 'ARS') as Currency;
  const monthExp = (monthExpenses ?? []) as ExpenseLite[];
  const budgetRows = budgets ?? [];

  const overall = budgetRows.find((b) => b.category_id === null);
  const overallCurrency = ((overall?.currency as string | undefined) ?? defaultCurrency) as Currency;
  const overallSpend = computeSpend(monthExp, null, overallCurrency, rates.rates);

  const overallRow: BudgetCardData = {
    categoryId: null,
    name: t.budgets.overall,
    icon: 'wallet',
    color: 'sky',
    budgetId: overall?.id ?? null,
    amount: overall?.amount ?? null,
    currency: overallCurrency,
    spent: overallSpend.spent,
    rateMissing: overallSpend.rateMissing,
  };

  const categoryRows: BudgetCardData[] = (categories ?? []).map((cat) => {
    const b = budgetRows.find((x) => x.category_id === cat.id);
    const currency = ((b?.currency as string | undefined) ?? defaultCurrency) as Currency;
    const { spent, rateMissing } = computeSpend(monthExp, cat.id, currency, rates.rates);
    return {
      categoryId: cat.id,
      name: categoryDisplayName(cat.name, t),
      icon: cat.icon,
      color: cat.color,
      budgetId: b?.id ?? null,
      amount: b?.amount ?? null,
      currency,
      spent,
      rateMissing,
    };
  });

  // Categorías con presupuesto primero (las más "usadas"), luego el resto.
  categoryRows.sort((a, b) => {
    const aHas = a.amount != null ? 0 : 1;
    const bHas = b.amount != null ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.budgets.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{t.budgets.subtitle}</p>
      </header>

      <BudgetsClient
        overall={overallRow}
        categories={categoryRows}
        defaultCurrency={defaultCurrency}
        locale={locale}
      />
    </div>
  );
};

export default BudgetsPage;
