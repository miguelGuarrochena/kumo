import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { MobileHeader } from '@/components/MobileHeader';
import { DesktopTopBar } from '@/components/DesktopTopBar';
import { CloudDecorations } from '@/components/CloudDecorations';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="flex min-h-screen">
      <CloudDecorations />
      <Sidebar userEmail={user.email ?? ''} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader userEmail={user.email ?? ''} />
        <DesktopTopBar />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
