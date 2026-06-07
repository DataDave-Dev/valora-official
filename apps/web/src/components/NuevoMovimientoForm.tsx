import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Loader2 } from 'lucide-react'
import {
  movimientoSchema,
  type MovimientoFormValues,
  type TipoMovimiento,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { useCategoriasStore, agruparPorPadre } from '@/store/useCategoriasStore'
import { useMovimientosStore } from '@/store/useMovimientosStore'
import { EtiquetaPicker } from '@/components/EtiquetaPicker'

interface INuevoMovimientoFormProps {
  /** Se llama tras guardar correctamente. */
  onSuccess?: () => void
  /** Si se pasa, se muestra un botón "Cancelar" que lo invoca. */
  onCancel?: () => void
}

/** Fecha de hoy en formato `YYYY-MM-DD` para el valor por defecto del campo fecha. */
const hoy = (): string => new Date().toISOString().split('T')[0] ?? ''

const INPUT_CLASS =
  'block w-full rounded-xl border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/**
 * Formulario reutilizable para crear movimientos (ingresos y gastos).
 * La categoría soporta subcategorías (agrupadas por su categoría padre).
 * No decide su propia navegación: avisa por `onSuccess`/`onCancel`.
 */
export function NuevoMovimientoForm({ onSuccess, onCancel }: INuevoMovimientoFormProps) {
  const hogar = useHogarStore((s) => s.hogar)
  const cuentas = useCuentasStore((s) => s.cuentas)
  const fetchCuentas = useCuentasStore((s) => s.fetchCuentas)
  const categorias = useCategoriasStore((s) => s.categorias)
  const fetchCategorias = useCategoriasStore((s) => s.fetchCategorias)
  const saving = useMovimientosStore((s) => s.saving)
  const error = useMovimientosStore((s) => s.error)
  const addMovimiento = useMovimientosStore((s) => s.addMovimiento)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<MovimientoFormValues>({
    resolver: zodResolver(movimientoSchema),
    defaultValues: {
      tipo: 'gasto',
      monto: undefined,
      cuenta_id: '',
      categoria_id: null,
      descripcion: '',
      fecha: hoy(),
      notas: null,
      etiquetaIds: [],
    },
  })

  const tipoActual = watch('tipo')

  useEffect(() => {
    if (!hogar) return
    void fetchCuentas(hogar.id)
    void fetchCategorias(hogar.id)
  }, [hogar, fetchCuentas, fetchCategorias])

  // Si solo hay una cuenta, preselecciónala para ahorrarle un paso al usuario.
  useEffect(() => {
    if (cuentas.length === 1) {
      const unica = cuentas[0]
      if (unica) setValue('cuenta_id', unica.id, { shouldValidate: false })
    }
  }, [cuentas, setValue])

  /** Árbol categoría → subcategorías del tipo seleccionado (un nivel). */
  const arbolCategorias = agruparPorPadre(categorias.filter((c) => c.tipo === tipoActual))

  // Al cambiar el tipo, descarta la categoría para no arrastrar una inválida.
  const handleTipo = (tipo: TipoMovimiento) => {
    setValue('tipo', tipo, { shouldValidate: false })
    setValue('categoria_id', null, { shouldValidate: false })
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!hogar) return
    const ok = await addMovimiento(hogar.id, values)
    if (ok) onSuccess?.()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
        >
          {error}
        </div>
      )}

      {/* Tipo */}
      <div
        role="group"
        aria-label="Tipo de movimiento"
        className="grid grid-cols-2 gap-2 rounded-xl bg-surface-container-low p-1"
      >
        <button
          type="button"
          aria-pressed={tipoActual === 'gasto'}
          onClick={() => handleTipo('gasto')}
          className={`flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 text-label-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            tipoActual === 'gasto'
              ? 'bg-error-container text-on-error-container'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          Gasto
        </button>
        <button
          type="button"
          aria-pressed={tipoActual === 'ingreso'}
          onClick={() => handleTipo('ingreso')}
          className={`flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 text-label-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            tipoActual === 'ingreso'
              ? 'bg-primary-container text-on-primary-container'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          Ingreso
        </button>
      </div>

      {/* Monto */}
      <div>
        <label htmlFor="mov-monto" className="sr-only">
          Monto
        </label>
        <div className="flex items-center justify-center gap-1 py-2">
          <span
            aria-hidden="true"
            className={`text-headline-sm ${
              tipoActual === 'ingreso' ? 'text-primary' : 'text-on-surface'
            }`}
          >
            $
          </span>
          <input
            id="mov-monto"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0.00"
            aria-label="Monto"
            aria-invalid={errors.monto != null}
            aria-describedby={errors.monto ? 'mov-monto-error' : undefined}
            {...register('monto', { valueAsNumber: true })}
            className={`w-40 bg-transparent text-center text-headline-md font-semibold focus:outline-none ${
              tipoActual === 'ingreso' ? 'text-primary' : 'text-on-surface'
            }`}
          />
        </div>
        {errors.monto && (
          <p id="mov-monto-error" className="text-center text-label-sm text-error">
            {errors.monto.message}
          </p>
        )}
      </div>

      {/* Cuenta */}
      <div>
        <label htmlFor="mov-cuenta" className="mb-2 block text-label-md text-on-surface-variant">
          Cuenta
        </label>
        <div className="relative">
          <select
            id="mov-cuenta"
            aria-invalid={errors.cuenta_id != null}
            aria-describedby={errors.cuenta_id ? 'mov-cuenta-error' : undefined}
            {...register('cuenta_id')}
            className={`${INPUT_CLASS} appearance-none pr-10`}
          >
            <option value="" disabled>
              Selecciona una cuenta
            </option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
          />
        </div>
        {errors.cuenta_id && (
          <p id="mov-cuenta-error" className="mt-1 text-label-sm text-error">
            {errors.cuenta_id.message}
          </p>
        )}
      </div>

      {/* Categoría (con subcategorías) */}
      <div>
        <label htmlFor="mov-categoria" className="mb-2 block text-label-md text-on-surface-variant">
          Categoría
        </label>
        <div className="relative">
          <select
            id="mov-categoria"
            {...register('categoria_id', {
              setValueAs: (v: string) => (v === '' ? null : v),
            })}
            className={`${INPUT_CLASS} appearance-none pr-10`}
          >
            <option value="">Sin categoría</option>
            {arbolCategorias.map((padre) =>
              padre.subcategorias.length > 0 ? (
                <optgroup key={padre.id} label={padre.nombre}>
                  <option value={padre.id}>{padre.nombre} (general)</option>
                  {padre.subcategorias.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.nombre}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <option key={padre.id} value={padre.id}>
                  {padre.nombre}
                </option>
              ),
            )}
          </select>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
          />
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label
          htmlFor="mov-descripcion"
          className="mb-2 block text-label-md text-on-surface-variant"
        >
          Descripción
        </label>
        <input
          id="mov-descripcion"
          type="text"
          maxLength={120}
          placeholder={tipoActual === 'ingreso' ? 'Ej. Bonificación anual' : '¿En qué gastaste?'}
          aria-invalid={errors.descripcion != null}
          aria-describedby={errors.descripcion ? 'mov-descripcion-error' : undefined}
          {...register('descripcion')}
          className={INPUT_CLASS}
        />
        {errors.descripcion && (
          <p id="mov-descripcion-error" className="mt-1 text-label-sm text-error">
            {errors.descripcion.message}
          </p>
        )}
      </div>

      {/* Fecha */}
      <div>
        <label htmlFor="mov-fecha" className="mb-2 block text-label-md text-on-surface-variant">
          Fecha
        </label>
        <input
          id="mov-fecha"
          type="date"
          aria-invalid={errors.fecha != null}
          aria-describedby={errors.fecha ? 'mov-fecha-error' : undefined}
          {...register('fecha')}
          className={INPUT_CLASS}
        />
        {errors.fecha && (
          <p id="mov-fecha-error" className="mt-1 text-label-sm text-error">
            {errors.fecha.message}
          </p>
        )}
      </div>

      {/* Notas */}
      <div>
        <label htmlFor="mov-notas" className="mb-2 block text-label-md text-on-surface-variant">
          Notas
        </label>
        <textarea
          id="mov-notas"
          rows={2}
          maxLength={500}
          placeholder="Detalles adicionales (opcional)"
          aria-invalid={errors.notas != null}
          aria-describedby={errors.notas ? 'mov-notas-error' : undefined}
          {...register('notas', { setValueAs: (v: string) => (v === '' ? null : v) })}
          className={`${INPUT_CLASS} resize-none`}
        />
        {errors.notas && (
          <p id="mov-notas-error" className="mt-1 text-label-sm text-error">
            {errors.notas.message}
          </p>
        )}
      </div>

      {/* Etiquetas */}
      <Controller
        control={control}
        name="etiquetaIds"
        render={({ field }) => (
          <EtiquetaPicker value={field.value ?? []} onChange={field.onChange} />
        )}
      />

      {/* Footer */}
      <div className={`gap-4 pt-2 ${onCancel ? 'grid grid-cols-2' : ''}`}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex min-h-[44px] items-center justify-center rounded-lg border border-outline-variant bg-white px-4 py-3 text-label-md text-secondary transition-colors duration-200 hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-label-md text-on-primary transition-colors duration-200 hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Guardando…
            </>
          ) : (
            'Guardar movimiento'
          )}
        </button>
      </div>
    </form>
  )
}
