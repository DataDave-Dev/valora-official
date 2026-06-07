import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { EtiquetaForm } from '@/components/EtiquetaForm'

const CATALOGO = '/catalogos/etiquetas'

/**
 * Página dedicada para crear una etiqueta (`/catalogos/etiquetas/nueva`).
 * Envuelve el formulario reutilizable `EtiquetaForm` y resuelve la
 * navegación de vuelta al catálogo.
 */
export function EtiquetaFormPage() {
  const navigate = useNavigate()
  const volver = () => navigate(CATALOGO)

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
        <h1 className="text-headline-sm text-on-surface">Nueva etiqueta</h1>
      </header>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          <EtiquetaForm onSuccess={volver} onCancel={() => navigate(-1)} />
        </div>
      </div>
    </div>
  )
}
