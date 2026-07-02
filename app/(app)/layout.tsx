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
import { WorkspaceSetup } from '@/components/WorkspaceSetup';
import { InstallPrompt } from '@/components/InstallPrompt';
import { CommandPalette } from '@/components/CommandPalette';
import { QuickAddSheet } from '@/components/QuickAddSheet';
import { QuickAddFab } from '@/components/QuickAddFab';
import { TrialBanner } from '@/components/TrialBanner';
import { findCurrentWorkspace } from '@/lib/workspace';
import type { WorkspaceOption } from '@/components/WorkspaceSwitcher';

const AppLayout = async ({ children }: { children: React.ReactNode }) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const ctx = await findCurrentWorkspace();

  if (!ctx) {
    return (
      <>
        <UserIdentifier
          userId={user.id}
          email={user.email ?? undefined}
          name={user.user_metadata?.full_name}
        />
        <CloudDecorations />
        <WorkspaceSetup
          userEmail={user.email ?? undefined}
          userName={user.user_metadata?.full_name}
        />
      </>
    );
  }

  const { data: rawMemberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(*)')
    .eq('user_id', user.id);

  type MembershipRow = {
    workspace_id: string;
    role: 'admin' | 'reader';
    workspaces: { name: string; icon: string; color: string } | null;
  };
  const workspaces: WorkspaceOption[] = ((rawMemberships ?? []) as unknown as MembershipRow[])
    .map((m) => ({
      id: m.workspace_id,
      name: m.workspaces?.name ?? 'Mi espacio',
      role: m.role,
      icon: m.workspaces?.icon ?? 'home',
      color: m.workspaces?.color ?? 'sky',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex h-dvh overflow-hidden">
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
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative overflow-hidden">
        <MobileHeader
          userEmail={user.email ?? ''}
          workspaces={workspaces}
          activeWorkspaceId={ctx.workspaceId}
        />
        <DesktopTopBar />
        <Suspense fallback={null}>
          <TrialBanner />
        </Suspense>
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overscroll-y-contain pb-20 lg:pb-0 pt-4 lg:pt-10">
          <div className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 min-w-0">{children}</div>
          <Footer variant="app" />
        </main>
        <MobileNav />
      </div>
      <InstallPrompt />
      <CommandPalette />
      <QuickAddSheet />
      <QuickAddFab />
    </div>
  );
};

export default AppLayout;
