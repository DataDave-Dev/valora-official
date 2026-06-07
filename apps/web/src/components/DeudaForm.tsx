import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import {
  deudaSchema,
  TIPO_DEUDA_LABELS,
  type DeudaFormValues,
  type IDeuda,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useDeudasStore } from '@/store/useDeudasStore'

interface IDeudaFormProps {
  /** Deuda a editar; si se omite, se crea una nueva. */
  deuda?: IDeuda
  onSuccess: () => void
  onCancel: () => void
}

const INPUT_CLASS =
  'block w-full rounded-xl border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/** Fecha de hoy como `yyyy-MM-dd` (formato columna `date`). */
function hoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Formulario de deuda (por cobrar o por pagar). */
export function DeudaForm({ deuda, onSuccess, onCancel }: IDeudaFormProps) {
  const hogar = useHogarStore((s) => s.hogar)
  const saving = useDeudasStore((s) => s.saving)
  const addDeuda = useDeudasStore((s) => s.addDeuda)
  // (Edición aún no implementada en store; en v1 siempre es creación.)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DeudaFormValues>({
    resolver: zodResolver(deudaSchema),
    defaultValues: {
      tipo: deuda?.tipo ?? 'por_pagar',
      contraparte: deuda?.contraparte ?? '',
      monto_original: deuda?.monto_original ?? undefined,
      fecha: deuda?.fecha ?? hoy(),
      fecha_limite: deuda?.fecha_limite ?? null,
      descripcion: deuda?.descripcion ?? null,
    },
  })

  const tipoActual = watch('tipo')

  const onSubmit = handleSubmit(async (values) => {
    if (!hogar) return
    const ok = await addDeuda(hogar.id, values)
    if (ok) onSuccess()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {/* Tipo */}
      <div
        role="group"
        aria-label="Tipo de deuda"
        className="grid grid-cols-2 gap-2 rounded-xl bg-surface-container-low p-1"
      >
        <button
          type="button"
          aria-pressed={tipoActual === 'por_pagar'}
          onClick={() => setValue('tipo', 'por_pagar', { shouldValidate: false })}
          className={`flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 text-label-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            tipoActual === 'por_pagar'
              ? 'bg-error-container text-on-error-container'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          Por pagar
        </button>
        <button
          type="button"
          aria-pressed={tipoActual === 'por_cobrar'}
          onClick={() => setValue('tipo', 'por_cobrar', { shouldValidate: false })}
          className={`flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 text-label-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            tipoActual === 'por_cobrar'
              ? 'bg-primary-container text-on-primary-container'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          Por cobrar
        </button>
      </div>

      {/* Contraparte */}
      <div>
        <label
          htmlFor="deuda-contraparte"
          className="mb-2 block text-label-md text-on-surface-variant"
        >
          Contraparte
        </label>
        <input
          id="deuda-contraparte"
          type="text"
          maxLength={120}
          placeholder={
            tipoActual === 'por_cobrar' ? 'Ej. Juan (me prestó dinero a su vez)'
              : 'Ej. Banco X (préstamo personal)'
          }
          aria-invalid={errors.contraparte != null}
          aria-describedby={errors.contraparte ? 'deuda-contraparte-error' : undefined}
          {...register('contraparte')}
          className={INPUT_CLASS}
        />
        {errors.contraparte && (
          <p id="deuda-contraparte-error" className="mt-1 text-label-sm text-error">
            {errors.contraparte.message}
          </p>
        )}
      </div>

      {/* Monto original */}
      <div>
        <label
          htmlFor="deuda-monto"
          className="mb-2 block text-label-md text-on-surface-variant"
        >
          Monto original
        </label>
        <input
          id="deuda-monto"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="0.00"
          aria-invalid={errors.monto_original != null}
          aria-describedby={errors.monto_original ? 'deuda-monto-error' : undefined}
          {...register('monto_original', { valueAsNumber: true })}
          className={INPUT_CLASS}
        />
        {errors.monto_original && (
          <p id="deuda-monto-error" className="mt-1 text-label-sm text-error">
            {errors.monto_original.message}
          </p>
        )}
      </div>

      {/* Fecha */}
      <div>
        <label htmlFor="deuda-fecha" className="mb-2 block text-label-md text-on-surface-variant">
          Fecha
        </label>
        <input
          id="deuda-fecha"
          type="date"
          aria-invalid={errors.fecha != null}
          aria-describedby={errors.fecha ? 'deuda-fecha-error' : undefined}
          {...register('fecha')}
          className={INPUT_CLASS}
        />
        {errors.fecha && (
          <p id="deuda-fecha-error" className="mt-1 text-label-sm text-error">
            {errors.fecha.message}
          </p>
        )}
      </div>

      {/* Fecha límite (opcional) */}
      <div>
        <label
          htmlFor="deuda-limite"
          className="mb-2 block text-label-md text-on-surface-variant"
        >
          Fecha límite (opcional)
        </label>
        <input
          id="deuda-limite"
          type="date"
          aria-invalid={errors.fecha_limite != null}
          aria-describedby={errors.fecha_limite ? 'deuda-limite-error' : undefined}
          {...register('fecha_limite', {
            setValueAs: (v: string) => (v === '' ? null : v),
          })}
          className={INPUT_CLASS}
        />
        {errors.fecha_limite && (
          <p id="deuda-limite-error" className="mt-1 text-label-sm text-error">
            {errors.fecha_limite.message}
          </p>
        )}
      </div>

      {/* Descripción */}
      <div>
        <label
          htmlFor="deuda-descripcion"
          className="mb-2 block text-label-md text-on-surface-variant"
        >
          Descripción (opcional)
        </label>
        <textarea
          id="deuda-descripcion"
          rows={2}
          maxLength={500}
          placeholder="Notas adicionales"
          aria-invalid={errors.descripcion != null}
          aria-describedby={errors.descripcion ? 'deuda-descripcion-error' : undefined}
          {...register('descripcion', { setValueAs: (v: string) => (v === '' ? null : v) })}
          className={`${INPUT_CLASS} resize-none`}
        />
        {errors.descripcion && (
          <p id="deuda-descripcion-error" className="mt-1 text-label-sm text-error">
            {errors.descripcion.message}
          </p>
        )}
      </div>

      <p className="text-label-sm text-secondary">
        {TIPO_DEUDA_LABELS[tipoActual]}: la deuda se creará como <strong>activa</strong>. Podrás
        registrar pagos parciales y, al llegar al 100%, se marcará como liquidada automáticamente.
      </p>

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
          Crear deuda
        </button>
      </div>
    </form>
  )
}
