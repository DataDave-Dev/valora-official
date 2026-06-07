import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Loader2, Plus, Repeat, Trash2 } from 'lucide-react'
import { formatFechaCorta, type ICuenta, type ITransferencia } from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { useTransferenciasStore } from '@/store/useTransferenciasStore'
import { useMoneda } from '@/hooks/useMoneda'
import { Skeleton } from '@/components/Skeleton'
import { Modal } from '@/components/Modal'

/**
 * Lista de transferencias entre cuentas del hogar. Vista de datos a ancho
 * completo. Las transferencias no afectan los KPIs del dashboard (mueven saldo
 * entre cuentas, no son ingreso ni gasto).
 */
export function TransferenciasPage() {
  const navigate = useNavigate()
  const hogar = useHogarStore((s) => s.hogar)

  const cuentas = useCuentasStore((s) => s.cuentas)
  const fetchCuentas = useCuentasStore((s) => s.fetchCuentas)

  const transferencias = useTransferenciasStore((s) => s.transferencias)
  const loading = useTransferenciasStore((s) => s.loading)
  const error = useTransferenciasStore((s) => s.error)
  const fetchTransferencias = useTransferenciasStore((s) => s.fetchTransferencias)

  const fmt = useMoneda()
  const [aBorrar, setABorrar] = useState<ITransferencia | null>(null)

  const hogarId = hogar?.id
  useEffect(() => {
    if (!hogarId) return
    void fetchCuentas(hogarId)
    void fetchTransferencias(hogarId)
  }, [hogarId, fetchCuentas, fetchTransferencias])

  const cuentasPorId = useMemo(() => {
    const mapa = new Map<string, ICuenta>()
    for (const c of cuentas) mapa.set(c.id, c)
    return mapa
  }, [cuentas])

  const nombreCuenta = (id: string) => cuentasPorId.get(id)?.nombre ?? 'Cuenta eliminada'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-sm text-on-surface">Transferencias</h1>
          <p className="mt-0.5 text-label-md text-secondary">
            Movimientos de dinero entre tus cuentas. No cuentan como ingreso ni gasto.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/transferencias/nueva')}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <Plus size={18} aria-hidden="true" />
          Nueva transferencia
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
        <ul className="divide-y divide-outline-variant/40 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-4 px-4 py-4">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-4 w-48 flex-1" />
              <Skeleton className="h-5 w-20" />
            </li>
          ))}
        </ul>
      ) : transferencias.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center">
          <p className="text-body-md text-on-surface-variant">
            Aún no has registrado transferencias.
          </p>
          <button
            type="button"
            onClick={() => navigate('/transferencias/nueva')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus size={18} aria-hidden="true" />
            Registrar la primera
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-outline-variant/40 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          {transferencias.map((t) => (
            <li key={t.id} className="flex items-center gap-4 px-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container/10 text-primary">
                <Repeat size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body-md text-on-surface">
                  <span className="truncate font-medium">{nombreCuenta(t.cuenta_origen)}</span>
                  <ArrowRight size={15} className="shrink-0 text-secondary" aria-hidden="true" />
                  <span className="truncate font-medium">{nombreCuenta(t.cuenta_destino)}</span>
                </div>
                <p className="text-label-sm text-secondary">
                  {formatFechaCorta(t.fecha)}
                  {t.descripcion ? ` · ${t.descripcion}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-body-md font-semibold text-on-surface">
                {fmt(t.monto)}
              </span>
              <button
                type="button"
                onClick={() => setABorrar(t)}
                aria-label="Eliminar transferencia"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-error-container hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {aBorrar && (
        <BorrarConfirm
          transferencia={aBorrar}
          fmt={fmt}
          nombreOrigen={nombreCuenta(aBorrar.cuenta_origen)}
          nombreDestino={nombreCuenta(aBorrar.cuenta_destino)}
          onClose={() => setABorrar(null)}
        />
      )}
    </div>
  )
}

interface IBorrarConfirmProps {
  transferencia: ITransferencia
  fmt: (monto: number) => string
  nombreOrigen: string
  nombreDestino: string
  onClose: () => void
}

function BorrarConfirm({
  transferencia,
  fmt,
  nombreOrigen,
  nombreDestino,
  onClose,
}: IBorrarConfirmProps) {
  const saving = useTransferenciasStore((s) => s.saving)
  const removeTransferencia = useTransferenciasStore((s) => s.removeTransferencia)

  const confirmar = async () => {
    const ok = await removeTransferencia(transferencia.id)
    if (ok) onClose()
  }

  return (
    <Modal title="Eliminar transferencia" onClose={onClose}>
      <div className="space-y-5">
        <p className="text-body-sm text-on-surface-variant">
          ¿Seguro que quieres eliminar la transferencia de{' '}
          <span className="font-semibold">{fmt(transferencia.monto)}</span> de{' '}
          <span className="font-semibold">{nombreOrigen}</span> a{' '}
          <span className="font-semibold">{nombreDestino}</span>? Los saldos de ambas cuentas se
          recalcularán. Esta acción no se puede deshacer.
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
