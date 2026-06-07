import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Loader2 } from 'lucide-react'
import {
  presupuestoSchema,
  etiquetaPeriodo,
  type PresupuestoFormValues,
  type ICategoria,
  type IPresupuesto,
  type Periodo,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { usePresupuestosStore } from '@/store/usePresupuestosStore'
import { agruparPorPadre } from '@/store/useCategoriasStore'

interface IPresupuestoFormProps {
  /** Presupuesto a editar; si se omite, el formulario crea uno nuevo. */
  presupuesto?: IPresupuesto
  /** Nombre de la categoría (modo edición: la categoría es fija). */
  categoriaNombre?: string
  /** Categorías de gasto seleccionables (modo creación; ya filtradas). */
  categorias?: ICategoria[]
  /** Período (mes/año) del presupuesto que se crea. */
  periodo: Periodo
  onSuccess: () => void
  onCancel: () => void
}

const INPUT_CLASS =
  'block w-full rounded-xl border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/**
 * Formulario para crear o editar un presupuesto (límite por categoría/mes).
 * Al editar, la categoría y el período son fijos: solo cambia el límite (la
 * identidad del presupuesto es categoría + mes + año, con UNIQUE en la BD).
 */
export function PresupuestoForm({
  presupuesto,
  categoriaNombre,
  categorias = [],
  periodo,
  onSuccess,
  onCancel,
}: IPresupuestoFormProps) {
  const hogar = useHogarStore((s) => s.hogar)
  const saving = usePresupuestosStore((s) => s.saving)
  const addPresupuesto = usePresupuestosStore((s) => s.addPresupuesto)
  const updatePresupuesto = usePresupuestosStore((s) => s.updatePresupuesto)

  const esEdicion = presupuesto != null

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PresupuestoFormValues>({
    resolver: zodResolver(presupuestoSchema),
    defaultValues: {
      categoria_id: presupuesto?.categoria_id ?? '',
      monto_limite: presupuesto?.monto_limite ?? undefined,
      mes: presupuesto?.mes ?? periodo.mes,
      anio: presupuesto?.anio ?? periodo.anio,
    },
  })

  const arbol = agruparPorPadre(categorias)

  const onSubmit = handleSubmit(async (values) => {
    const ok = esEdicion
      ? await updatePresupuesto(presupuesto.id, values.monto_limite)
      : hogar
        ? await addPresupuesto(hogar.id, values)
        : false
    if (ok) onSuccess()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-label-md text-secondary">
        Período: <span className="font-medium capitalize text-on-surface">{etiquetaPeriodo(periodo)}</span>
      </p>

      {/* Categoría: select en creación, texto fijo en edición. */}
      {esEdicion ? (
        <div>
          <span className="mb-2 block text-label-md text-on-surface-variant">Categoría</span>
          <p className="rounded-xl bg-surface-container-low px-4 py-3 text-body-sm font-medium text-on-surface">
            {categoriaNombre ?? 'Categoría'}
          </p>
        </div>
      ) : (
        <div>
          <label htmlFor="pre-categoria" className="mb-2 block text-label-md text-on-surface-variant">
            Categoría de gasto
          </label>
          {arbol.length === 0 ? (
            <p className="rounded-xl bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
              Ya tienes un presupuesto para cada categoría de gasto este mes.
            </p>
          ) : (
            <div className="relative">
              <select
                id="pre-categoria"
                aria-invalid={errors.categoria_id != null}
                aria-describedby={errors.categoria_id ? 'pre-categoria-error' : undefined}
                {...register('categoria_id')}
                className={`${INPUT_CLASS} appearance-none pr-10`}
              >
                <option value="" disabled>
                  Selecciona una categoría
                </option>
                {arbol.map((padre) =>
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
          )}
          {errors.categoria_id && (
            <p id="pre-categoria-error" className="mt-1 text-label-sm text-error">
              {errors.categoria_id.message}
            </p>
          )}
        </div>
      )}

      {/* Límite */}
      <div>
        <label htmlFor="pre-limite" className="mb-2 block text-label-md text-on-surface-variant">
          Límite mensual
        </label>
        <input
          id="pre-limite"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="0.00"
          aria-invalid={errors.monto_limite != null}
          aria-describedby={errors.monto_limite ? 'pre-limite-error' : undefined}
          {...register('monto_limite', { valueAsNumber: true })}
          className={INPUT_CLASS}
        />
        {errors.monto_limite && (
          <p id="pre-limite-error" className="mt-1 text-label-sm text-error">
            {errors.monto_limite.message}
          </p>
        )}
      </div>

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
          disabled={saving || (!esEdicion && arbol.length === 0)}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {esEdicion ? 'Guardar cambios' : 'Crear presupuesto'}
        </button>
      </div>
    </form>
  )
}
