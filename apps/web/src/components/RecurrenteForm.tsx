import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Loader2 } from 'lucide-react'
import {
  recurrenteSchema,
  FRECUENCIA_LABELS,
  type FrecuenciaRecurrente,
  type IMovimientoRecurrente,
  type RecurrenteFormValues,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { useCategoriasStore, agruparPorPadre } from '@/store/useCategoriasStore'
import { useRecurrentesStore } from '@/store/useRecurrentesStore'

interface IRecurrenteFormProps {
  /** Recurrente a editar; si se omite, el formulario crea uno nuevo. */
  recurrente?: IMovimientoRecurrente
  onSuccess: () => void
  onCancel: () => void
}

const INPUT_CLASS =
  'block w-full rounded-xl border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const FRECUENCIAS: FrecuenciaRecurrente[] = ['semanal', 'quincenal', 'mensual', 'anual']

/** Fecha de hoy en formato `yyyy-MM-dd` (columna `date` de la BD). */
function hoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Formulario de movimiento recurrente. Define la plantilla (plantilla = cuenta
 * + categoría + tipo + monto + descripción + frecuencia + próxima fecha);
 * la materialización de los movimientos `pendiente` la dispara el store al
 * iniciar sesión o al activar el hogar (ver `useRecurrentesStore.materializarVencidos`).
 */
export function RecurrenteForm({ recurrente, onSuccess, onCancel }: IRecurrenteFormProps) {
  const hogar = useHogarStore((s) => s.hogar)
  const cuentas = useCuentasStore((s) => s.cuentas)
  const fetchCuentas = useCuentasStore((s) => s.fetchCuentas)
  const categorias = useCategoriasStore((s) => s.categorias)
  const fetchCategorias = useCategoriasStore((s) => s.fetchCategorias)
  const saving = useRecurrentesStore((s) => s.saving)
  const addRecurrente = useRecurrentesStore((s) => s.addRecurrente)
  const updateRecurrente = useRecurrentesStore((s) => s.updateRecurrente)

  const esEdicion = recurrente != null

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecurrenteFormValues>({
    resolver: zodResolver(recurrenteSchema),
    defaultValues: {
      tipo: recurrente?.tipo ?? 'gasto',
      monto: recurrente?.monto ?? undefined,
      cuenta_id: recurrente?.cuenta_id ?? '',
      categoria_id: recurrente?.categoria_id ?? null,
      descripcion: recurrente?.descripcion ?? '',
      frecuencia: recurrente?.frecuencia ?? 'mensual',
      proxima_fecha: recurrente?.proxima_fecha ?? hoy(),
      fecha_fin: recurrente?.fecha_fin ?? null,
      dia_del_mes: recurrente?.dia_del_mes ?? null,
      activa: recurrente?.activa ?? true,
    },
  })

  const tipoActual = watch('tipo')

  // Carga inicial de catálogos del hogar activo.
  useEffect(() => {
    if (!hogar) return
    void fetchCuentas(hogar.id)
    void fetchCategorias(hogar.id)
  }, [hogar, fetchCuentas, fetchCategorias])

  // Si solo hay una cuenta, preseleccionarla.
  useEffect(() => {
    if (recurrente) return
    if (cuentas.length === 1) {
      const unica = cuentas[0]
      if (unica) setValue('cuenta_id', unica.id, { shouldValidate: false })
    }
  }, [cuentas, recurrente, setValue])

  const arbolCategorias = agruparPorPadre(categorias.filter((c) => c.tipo === tipoActual))

  const onSubmit = handleSubmit(async (values) => {
    const ok = esEdicion
      ? await updateRecurrente(recurrente.id, values)
      : hogar
        ? await addRecurrente(hogar.id, values)
        : false
    if (ok) onSuccess()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* Tipo */}
      <div
        role="group"
        aria-label="Tipo de movimiento recurrente"
        className="grid grid-cols-2 gap-2 rounded-xl bg-surface-container-low p-1"
      >
        <button
          type="button"
          aria-pressed={tipoActual === 'gasto'}
          onClick={() => {
            setValue('tipo', 'gasto', { shouldValidate: false })
            setValue('categoria_id', null, { shouldValidate: false })
          }}
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
          onClick={() => {
            setValue('tipo', 'ingreso', { shouldValidate: false })
            setValue('categoria_id', null, { shouldValidate: false })
          }}
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
        <label htmlFor="rec-monto" className="mb-2 block text-label-md text-on-surface-variant">
          Monto
        </label>
        <input
          id="rec-monto"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="0.00"
          aria-invalid={errors.monto != null}
          aria-describedby={errors.monto ? 'rec-monto-error' : undefined}
          {...register('monto', { valueAsNumber: true })}
          className={INPUT_CLASS}
        />
        {errors.monto && (
          <p id="rec-monto-error" className="mt-1 text-label-sm text-error">
            {errors.monto.message}
          </p>
        )}
      </div>

      {/* Cuenta */}
      <div>
        <label htmlFor="rec-cuenta" className="mb-2 block text-label-md text-on-surface-variant">
          Cuenta
        </label>
        <div className="relative">
          <select
            id="rec-cuenta"
            aria-invalid={errors.cuenta_id != null}
            aria-describedby={errors.cuenta_id ? 'rec-cuenta-error' : undefined}
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
          <p id="rec-cuenta-error" className="mt-1 text-label-sm text-error">
            {errors.cuenta_id.message}
          </p>
        )}
      </div>

      {/* Categoría */}
      <div>
        <label
          htmlFor="rec-categoria"
          className="mb-2 block text-label-md text-on-surface-variant"
        >
          Categoría
        </label>
        <div className="relative">
          <select
            id="rec-categoria"
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
          htmlFor="rec-descripcion"
          className="mb-2 block text-label-md text-on-surface-variant"
        >
          Descripción
        </label>
        <input
          id="rec-descripcion"
          type="text"
          maxLength={120}
          placeholder={
            tipoActual === 'ingreso' ? 'Ej. Sueldo mensual' : 'Ej. Renta mensual'
          }
          aria-invalid={errors.descripcion != null}
          aria-describedby={errors.descripcion ? 'rec-descripcion-error' : undefined}
          {...register('descripcion')}
          className={INPUT_CLASS}
        />
        {errors.descripcion && (
          <p id="rec-descripcion-error" className="mt-1 text-label-sm text-error">
            {errors.descripcion.message}
          </p>
        )}
      </div>

      {/* Frecuencia */}
      <div>
        <label
          htmlFor="rec-frecuencia"
          className="mb-2 block text-label-md text-on-surface-variant"
        >
          Frecuencia
        </label>
        <div className="relative">
          <select
            id="rec-frecuencia"
            aria-invalid={errors.frecuencia != null}
            {...register('frecuencia')}
            className={`${INPUT_CLASS} appearance-none pr-10`}
          >
            {FRECUENCIAS.map((f) => (
              <option key={f} value={f}>
                {FRECUENCIA_LABELS[f]}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
          />
        </div>
        {errors.frecuencia && (
          <p className="mt-1 text-label-sm text-error">{errors.frecuencia.message}</p>
        )}
      </div>

      {/* Próxima fecha */}
      <div>
        <label
          htmlFor="rec-proxima"
          className="mb-2 block text-label-md text-on-surface-variant"
        >
          Próxima fecha
        </label>
        <input
          id="rec-proxima"
          type="date"
          aria-invalid={errors.proxima_fecha != null}
          aria-describedby={errors.proxima_fecha ? 'rec-proxima-error' : undefined}
          {...register('proxima_fecha')}
          className={INPUT_CLASS}
        />
        {errors.proxima_fecha && (
          <p id="rec-proxima-error" className="mt-1 text-label-sm text-error">
            {errors.proxima_fecha.message}
          </p>
        )}
      </div>

      {/* Fecha fin (opcional) */}
      <div>
        <label htmlFor="rec-fin" className="mb-2 block text-label-md text-on-surface-variant">
          Fecha de fin (opcional)
        </label>
        <input
          id="rec-fin"
          type="date"
          aria-invalid={errors.fecha_fin != null}
          aria-describedby={errors.fecha_fin ? 'rec-fin-error' : undefined}
          {...register('fecha_fin', {
            setValueAs: (v: string) => (v === '' ? null : v),
          })}
          className={INPUT_CLASS}
        />
        {errors.fecha_fin && (
          <p id="rec-fin-error" className="mt-1 text-label-sm text-error">
            {errors.fecha_fin.message}
          </p>
        )}
      </div>

      {/* Activa */}
      <label className="flex items-center gap-2 text-body-sm text-on-surface">
        <input
          type="checkbox"
          {...register('activa')}
          className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-2 focus:ring-primary/20"
        />
        Activa
      </label>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex min-h-[44px] items-center justify-center rounded-lg border border-outline-variant bg-white px-4 py-3 text-label-md text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {esEdicion ? 'Guardar cambios' : 'Crear recurrente'}
        </button>
      </div>
    </form>
  )
}
