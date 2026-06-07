import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import {
  categoriaSchema,
  TIPO_MOVIMIENTO_LABELS,
  type CategoriaFormValues,
  type ICategoria,
  type TipoMovimiento,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCategoriasStore } from '@/store/useCategoriasStore'
import { DynamicIcon } from '@/components/DynamicIcon'

interface ICategoriaFormProps {
  /** Categoría a editar; si se omite, el formulario crea una nueva. */
  categoria?: ICategoria
  /** Tipo preseleccionado al crear (según la columna de origen). */
  tipoInicial?: TipoMovimiento
  onSuccess: () => void
  onCancel: () => void
}

const inputClass =
  'block w-full rounded-lg border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/** Iconos lucide sugeridos para elegir con un toque (el campo acepta cualquier nombre). */
const ICONOS_SUGERIDOS = [
  'tag',
  'shopping-cart',
  'utensils',
  'car',
  'home',
  'heart-pulse',
  'graduation-cap',
  'plane',
  'gift',
  'wallet',
  'briefcase',
  'piggy-bank',
]

const TIPOS: TipoMovimiento[] = ['gasto', 'ingreso']

/**
 * Formulario para crear o editar una categoría raíz. Reutilizable desde la
 * página de formulario (`/catalogos/categorias/nueva` y `…/:id/editar`). Al
 * editar, el tipo queda fijo: cambiar Gasto↔Ingreso rompería la coherencia
 * categoría↔movimiento que validan los triggers.
 */
export function CategoriaForm({ categoria, tipoInicial, onSuccess, onCancel }: ICategoriaFormProps) {
  const hogar = useHogarStore((s) => s.hogar)
  const saving = useCategoriasStore((s) => s.saving)
  const addCategoria = useCategoriasStore((s) => s.addCategoria)
  const updateCategoria = useCategoriasStore((s) => s.updateCategoria)

  const esEdicion = categoria != null

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: categoria?.nombre ?? '',
      tipo: categoria?.tipo ?? tipoInicial ?? 'gasto',
      color: categoria?.color ?? '#10b981',
      icono: categoria?.icono ?? 'tag',
    },
  })

  const color = watch('color')
  const icono = watch('icono')
  const tipo = watch('tipo')

  const onSubmit = handleSubmit(async (values) => {
    const ok = esEdicion
      ? await updateCategoria(categoria.id, values)
      : hogar
        ? await addCategoria(hogar.id, values)
        : false
    if (ok) onSuccess()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <input type="hidden" {...register('tipo')} />

      {/* Previsualización del aspecto de la categoría. */}
      <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <DynamicIcon name={icono} size={22} />
        </div>
        <div>
          <p className="text-body-md font-medium text-on-surface">
            {watch('nombre') || 'Nombre de la categoría'}
          </p>
          <p className="text-label-sm text-secondary">{TIPO_MOVIMIENTO_LABELS[tipo]}</p>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 block text-label-md text-on-surface-variant">Tipo</legend>
        <div className="flex gap-2">
          {TIPOS.map((t) => {
            const activo = tipo === t
            const deshabilitado = esEdicion && !activo
            return (
              <button
                key={t}
                type="button"
                aria-pressed={activo}
                disabled={deshabilitado}
                onClick={() => setValue('tipo', t, { shouldValidate: true })}
                className={`min-h-[44px] flex-1 rounded-lg border px-3 py-2.5 text-label-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  activo
                    ? 'border-primary bg-primary-container/15 text-primary'
                    : 'border-outline-variant text-secondary hover:border-primary-container hover:text-primary'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {TIPO_MOVIMIENTO_LABELS[t]}
              </button>
            )
          })}
        </div>
        {esEdicion && (
          <p className="mt-1 text-label-sm text-outline-variant">
            El tipo no se puede cambiar después de crear la categoría.
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="cat-nombre" className="mb-2 block text-label-md text-on-surface-variant">
          Nombre
        </label>
        <input
          id="cat-nombre"
          type="text"
          placeholder="Ej. Mascotas"
          aria-invalid={errors.nombre != null}
          aria-describedby={errors.nombre ? 'cat-nombre-error' : undefined}
          {...register('nombre')}
          className={inputClass}
        />
        {errors.nombre && (
          <p id="cat-nombre-error" className="mt-1 text-label-sm text-error">
            {errors.nombre.message}
          </p>
        )}
      </div>

      <div className="flex gap-4">
        <div className="w-28">
          <label htmlFor="cat-color" className="mb-2 block text-label-md text-on-surface-variant">
            Color
          </label>
          <input
            id="cat-color"
            type="color"
            aria-invalid={errors.color != null}
            {...register('color')}
            className="h-12 w-full cursor-pointer rounded-lg border border-outline-variant"
          />
          {errors.color && <p className="mt-1 text-label-sm text-error">{errors.color.message}</p>}
        </div>
        <div className="flex-1">
          <label htmlFor="cat-icono" className="mb-2 block text-label-md text-on-surface-variant">
            Icono
          </label>
          <input
            id="cat-icono"
            type="text"
            placeholder="tag"
            aria-invalid={errors.icono != null}
            aria-describedby={errors.icono ? 'cat-icono-error' : undefined}
            {...register('icono')}
            className={inputClass}
          />
          {errors.icono && (
            <p id="cat-icono-error" className="mt-1 text-label-sm text-error">
              {errors.icono.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ICONOS_SUGERIDOS.map((nombre) => {
          const activo = icono === nombre
          return (
            <button
              key={nombre}
              type="button"
              aria-label={`Usar icono ${nombre}`}
              aria-pressed={activo}
              onClick={() => setValue('icono', nombre, { shouldValidate: true })}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                activo
                  ? 'border-primary bg-primary-container/15 text-primary'
                  : 'border-outline-variant text-secondary hover:border-primary-container hover:text-primary'
              }`}
            >
              <DynamicIcon name={nombre} size={18} />
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="min-h-[44px] w-1/3 rounded-lg border border-outline-variant bg-white py-3 text-label-md text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex min-h-[44px] w-2/3 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {esEdicion ? 'Guardar cambios' : 'Crear categoría'}
        </button>
      </div>
    </form>
  )
}
