'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Users, Plus, Shield, Eye, Trash2, Copy, Check, AlertTriangle, Pencil } from 'lucide-react';
import { createInvite, revokeInvite, removeMember, changeMemberRole, deleteWorkspace, updateWorkspaceMeta } from './workspaceActions';
import { Select } from '@/components/Select';
import { Sheet } from '@/components/Sheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { WorkspaceRole } from '@/lib/supabase/database.types';
import { useT } from '@/lib/i18n/client';
import {
  WORKSPACE_ICON_KEYS,
  WORKSPACE_COLORS,
  WORKSPACE_COLOR_DOT,
  getWorkspaceIcon,
  getWorkspaceColorClass,
} from '@/lib/workspaceTheme';

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);
  const [lastInvitedEmail, setLastInvitedEmail] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(workspaceName);
  const [editIcon, setEditIcon] = useState(workspaceIcon);
  const [editColor, setEditColor] = useState(workspaceColor);

  const canDelete = isOwner && totalSpaces > 1;

  const onSaveMeta = () => {
    startTransition(async () => {
      const result = await updateWorkspaceMeta({
        name: editName.trim() || workspaceName,
        icon: editIcon,
        color: editColor,
      });
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
    if (deleteConfirmText !== workspaceName) return;
    startTransition(async () => {
      const result = await deleteWorkspace(workspaceId);
      if (result.ok) {
        toast.success(t.workspace.deleted);
        setDeleteOpen(false);
        setDeleteConfirmText('');
        router.refresh();
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
    const result = await removeMember(memberToRemove.user_id);
    if (result.ok) { toast.success(t.workspace.member_removed); router.refresh(); }
    else toast.error(result.error ?? 'Error');
    setMemberToRemove(null);
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
            <h3 className="font-semibold truncate">{workspaceName}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.workspace.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditName(workspaceName);
                setEditIcon(workspaceIcon);
                setEditColor(workspaceColor);
                setEditOpen(true);
              }}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label={t.common.edit}
              title={t.common.edit}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
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
            disabled={!canDelete}
            title={!canDelete ? t.workspace.delete_only_one : undefined}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            {t.workspace.delete}
          </button>
          {!canDelete && (
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 italic">
              {t.workspace.delete_only_one}
            </p>
          )}
        </div>
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

      {/* Sheet de editar espacio: nombre + icono + color */}
      <Sheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t.common.edit}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={onSaveMeta}
              disabled={!editName.trim()}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
            >
              {t.common.save}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
            <div className={`w-11 h-11 rounded-xl ${getWorkspaceColorClass(editColor)} grid place-items-center shrink-0`}>
              {(() => {
                const PreviewIcon = getWorkspaceIcon(editIcon);
                return <PreviewIcon className="w-5 h-5" />;
              })()}
            </div>
            <p className="font-medium truncate">{editName || workspaceName}</p>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Nombre</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={60}
              autoFocus
              className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Color</label>
            <div className="grid grid-cols-9 gap-2">
              {WORKSPACE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditColor(c)}
                  className={`aspect-square rounded-lg ${WORKSPACE_COLOR_DOT[c]} grid place-items-center transition-all active:scale-90 ${
                    editColor === c
                      ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-offset-slate-800 dark:ring-white'
                      : ''
                  }`}
                  aria-label={c}
                >
                  {editColor === c && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          {/* Icono */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Ícono</label>
            <div className="grid grid-cols-6 gap-2">
              {WORKSPACE_ICON_KEYS.map((iconKey) => {
                const Icon = getWorkspaceIcon(iconKey);
                const active = editIcon === iconKey;
                return (
                  <button
                    key={iconKey}
                    type="button"
                    onClick={() => setEditIcon(iconKey)}
                    className={`p-2.5 rounded-xl border-2 transition-colors ${
                      active
                        ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                    } active:scale-95`}
                    aria-label={iconKey}
                  >
                    <Icon className="w-4 h-4 mx-auto" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Sheet>

      {/* Sheet de confirmación de borrado con typing del nombre */}
      <Sheet
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeleteConfirmText(''); }}
        title={t.workspace.delete_title}
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setDeleteOpen(false); setDeleteConfirmText(''); }}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleteConfirmText !== workspaceName}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t.workspace.delete}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/40">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700 dark:text-rose-200">
              {t.workspace.delete_confirm.replace('{name}', workspaceName)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              {t.workspace.delete_confirm_text}
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={workspaceName}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400 text-base"
              autoFocus
            />
          </div>
        </div>
      </Sheet>
    </div>
  );
};
