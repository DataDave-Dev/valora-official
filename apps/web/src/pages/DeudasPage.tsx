import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, HandCoins, Plus, Trash2, TrendingUp } from 'lucide-react'
import { formatMXN, type IDeudaConProgreso } from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useDeudasStore } from '@/store/useDeudasStore'
import { Modal } from '@/components/Modal'
import { PagoDeudaForm } from '@/components/PagoDeudaForm'

type TabDeuda = 'activas' | 'liquidada'

export function DeudasPage() {
  const navigate = useNavigate()
  const hogar = useHogarStore((s) => s.hogar)
  const deudas = useDeudasStore((s) => s.deudas)
  const loading = useDeudasStore((s) => s.loading)
  const error = useDeudasStore((s) => s.error)
  const fetchDeudas = useDeudasStore((s) => s.fetchDeudas)
  const removeDeuda = useDeudasStore((s) => s.removeDeuda)
  const [toast, setToast] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  const [tab, setTab] = useState<TabDeuda>('activas')
  const [pagoDe, setPagoDe] = useState<IDeudaConProgreso | null>(null)
  const [aBorrar, setABorrar] = useState<IDeudaConProgreso | null>(null)

  useEffect(() => {
    if (hogar) void fetchDeudas(hogar.id)
  }, [hogar, fetchDeudas])

  // Auto-dismiss del toast.
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(t)
  }, [toast])

  if (!hogar) return null

  const activas = deudas.filter((d) => !d.liquidada)
  const liquidadas = deudas.filter((d) => d.liquidada)
  const lista = tab === 'activas' ? activas : liquidadas

  const totalPendientePagar = activas
    .filter((d) => d.tipo === 'por_pagar')
    .reduce((acc, d) => acc + d.restante, 0)
  const totalPendienteCobrar = activas
    .filter((d) => d.tipo === 'por_cobrar')
    .reduce((acc, d) => acc + d.restante, 0)

  const handleEliminar = async () => {
    if (!aBorrar) return
    const ok = await removeDeuda(aBorrar.id)
    setABorrar(null)
    if (ok) setToast({ tipo: 'ok', texto: 'Deuda eliminada.' })
  }

  return (
    <div className="mx-auto space-y-6 p-4 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-headline-sm text-on-surface">Deudas</h1>
        <button
          type="button"
          onClick={() => navigate('/deudas/nueva')}
          className="bg-primary text-label-md text-on-primary hover:bg-primary-container focus-visible:ring-primary flex min-h-11 items-center gap-2 rounded-lg px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <Plus size={18} aria-hidden="true" />
          Nueva deuda
        </button>
      </header>

      {/* Resumen */}
      {activas.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="border-error-container bg-error-container/30 flex items-center gap-3 rounded-2xl border p-4">
            <HandCoins size={22} className="text-error" aria-hidden="true" />
            <div>
              <p className="text-label-sm text-on-error-container">Por pagar</p>
              <p className="text-title-md text-on-error-container font-semibold">
                {formatMXN(totalPendientePagar)}
              </p>
            </div>
          </div>
          <div className="border-primary-container bg-primary-container/30 flex items-center gap-3 rounded-2xl border p-4">
            <TrendingUp size={22} className="text-primary" aria-hidden="true" />
            <div>
              <p className="text-label-sm text-on-primary-container">Por cobrar</p>
              <p className="text-title-md text-on-primary-container font-semibold">
                {formatMXN(totalPendienteCobrar)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Estado de deudas"
        className="bg-surface-container-low grid grid-cols-2 gap-2 rounded-xl p-1"
      >
        <button
          role="tab"
          aria-selected={tab === 'activas'}
          onClick={() => setTab('activas')}
          className={`text-label-md focus-visible:ring-primary flex min-h-[44px] items-center justify-center rounded-lg px-3 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            tab === 'activas'
              ? 'bg-primary text-on-primary'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          Activas ({activas.length})
        </button>
        <button
          role="tab"
          aria-selected={tab === 'liquidada'}
          onClick={() => setTab('liquidada')}
          className={`text-label-md focus-visible:ring-primary flex min-h-[44px] items-center justify-center rounded-lg px-3 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            tab === 'liquidada'
              ? 'bg-primary text-on-primary'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          Liquidadas ({liquidadas.length})
        </button>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`text-body-sm rounded-lg p-3 ${
            toast.tipo === 'ok'
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-error-container text-on-error-container'
          }`}
        >
          {toast.texto}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="bg-error-container text-body-sm text-on-error-container rounded-lg p-3"
        >
          {error}
        </div>
      )}

      {/* Lista */}
      {loading && deudas.length === 0 ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-surface-container-low h-28 animate-pulse rounded-2xl"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="border-outline-variant rounded-2xl border border-dashed p-8 text-center">
          <p className="text-body-md text-secondary">
            {tab === 'activas'
              ? 'No hay deudas activas. Crea una para empezar a registrar pagos parciales.'
              : 'Aún no has liquidado ninguna deuda.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {lista.map((d) => (
            <li
              key={d.id}
              className="border-outline-variant rounded-2xl border bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-label-sm rounded-full px-2 py-0.5 font-medium ${
                        d.tipo === 'por_pagar'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-primary-container text-on-primary-container'
                      }`}
                    >
                      {d.tipo === 'por_pagar' ? 'Por pagar' : 'Por cobrar'}
                    </span>
                    {d.liquidada && (
                      <span className="bg-primary-container text-label-sm text-on-primary-container flex items-center gap-1 rounded-full px-2 py-0.5">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        Liquidada
                      </span>
                    )}
                  </div>
                  <p className="text-title-sm text-on-surface mt-2 font-semibold">
                    {d.contraparte}
                  </p>
                  {d.descripcion && (
                    <p className="text-body-sm text-on-surface-variant mt-1 truncate">
                      {d.descripcion}
                    </p>
                  )}
                  <p className="text-label-sm text-secondary mt-1">
                    Inicio: {d.fecha}
                    {d.fecha_limite && ` · Límite: ${d.fecha_limite}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!d.liquidada && (
                    <button
                      type="button"
                      onClick={() => setPagoDe(d)}
                      aria-label={`Registrar pago a ${d.contraparte}`}
                      className="text-primary hover:bg-primary-container focus-visible:ring-primary flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    >
                      <Plus size={18} aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setABorrar(d)}
                    aria-label={`Eliminar deuda con ${d.contraparte}`}
                    className="text-error hover:bg-error-container focus-visible:ring-error flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="mt-3">
                <div className="mb-1 flex items-baseline justify-between">
                  <p className="text-label-sm text-secondary">
                    Pagado {formatMXN(d.pagado)} de {formatMXN(d.monto_original)}
                  </p>
                  <p className="text-label-sm text-on-surface font-medium">
                    {d.porcentaje.toFixed(0)}%
                  </p>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={d.porcentaje}
                  aria-label={`Progreso de pago de la deuda con ${d.contraparte}`}
                  className="bg-surface-container-low h-2 w-full overflow-hidden rounded-full"
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      d.liquidada ? 'bg-primary' : 'bg-primary'
                    }`}
                    style={{ width: `${d.porcentaje}%` }}
                  />
                </div>
                <p className="text-label-sm text-on-surface-variant mt-1">
                  Restante: <strong>{formatMXN(d.restante)}</strong>
                  {d.pagos.length > 0 &&
                    ` · ${d.pagos.length} pago${d.pagos.length === 1 ? '' : 's'}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal: registrar pago */}
      {pagoDe && (
        <Modal title={`Registrar pago a ${pagoDe.contraparte}`} onClose={() => setPagoDe(null)}>
          <PagoDeudaForm
            deuda={pagoDe}
            onSuccess={() => setPagoDe(null)}
            onCancel={() => setPagoDe(null)}
          />
        </Modal>
      )}

      {/* Modal: confirmar borrado */}
      {aBorrar && (
        <Modal title="Eliminar deuda" onClose={() => setABorrar(null)}>
          <div className="space-y-4">
            <p className="text-body-md text-on-surface">
              ¿Eliminar la deuda con <strong>{aBorrar.contraparte}</strong>?
            </p>
            <p className="text-body-sm text-on-surface-variant">
              Se eliminará también el historial de pagos asociado. Esta acción no se puede deshacer.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => setABorrar(null)}
                className="border-outline-variant text-label-md text-secondary hover:bg-surface-container-low focus-visible:ring-primary flex min-h-[44px] items-center justify-center rounded-lg border bg-white px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEliminar}
                className="bg-error text-label-md text-on-error hover:bg-error/90 focus-visible:ring-error flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                <Trash2 size={18} aria-hidden="true" />
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
