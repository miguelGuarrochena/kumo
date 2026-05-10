import { EmptyState } from '@/components/EmptyState';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
        <p className="text-slate-500 mt-1">
          Todas tus fechas: vencimientos, citas y cumpleaños en un solo lugar.
        </p>
      </header>

      {/* TODO: implementar
          - Vista mensual con grid de días
          - Pintar días según tipo de evento (gasto, recordatorio, cumple)
          - Modal con detalle del día al click
          - Navegación entre meses
          - Botón "Hoy"
          - Más adelante: sync con Google Calendar (export only para empezar)
      */}

      <EmptyState
        title="Próximamente: tu calendario"
        description="Vencimientos, citas y cumpleaños pintados sobre un calendario mensual."
        action={
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-peach-100 text-peach-400">
            En construcción
          </span>
        }
      />
    </div>
  );
}
