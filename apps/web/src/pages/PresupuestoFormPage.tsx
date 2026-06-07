import { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { periodoActual, type Periodo } from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCategoriasStore } from '@/store/useCategoriasStore'
import { usePresupuestosStore } from '@/store/usePresupuestosStore'
import { PresupuestoForm } from '@/components/PresupuestoForm'

/** Lee un entero válido de los search params, o devuelve el fallback. */
function intParam(value: string | null, fallback: number): number {
  const n = Number(value)
  return Number.isInteger(n) ? n : fallback
}

/**
 * Página dedicada para crear (`/presupuestos/nuevo?mes=&anio=`) o editar
 * (`/presupuestos/:id/editar`) un presupuesto. No es un modal: envuelve
 * `PresupuestoForm` y resuelve período, categorías disponibles y navegación.
 */
export function PresupuestoFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()

  const hogar = useHogarStore((s) => s.hogar)
  const categorias = useCategoriasStore((s) => s.categorias)
  const fetchCategorias = useCategoriasStore((s) => s.fetchCategorias)

  const presupuestos = usePresupuestosStore((s) => s.presupuestos)
  const loading = usePresupuestosStore((s) => s.loading)
  const fetchPresupuestos = usePresupuestosStore((s) => s.fetchPresupuestos)

  const esEdicion = id != null
  const presupuesto = id ? presupuestos.find((p) => p.id === id) : undefined

  const actual = periodoActual()
  const periodo: Periodo = presupuesto
    ? { mes: presupuesto.mes, anio: presupuesto.anio }
    : {
        mes: intParam(searchParams.get('mes'), actual.mes),
        anio: intParam(searchParams.get('anio'), actual.anio),
      }

  const hogarId = hogar?.id
  useEffect(() => {
    if (!hogarId) return
    if (categorias.length === 0) void fetchCategorias(hogarId)
    void fetchPresupuestos(hogarId, periodo)
    // periodo.mes/anio cubren el cambio de período; categorias.length evita refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hogarId, periodo.mes, periodo.anio, fetchCategorias, fetchPresupuestos])

  // Categorías de gasto aún sin presupuesto en este período (modo creación).
  const disponibles = useMemo(() => {
    const yaConPresupuesto = new Set(presupuestos.map((p) => p.categoria_id))
    return categorias.filter((c) => c.tipo === 'gasto' && !yaConPresupuesto.has(c.id))
  }, [categorias, presupuestos])

  const categoriaNombre = presupuesto
    ? (categorias.find((c) => c.id === presupuesto.categoria_id)?.nombre ?? 'Categoría')
    : undefined

  const volver = () => navigate(`/presupuestos?mes=${periodo.mes}&anio=${periodo.anio}`)

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
          {esEdicion ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        </h1>
      </header>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          {esEdicion && !presupuesto ? (
            loading ? (
              <div className="flex items-center justify-center py-6 text-secondary">
                <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                <span className="ml-2 text-body-sm">Cargando presupuesto…</span>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-body-md text-on-surface-variant">
                  No se encontró el presupuesto solicitado.
                </p>
                <button
                  type="button"
                  onClick={volver}
                  className="rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Volver a Presupuestos
                </button>
              </div>
            )
          ) : (
            <PresupuestoForm
              presupuesto={presupuesto}
              categoriaNombre={categoriaNombre}
              categorias={disponibles}
              periodo={periodo}
              onSuccess={volver}
              onCancel={() => navigate(-1)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
