import Link from 'next/link';
import { CloudLogo } from '@/components/CloudLogo';
import { CloudDecorations } from '@/components/CloudDecorations';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen relative">
      <CloudDecorations />
      <header className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2">
          <CloudLogo className="w-8 h-8" />
          <span className="font-bold text-lg tracking-tight kumo-gradient-text">Kumo</span>
        </Link>
      </header>
      <article className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pb-20 prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3 prose-p:text-slate-600 prose-p:dark:text-slate-400 prose-p:text-sm prose-li:text-sm prose-li:text-slate-600 prose-li:dark:text-slate-400 prose-a:text-sky-600 prose-a:dark:text-sky-400 prose-a:no-underline hover:prose-a:underline">
        {children}
      </article>
    </main>
  );
}
