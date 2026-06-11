'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Shield, Eye, Trash2, Copy, Check, AlertTriangle, Pencil } from 'lucide-react';
import { createInvite, revokeInvite, removeMember, changeMemberRole, deleteWorkspace, updateWorkspaceMeta } from './workspaceActions';
import { Select } from '@/components/Select';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { WorkspaceRole } from '@/lib/supabase/database.types';
import { useT } from '@/lib/i18n/client';
import { getWorkspaceIcon, getWorkspaceColorClass } from '@/lib/workspaceTheme';
import type { Member, Invite } from './workspaceSectionTypes';
import { EditWorkspaceSheet } from './EditWorkspaceSheet';
import { DeleteWorkspaceSheet } from './DeleteWorkspaceSheet';

export type { Member, Invite } from './workspaceSectionTypes';

type Props = {
  members: Member[];
  invites: Invite[];
  isAdmin: boolean;
  origin: string;
  workspaceId: string;
  workspaceName: string;
  workspaceIcon: string;
  workspaceColor: string;
  isOwner: boolean;
  totalSpaces: number;
};

export const WorkspaceSection = ({
  members,
  invites,
  isAdmin,
  origin,
  workspaceId,
  workspaceName,
  workspaceIcon,
  workspaceColor,
  isOwner,
  totalSpaces,
}: Props) => {
  const router = useRouter();
  const { t } = useT();
  const [, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('reader');
  const [linkJustCreated, setLinkJustCreated] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [localMembers, setLocalMembers] = useState(members);

  useEffect(() => {
    setLocalMembers(members);
  }, [members]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // El owner siempre puede borrar — si es el único espacio, queda en Setup
  const isLastSpace = totalSpaces <= 1;

  const onSaveMeta = (values: { name: string; icon: string; color: string }) => {
    startTransition(async () => {
      const result = await updateWorkspaceMeta(values);
      if (result.ok) {
        toast.success('Espacio actualizado');
        setEditOpen(false);
        // Hard reload para refrescar el avatar+nombre del switcher en sidebar
        window.location.reload();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  const onDelete = () => {
    startTransition(async () => {
      const result = await deleteWorkspace(workspaceId);
      if (result.ok) {
        toast.success(t.workspace.deleted);
        setDeleteOpen(false);
        // Hard navigation así el layout vuelve a evaluar findCurrentWorkspace.
        // Si era el único, va a aterrizar en la pantalla de Setup.
        window.location.href = isLastSpace ? '/dashboard' : '/settings';
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const fd = new FormData();
    fd.set('email', email.trim());
    fd.set('role', role);
    const invitedEmail = email.trim();
    startTransition(async () => {
      const result = await createInvite({ ok: false }, fd);
      if (result.ok) {
        const link = result.inviteLink ?? '';
        setLinkJustCreated(link);
        setLastInvitedEmail(invitedEmail);
        setEmailSent(result.emailSent ?? false);
        setEmailErrorMsg(result.emailError ?? null);
        setEmail('');
        toast.success(
          result.emailSent
            ? `Invitación enviada a ${invitedEmail}`
            : t.workspace.invite_created,
        );
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
    if (result.ok) { toast.success('Invitación revocada'); router.refresh(); }
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
    const target = memberToRemove;
    setMemberToRemove(null);
    setLocalMembers((prev) => prev.filter((m) => m.user_id !== target.user_id));
    const result = await removeMember(target.user_id);
    if (result.ok) {
      toast.success(t.workspace.member_removed);
    } else {
      setLocalMembers((prev) =>
        prev.some((m) => m.user_id === target.user_id) ? prev : [...prev, target],
      );
      toast.error(result.error ?? 'Error');
    }
  };

  const WsIcon = getWorkspaceIcon(workspaceIcon);
  const wsClass = getWorkspaceColorClass(workspaceColor);

  return (
    <div className="kumo-card p-5">
      {/* Header con avatar editable + nombre */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-xl ${wsClass} grid place-items-center shrink-0`}>
            <WsIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-0.5 min-w-0">
              <h3 className="font-semibold truncate">{workspaceName}</h3>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0"
                  aria-label={t.common.edit}
                  title={t.common.edit}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.workspace.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && !inviteOpen && (
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg kumo-gradient text-white text-sm font-medium hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t.workspace.invite}</span>
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 -mt-2">
        {t.workspace.subtitle}
      </p>

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
            <div className="space-y-1.5">
              {emailSent ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-mint-50 dark:bg-mint-500/10 border border-mint-200 dark:border-mint-500/30 text-sm">
                  <Check className="w-4 h-4 text-mint-500 shrink-0" />
                  <span className="text-mint-700 dark:text-mint-300">
                    Invitación enviada a <strong>{lastInvitedEmail}</strong>
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {emailErrorMsg && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 px-1">
                      No se pudo enviar el email automáticamente — compartí el link a mano:
                    </p>
                  )}
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sm">
                    <Check className="w-4 h-4 text-mint-500 shrink-0" />
                    <code className="flex-1 text-xs truncate text-slate-700 dark:text-slate-200">{linkJustCreated}</code>
                    <button
                      type="button"
                      onClick={() => copyLink(linkJustCreated)}
                      className="p-1.5 rounded text-slate-500 hover:bg-white dark:hover:bg-slate-800"
                      title={t.workspace.copy_link}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      )}

      {/* Miembros */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold px-1">
          {t.workspace.members_n.replace('{n}', String(localMembers.length))}
        </p>
        {localMembers.map((m) => (
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

      {/* Zona de peligro: solo si es owner */}
      {isOwner && (
        <div className="mt-5 pt-4 border-t border-rose-100 dark:border-rose-900/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <h4 className="text-[10px] uppercase tracking-wider font-semibold text-rose-600 dark:text-rose-400">
              {t.workspace.danger_zone}
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t.workspace.delete}
          </button>
          {isLastSpace && (
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 italic">
              Es tu único espacio. Si lo borrás vas a tener que crear uno nuevo.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        onConfirm={onRemove}
        closeOnConfirm={false}
        title={t.workspace.remove_title}
        description={t.workspace.remove_confirm.replace(
          '{who}',
          memberToRemove?.full_name ?? memberToRemove?.email ?? '',
        )}
      />

      <EditWorkspaceSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        workspaceName={workspaceName}
        workspaceIcon={workspaceIcon}
        workspaceColor={workspaceColor}
        onSave={onSaveMeta}
      />

      <DeleteWorkspaceSheet
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        workspaceName={workspaceName}
        isLastSpace={isLastSpace}
        onConfirm={onDelete}
      />
    </div>
  );
};
