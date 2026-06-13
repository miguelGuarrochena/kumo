-- Índices compuestos para las rutas calientes que filtran por workspace + fecha.
-- Las consultas de dashboard, métricas, archivo y resumen de gastos filtran
-- siempre por (workspace_id, expense_date). Los índices previos eran por
-- (user_id, expense_date) o solo (workspace_id), así que estas queries hacían
-- scan parcial. Estos compuestos cubren rango de fechas + orden.

-- Gastos por workspace ordenados/filtrados por fecha (dashboard mes, métricas,
-- archivo por año, resumen paginado).
create index if not exists expenses_ws_date_idx
  on public.expenses (workspace_id, expense_date desc);

-- Vencimientos próximos sin pagar (tarjeta "próximos 7 días" del dashboard).
create index if not exists expenses_ws_due_idx
  on public.expenses (workspace_id, due_date)
  where due_date is not null and paid = false;

-- Recordatorios por workspace filtrados por fecha (dashboard + calendario).
create index if not exists reminders_ws_date_idx
  on public.reminders (workspace_id, reminder_date);
