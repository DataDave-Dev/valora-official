import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArchiveRestore, Loader2, Pencil, Plus, Repeat, Archive as ArchiveIcon } from 'lucide-react'
import { metaDeCuenta, saldosPorCuenta, type ICuenta } from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { useMovimientosStore } from '@/store/useMovimientosStore'
import { useTransferenciasStore } from '@/store/useTransferenciasStore'
import { useMoneda } from '@/hooks/useMoneda'
import { DynamicIcon } from '@/components/DynamicIcon'
import { Skeleton } from '@/components/Skeleton'
import { Modal } from '@/components/Modal'

/**
 * Gestión de cuentas: lista las cuentas activas (con saldo calculado) y las
 * archivadas por separado. Permite crear, editar, archivar y restaurar.
 * Vista de datos a ancho completo (sin `max-w` propio).
 */
export function CuentasPage() {
  const navigate = useNavigate()
  const hogar = useHogarStore((s) => s.hogar)

  const cuentas = useCuentasStore((s) => s.cuentas)
  const loading = useCuentasStore((s) => s.loading)
  const error = useCuentasStore((s) => s.error)
  const fetchCuentas = useCuentasStore((s) => s.fetchCuentas)

  const movimientos = useMovimientosStore((s) => s.movimientos)
  const movimientosLoading = useMovimientosStore((s) => s.loading)
  const fetchMovimientos = useMovimientosStore((s) => s.fetchMovimientos)

  const transferencias = useTransferenciasStore((s) => s.transferencias)
  const fetchTransferencias = useTransferenciasStore((s) => s.fetchTransferencias)

  const fmt = useMoneda()

  const [aArchivar, setAArchivar] = useState<ICuenta | null>(null)

  const hogarId = hogar?.id
  useEffect(() => {
    if (!hogarId) return
    void fetchCuentas(hogarId)
    void fetchMovimientos(hogarId)
    void fetchTransferencias(hogarId)
  }, [hogarId, fetchCuentas, fetchMovimientos, fetchTransferencias])

  const activas = useMemo(() => cuentas.filter((c) => !c.archivada), [cuentas])
  const archivadas = useMemo(() => cuentas.filter((c) => c.archivada), [cuentas])

  // Saldos de todas las cuentas en una sola pasada (movimientos + transferencias).
  const saldos = useMemo(
    () => saldosPorCuenta(cuentas, movimientos, transferencias),
    [cuentas, movimientos, transferencias],
  )
  const saldoDe = (c: ICuenta) => saldos.get(c.id) ?? c.saldo_inicial

  const cargando = loading || movimientosLoading

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-sm text-on-surface">Cuentas</h1>
          <p className="mt-0.5 text-label-md text-secondary">
            Administra tus cuentas, tarjetas y ahorros.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate('/transferencias')}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 py-2.5 text-label-md text-secondary transition-colors hover:border-primary-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Repeat size={18} aria-hidden="true" />
            Transferencias
          </button>
          <button
            type="button"
            onClick={() => navigate('/cuentas/nueva')}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            <Plus size={18} aria-hidden="true" />
            Nueva cuenta
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
        >
          {error}
        </div>
      )}

      {cargando ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <CuentaCardSkeleton key={i} />
          ))}
        </div>
      ) : activas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-12 text-center">
          <p className="text-body-md text-on-surface-variant">
            Aún no tienes cuentas registradas.
          </p>
          <button
            type="button"
            onClick={() => navigate('/cuentas/nueva')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus size={18} aria-hidden="true" />
            Crear mi primera cuenta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activas.map((cuenta) => (
            <CuentaCard
              key={cuenta.id}
              cuenta={cuenta}
              saldo={saldoDe(cuenta)}
              fmt={fmt}
              onEditar={() => navigate(`/cuentas/${cuenta.id}/editar`)}
              onArchivar={() => setAArchivar(cuenta)}
            />
          ))}
        </div>
      )}

      {archivadas.length > 0 && (
        <section className="space-y-4 pt-2">
          <h2 className="text-headline-sm text-on-surface">Archivadas</h2>
          <ul className="divide-y divide-outline-variant/40 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
            {archivadas.map((cuenta) => (
              <CuentaArchivadaRow key={cuenta.id} cuenta={cuenta} saldo={saldoDe(cuenta)} fmt={fmt} />
            ))}
          </ul>
        </section>
      )}

      {aArchivar && (
        <ArchivarConfirm cuenta={aArchivar} onClose={() => setAArchivar(null)} />
      )}
    </div>
  )
}

interface ICuentaCardProps {
  cuenta: ICuenta
  saldo: number
  fmt: (monto: number) => string
  onEditar: () => void
  onArchivar: () => void
}

function CuentaCard({ cuenta, saldo, fmt, onEditar, onArchivar }: ICuentaCardProps) {
  return (
    <div className="stagger-item flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div className="rounded-lg bg-primary-container/10 p-2 text-primary">
          <DynamicIcon name={cuenta.icono} size={22} />
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onEditar}
            aria-label={`Editar ${cuenta.nombre}`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Pencil size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onArchivar}
            aria-label={`Archivar ${cuenta.nombre}`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <ArchiveIcon size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div>
        <p className="text-label-md text-secondary">{cuenta.nombre}</p>
        <p className="mt-1 text-headline-md text-on-surface">{fmt(saldo)}</p>
        <p className="mt-2 text-label-sm text-outline-variant">{metaDeCuenta(cuenta)}</p>
      </div>
    </div>
  )
}

function CuentaArchivadaRow({
  cuenta,
  saldo,
  fmt,
}: {
  cuenta: ICuenta
  saldo: number
  fmt: (monto: number) => string
}) {
  const saving = useCuentasStore((s) => s.saving)
  const setArchivada = useCuentasStore((s) => s.setArchivada)

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-container text-secondary">
          <DynamicIcon name={cuenta.icono} size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-body-md text-on-surface">{cuenta.nombre}</p>
          <p className="text-label-sm text-outline-variant">{fmt(saldo)}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void setArchivada(cuenta.id, false)}
        disabled={saving}
        className="flex min-h-[40px] shrink-0 items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-label-md text-secondary transition-colors hover:border-primary-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
      >
        <ArchiveRestore size={16} aria-hidden="true" />
        Restaurar
      </button>
    </li>
  )
}

function ArchivarConfirm({ cuenta, onClose }: { cuenta: ICuenta; onClose: () => void }) {
  const saving = useCuentasStore((s) => s.saving)
  const setArchivada = useCuentasStore((s) => s.setArchivada)

  const confirmar = async () => {
    const ok = await setArchivada(cuenta.id, true)
    if (ok) onClose()
  }

  return (
    <Modal title="Archivar cuenta" onClose={onClose}>
      <div className="space-y-5">
        <p className="text-body-sm text-on-surface-variant">
          ¿Seguro que quieres archivar <span className="font-semibold">{cuenta.nombre}</span>? Se
          ocultará del dashboard pero conservará su historial y podrás restaurarla cuando quieras.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-[44px] w-1/2 rounded-lg border border-outline-variant bg-white py-3 text-label-md text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={saving}
            className="flex min-h-[44px] w-1/2 items-center justify-center gap-2 rounded-lg bg-on-surface py-3 text-label-md text-surface-container-lowest transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
            Archivar
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CuentaCardSkeleton() {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
      <div className="mb-6 flex justify-between">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-7 w-32" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  )
}
