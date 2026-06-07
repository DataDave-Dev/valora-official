import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useHogarStore } from '@/store/useHogarStore'
import { useEtiquetasStore } from '@/store/useEtiquetasStore'
import { EtiquetaForm } from '@/components/EtiquetaForm'
import { Modal } from '@/components/Modal'
import { Skeleton } from '@/components/Skeleton'
import type { IEtiqueta } from '@valora/shared'

const CATALOGO = '/catalogos/etiquetas'

/**
 * Catálogo de etiquetas del hogar: lista con CRUD completo. La unicidad del
 * nombre la garantiza la BD; el store traduce la violación a un mensaje
 * legible y no la aplicamos dos veces. El borrado es seguro: el cascade en
 * `movimiento_etiquetas` desvincula los movimientos asociados.
 */
export function EtiquetasPage() {
  const navigate = useNavigate()
  const hogar = useHogarStore((s) => s.hogar)
  const etiquetas = useEtiquetasStore((s) => s.etiquetas)
  const loading = useEtiquetasStore((s) => s.loading)
  const error = useEtiquetasStore((s) => s.error)
  const fetchEtiquetas = useEtiquetasStore((s) => s.fetchEtiquetas)

  const [aEditar, setAEditar] = useState<IEtiqueta | null>(null)
  const [aBorrar, setABorrar] = useState<IEtiqueta | null>(null)

  const hogarId = hogar?.id
  useEffect(() => {
    if (hogarId) void fetchEtiquetas(hogarId)
  }, [hogarId, fetchEtiquetas])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-sm text-on-surface">Etiquetas</h1>
          <p className="mt-0.5 text-label-md text-secondary">
            Etiquetas libres para agrupar y filtrar tus movimientos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`${CATALOGO}/nueva`)}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <Plus size={18} aria-hidden="true" />
          Nueva etiqueta
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
        <ul className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm"
            >
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-32 flex-1" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </li>
          ))}
        </ul>
      ) : etiquetas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center">
          <p className="text-body-md text-on-surface-variant">
            Aún no has creado etiquetas. Te servirán para filtrar movimientos.
          </p>
          <button
            type="button"
            onClick={() => navigate(`${CATALOGO}/nueva`)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus size={18} aria-hidden="true" />
            Crear la primera
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-outline-variant/40 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          {etiquetas.map((e) => (
            <EtiquetaRow
              key={e.id}
              etiqueta={e}
              onEditar={() => setAEditar(e)}
              onBorrar={() => setABorrar(e)}
            />
          ))}
        </ul>
      )}

      {aEditar && (
        <Modal title="Editar etiqueta" onClose={() => setAEditar(null)}>
          <EtiquetaForm
            etiqueta={aEditar}
            onSuccess={() => setAEditar(null)}
            onCancel={() => setAEditar(null)}
          />
        </Modal>
      )}

      {aBorrar && <BorrarConfirm etiqueta={aBorrar} onClose={() => setABorrar(null)} />}
    </div>
  )
}

interface IEtiquetaRowProps {
  etiqueta: IEtiqueta
  onEditar: () => void
  onBorrar: () => void
}

function EtiquetaRow({ etiqueta, onEditar, onBorrar }: IEtiquetaRowProps) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: etiqueta.color }}
        aria-hidden="true"
      >
        <Check size={14} className="text-white" />
      </span>
      <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">{etiqueta.nombre}</span>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={onEditar}
          aria-label={`Editar ${etiqueta.nombre}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onBorrar}
          aria-label={`Eliminar ${etiqueta.nombre}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-error-container hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}

function BorrarConfirm({
  etiqueta,
  onClose,
}: {
  etiqueta: IEtiqueta
  onClose: () => void
}) {
  const saving = useEtiquetasStore((s) => s.saving)
  const removeEtiqueta = useEtiquetasStore((s) => s.removeEtiqueta)

  const confirmar = async () => {
    const ok = await removeEtiqueta(etiqueta.id)
    if (ok) onClose()
  }

  return (
    <Modal title="Eliminar etiqueta" onClose={onClose}>
      <div className="space-y-5">
        <p className="text-body-sm text-on-surface-variant">
          ¿Seguro que quieres eliminar la etiqueta{' '}
          <span className="font-semibold">{etiqueta.nombre}</span>? Se desvinculará de los
          movimientos donde estaba aplicada, pero esos movimientos no se eliminan.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-[44px] flex-1 rounded-lg border border-outline-variant bg-white py-3 text-label-md text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
          >
            <X size={18} className="mr-1 inline" aria-hidden="true" />
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
