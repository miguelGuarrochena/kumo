import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CloudLogo } from '@/components/CloudLogo';
import { CloudDecorations } from '@/components/CloudDecorations';
import { createClient } from '@/lib/supabase/server';

const LegalLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const backHref = user ? '/dashboard' : '/';
  const backLabel = user ? 'Volver a la app' : 'Volver al inicio';

  return (
    <main className="min-h-screen relative">
      <CloudDecorations />

      <header className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
        <Link href={backHref as never} className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
          <CloudLogo className="w-8 h-8" />
          <span className="font-bold text-lg tracking-tight kumo-gradient-text">Kumo</span>
        </Link>
        <Link
          href={backHref as never}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{backLabel}</span>
          <span className="sm:hidden">Volver</span>
        </Link>
      </header>

      <article className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pb-20 prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-p:text-slate-600 prose-p:dark:text-slate-400 prose-p:text-sm prose-li:text-sm prose-li:text-slate-600 prose-li:dark:text-slate-400 prose-a:text-sky-600 prose-a:dark:text-sky-400 prose-a:no-underline hover:prose-a:underline">
        {children}
      </article>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pb-12">
        <Link
          href={backHref as never}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl kumo-gradient text-white text-sm font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
      </div>
    </main>
  );
};

export default LegalLayout;
