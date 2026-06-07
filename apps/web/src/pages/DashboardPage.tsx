import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoveUpRight, TrendingDown, TrendingUp } from 'lucide-react'
import {
  calcularPatrimonio,
  calcularVariacionGastos,
  esDelPeriodo,
  gastosPorCategoria,
  metaDeCuenta,
  periodoActual,
  saldosPorCuenta,
  type ICategoria,
  type ICuenta,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { useCategoriasStore } from '@/store/useCategoriasStore'
import { useMovimientosStore } from '@/store/useMovimientosStore'
import { useTransferenciasStore } from '@/store/useTransferenciasStore'
import { SpendingDonut } from '@/components/SpendingDonut'
import { DynamicIcon } from '@/components/DynamicIcon'
import { Skeleton } from '@/components/Skeleton'
import { TransaccionRow, TransaccionRowSkeleton } from '@/components/TransaccionRow'
import { useCountUp } from '@/hooks/useCountUp'
import { useMoneda } from '@/hooks/useMoneda'

export function DashboardPage() {
  const navigate = useNavigate()
  const hogar = useHogarStore((s) => s.hogar)

  const cuentas = useCuentasStore((s) => s.cuentas)
  const cuentasLoading = useCuentasStore((s) => s.loading)
  const cuentasError = useCuentasStore((s) => s.error)
  const fetchCuentas = useCuentasStore((s) => s.fetchCuentas)

  const categorias = useCategoriasStore((s) => s.categorias)
  const fetchCategorias = useCategoriasStore((s) => s.fetchCategorias)

  const movimientos = useMovimientosStore((s) => s.movimientos)
  const movimientosLoading = useMovimientosStore((s) => s.loading)
  const movimientosError = useMovimientosStore((s) => s.error)
  const fetchMovimientos = useMovimientosStore((s) => s.fetchMovimientos)

  const transferencias = useTransferenciasStore((s) => s.transferencias)
  const fetchTransferencias = useTransferenciasStore((s) => s.fetchTransferencias)

  const fmt = useMoneda()

  const hogarId = hogar?.id
  useEffect(() => {
    if (!hogarId) return
    void fetchCuentas(hogarId)
    void fetchCategorias(hogarId)
    void fetchMovimientos(hogarId)
    void fetchTransferencias(hogarId)
  }, [hogarId, fetchCuentas, fetchCategorias, fetchMovimientos, fetchTransferencias])

  const patrimonio = useMemo(
    () => calcularPatrimonio(cuentas, movimientos, transferencias),
    [cuentas, movimientos, transferencias],
  )

  // Gastos del mes en curso para la dona.
  const gastosDelMes = useMemo(() => {
    const periodo = periodoActual()
    const delMes = movimientos.filter((m) => esDelPeriodo(m.fecha, periodo))
    return gastosPorCategoria(delMes, categorias)
  }, [movimientos, categorias])

  // Variación de gastos mes actual vs mes anterior (solo si hay histórico real).
  const variacion = useMemo(
    () => calcularVariacionGastos(movimientos),
    [movimientos],
  )

  const categoriasPorId = useMemo(
    () => new Map<string, ICategoria>(categorias.map((c) => [c.id, c])),
    [categorias],
  )

  const recientes = useMemo(
    () => movimientos.filter((m) => m.estado === 'confirmado').slice(0, 5),
    [movimientos],
  )

  const cuentasActivas = useMemo(() => cuentas.filter((c) => !c.archivada), [cuentas])

  // Saldos de todas las cuentas en una sola pasada (evita O(cuentas×movimientos)).
  const saldos = useMemo(
    () => saldosPorCuenta(cuentasActivas, movimientos, transferencias),
    [cuentasActivas, movimientos, transferencias],
  )

  const error = cuentasError ?? movimientosError

  const patrimonioAnimado = useCountUp(patrimonio.patrimonioNeto)

  return (
    <div className="space-y-8">
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
        >
          {error}
        </div>
      )}

      {/* Hero: Patrimonio Neto */}
      <section className="relative overflow-hidden rounded-2xl bg-primary p-8 text-on-primary shadow-lg">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-container opacity-20" />
        <div className="relative z-10 space-y-4">
          <h2 className="text-label-sm uppercase tracking-wider text-on-primary">
            Patrimonio Neto Total
          </h2>
          {cuentasLoading || movimientosLoading ? (
            <Skeleton className="h-10 w-3/4 bg-on-primary/20 md:h-14" />
          ) : (
            <h1 className="text-display-lg-mobile md:text-display-lg">
              {fmt(patrimonioAnimado)}
            </h1>
          )}

          {variacion && (
            <span className="inline-flex items-center gap-1 rounded-full bg-on-primary/15 px-3 py-1 text-label-sm">
              {variacion.porcentaje >= 0 ? (
                <TrendingUp size={14} aria-hidden="true" />
              ) : (
                <TrendingDown size={14} aria-hidden="true" />
              )}
              {variacion.porcentaje >= 0 ? '+' : '−'}
              {Math.abs(variacion.porcentaje).toFixed(1)}% en gastos este mes
            </span>
          )}

          <div className="flex gap-6 pt-2">
            <div>
              <p className="text-label-sm text-on-primary">Activos Líquidos</p>
              {cuentasLoading || movimientosLoading ? (
                <Skeleton className="mt-1 h-7 w-24 bg-on-primary/20" />
              ) : (
                <p className="text-headline-sm">{fmt(patrimonio.activosLiquidos)}</p>
              )}
            </div>
            <div className="w-px bg-on-primary/20" />
            <div>
              <p className="text-label-sm text-on-primary">Invertido</p>
              {cuentasLoading || movimientosLoading ? (
                <Skeleton className="mt-1 h-7 w-24 bg-on-primary/20" />
              ) : (
                <p className="text-headline-sm">{fmt(patrimonio.invertido)}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Mis Cuentas */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-headline-sm text-on-surface">Mis Cuentas</h3>
          <button
            type="button"
            onClick={() => navigate('/cuentas')}
            className="rounded-lg px-1 text-label-md text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Gestionar Cuentas
          </button>
        </div>

        {cuentasLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <CuentaCardSkeleton key={i} />
            ))}
          </div>
        ) : cuentasActivas.length === 0 ? (
          <EmptyCard texto="Aún no tienes cuentas registradas." />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {cuentasActivas.map((cuenta) => (
              <CuentaCard
                key={cuenta.id}
                cuenta={cuenta}
                saldo={saldos.get(cuenta.id) ?? cuenta.saldo_inicial}
              />
            ))}
          </div>
        )}
      </section>

      {/* Resumen + Transacciones */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <h3 className="mb-6 text-headline-sm text-on-surface">Resumen de Gastos</h3>
            {movimientosLoading ? (
              <DonutSkeleton />
            ) : (
              <SpendingDonut datos={gastosDelMes} />
            )}
          </div>
        </section>

        <section className="space-y-6 lg:col-span-8">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-headline-sm text-on-surface">Transacciones Recientes</h3>
              <button
                type="button"
                className="rounded-lg bg-surface-container-low px-4 py-2 text-label-md text-primary transition-colors hover:bg-primary-container/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Ver Todo
              </button>
            </div>

            {movimientosLoading ? (
              <ul className="divide-y divide-outline-variant/40">
                {[0, 1, 2, 3].map((i) => (
                  <TransaccionRowSkeleton key={i} />
                ))}
              </ul>
            ) : recientes.length === 0 ? (
              <EmptyCard texto="Aún no hay transacciones. Añade tu primer movimiento." />
            ) : (
              <ul className="divide-y divide-outline-variant/40">
                {recientes.map((m) => (
                  <TransaccionRow
                    key={m.id}
                    movimiento={m}
                    categoria={m.categoria_id ? categoriasPorId.get(m.categoria_id) ?? null : null}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function CuentaCard({ cuenta, saldo }: { cuenta: ICuenta; saldo: number }) {
  const fmt = useMoneda()
  return (
    <div className="stagger-item group cursor-pointer rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm transition-shadow hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-8 flex justify-between">
        <div className="rounded-lg bg-primary-container/10 p-2 text-primary">
          <DynamicIcon name={cuenta.icono} size={22} />
        </div>
        <MoveUpRight
          size={20}
          className="text-outline transition-colors group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
      <div>
        <p className="text-label-md text-secondary">{cuenta.nombre}</p>
        <p className="mt-1 text-headline-md text-on-surface">{fmt(saldo)}</p>
        <p className="mt-2 text-label-sm text-outline-variant">{metaDeCuenta(cuenta)}</p>
      </div>
    </div>
  )
}

function CuentaCardSkeleton() {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
      <div className="mb-8 flex justify-between">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-5 w-5" />
      </div>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-7 w-32" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  )
}

function DonutSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex aspect-square w-full items-center justify-center">
        <Skeleton className="aspect-square w-full rounded-full" />
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyCard({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-container-highest bg-surface-container-low p-8 text-center text-body-sm text-on-surface-variant">
      {texto}
    </div>
  )
}
