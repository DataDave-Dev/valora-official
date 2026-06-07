import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Loader2, Pencil, Plus, Trash2, TrendingUp } from 'lucide-react'
import { formatFechaCorta, progresoMeta, type IMeta } from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useMetasStore } from '@/store/useMetasStore'
import { useMoneda } from '@/hooks/useMoneda'
import { Skeleton } from '@/components/Skeleton'
import { Modal } from '@/components/Modal'

/**
 * Metas de ahorro del hogar, separadas en activas y completadas. El monto
 * acumulado de cada meta lo mantiene el trigger de la BD a partir de los
 * abonos/retiros (transferencias); aquí solo se muestra y se opera sobre él.
 */
export function MetasPage() {
  const navigate = useNavigate()
  const hogar = useHogarStore((s) => s.hogar)

  const metas = useMetasStore((s) => s.metas)
  const loading = useMetasStore((s) => s.loading)
  const error = useMetasStore((s) => s.error)
  const fetchMetas = useMetasStore((s) => s.fetchMetas)

  const fmt = useMoneda()
  const [aBorrar, setABorrar] = useState<IMeta | null>(null)

  const hogarId = hogar?.id
  useEffect(() => {
    if (hogarId) void fetchMetas(hogarId)
  }, [hogarId, fetchMetas])

  const activas = useMemo(() => metas.filter((m) => !m.completada), [metas])
  const completadas = useMemo(() => metas.filter((m) => m.completada), [metas])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-sm text-on-surface">Metas de ahorro</h1>
          <p className="mt-0.5 text-label-md text-secondary">
            Ahorra hacia un objetivo. Cada abono mueve dinero a tu cuenta de ahorro.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/metas/nueva')}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <Plus size={18} aria-hidden="true" />
          Nueva meta
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <MetaCardSkeleton key={i} />
          ))}
        </div>
      ) : metas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center">
          <p className="text-body-md text-on-surface-variant">Aún no tienes metas de ahorro.</p>
          <button
            type="button"
            onClick={() => navigate('/metas/nueva')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus size={18} aria-hidden="true" />
            Crear mi primera meta
          </button>
        </div>
      ) : (
        <>
          {activas.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {activas.map((meta) => (
                <MetaCard
                  key={meta.id}
                  meta={meta}
                  fmt={fmt}
                  onAbonar={() => navigate(`/metas/${meta.id}/abonar`)}
                  onEditar={() => navigate(`/metas/${meta.id}/editar`)}
                  onBorrar={() => setABorrar(meta)}
                />
              ))}
            </div>
          )}

          {completadas.length > 0 && (
            <section className="space-y-4 pt-2">
              <h2 className="text-headline-sm text-on-surface">Completadas</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {completadas.map((meta) => (
                  <MetaCard
                    key={meta.id}
                    meta={meta}
                    fmt={fmt}
                    onAbonar={() => navigate(`/metas/${meta.id}/abonar`)}
                    onEditar={() => navigate(`/metas/${meta.id}/editar`)}
                    onBorrar={() => setABorrar(meta)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {aBorrar && <BorrarConfirm meta={aBorrar} onClose={() => setABorrar(null)} />}
    </div>
  )
}

interface IMetaCardProps {
  meta: IMeta
  fmt: (monto: number) => string
  onAbonar: () => void
  onEditar: () => void
  onBorrar: () => void
}

function MetaCard({ meta, fmt, onAbonar, onEditar, onBorrar }: IMetaCardProps) {
  const { porcentaje, completada } = progresoMeta(meta.monto_actual, meta.monto_objetivo)
  const restante = Math.max(meta.monto_objetivo - meta.monto_actual, 0)

  return (
    <div className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            completada ? 'bg-primary text-on-primary' : 'bg-primary-container/10 text-primary'
          }`}
        >
          {completada ? <CheckCircle2 size={20} /> : <TrendingUp size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-md font-medium text-on-surface">{meta.nombre}</p>
          {meta.fecha_limite && (
            <p className="text-label-sm text-secondary">
              Fecha límite: {formatFechaCorta(meta.fecha_limite)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEditar}
            aria-label={`Editar ${meta.nombre}`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onBorrar}
            aria-label={`Eliminar ${meta.nombre}`}
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
        aria-valuenow={Math.round(porcentaje)}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-label-md">
        <span className="font-medium text-on-surface">
          {fmt(meta.monto_actual)} <span className="text-secondary">/ {fmt(meta.monto_objetivo)}</span>
        </span>
        <span className="text-secondary">
          {completada ? '¡Completada!' : `Faltan ${fmt(restante)}`}
        </span>
      </div>

      <button
        type="button"
        onClick={onAbonar}
        className="mt-4 flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-container/15 py-2.5 text-label-md font-medium text-primary transition-colors hover:bg-primary-container/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Abonar o retirar
      </button>
    </div>
  )
}

function MetaCardSkeleton() {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-4 w-32 flex-1" />
      </div>
      <Skeleton className="h-2.5 w-full" />
      <Skeleton className="mt-2 h-4 w-40" />
      <Skeleton className="mt-4 h-10 w-full" />
    </div>
  )
}

function BorrarConfirm({ meta, onClose }: { meta: IMeta; onClose: () => void }) {
  const saving = useMetasStore((s) => s.saving)
  const removeMeta = useMetasStore((s) => s.removeMeta)

  const confirmar = async () => {
    const ok = await removeMeta(meta.id)
    if (ok) onClose()
  }

  return (
    <Modal title="Eliminar meta" onClose={onClose}>
      <div className="space-y-5">
        <p className="text-body-sm text-on-surface-variant">
          ¿Seguro que quieres eliminar <span className="font-semibold">{meta.nombre}</span>? Las
          transferencias de tus abonos se conservan (el dinero ya se movió); solo se elimina el
          seguimiento de la meta.
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
