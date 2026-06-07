import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Plus, Search } from 'lucide-react'
import {
  ANIO_MAX,
  ANIO_MIN,
  filtrosMovimientosSchema,
  type FiltrosMovimientos,
  type ICategoria,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { useCategoriasStore } from '@/store/useCategoriasStore'
import { useEtiquetasStore } from '@/store/useEtiquetasStore'
import { useMovimientosStore } from '@/store/useMovimientosStore'
import { TransaccionRow, TransaccionRowSkeleton } from '@/components/TransaccionRow'

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

/** Años seleccionables: del año próximo hacia atrás 8 años (dentro del rango válido). */
const anioActual = new Date().getFullYear()
const ANIOS = Array.from({ length: 8 }, (_, i) => anioActual + 1 - i).filter(
  (a) => a >= ANIO_MIN && a <= ANIO_MAX,
)

const SELECT_CLASS =
  'block w-full appearance-none rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5 pr-9 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/**
 * Vista de Movimientos: las transacciones SIEMPRE se consultan por período
 * (año + mes obligatorios) más filtros opcionales (tipo, cuenta). Nunca se
 * cargan todas de golpe. Validación en el front (este formulario) y en el
 * store antes de consultar la BD.
 */
export function MovimientosPage() {
  const navigate = useNavigate()
  const hogar = useHogarStore((s) => s.hogar)
  const cuentas = useCuentasStore((s) => s.cuentas)
  const fetchCuentas = useCuentasStore((s) => s.fetchCuentas)
  const categorias = useCategoriasStore((s) => s.categorias)
  const fetchCategorias = useCategoriasStore((s) => s.fetchCategorias)
  const etiquetas = useEtiquetasStore((s) => s.etiquetas)
  const fetchEtiquetas = useEtiquetasStore((s) => s.fetchEtiquetas)
  const movimientos = useMovimientosStore((s) => s.movimientosFiltrados)
  const loading = useMovimientosStore((s) => s.loadingFiltrados)
  const loadingMore = useMovimientosStore((s) => s.loadingMore)
  const hasMore = useMovimientosStore((s) => s.hasMore)
  const error = useMovimientosStore((s) => s.errorFiltrados)
  const etiquetasPorMovimiento = useMovimientosStore((s) => s.etiquetasPorMovimiento)
  const fetchMovimientosFiltrados = useMovimientosStore((s) => s.fetchMovimientosFiltrados)
  const cargarMas = useMovimientosStore((s) => s.cargarMas)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FiltrosMovimientos>({
    resolver: zodResolver(filtrosMovimientosSchema),
    defaultValues: {
      anio: anioActual,
      mes: new Date().getMonth() + 1,
      tipo: null,
      cuenta_id: null,
      etiqueta_id: null,
      estado: null,
    },
  })

  // Período efectivamente aplicado (para la etiqueta), no el seleccionado sin aplicar.
  const [aplicado, setAplicado] = useState({ anio: anioActual, mes: new Date().getMonth() + 1 })

  const hogarId = hogar?.id
  useEffect(() => {
    if (!hogarId) return
    void fetchCuentas(hogarId)
    void fetchCategorias(hogarId)
    void fetchEtiquetas(hogarId)
    void fetchMovimientosFiltrados(hogarId, getValues())
  }, [hogarId, fetchCuentas, fetchCategorias, fetchEtiquetas, fetchMovimientosFiltrados, getValues])

  const aplicar = handleSubmit((f) => {
    if (!hogarId) return
    setAplicado({ anio: f.anio, mes: f.mes })
    void fetchMovimientosFiltrados(hogarId, f)
  })

  const categoriasPorId = useMemo(
    () => new Map<string, ICategoria>(categorias.map((c) => [c.id, c])),
    [categorias],
  )

  const errorPeriodo = errors.anio?.message ?? errors.mes?.message

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-sm text-on-surface">Movimientos</h1>
          <p className="mt-0.5 text-label-md text-secondary">
            {MESES[aplicado.mes - 1]} {aplicado.anio}
            {!loading &&
              ` · ${movimientos.length} ${movimientos.length === 1 ? 'movimiento' : 'movimientos'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/movimientos/nuevo')}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors duration-200 hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <Plus size={18} aria-hidden="true" />
          Nuevo movimiento
        </button>
      </div>

      {/* Filtros */}
      <form
        onSubmit={aplicar}
        noValidate
        className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm md:p-6"
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12">
          {/* Año (obligatorio) */}
          <div>
            <label htmlFor="f-anio" className="mb-1.5 block text-label-md text-on-surface-variant">
              Año <span className="text-error">*</span>
            </label>
            <div className="relative">
              <select
                id="f-anio"
                aria-invalid={errors.anio != null}
                {...register('anio', { valueAsNumber: true })}
                className={SELECT_CLASS}
              >
                {ANIOS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
              />
            </div>
          </div>

          {/* Mes (obligatorio) */}
          <div>
            <label htmlFor="f-mes" className="mb-1.5 block text-label-md text-on-surface-variant">
              Mes <span className="text-error">*</span>
            </label>
            <div className="relative">
              <select
                id="f-mes"
                aria-invalid={errors.mes != null}
                {...register('mes', { valueAsNumber: true })}
                className={SELECT_CLASS}
              >
                {MESES.map((nombre, i) => (
                  <option key={nombre} value={i + 1}>
                    {nombre}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
              />
            </div>
          </div>

          {/* Tipo (opcional) */}
          <div>
            <label htmlFor="f-tipo" className="mb-1.5 block text-label-md text-on-surface-variant">
              Tipo
            </label>
            <div className="relative">
              <select
                id="f-tipo"
                {...register('tipo', { setValueAs: (v: string) => (v === '' ? null : v) })}
                className={SELECT_CLASS}
              >
                <option value="">Todos</option>
                <option value="gasto">Gastos</option>
                <option value="ingreso">Ingresos</option>
              </select>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
              />
            </div>
          </div>

          {/* Cuenta (opcional) */}
          <div>
            <label
              htmlFor="f-cuenta"
              className="mb-1.5 block text-label-md text-on-surface-variant"
            >
              Cuenta
            </label>
            <div className="relative">
              <select
                id="f-cuenta"
                {...register('cuenta_id', { setValueAs: (v: string) => (v === '' ? null : v) })}
                className={SELECT_CLASS}
              >
                <option value="">Todas</option>
                {cuentas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
              />
            </div>
          </div>

          {/* Etiqueta (opcional) */}
          <div>
            <label
              htmlFor="f-etiqueta"
              className="mb-1.5 block text-label-md text-on-surface-variant"
            >
              Etiqueta
            </label>
            <div className="relative">
              <select
                id="f-etiqueta"
                {...register('etiqueta_id', { setValueAs: (v: string) => (v === '' ? null : v) })}
                className={SELECT_CLASS}
              >
                <option value="">Todas</option>
                {etiquetas.map((e) => (
                  <option key={e.id} value={e.id}>
                    #{e.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
              />
            </div>
          </div>

          {/* Estado (opcional) */}
          <div>
            <label htmlFor="f-estado" className="mb-1.5 block text-label-md text-on-surface-variant">
              Estado
            </label>
            <div className="relative">
              <select
                id="f-estado"
                {...register('estado', { setValueAs: (v: string) => (v === '' ? null : v) })}
                className={SELECT_CLASS}
              >
                <option value="">Todos</option>
                <option value="confirmado">Confirmados</option>
                <option value="pendiente">Pendientes</option>
              </select>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
              />
            </div>
          </div>

          {/* Aplicar */}
          <div className="col-span-2 flex items-end md:col-span-4 lg:col-span-2 xl:col-span-1">
            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors duration-200 hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
            >
              <Search size={18} aria-hidden="true" />
              Aplicar
            </button>
          </div>
        </div>

        {errorPeriodo && (
          <p role="alert" className="mt-3 text-label-sm text-error">
            {errorPeriodo}
          </p>
        )}
      </form>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
        >
          {error}
        </div>
      )}

      {/* Tabla de transacciones del período */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
        {loading ? (
          <ul className="divide-y divide-outline-variant/40">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <TransaccionRowSkeleton key={i} />
            ))}
          </ul>
        ) : movimientos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-container-highest bg-surface-container-low p-12 text-center text-body-sm text-on-surface-variant">
            No hay transacciones en {MESES[aplicado.mes - 1]} {aplicado.anio} con los filtros
            seleccionados.
          </div>
        ) : (
          <>
            <ul className="divide-y divide-outline-variant/40">
              {movimientos.map((m) => (
                <TransaccionRow
                  key={m.id}
                  movimiento={m}
                  categoria={m.categoria_id ? categoriasPorId.get(m.categoria_id) ?? null : null}
                  etiquetas={etiquetasPorMovimiento[m.id] ?? []}
                />
              ))}
            </ul>
            {hasMore && hogarId && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => void cargarMas(hogarId)}
                  disabled={loadingMore}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-5 py-2.5 text-label-md text-secondary transition-colors duration-200 hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
                >
                  {loadingMore ? 'Cargando…' : 'Cargar más'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
