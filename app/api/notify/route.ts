// Endpoint que corre el "loop de notificaciones".
// Llamado por un cron (Supabase pg_cron, Vercel Cron, o uptime monitor).
// Auth: header Authorization: Bearer <CRON_SECRET>
//
// Flujo:
//  1. Buscar gastos con due_date próxima, no pagados.
//  2. Buscar recordatorios con fecha cercana según notify_days_before.
//  3. Para cada item, determinar a quién avisar:
//     - Si notify_contact_ids está poblado → mandar a cada contacto de la lista.
//     - Si está vacío → fallback al whatsapp_number del user (compatibilidad).
//  4. Mandar WhatsApp a cada destinatario.
//  5. Marcar recordatorios como notificados (last_notified_at) para no spammear.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWhatsAppAdapter } from '@/lib/notifications/whatsapp';
import type { Database } from '@/lib/supabase/database.types';

type Contact = Database['public']['Tables']['notification_contacts']['Row'];
type Settings = Database['public']['Tables']['user_settings']['Row'];

export async function POST(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // --- Ventana temporal: gastos en los próximos 3 días, no pagados -----
  const today = new Date().toISOString().slice(0, 10);
  const in3Days = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);

  const { data: dueExpenses } = await supabase
    .from('expenses')
    .select('id, user_id, amount, currency, description, due_date, notify_contact_ids, categories(name)')
    .eq('paid', false)
    .gte('due_date', today)
    .lte('due_date', in3Days);

  // --- Recordatorios futuros -------------------------------------------
  const { data: reminders } = await supabase
    .from('reminders')
    .select('id, user_id, title, reminder_date, reminder_type, notify_days_before, last_notified_at, notify_contact_ids')
    .gte('reminder_date', today);

  // --- Cargar contactos + settings por user_id -------------------------
  const allUserIds = new Set<string>([
    ...(dueExpenses?.map((e) => e.user_id) ?? []),
    ...(reminders?.map((r) => r.user_id) ?? []),
  ]);

  const [{ data: contacts }, { data: settings }] = await Promise.all([
    supabase
      .from('notification_contacts')
      .select('*')
      .in('user_id', [...allUserIds]),
    supabase.from('user_settings').select('*').in('user_id', [...allUserIds]),
  ]);

  const contactsById = new Map<string, Contact>((contacts ?? []).map((c) => [c.id, c]));
  const settingsByUser = new Map<string, Settings>((settings ?? []).map((s) => [s.user_id, s]));
  const selfContactByUser = new Map<string, Contact>(
    (contacts ?? []).filter((c) => c.is_self).map((c) => [c.user_id, c]),
  );

  const wa = getWhatsAppAdapter();

  /**
   * Resuelve los destinatarios para un item.
   * - Si tiene notify_contact_ids: usa esos contactos.
   * - Si está vacío y el user tiene whatsapp_number en settings: usa ese (legacy).
   * - Si está vacío y el user tiene contacto "Yo" con phone: usa ese.
   * - Filtra contactos sin número.
   */
  function resolveRecipients(userId: string, contactIds: string[]): { id: string; name: string; phone: string }[] {
    let pool: Contact[] = [];

    if (contactIds.length > 0) {
      pool = contactIds.map((id) => contactsById.get(id)).filter((c): c is Contact => !!c);
    } else {
      // Legacy fallback: usar el contacto "Yo" o el whatsapp_number de settings
      const self = selfContactByUser.get(userId);
      const settingsRow = settingsByUser.get(userId);
      if (self?.phone) pool = [self];
      else if (settingsRow?.whatsapp_number) {
        pool = [{
          id: 'legacy',
          user_id: userId,
          name: 'Yo',
          phone: settingsRow.whatsapp_number,
          relationship: 'self',
          is_self: true,
          verified: false,
          created_at: new Date().toISOString(),
        }];
      }
    }

    return pool
      .filter((c) => !!c.phone)
      .map((c) => ({ id: c.id, name: c.name, phone: c.phone! }));
  }

  // --- Enviar vencimientos de gastos -----------------------------------
  for (const exp of dueExpenses ?? []) {
    const userSettings = settingsByUser.get(exp.user_id);
    if (userSettings && !userSettings.notify_expenses) {
      skipped++;
      continue;
    }

    const recipients = resolveRecipients(exp.user_id, exp.notify_contact_ids ?? []);
    if (recipients.length === 0) {
      skipped++;
      continue;
    }

    for (const r of recipients) {
      const result = await wa.send({
        to: r.phone,
        title: '🌥️ Vencimiento próximo · Kumo',
        body: `${exp.description ?? 'Gasto'} vence el ${exp.due_date}.\nMonto: ${exp.amount} ${exp.currency}`,
        ref: { type: 'expense', id: exp.id },
      });
      result.ok ? sent++ : failed++;
    }
  }

  // --- Enviar recordatorios --------------------------------------------
  for (const rem of reminders ?? []) {
    const userSettings = settingsByUser.get(rem.user_id);
    if (userSettings && !userSettings.notify_reminders) {
      skipped++;
      continue;
    }

    const reminderDate = new Date(rem.reminder_date);
    const diffDays = Math.ceil((reminderDate.getTime() - Date.now()) / 86400_000);
    if (diffDays > rem.notify_days_before) {
      skipped++;
      continue;
    }

    // Evitar duplicados: si ya notificamos hoy, saltar.
    if (rem.last_notified_at) {
      const lastNotif = new Date(rem.last_notified_at);
      const sameDay = lastNotif.toDateString() === new Date().toDateString();
      if (sameDay) {
        skipped++;
        continue;
      }
    }

    const recipients = resolveRecipients(rem.user_id, rem.notify_contact_ids ?? []);
    if (recipients.length === 0) {
      skipped++;
      continue;
    }

    const emoji =
      rem.reminder_type === 'medical'  ? '🏥' :
      rem.reminder_type === 'birthday' ? '🎂' :
      '🔔';

    let anyOk = false;
    for (const r of recipients) {
      // Personalizar saludo si el destinatario no es el dueño del recordatorio
      const selfPhone = selfContactByUser.get(rem.user_id)?.phone;
      const isOwner = r.phone === selfPhone;
      const greeting = isOwner ? '' : `Hola ${r.name}, te aviso de parte de Kumo: `;

      const result = await wa.send({
        to: r.phone,
        title: `${emoji} ${rem.title} · Kumo`,
        body: `${greeting}Es ${diffDays === 0 ? 'hoy' : diffDays === 1 ? 'mañana' : `en ${diffDays} días`} (${rem.reminder_date})`,
        ref: { type: 'reminder', id: rem.id },
      });
      if (result.ok) {
        anyOk = true;
        sent++;
      } else {
        failed++;
      }
    }

    if (anyOk) {
      await supabase
        .from('reminders')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', rem.id);
    }
  }

  return NextResponse.json({ sent, failed, skipped });
}
