import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useHogarStore } from '@/store/useHogarStore'
import { useRecurrentesStore } from '@/store/useRecurrentesStore'
import { RecurrenteForm } from '@/components/RecurrenteForm'

/**
 * Página para crear (`/recurrentes/nuevo`) o editar (`/recurrentes/:id/editar`)
 * un movimiento recurrente. Envuelve `RecurrenteForm` y resuelve navegación +
 * carga de la plantilla a editar.
 */
export function RecurrenteFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const hogar = useHogarStore((s) => s.hogar)
  const recurrentes = useRecurrentesStore((s) => s.recurrentes)
  const loading = useRecurrentesStore((s) => s.loading)
  const fetchRecurrentes = useRecurrentesStore((s) => s.fetchRecurrentes)

  const esEdicion = id != null
  const recurrente = id ? recurrentes.find((r) => r.id === id) : undefined

  const hogarId = hogar?.id
  useEffect(() => {
    if (!hogarId) return
    void fetchRecurrentes(hogarId)
  }, [hogarId, fetchRecurrentes])

  const volver = () => navigate('/recurrentes')

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
        <h1 className="text-headline-sm text-on-surface">
          {esEdicion ? 'Editar recurrente' : 'Nuevo recurrente'}
        </h1>
      </header>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          {esEdicion && !recurrente ? (
            loading ? (
              <div className="flex items-center justify-center py-6 text-secondary">
                <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                <span className="ml-2 text-body-sm">Cargando recurrente…</span>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-body-md text-on-surface-variant">
                  No se encontró el recurrente solicitado.
                </p>
                <button
                  type="button"
                  onClick={volver}
                  className="rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Volver a Recurrentes
                </button>
              </div>
            )
          ) : (
            <RecurrenteForm
              recurrente={recurrente}
              onSuccess={volver}
              onCancel={() => navigate(-1)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
