// Templates de email. HTML inline porque algunos clients de email (Gmail,
// Outlook) no soportan <style> en el head correctamente. Usamos colores
// hex directos para evitar CSS variables.

import type { WorkspaceRole } from '@/lib/supabase/database.types';

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type InviteEmailParams = {
  inviteeEmail: string;
  inviterName: string;          // "Miguel" o "Miguel G." — quién invita
  workspaceName: string;        // "Casa familia"
  role: WorkspaceRole;
  acceptLink: string;
};

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  admin:  'Admin — podés crear y modificar todo',
  reader: 'Lector — solo ver',
};

export const renderInviteEmail = (p: InviteEmailParams) => {
  const inviter = escapeHtml(p.inviterName);
  const wsName = escapeHtml(p.workspaceName);
  const roleLabel = escapeHtml(ROLE_LABEL[p.role]);

  const subject = `${inviter} te invitó a "${p.workspaceName}" en Kumo`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 16px;text-align:center;">
              <div style="display:inline-block;font-size:24px;font-weight:700;background:linear-gradient(135deg,#38bdf8,#a78bfa);-webkit-background-clip:text;background-clip:text;color:transparent;">
                ☁ Kumo
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:8px 32px 24px;">
              <h1 style="margin:0 0 12px;font-size:20px;line-height:1.4;font-weight:600;color:#0f172a;">
                ${inviter} te invitó a su espacio
              </h1>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#475569;">
                Vas a poder ver y manejar los gastos, recordatorios y compras
                del espacio <strong style="color:#0f172a;">${wsName}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:13px;color:#64748b;">
                Rol: <strong>${roleLabel}</strong>
              </p>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0;">
                    <a href="${p.acceptLink}" style="display:inline-block;background:linear-gradient(135deg,#38bdf8,#8b5cf6);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:12px;">
                      Aceptar invitación
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;text-align:center;">
                El link vence en 7 días.<br>
                Si el botón no funciona, copiá y pegá esta URL:<br>
                <a href="${p.acceptLink}" style="color:#0ea5e9;word-break:break-all;">${p.acceptLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f1f5f9;background:#f8fafc;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                Kumo · tus gastos como una nube perfecta<br>
                Si no esperabas esta invitación, ignorá este correo.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Versión texto plano para clientes que no renderizan HTML
  const text = [
    `${p.inviterName} te invitó a su espacio "${p.workspaceName}" en Kumo.`,
    '',
    `Rol: ${ROLE_LABEL[p.role]}`,
    '',
    `Aceptar invitación: ${p.acceptLink}`,
    '',
    'El link vence en 7 días.',
    'Si no esperabas esta invitación, ignorá este correo.',
  ].join('\n');

  return { subject, html, text };
};
