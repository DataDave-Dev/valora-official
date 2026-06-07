import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import {
  formatMXN,
  pagoDeudaSchema,
  type IDeudaConProgreso,
  type PagoDeudaFormValues,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useDeudasStore } from '@/store/useDeudasStore'

interface IPagoDeudaFormProps {
  deuda: IDeudaConProgreso
  onSuccess: () => void
  onCancel: () => void
}

const INPUT_CLASS =
  'block w-full rounded-xl border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

function hoy(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Formulario de pago (parcial o total) contra una deuda.
 * El monto máximo permitido es el `restante` actual.
 */
export function PagoDeudaForm({ deuda, onSuccess, onCancel }: IPagoDeudaFormProps) {
  const hogar = useHogarStore((s) => s.hogar)
  const saving = useDeudasStore((s) => s.saving)
  const addPago = useDeudasStore((s) => s.addPago)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PagoDeudaFormValues>({
    resolver: zodResolver(pagoDeudaSchema),
    defaultValues: {
      monto: deuda.restante > 0 ? Number(deuda.restante.toFixed(2)) : undefined,
      fecha: hoy(),
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (!hogar) return
    if (values.monto > deuda.restante + 0.005) {
      // Defensa adicional (zod solo valida > 0)
      alert(
        `El pago no puede exceder el saldo pendiente (${formatMXN(deuda.restante)}).`,
      )
      return
    }
    const ok = await addPago(deuda.id, hogar.id, values)
    if (ok) onSuccess()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="rounded-lg bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
        Saldo pendiente: <strong className="text-on-surface">{formatMXN(deuda.restante)}</strong>
        {' · '}
        Pagado: {formatMXN(deuda.pagado)} de {formatMXN(deuda.monto_original)}
      </p>

      <div>
        <label
          htmlFor="pago-monto"
          className="mb-2 block text-label-md text-on-surface-variant"
        >
          Monto del pago
        </label>
        <input
          id="pago-monto"
          type="number"
          step="0.01"
          min="0"
          max={deuda.restante}
          inputMode="decimal"
          placeholder="0.00"
          aria-invalid={errors.monto != null}
          aria-describedby={errors.monto ? 'pago-monto-error' : undefined}
          {...register('monto', { valueAsNumber: true })}
          className={INPUT_CLASS}
        />
        {errors.monto && (
          <p id="pago-monto-error" className="mt-1 text-label-sm text-error">
            {errors.monto.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="pago-fecha" className="mb-2 block text-label-md text-on-surface-variant">
          Fecha
        </label>
        <input
          id="pago-fecha"
          type="date"
          aria-invalid={errors.fecha != null}
          aria-describedby={errors.fecha ? 'pago-fecha-error' : undefined}
          {...register('fecha')}
          className={INPUT_CLASS}
        />
        {errors.fecha && (
          <p id="pago-fecha-error" className="mt-1 text-label-sm text-error">
            {errors.fecha.message}
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
          disabled={saving || deuda.restante <= 0}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          Registrar pago
        </button>
      </div>
    </form>
  )
}
