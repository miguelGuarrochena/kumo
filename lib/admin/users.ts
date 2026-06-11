import { createServiceClient } from '@/lib/supabase/service';

export type AuthUserLite = {
  id: string;
  email: string | null;
  created_at: string;
  user_metadata?: { full_name?: string };
};

const LIST_PER_PAGE = 200;
const MAX_PAGES = 50;

const listUsersPage = async (page: number, perPage: number): Promise<AuthUserLite[]> => {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).auth.admin.listUsers({ page, perPage });
  if (error) return [];
  return (data?.users ?? []) as AuthUserLite[];
};

export const findUserByEmail = async (email: string): Promise<{ id: string } | null> => {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  let page = 1;
  while (page <= MAX_PAGES) {
    const users = await listUsersPage(page, LIST_PER_PAGE);
    const match = users.find((u) => (u.email ?? '').toLowerCase() === target);
    if (match) return { id: match.id };
    if (users.length < LIST_PER_PAGE) break;
    page += 1;
  }
  return null;
};

export const searchAuthUsers = async (query: string): Promise<AuthUserLite[]> => {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const matches: AuthUserLite[] = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const users = await listUsersPage(page, LIST_PER_PAGE);
    for (const u of users) {
      const email = (u.email ?? '').toLowerCase();
      const name = (u.user_metadata?.full_name ?? '').toLowerCase();
      if (email.includes(needle) || name.includes(needle)) {
        matches.push(u);
      }
    }
    if (users.length < LIST_PER_PAGE) break;
    page += 1;
  }

  return matches.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
};
