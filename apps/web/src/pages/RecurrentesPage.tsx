import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Loader2, Pencil, Play, Power, RefreshCw, Trash2 } from 'lucide-react'
import {
  FRECUENCIA_LABELS,
  formatFechaCorta,
  type FrecuenciaRecurrente,
  type IMovimientoRecurrente,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { useCategoriasStore } from '@/store/useCategoriasStore'
import { useRecurrentesStore } from '@/store/useRecurrentesStore'
import { useMoneda } from '@/hooks/useMoneda'
import { Skeleton } from '@/components/Skeleton'
import { Modal } from '@/components/Modal'

/**
 * Plantillas de movimientos recurrentes del hogar activo. Cada plantilla
 * genera, en su `proxima_fecha` y siguientes, un movimiento `pendiente` que
 * el usuario debe confirmar o descartar. La materialización corre
 * automáticamente al activar el hogar o iniciar sesión; aquí ofrecemos un
 * botón "Materializar ahora" para forzar el ciclo.
 */
export function RecurrentesPage() {
  const navigate = useNavigate()
  const fmt = useMoneda()

  const hogar = useHogarStore((s) => s.hogar)
  const cuentas = useCuentasStore((s) => s.cuentas)
  const fetchCuentas = useCuentasStore((s) => s.fetchCuentas)
  const categorias = useCategoriasStore((s) => s.categorias)
  const fetchCategorias = useCategoriasStore((s) => s.fetchCategorias)

  const recurrentes = useRecurrentesStore((s) => s.recurrentes)
  const loading = useRecurrentesStore((s) => s.loading)
  const saving = useRecurrentesStore((s) => s.saving)
  const error = useRecurrentesStore((s) => s.error)
  const loadingMaterializar = useRecurrentesStore((s) => s.loadingMaterializar)
  const pendientesPorRecurrente = useRecurrentesStore((s) => s.pendientesPorRecurrente)
  const fetchRecurrentes = useRecurrentesStore((s) => s.fetchRecurrentes)
  const materializarVencidos = useRecurrentesStore((s) => s.materializarVencidos)
  const removeRecurrente = useRecurrentesStore((s) => s.removeRecurrente)

  const [aBorrar, setABorrar] = useState<IMovimientoRecurrente | null>(null)

  const hogarId = hogar?.id
  useEffect(() => {
    if (!hogarId) return
    void fetchCuentas(hogarId)
    void fetchCategorias(hogarId)
    void fetchRecurrentes(hogarId)
  }, [hogarId, fetchCuentas, fetchCategorias, fetchRecurrentes])

  const cuentasPorId = useMemo(
    () => new Map(cuentas.map((c) => [c.id, c.nombre])),
    [cuentas],
  )
  const categoriasPorId = useMemo(
    () => new Map(categorias.map((c) => [c.id, c.nombre])),
    [categorias],
  )

  // Total de movimientos pendientes por confirmar en todo el hogar.
  const totalPendientes = useMemo(
    () =>
      Object.values(pendientesPorRecurrente).reduce(
        (acc, lista) => acc + lista.length,
        0,
      ),
    [pendientesPorRecurrente],
  )

  const onMaterializar = async () => {
    if (!hogarId) return
    await materializarVencidos(hogarId)
  }

  const onConfirmarBorrar = async () => {
    if (!aBorrar) return
    const ok = await removeRecurrente(aBorrar.id)
    if (ok) setABorrar(null)
  }

  const onToggleActiva = async (r: IMovimientoRecurrente) => {
    // Usamos updateRecurrente pasando los mismos valores excepto activa.
    // Para no acoplarnos al RecurrenteFormValues, hacemos un update mínimo
    // con solo `activa`; el resto se preserva por el Update de Supabase.
    await useRecurrentesStore.getState().updateRecurrente(r.id, {
      tipo: r.tipo,
      monto: r.monto,
      descripcion: r.descripcion,
      cuenta_id: r.cuenta_id,
      categoria_id: r.categoria_id,
      frecuencia: r.frecuencia,
      proxima_fecha: r.proxima_fecha,
      fecha_fin: r.fecha_fin,
      dia_del_mes: r.dia_del_mes,
      activa: !r.activa,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-sm text-on-surface">Movimientos recurrentes</h1>
          <p className="mt-0.5 text-label-md text-secondary">
            Plantillas que generan movimientos pendientes de confirmar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onMaterializar()}
            disabled={loadingMaterializar}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-label-md text-secondary transition-colors duration-200 hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
          >
            <RefreshCw
              size={18}
              className={loadingMaterializar ? 'animate-spin' : ''}
              aria-hidden="true"
            />
            Materializar ahora
          </button>
          <button
            type="button"
            onClick={() => navigate('/recurrentes/nuevo')}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors duration-200 hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            <Pencil size={18} aria-hidden="true" />
            Nueva plantilla
          </button>
        </div>
      </div>

      {/* Banner de pendientes */}
      {totalPendientes > 0 && (
        <button
          type="button"
          onClick={() => navigate('/movimientos?estado=pendiente')}
          className="flex w-full items-center gap-3 rounded-2xl border border-tertiary/30 bg-tertiary-container px-4 py-3 text-left text-body-sm text-on-tertiary-container transition-colors hover:bg-tertiary-container/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary focus-visible:ring-offset-2"
        >
          <AlertCircle size={20} aria-hidden="true" />
          <span className="flex-1">
            Tienes <strong>{totalPendientes}</strong>{' '}
            {totalPendientes === 1 ? 'movimiento pendiente' : 'movimientos pendientes'} por
            confirmar. Toca para revisarlos.
          </span>
        </button>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
        >
          {error}
        </div>
      )}

      {loading ? (
        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-8 w-24" />
            </li>
          ))}
        </ul>
      ) : recurrentes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-container-highest bg-surface-container-low p-12 text-center text-body-sm text-on-surface-variant">
          Aún no tienes plantillas. Crea una para que un ingreso o gasto se repita automáticamente.
        </div>
      ) : (
        <ul className="space-y-2">
          {recurrentes.map((r) => {
            const pendientes = pendientesPorRecurrente[r.id]?.length ?? 0
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        r.activa ? 'bg-primary' : 'bg-outline-variant'
                      }`}
                      aria-hidden="true"
                    />
                    <p className="truncate text-body-md font-medium text-on-surface">
                      {r.descripcion}
                    </p>
                    <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-secondary">
                      {FRECUENCIA_LABELS[r.frecuencia as FrecuenciaRecurrente]}
                    </span>
                    {!r.activa && (
                      <span className="rounded-full bg-outline-variant/40 px-2 py-0.5 text-label-sm text-secondary">
                        Pausada
                      </span>
                    )}
                    {pendientes > 0 && (
                      <span className="rounded-full bg-tertiary-container px-2 py-0.5 text-label-sm text-on-tertiary-container">
                        {pendientes} pendiente{pendientes === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-body-sm text-secondary">
                    {r.tipo === 'gasto' ? '−' : '+'}
                    {fmt(r.monto)} · {cuentasPorId.get(r.cuenta_id) ?? 'Cuenta'}
                    {r.categoria_id && categoriasPorId.get(r.categoria_id)
                      ? ` · ${categoriasPorId.get(r.categoria_id)}`
                      : ''}
                    {' · '}
                    Próxima: {formatFechaCorta(r.proxima_fecha)}
                    {r.fecha_fin && ` · Hasta: ${formatFechaCorta(r.fecha_fin)}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void onToggleActiva(r)}
                    disabled={saving}
                    aria-label={r.activa ? `Pausar ${r.descripcion}` : `Reanudar ${r.descripcion}`}
                    className="rounded-lg p-2 text-secondary transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
                  >
                    {r.activa ? <Power size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/recurrentes/${r.id}/editar`)}
                    aria-label={`Editar ${r.descripcion}`}
                    className="rounded-lg p-2 text-secondary transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <Pencil size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setABorrar(r)}
                    aria-label={`Eliminar ${r.descripcion}`}
                    className="rounded-lg p-2 text-secondary transition-colors hover:bg-error-container hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Modal de confirmación de borrado */}
      {aBorrar && (
        <Modal title="Eliminar recurrente" onClose={() => setABorrar(null)}>
          <div className="space-y-4">
            <p className="text-body-md text-on-surface-variant">
              ¿Eliminar la plantilla <strong className="text-on-surface">{aBorrar.descripcion}</strong>?
              Los movimientos ya generados no se borrarán; quedarán en el historial con su estado
              actual.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setABorrar(null)}
                disabled={saving}
                className="flex min-h-[44px] items-center justify-center rounded-lg border border-outline-variant bg-white px-4 py-3 text-label-md text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void onConfirmarBorrar()}
                disabled={saving}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-error px-4 py-3 text-label-md text-on-error transition-colors hover:bg-error/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
              >
                {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
