import { createClient } from '@/lib/supabase/server';
import { CategoriesClient } from './CategoriesClient';

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
        <p className="text-slate-500 mt-1">
          Organizá tus gastos por categoría. Podés crear las que quieras.
        </p>
      </header>

      <CategoriesClient initialCategories={categories ?? []} />
    </div>
  );
}
