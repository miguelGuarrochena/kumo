'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Users, Plus, Shield, Eye, Trash2, Copy, Check } from 'lucide-react';
import { createInvite, revokeInvite, removeMember, changeMemberRole } from './workspaceActions';
import { Select } from '@/components/Select';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { WorkspaceRole } from '@/lib/supabase/database.types';
import { useT } from '@/lib/i18n/client';

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

type Props = {
  members: Member[];
  invites: Invite[];
  isAdmin: boolean;
  origin: string;
};

export const WorkspaceSection = ({ members, invites, isAdmin, origin }: Props) => {
  const router = useRouter();
  const { t } = useT();
  const [, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('reader');
  const [linkJustCreated, setLinkJustCreated] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const fd = new FormData();
    fd.set('email', email.trim());
    fd.set('role', role);
    startTransition(async () => {
      const result = await createInvite({ ok: false }, fd);
      if (result.ok) {
        const link = result.inviteLink ?? '';
        setLinkJustCreated(link);
        setEmail('');
        toast.success(t.workspace.invite_created);
        router.refresh();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success(t.workspace.link_copied);
  };

  const onRevoke = async (id: string) => {
    const result = await revokeInvite(id);
    if (result.ok) { toast.success('✓'); router.refresh(); }
    else toast.error(result.error ?? 'Error');
  };

  const onChangeRole = (userId: string, newRole: WorkspaceRole) => {
    startTransition(async () => {
      const result = await changeMemberRole(userId, newRole);
      if (result.ok) { toast.success(t.workspace.role_updated); router.refresh(); }
      else toast.error(result.error ?? 'Error');
    });
  };

  const onRemove = async () => {
    if (!memberToRemove) return;
    const result = await removeMember(memberToRemove.user_id);
    if (result.ok) { toast.success(t.workspace.member_removed); router.refresh(); }
    else toast.error(result.error ?? 'Error');
    setMemberToRemove(null);
  };

  return (
    <div className="kumo-card p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 grid place-items-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">{t.workspace.title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.workspace.subtitle}
            </p>
          </div>
        </div>
        {isAdmin && !inviteOpen && (
          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg kumo-gradient text-white text-sm font-medium hover:opacity-90 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t.workspace.invite}</span>
          </button>
        )}
      </div>

      {/* Form de invite */}
      {isAdmin && inviteOpen && (
        <form onSubmit={submitInvite} className="space-y-2 mb-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              placeholder={t.workspace.invite_link_email_placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <Select
              value={role}
              onChange={(v) => setRole(v as WorkspaceRole)}
              options={[
                { value: 'reader', label: t.workspace.role_reader, hint: t.workspace.role_reader_hint },
                { value: 'admin',  label: t.workspace.role_admin,  hint: t.workspace.role_admin_hint },
              ]}
              className="sm:w-40"
              buttonClassName="py-2"
              ariaLabel="Role"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg kumo-gradient text-white text-sm font-medium hover:opacity-90"
            >
              {t.workspace.create_invite}
            </button>
            <button
              type="button"
              onClick={() => { setInviteOpen(false); setLinkJustCreated(null); }}
              className="px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {t.common.cancel}
            </button>
          </div>

          {linkJustCreated && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sm">
              <Check className="w-4 h-4 text-mint-500 shrink-0" />
              <code className="flex-1 text-xs truncate text-slate-700 dark:text-slate-200">{linkJustCreated}</code>
              <button
                type="button"
                onClick={() => copyLink(linkJustCreated)}
                className="p-1.5 rounded text-slate-500 hover:bg-white dark:hover:bg-slate-800"
                title="Copiar"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </form>
      )}

      {/* Miembros */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold px-1">
          {t.workspace.members_n.replace('{n}', String(members.length))}
        </p>
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <div className={`w-8 h-8 rounded-full grid place-items-center text-sm font-medium ${
              m.role === 'admin'
                ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {(m.full_name ?? m.email ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {m.full_name ?? m.email ?? m.user_id}
                {m.is_me && <span className="ml-1.5 text-xs text-slate-400">({t.workspace.you_badge})</span>}
                {m.is_owner && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">{t.workspace.owner_badge}</span>}
              </p>
              {m.email && m.full_name && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.email}</p>
              )}
            </div>
            {isAdmin && !m.is_owner && !m.is_me ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <Select
                  value={m.role}
                  onChange={(v) => onChangeRole(m.user_id, v as WorkspaceRole)}
                  options={[
                    { value: 'reader', label: t.workspace.role_reader },
                    { value: 'admin',  label: t.workspace.role_admin },
                  ]}
                  className="w-28"
                  buttonClassName="py-1.5 text-sm"
                  ariaLabel="Role"
                />
                <button
                  onClick={() => setMemberToRemove(m)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-900/20 hover:text-rose-500"
                  title={t.workspace.remove}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className={`shrink-0 px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${
                m.role === 'admin'
                  ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {m.role === 'admin' ? <Shield className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {m.role === 'admin' ? t.workspace.role_admin : t.workspace.role_reader}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Invites pendientes */}
      {invites.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold px-1">
            {t.workspace.invites_pending_n.replace('{n}', String(invites.length))}
          </p>
          {invites.map((inv) => {
            const link = `${origin}/accept-invite?token=${inv.token}`;
            return (
              <div key={inv.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{inv.email}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {inv.role === 'admin' ? t.workspace.role_admin : t.workspace.role_reader} · {t.workspace.expires_on} {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => copyLink(link)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  title={t.workspace.copy_link}
                >
                  <Copy className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => onRevoke(inv.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-900/20 hover:text-rose-500"
                    title={t.workspace.revoke}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isAdmin && (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 italic">
          {t.workspace.only_admin_can_manage}
        </p>
      )}

      <ConfirmDialog
        open={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={onRemove}
        title={t.workspace.remove_title}
        description={t.workspace.remove_confirm.replace(
          '{who}',
          memberToRemove?.full_name ?? memberToRemove?.email ?? '',
        )}
      />
    </div>
  );
};
