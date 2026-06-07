import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  etiquetaPeriodo,
  periodoActual,
  presupuestosConProgreso,
  type EstadoPresupuesto,
  type IPresupuestoConProgreso,
  type Periodo,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCategoriasStore } from '@/store/useCategoriasStore'
import { useMovimientosStore } from '@/store/useMovimientosStore'
import { usePresupuestosStore } from '@/store/usePresupuestosStore'
import { useMoneda } from '@/hooks/useMoneda'
import { DynamicIcon } from '@/components/DynamicIcon'
import { Skeleton } from '@/components/Skeleton'
import { Modal } from '@/components/Modal'

/** Avanza/retrocede un período en `delta` meses. */
function pasoMes({ mes, anio }: Periodo, delta: number): Periodo {
  const total = (anio * 12 + (mes - 1)) + delta
  return { mes: (total % 12) + 1, anio: Math.floor(total / 12) }
}

function intParam(value: string | null, fallback: number): number {
  const n = Number(value)
  return Number.isInteger(n) ? n : fallback
}

/** Clases de color de la barra/badge según el estado del presupuesto. */
const COLOR_ESTADO: Record<EstadoPresupuesto, { barra: string; texto: string; chip: string }> = {
  ok: { barra: 'bg-primary', texto: 'text-primary', chip: 'bg-primary-container/15 text-primary' },
  alerta: {
    barra: 'bg-warning',
    texto: 'text-warning',
    chip: 'bg-warning-container text-on-warning-container',
  },
  excedido: {
    barra: 'bg-error',
    texto: 'text-error',
    chip: 'bg-error-container text-on-error-container',
  },
}

/**
 * Presupuestos por categoría del período seleccionado. El período vive en la
 * URL (`?mes=&anio=`) para que sobreviva a la navegación al formulario. Barra
 * amarilla ≥80% (alerta), roja ≥100% (excedido).
 */
export function PresupuestosPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const hogar = useHogarStore((s) => s.hogar)

  const categorias = useCategoriasStore((s) => s.categorias)
  const fetchCategorias = useCategoriasStore((s) => s.fetchCategorias)

  const movimientos = useMovimientosStore((s) => s.movimientos)
  const movimientosLoading = useMovimientosStore((s) => s.loading)
  const fetchMovimientos = useMovimientosStore((s) => s.fetchMovimientos)

  const presupuestos = usePresupuestosStore((s) => s.presupuestos)
  const loading = usePresupuestosStore((s) => s.loading)
  const error = usePresupuestosStore((s) => s.error)
  const fetchPresupuestos = usePresupuestosStore((s) => s.fetchPresupuestos)

  const fmt = useMoneda()
  const [aBorrar, setABorrar] = useState<IPresupuestoConProgreso | null>(null)

  const actual = periodoActual()
  const periodo: Periodo = {
    mes: intParam(searchParams.get('mes'), actual.mes),
    anio: intParam(searchParams.get('anio'), actual.anio),
  }

  const irAPeriodo = (p: Periodo) =>
    setSearchParams({ mes: String(p.mes), anio: String(p.anio) }, { replace: true })

  const hogarId = hogar?.id

  // Siempre que se abre la vista, resetea a mes/año actual si los params no coinciden.
  useEffect(() => {
    const current = periodoActual()
    const urlMes = intParam(searchParams.get('mes'), -1)
    const urlAnio = intParam(searchParams.get('anio'), -1)
    if (urlMes !== current.mes || urlAnio !== current.anio) {
      setSearchParams({ mes: String(current.mes), anio: String(current.anio) }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSearchParams])

  useEffect(() => {
    if (!hogarId) return
    if (categorias.length === 0) void fetchCategorias(hogarId)
    if (movimientos.length === 0) void fetchMovimientos(hogarId)
    void fetchPresupuestos(hogarId, periodo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hogarId, periodo.mes, periodo.anio, fetchCategorias, fetchMovimientos, fetchPresupuestos])

  const items = useMemo(
    () => presupuestosConProgreso(presupuestos, categorias, movimientos),
    [presupuestos, categorias, movimientos],
  )

  const cargando = loading || movimientosLoading

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-sm text-on-surface">Presupuestos</h1>
          <p className="mt-0.5 text-label-md text-secondary">
            Límites de gasto por categoría. Se evalúan por mes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/presupuestos/nuevo?mes=${periodo.mes}&anio=${periodo.anio}`)}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <Plus size={18} aria-hidden="true" />
          Nuevo presupuesto
        </button>
      </header>

      {/* Selector de período */}
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => irAPeriodo(pasoMes(periodo, -1))}
          aria-label="Mes anterior"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant text-secondary transition-colors hover:border-primary-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <span className="min-w-40 text-center text-body-md font-semibold capitalize text-on-surface">
          {etiquetaPeriodo(periodo)}
        </span>
        <button
          type="button"
          onClick={() => irAPeriodo(pasoMes(periodo, 1))}
          aria-label="Mes siguiente"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant text-secondary transition-colors hover:border-primary-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
        >
          {error}
        </div>
      )}

      {cargando ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <PresupuestoCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center">
          <p className="text-body-md text-on-surface-variant">
            No hay presupuestos para {etiquetaPeriodo(periodo)}.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/presupuestos/nuevo?mes=${periodo.mes}&anio=${periodo.anio}`)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus size={18} aria-hidden="true" />
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => (
            <PresupuestoCard
              key={item.id}
              item={item}
              fmt={fmt}
              onEditar={() => navigate(`/presupuestos/${item.id}/editar`)}
              onBorrar={() => setABorrar(item)}
            />
          ))}
        </div>
      )}

      {aBorrar && <BorrarConfirm item={aBorrar} onClose={() => setABorrar(null)} />}
    </div>
  )
}

interface IPresupuestoCardProps {
  item: IPresupuestoConProgreso
  fmt: (monto: number) => string
  onEditar: () => void
  onBorrar: () => void
}

function PresupuestoCard({ item, fmt, onEditar, onBorrar }: IPresupuestoCardProps) {
  const color = COLOR_ESTADO[item.estado]
  const restante = item.monto_limite - item.gastado
  const ancho = Math.min(item.porcentaje, 100)
  const categoria = item.categoria

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={
            categoria
              ? { backgroundColor: `${categoria.color}1a`, color: categoria.color }
              : undefined
          }
        >
          <DynamicIcon name={categoria?.icono ?? 'tag'} size={20} />
        </div>
        <span className="min-w-0 flex-1 truncate text-body-md font-medium text-on-surface">
          {categoria?.nombre ?? 'Categoría eliminada'}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-label-sm font-semibold ${color.chip}`}>
          {Math.round(item.porcentaje)}%
        </span>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEditar}
            aria-label="Editar presupuesto"
            className="flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onBorrar}
            aria-label="Eliminar presupuesto"
            className="flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-error-container hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-surface-container"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ancho)}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${color.barra}`}
          style={{ width: `${ancho}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-label-md">
        <span className="text-secondary">
          {fmt(item.gastado)} de {fmt(item.monto_limite)}
        </span>
        <span className={restante < 0 ? 'font-medium text-error' : 'text-secondary'}>
          {restante < 0 ? `${fmt(-restante)} excedido` : `${fmt(restante)} disponible`}
        </span>
      </div>
    </div>
  )
}

function PresupuestoCardSkeleton() {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-4 w-32 flex-1" />
        <Skeleton className="h-5 w-10" />
      </div>
      <Skeleton className="h-2.5 w-full" />
      <Skeleton className="mt-2 h-4 w-40" />
    </div>
  )
}

function BorrarConfirm({ item, onClose }: { item: IPresupuestoConProgreso; onClose: () => void }) {
  const saving = usePresupuestosStore((s) => s.saving)
  const removePresupuesto = usePresupuestosStore((s) => s.removePresupuesto)

  const confirmar = async () => {
    const ok = await removePresupuesto(item.id)
    if (ok) onClose()
  }

  return (
    <Modal title="Eliminar presupuesto" onClose={onClose}>
      <div className="space-y-5">
        <p className="text-body-sm text-on-surface-variant">
          ¿Seguro que quieres eliminar el presupuesto de{' '}
          <span className="font-semibold">{item.categoria?.nombre ?? 'esta categoría'}</span>? No
          afecta tus movimientos; solo deja de mostrarse el límite.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-[44px] flex-1 rounded-lg border border-outline-variant bg-white py-3 text-label-md text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={saving}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-error py-3 text-label-md text-on-error transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
            Eliminar
          </button>
        </div>
      </div>
    </Modal>
  )
}
