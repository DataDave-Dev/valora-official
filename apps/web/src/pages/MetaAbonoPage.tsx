import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { useMetasStore } from '@/store/useMetasStore'
import { MetaAbonoForm } from '@/components/MetaAbonoForm'

/**
 * Página dedicada para abonar a o retirar de una meta (`/metas/:id/abonar`).
 * No es un modal: envuelve `MetaAbonoForm` y resuelve la navegación.
 */
export function MetaAbonoPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const hogar = useHogarStore((s) => s.hogar)
  const cuentas = useCuentasStore((s) => s.cuentas)
  const fetchCuentas = useCuentasStore((s) => s.fetchCuentas)

  const metas = useMetasStore((s) => s.metas)
  const loading = useMetasStore((s) => s.loading)
  const fetchMetas = useMetasStore((s) => s.fetchMetas)

  const hogarId = hogar?.id
  useEffect(() => {
    if (!hogarId) return
    if (cuentas.length === 0) void fetchCuentas(hogarId)
    if (metas.length === 0) void fetchMetas(hogarId)
  }, [hogarId, cuentas.length, metas.length, fetchCuentas, fetchMetas])

  const meta = id ? metas.find((m) => m.id === id) : undefined
  const volver = () => navigate('/metas')

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
          {meta ? meta.nombre : 'Meta'}
        </h1>
      </header>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          {!meta ? (
            loading ? (
              <div className="flex items-center justify-center py-6 text-secondary">
                <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                <span className="ml-2 text-body-sm">Cargando meta…</span>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-body-md text-on-surface-variant">No se encontró la meta solicitada.</p>
                <button
                  type="button"
                  onClick={volver}
                  className="rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Volver a Metas
                </button>
              </div>
            )
          ) : (
            <MetaAbonoForm meta={meta} onSuccess={volver} onCancel={() => navigate(-1)} />
          )}
        </div>
      </div>
    </div>
  )
}
