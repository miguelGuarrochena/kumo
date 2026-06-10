'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Users, Plus, Pencil, Trash2, User, Heart, Baby, UserCircle2, UserRound, Check,
} from 'lucide-react';
import { Sheet } from '@/components/Sheet';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { upsertContact, deleteContact } from './contactsActions';
import type { Database } from '@/lib/supabase/database.types';

type Contact = Database['public']['Tables']['notification_contacts']['Row'];

const RELATIONSHIP_OPTIONS = [
  { value: 'self',     label: 'Yo',      icon: UserCircle2 },
  { value: 'partner',  label: 'Pareja',  icon: Heart },
  { value: 'child',    label: 'Hijo/a',  icon: Baby },
  { value: 'parent',   label: 'Padre/Madre', icon: UserRound },
  { value: 'sibling',  label: 'Hermano/a', icon: User },
  { value: 'friend',   label: 'Amigo/a', icon: User },
  { value: 'other',    label: 'Otro',    icon: User },
] as const;

const RELATIONSHIP_LABEL: Record<string, string> = Object.fromEntries(
  RELATIONSHIP_OPTIONS.map((o) => [o.value, o.label]),
);

export const ContactsSection = ({ contacts }: { contacts: Contact[] }) => {
  const router = useRouter();
  const [editing, setEditing] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Contact | null>(null);

  const sorted = [...contacts].sort((a, b) => {
    if (a.is_self && !b.is_self) return -1;
    if (!a.is_self && b.is_self) return 1;
    return a.name.localeCompare(b.name);
  });

  const onDelete = async () => {
    if (!toDelete) return;
    const result = await deleteContact(toDelete.id);
    if (result.ok) {
      toast.success(`"${toDelete.name}" eliminado`);
      router.refresh();
    } else {
      toast.error(result.error ?? 'No se pudo eliminar');
    }
  };

  return (
    <div className="kumo-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-mint-100 text-mint-500 grid place-items-center">
          <Users className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Contactos para notificaciones</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gente a la que podés avisar por WhatsApp (vos, familia, etc.)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg kumo-gradient text-white text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Agregar</span>
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
          Sin contactos. Agregá el primero con el botón de arriba.
        </p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {sorted.map((c) => (
            <ContactRow
              key={c.id}
              contact={c}
              onEdit={() => setEditing(c)}
              onDelete={() => setToDelete(c)}
            />
          ))}
        </div>
      )}

      <ContactSheet
        open={!!editing || creating}
        contact={editing}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={onDelete}
        title="Borrar contacto"
        description={`¿Borrar a "${toDelete?.name}"? No vas a poder avisarle más.`}
      />
    </div>
  );
};

type ContactRowProps = {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
};

const ContactRow = ({ contact, onEdit, onDelete }: ContactRowProps) => {
  const relMeta = RELATIONSHIP_OPTIONS.find((r) => r.value === contact.relationship);
  const Icon = relMeta?.icon ?? User;

  const phoneDisplay = contact.phone ? formatPhone(contact.phone) : 'Sin número';

  return (
    <div className="py-3 flex items-center gap-3 group">
      <div className="w-9 h-9 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 grid place-items-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{contact.name}</p>
          {contact.is_self && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-lavender-100 dark:bg-lavender-500/20 text-lavender-500 font-medium">
              Vos
            </span>
          )}
          {contact.verified && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-mint-100 dark:bg-mint-500/20 text-mint-500 font-medium flex items-center gap-0.5">
              <Check className="w-2.5 h-2.5" />
              Verificado
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {RELATIONSHIP_LABEL[contact.relationship]} · {phoneDisplay}
        </p>
      </div>
      <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          aria-label="Editar"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/20 text-rose-500"
          aria-label="Borrar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

type ContactSheetProps = {
  open: boolean;
  contact: Contact | null;
  onClose: () => void;
};

const ContactSheet = ({ open, contact, onClose }: ContactSheetProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState<string>('other');

  useEffect(() => {
    if (!open) return;
    setName(contact?.name ?? '');
    setPhone(contact?.phone ?? '');
    setRelationship(contact?.relationship ?? 'other');
  }, [open, contact?.id]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData();
    if (contact?.id) fd.set('id', contact.id);
    fd.set('name', name);
    fd.set('phone', phone);
    // Si es "Yo" (is_self), forzamos relationship a "self"
    fd.set('relationship', contact?.is_self ? 'self' : relationship);

    startTransition(async () => {
      const result = await upsertContact({ ok: false }, fd);
      if (result.ok) {
        toast.success(contact ? 'Contacto actualizado' : 'Contacto agregado');
        router.refresh();
        onClose();
      } else {
        toast.error(result.error ?? 'Error');
      }
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title={contact ? 'Editar contacto' : 'Nuevo contacto'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Mamá, Lucia, Tomás..."
            className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            autoFocus
            required
            maxLength={60}
            disabled={contact?.is_self}
          />
          {contact?.is_self && (
            <p className="text-xs text-slate-400 mt-1">El nombre &ldquo;Yo&rdquo; no se puede cambiar.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Número de WhatsApp</label>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+54 9 11 1234 5678"
            className="w-full px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 text-base"
            maxLength={20}
          />
          <p className="text-xs text-slate-400 mt-1">
            Formato internacional. Podés escribirlo con espacios o guiones.
          </p>
        </div>

        {!contact?.is_self && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Relación</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {RELATIONSHIP_OPTIONS.filter((r) => r.value !== 'self').map((opt) => {
                const Icon = opt.icon;
                const active = relationship === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRelationship(opt.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                      active
                        ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending || !name.trim()}
            className="flex-1 px-4 py-3 rounded-xl text-sm font-medium kumo-gradient text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Guardando...' : contact ? 'Guardar' : 'Agregar'}
          </button>
        </div>
      </form>
    </Sheet>
  );
};

function formatPhone(digits: string): string {
  // Simple: agrega "+" al principio. Más sofisticación después si querés.
  return `+${digits}`;
}
