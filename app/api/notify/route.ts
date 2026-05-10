// Endpoint que corre el "loop de notificaciones".
// Llamado por un cron (Supabase pg_cron, Vercel Cron, o uptime monitor).
// Auth: header Authorization: Bearer <CRON_SECRET>
//
// Lógica:
//  1. Buscar gastos con due_date <= hoy + N días, no pagados, del que falta notificar.
//  2. Buscar reminders con fecha cercana según notify_days_before.
//  3. Mandar WhatsApp al número del user_settings.
//  4. Marcar como notificado para no spammear.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getWhatsAppAdapter } from '@/lib/notifications/whatsapp';
import type { Database } from '@/lib/supabase/database.types';

export async function POST(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Cliente con service_role para saltarse RLS y procesar todos los users
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  let sent = 0;
  let failed = 0;

  // --- Vencimientos próximos (gastos no pagados con due_date) -----
  const today = new Date().toISOString().slice(0, 10);
  const in3Days = new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10);

  const { data: dueExpenses } = await supabase
    .from('expenses')
    .select('id, user_id, amount, currency, description, due_date, categories(name)')
    .eq('paid', false)
    .gte('due_date', today)
    .lte('due_date', in3Days);

  // --- Recordatorios próximos -------------------------------------
  const { data: reminders } = await supabase
    .from('reminders')
    .select('id, user_id, title, reminder_date, reminder_type, notify_days_before, last_notified_at')
    .gte('reminder_date', today);

  // --- User settings (mapa user_id -> settings) -------------------
  const userIds = new Set([
    ...(dueExpenses?.map((e) => e.user_id) ?? []),
    ...(reminders?.map((r) => r.user_id) ?? []),
  ]);
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .in('user_id', [...userIds]);
  const settingsByUser = new Map(settings?.map((s) => [s.user_id, s]) ?? []);

  const wa = getWhatsAppAdapter();

  // --- Enviar gastos ----------------------------------------------
  for (const exp of dueExpenses ?? []) {
    const userSettings = settingsByUser.get(exp.user_id);
    if (!userSettings?.whatsapp_number || !userSettings.notify_expenses) continue;

    const result = await wa.send({
      to: userSettings.whatsapp_number,
      title: '🌥️ Vencimiento próximo · Kumo',
      body: `${exp.description ?? 'Gasto'} vence el ${exp.due_date}.\nMonto: ${exp.amount} ${exp.currency}`,
      ref: { type: 'expense', id: exp.id },
    });
    result.ok ? sent++ : failed++;
  }

  // --- Enviar recordatorios ---------------------------------------
  for (const rem of reminders ?? []) {
    const userSettings = settingsByUser.get(rem.user_id);
    if (!userSettings?.whatsapp_number || !userSettings.notify_reminders) continue;

    const reminderDate = new Date(rem.reminder_date);
    const diffDays = Math.ceil((reminderDate.getTime() - Date.now()) / 86400_000);
    if (diffDays > rem.notify_days_before) continue;

    // Evitar duplicados si ya notificamos hoy
    if (rem.last_notified_at) {
      const lastNotif = new Date(rem.last_notified_at);
      const sameDay = lastNotif.toDateString() === new Date().toDateString();
      if (sameDay) continue;
    }

    const emoji = rem.reminder_type === 'medical' ? '🏥' : rem.reminder_type === 'birthday' ? '🎂' : '🔔';
    const result = await wa.send({
      to: userSettings.whatsapp_number,
      title: `${emoji} ${rem.title} · Kumo`,
      body: `Es ${diffDays === 0 ? 'hoy' : diffDays === 1 ? 'mañana' : `en ${diffDays} días`} (${rem.reminder_date})`,
      ref: { type: 'reminder', id: rem.id },
    });
    if (result.ok) {
      sent++;
      await supabase
        .from('reminders')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', rem.id);
    } else {
      failed++;
    }
  }

  return NextResponse.json({ sent, failed });
}
