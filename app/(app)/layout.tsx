import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { MobileHeader } from '@/components/MobileHeader';
import { DesktopTopBar } from '@/components/DesktopTopBar';
import { CloudDecorations } from '@/components/CloudDecorations';
import { Footer } from '@/components/Footer';
import { UserIdentifier } from '@/components/UserIdentifier';

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  return (
    <div className="flex min-h-screen">
      <UserIdentifier
        userId={user.id}
        email={user.email ?? undefined}
        name={user.user_metadata?.full_name}
      />
      <CloudDecorations />
      <Sidebar userEmail={user.email ?? ''} />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <MobileHeader userEmail={user.email ?? ''} />
        <DesktopTopBar />
        <main className="flex-1 pb-20 lg:pb-0">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
          <Footer variant="app" />
        </main>
        <MobileNav />
      </div>
    </div>
  );
};

export default AppLayout;
