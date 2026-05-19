import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { MobileHeader } from '@/components/MobileHeader';
import { DesktopTopBar } from '@/components/DesktopTopBar';
import { CloudDecorations } from '@/components/CloudDecorations';
import { Footer } from '@/components/Footer';
import { UserIdentifier } from '@/components/UserIdentifier';
import { NavigationProgress } from '@/components/NavigationProgress';
import { getCurrentWorkspace } from '@/lib/workspace';
import type { WorkspaceOption } from '@/components/WorkspaceSwitcher';

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  // Workspaces de los que el usuario es miembro (para el switcher)
  const ctx = await getCurrentWorkspace();
  const { data: rawMemberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name)')
    .eq('user_id', user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaces: WorkspaceOption[] = ((rawMemberships ?? []) as any[])
    .map((m) => ({
      id: m.workspace_id,
      name: m.workspaces?.name ?? 'Mi cuenta',
      role: m.role,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex min-h-screen">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <UserIdentifier
        userId={user.id}
        email={user.email ?? undefined}
        name={user.user_metadata?.full_name}
      />
      <CloudDecorations />
      <Sidebar
        userEmail={user.email ?? ''}
        workspaces={workspaces}
        activeWorkspaceId={ctx.workspaceId}
      />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <MobileHeader
          userEmail={user.email ?? ''}
          workspaces={workspaces}
          activeWorkspaceId={ctx.workspaceId}
        />
        <DesktopTopBar />
        <main className="flex-1 flex flex-col pb-20 lg:pb-0 pt-4 lg:pt-10">
          <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
          <Footer variant="app" />
        </main>
        <MobileNav />
      </div>
    </div>
  );
};

export default AppLayout;
