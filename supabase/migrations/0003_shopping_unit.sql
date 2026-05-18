-- =========================================================================
-- Shopping items: agregar columna `unit` para medida (g, kg, L, ml, etc.)
-- =========================================================================
alter table public.shopping_items
  add column if not exists unit text;

comment on column public.shopping_items.unit is
  'Unidad de medida: un., g, kg, ml, L, paq., docena, etc. Opcional.';
