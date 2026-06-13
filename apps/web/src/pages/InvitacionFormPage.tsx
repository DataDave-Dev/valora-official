import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useHogarStore } from '@/store/useHogarStore'
import { InvitacionForm } from '@/components/InvitacionForm'

/**
 * Página para invitar a alguien al hogar activo (`/perfil/hogar/invitar`).
 * Envuelve `InvitacionForm`; al crear la invitación vuelve a la página Hogar,
 * donde aparece en la lista de pendientes con su enlace para copiar.
 */
export function InvitacionFormPage() {
  const navigate = useNavigate()
  const hogarActivo = useHogarStore((s) => s.hogar)

  const volver = () => navigate('/perfil/hogar')

  if (!hogarActivo) return <Navigate to="/perfil/hogar" replace />

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={volver}
          aria-label="Volver"
          className="rounded-lg p-1 text-secondary transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-headline-sm text-on-surface">Invitar a {hogarActivo.nombre}</h1>
      </header>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          <InvitacionForm hogarId={hogarActivo.id} onSuccess={volver} onCancel={volver} />
        </div>
      </div>
    </div>
  )
}
