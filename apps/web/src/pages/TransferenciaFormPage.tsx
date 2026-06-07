import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TransferenciaForm } from '@/components/TransferenciaForm'

/**
 * Página dedicada para registrar una transferencia (no es un modal). Envuelve
 * el formulario reutilizable `TransferenciaForm` y resuelve la navegación: al
 * guardar vuelve a la lista; al cancelar/volver, atrás.
 */
export function TransferenciaFormPage() {
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
        <h1 className="text-headline-sm text-on-surface">Nueva transferencia</h1>
      </header>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          <TransferenciaForm
            onSuccess={() => navigate('/transferencias')}
            onCancel={() => navigate(-1)}
          />
        </div>
      </div>
    </div>
  )
}
