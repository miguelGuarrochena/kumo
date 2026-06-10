-- =========================================================================
-- 0021_split_only_contacts.sql
--
-- Diferencia los contactos creados al dividir un gasto (sólo para asignar
-- splits, sin teléfono) de los contactos de notificaciones (WhatsApp).
-- Antes, al tipear "Martín" en el editor de split, terminaba apareciendo
-- en Settings > Contactos como si pudiera recibir notificaciones — confuso.
--
-- Con esta columna:
--   - Settings > Contactos filtra `is_split_only = false`.
--   - Los selectores de split traen todos (incluyendo split_only).
--   - Cuando el user agrega teléfono a un contacto split_only desde Settings,
--     podemos marcarlo como is_split_only=false (que reciba notificaciones).
-- =========================================================================

alter table public.notification_contacts
  add column if not exists is_split_only boolean not null default false;

create index if not exists notification_contacts_split_only_idx
  on public.notification_contacts(workspace_id, is_split_only);
