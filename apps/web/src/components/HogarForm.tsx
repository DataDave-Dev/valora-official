import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { hogarSchema, type HogarFormValues, type IHogar } from '@valora/shared'
import { useHogaresStore } from '@/store/useHogaresStore'

/** Monedas frecuentes (ISO 4217); el resto se puede teclear manualmente. */
const MONEDAS: { codigo: string; etiqueta: string }[] = [
  { codigo: 'MXN', etiqueta: 'Peso mexicano (MXN)' },
  { codigo: 'USD', etiqueta: 'Dólar estadounidense (USD)' },
  { codigo: 'EUR', etiqueta: 'Euro (EUR)' },
  { codigo: 'COP', etiqueta: 'Peso colombiano (COP)' },
  { codigo: 'ARS', etiqueta: 'Peso argentino (ARS)' },
  { codigo: 'CLP', etiqueta: 'Peso chileno (CLP)' },
  { codigo: 'PEN', etiqueta: 'Sol peruano (PEN)' },
  { codigo: 'BRL', etiqueta: 'Real brasileño (BRL)' },
  { codigo: 'GBP', etiqueta: 'Libra esterlina (GBP)' },
  { codigo: 'CAD', etiqueta: 'Dólar canadiense (CAD)' },
]

interface IHogarFormProps {
  /** Hogar a editar; si se omite, el formulario crea uno nuevo. */
  hogar?: IHogar
  /** Recibe el hogar resultante (creado o actualizado). */
  onSuccess: (hogar: IHogar) => void
  onCancel: () => void
}

const inputClass =
  'block w-full rounded-lg border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/**
 * Formulario para crear o editar un hogar (nombre, moneda y día de inicio del
 * mes financiero). Reutilizable desde la página Hogar. La moneda determina el
 * formato de todos los montos del hogar (`formatCurrency`).
 */
export function HogarForm({ hogar, onSuccess, onCancel }: IHogarFormProps) {
  const saving = useHogaresStore((s) => s.saving)
  const addHogar = useHogaresStore((s) => s.addHogar)
  const updateHogar = useHogaresStore((s) => s.updateHogar)

  const esEdicion = hogar != null

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HogarFormValues>({
    resolver: zodResolver(hogarSchema),
    defaultValues: {
      nombre: hogar?.nombre ?? '',
      moneda: hogar?.moneda ?? 'MXN',
      dia_inicio_mes: hogar?.dia_inicio_mes ?? 1,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (esEdicion) {
      const ok = await updateHogar(hogar.id, values)
      if (ok) onSuccess({ ...hogar, ...values })
    } else {
      const creado = await addHogar(values)
      if (creado) onSuccess(creado)
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="hogar-nombre" className="mb-2 block text-label-md text-on-surface-variant">
          Nombre del hogar
        </label>
        <input
          id="hogar-nombre"
          type="text"
          placeholder="Ej. Casa, Familia García…"
          aria-invalid={errors.nombre != null}
          aria-describedby={errors.nombre ? 'hogar-nombre-error' : undefined}
          {...register('nombre')}
          className={inputClass}
        />
        {errors.nombre && (
          <p id="hogar-nombre-error" className="mt-1 text-label-sm text-error">
            {errors.nombre.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="hogar-moneda" className="mb-2 block text-label-md text-on-surface-variant">
          Moneda
        </label>
        <select
          id="hogar-moneda"
          aria-invalid={errors.moneda != null}
          aria-describedby={errors.moneda ? 'hogar-moneda-error' : undefined}
          {...register('moneda')}
          className={inputClass}
        >
          {MONEDAS.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.etiqueta}
            </option>
          ))}
        </select>
        {errors.moneda && (
          <p id="hogar-moneda-error" className="mt-1 text-label-sm text-error">
            {errors.moneda.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="hogar-dia" className="mb-2 block text-label-md text-on-surface-variant">
          Día de inicio del mes
        </label>
        <input
          id="hogar-dia"
          type="number"
          min="1"
          max="31"
          aria-invalid={errors.dia_inicio_mes != null}
          aria-describedby="hogar-dia-ayuda"
          {...register('dia_inicio_mes')}
          className={inputClass}
        />
        <p id="hogar-dia-ayuda" className="mt-1 text-label-sm text-secondary">
          El mes financiero arranca este día (útil si cobras quincenal o a fin de mes).
        </p>
        {errors.dia_inicio_mes && (
          <p className="mt-1 text-label-sm text-error">{errors.dia_inicio_mes.message}</p>
        )}
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
          {esEdicion ? 'Guardar cambios' : 'Crear hogar'}
        </button>
      </div>
    </form>
  )
}
