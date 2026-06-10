import type { WorkspaceRole } from '@/lib/supabase/database.types';

export type Member = {
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  email: string | null;
  full_name: string | null;
  is_owner: boolean;
  is_me: boolean;
};

export type Invite = {
  id: string;
  email: string;
  role: WorkspaceRole;
  expires_at: string;
  token: string;
  created_at: string;
};
