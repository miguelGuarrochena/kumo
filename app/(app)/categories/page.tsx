import { createClient } from '@/lib/supabase/server';
import { CategoriesClient } from './CategoriesClient';
import { getMessages } from '@/lib/i18n/server';

const CategoriesPage = async () => {
  const supabase = await createClient();
  const t = await getMessages();
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.categories.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          {t.categories.subtitle}
        </p>
      </header>

      <CategoriesClient initialCategories={categories ?? []} />
    </div>
  );
};

export default CategoriesPage;
