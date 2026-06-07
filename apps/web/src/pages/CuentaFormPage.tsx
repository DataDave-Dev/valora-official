import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { CuentaForm } from '@/components/CuentaForm'

/**
 * Página dedicada para crear (`/cuentas/nueva`) o editar
 * (`/cuentas/:id/editar`) una cuenta. No es un modal: envuelve el formulario
 * reutilizable `CuentaForm` y resuelve la navegación de vuelta a `/cuentas`.
 */
export function CuentaFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const hogar = useHogarStore((s) => s.hogar)
  const cuentas = useCuentasStore((s) => s.cuentas)
  const loading = useCuentasStore((s) => s.loading)
  const fetchCuentas = useCuentasStore((s) => s.fetchCuentas)

  const hogarId = hogar?.id
  // En edición la lista podría no estar cargada (acceso directo por URL).
  useEffect(() => {
    if (id && hogarId && cuentas.length === 0) void fetchCuentas(hogarId)
  }, [id, hogarId, cuentas.length, fetchCuentas])

  const cuenta = id ? cuentas.find((c) => c.id === id) : undefined
  const esEdicion = id != null

  const volver = () => navigate('/cuentas')

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
          {esEdicion ? 'Editar cuenta' : 'Nueva cuenta'}
        </h1>
      </header>

      {/* Un formulario se lee mejor en una columna acotada; no se estira a todo el ancho. */}
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          {esEdicion && !cuenta ? (
            loading ? (
              <div className="flex items-center justify-center py-6 text-secondary">
                <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                <span className="ml-2 text-body-sm">Cargando cuenta…</span>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-body-md text-on-surface-variant">
                  No se encontró la cuenta solicitada.
                </p>
                <button
                  type="button"
                  onClick={volver}
                  className="rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Volver a Cuentas
                </button>
              </div>
            )
          ) : (
            <CuentaForm cuenta={cuenta} onSuccess={volver} onCancel={() => navigate(-1)} />
          )}
        </div>
      </div>
    </div>
  )
}
