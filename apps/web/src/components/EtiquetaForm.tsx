import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2 } from 'lucide-react'
import {
  etiquetaSchema,
  type EtiquetaFormValues,
  type IEtiqueta,
} from '@valora/shared'
import { useEtiquetasStore } from '@/store/useEtiquetasStore'
import { useHogarStore } from '@/store/useHogarStore'

interface IEtiquetaFormProps {
  /** Etiqueta a editar; si se omite, el formulario crea una nueva. */
  etiqueta?: IEtiqueta
  /**
   * Se invoca al guardar. Si era creación, recibe el id de la nueva etiqueta;
   * si era edición, no se pasa argumento. El padre que no necesite el id
   * puede llamarlo sin él.
   */
  onSuccess: (nuevaId?: string) => void
  onCancel?: () => void
}

const inputClass =
  'block w-full rounded-lg border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/** Paleta de colores sugeridos (mismo rango que las categorías default). */
const COLORES_SUGERIDOS = [
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#6b7280',
]

/**
 * Formulario para crear o editar una etiqueta. La unicidad del nombre por
 * hogar la garantiza la BD; el store traduce la violación a un mensaje
 * legible. Se usa dentro de un `Modal` desde `EtiquetasPage` y desde el
 * `EtiquetaPicker` (mini-modal al crear inline).
 */
export function EtiquetaForm({ etiqueta, onSuccess, onCancel }: IEtiquetaFormProps) {
  const hogar = useHogarStore((s) => s.hogar)
  const saving = useEtiquetasStore((s) => s.saving)
  const addEtiqueta = useEtiquetasStore((s) => s.addEtiqueta)
  const updateEtiqueta = useEtiquetasStore((s) => s.updateEtiqueta)

  const esEdicion = etiqueta != null

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EtiquetaFormValues>({
    resolver: zodResolver(etiquetaSchema),
    defaultValues: {
      nombre: etiqueta?.nombre ?? '',
      color: etiqueta?.color ?? COLORES_SUGERIDOS[0]!,
    },
  })

  const color = watch('color')
  const nombre = watch('nombre')

  const onSubmit = handleSubmit(async (values) => {
    if (esEdicion) {
      const ok = await updateEtiqueta(etiqueta.id, values)
      if (ok) onSuccess()
      return
    }
    if (!hogar) return
    const nueva = await addEtiqueta(hogar.id, values)
    if (nueva) onSuccess(nueva.id)
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {/* Previsualización */}
      <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        >
          <Check size={14} className="text-white" />
        </span>
        <span className="truncate text-body-md font-medium text-on-surface">
          {nombre || 'Nombre de la etiqueta'}
        </span>
      </div>

      <div>
        <label
          htmlFor="etiqueta-nombre"
          className="mb-2 block text-label-md text-on-surface-variant"
        >
          Nombre
        </label>
        <input
          id="etiqueta-nombre"
          type="text"
          maxLength={40}
          placeholder="Ej. Vacaciones, Trabajo, Urgente…"
          autoFocus
          aria-invalid={errors.nombre != null}
          aria-describedby={errors.nombre ? 'etiqueta-nombre-error' : undefined}
          {...register('nombre')}
          className={inputClass}
        />
        {errors.nombre && (
          <p id="etiqueta-nombre-error" className="mt-1 text-label-sm text-error">
            {errors.nombre.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="etiqueta-color" className="mb-2 block text-label-md text-on-surface-variant">
          Color
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {COLORES_SUGERIDOS.map((sugerido) => {
            const activo = color === sugerido
            return (
              <button
                key={sugerido}
                type="button"
                aria-label={`Usar color ${sugerido}`}
                aria-pressed={activo}
                onClick={() => setValue('color', sugerido, { shouldValidate: true })}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  activo
                    ? 'border-on-surface scale-110'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: sugerido }}
              >
                {activo && <Check size={16} className="text-white" aria-hidden="true" />}
              </button>
            )
          })}
          <input
            id="etiqueta-color"
            type="color"
            aria-label="Color personalizado"
            aria-invalid={errors.color != null}
            value={color}
            onChange={(e) => setValue('color', e.target.value, { shouldValidate: true })}
            className="h-9 w-12 cursor-pointer rounded-lg border border-outline-variant"
          />
        </div>
        {errors.color && <p className="mt-1 text-label-sm text-error">{errors.color.message}</p>}
      </div>

      <div className={`flex gap-3 pt-2 ${onCancel ? '' : 'justify-end'}`}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="min-h-[44px] flex-1 rounded-lg border border-outline-variant bg-white py-3 text-label-md text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {esEdicion ? 'Guardar cambios' : 'Crear etiqueta'}
        </button>
      </div>
    </form>
  )
}
