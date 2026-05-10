import { EmptyState } from '@/components/EmptyState';

export default function RemindersPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Recordatorios</h1>
        <p className="text-slate-500 mt-1">
          Citas médicas, cumpleaños y fechas que no querés olvidar.
        </p>
      </header>

      {/* TODO: implementar
          - Form de alta (título, tipo, fecha, hora opcional, descripción, días antes para notificar)
          - Lista agrupada por mes
          - Filtros por tipo (médico, cumpleaños, otros)
          - Recurrencia anual para cumpleaños
          - Indicador de "ya pasó" / "próximo"
      */}

      <EmptyState
        title="Próximamente: tus recordatorios"
        description="Cargá citas médicas, cumpleaños y fechas importantes. Te avisamos por WhatsApp."
        action={
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-lavender-100 text-lavender-500">
            En construcción
          </span>
        }
      />
    </div>
  );
}
