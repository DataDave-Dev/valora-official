import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { NuevoMovimientoForm } from '@/components/NuevoMovimientoForm'

/**
 * Página dedicada para crear un movimiento (no es un modal). Envuelve el
 * formulario reutilizable `NuevoMovimientoForm` y resuelve la navegación:
 * al guardar vuelve a la lista de movimientos; al cancelar/volver, atrás.
 */
export function NuevoMovimientoPage() {
  const navigate = useNavigate()

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="rounded-lg p-1 text-secondary transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-headline-sm text-on-surface">Nuevo movimiento</h1>
      </header>

      {/* Un formulario se lee mejor en una columna acotada; no se estira a todo el ancho. */}
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          <NuevoMovimientoForm
            onSuccess={() => navigate('/movimientos')}
            onCancel={() => navigate(-1)}
          />
        </div>
      </div>
    </div>
  )
}
