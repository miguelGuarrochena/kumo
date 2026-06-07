-- Items breakdown: cuando split_mode='items', persistimos los items detectados
-- (OCR o cargados a mano) con su precio y a quiénes están asignados.
-- Formato JSON: [{ name: string, price: number, contact_ids: string[] }]
-- Los expense_splits asociados se generan al guardar (amount = suma de items asignados / N).

alter table public.expenses
  add column if not exists items_breakdown jsonb;
