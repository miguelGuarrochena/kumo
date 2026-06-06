-- =========================================================================
-- Workspaces: customización visual (ícono + color).
--
-- Permite que cada espacio tenga su identidad visual en el switcher,
-- en lugar de mostrar siempre la primer letra del nombre.
-- =========================================================================

alter table public.workspaces
  add column if not exists icon  text not null default 'home',
  add column if not exists color text not null default 'sky';

comment on column public.workspaces.icon  is 'Ícono lucide: home, users, heart, briefcase, baby, etc.';
comment on column public.workspaces.color is 'Color de paleta Kumo: sky, lavender, peach, mint, rose, amber, fuchsia, emerald, indigo.';

-- =========================================================================
-- Update RPC get_workspace_members para no romper si se llama con cualquier
-- caller (la firma anterior se mantiene; los nuevos campos viajan aparte).
-- =========================================================================
-- (No cambios necesarios en la RPC — devuelve members, no metadata del ws)
