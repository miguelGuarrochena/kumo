import { EmptyState } from '@/components/EmptyState';

export default function ShoppingPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Lista de compras</h1>
        <p className="text-slate-500 mt-1">
          Anotá lo que falta. Tickeá mientras estás en el súper.
        </p>
      </header>

      {/* TODO: implementar
          - Input rápido para sumar item
          - Multiple listas (Supermercado, Farmacia, Ferretería, etc.)
          - Tickear/destickear con animación
          - Reordenar drag-and-drop
          - Vista compacta optimizada para mobile
          - Botón "Limpiar comprados"
      */}

      <EmptyState
        title="Próximamente: tu lista"
        description="Anotá lo que necesitás y tickealo mientras hacés las compras."
        action={
          <span className="inline-block text-xs px-3 py-1 rounded-full bg-mint-100 text-mint-500">
            En construcción
          </span>
        }
      />
    </div>
  );
}
