import { EmptyState } from '@/components/EmptyState';

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Gastos</h1>
        <p className="text-slate-500 mt-1">
          Cargá lo que gastaste, vencimientos futuros y mirá totales por mes.
        </p>
      </header>

      {/* TODO: implementar
          - Form de alta (monto, categoría, descripción, fecha, vencimiento opcional, recurrencia)
          - Tabla de gastos del mes con filtros
          - Toggle pagado/pendiente para vencimientos
          - Gráfico de torta por categoría (Recharts)
          - Gráfico de barras de evolución mensual
          - Total del mes en grande arriba
      */}

      <EmptyState
        title="Próximamente: tus gastos"
        description="Acá vas a poder cargar lo que gastás, ver totales mensuales y gráficos por categoría."
        action={
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-sky-100 text-sky-700">
            En construcción
          </span>
        }
      />
    </div>
  );
}
