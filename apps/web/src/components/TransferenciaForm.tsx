import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowDown, ChevronDown, Loader2 } from 'lucide-react'
import {
  transferenciaSchema,
  TIPO_CUENTA_LABELS,
  type TransferenciaFormValues,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { useTransferenciasStore } from '@/store/useTransferenciasStore'

interface ITransferenciaFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

/** Fecha de hoy en formato `YYYY-MM-DD` para el valor por defecto del campo fecha. */
const hoy = (): string => new Date().toISOString().split('T')[0] ?? ''

const INPUT_CLASS =
  'block w-full rounded-xl border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/**
 * Formulario para registrar una transferencia entre dos cuentas del hogar.
 * El caso "pago de tarjeta" es una transferencia normal banco → tarjeta_credito.
 * No decide su propia navegación: avisa por `onSuccess`/`onCancel`.
 */
export function TransferenciaForm({ onSuccess, onCancel }: ITransferenciaFormProps) {
  const hogar = useHogarStore((s) => s.hogar)
  const cuentas = useCuentasStore((s) => s.cuentas)
  const fetchCuentas = useCuentasStore((s) => s.fetchCuentas)
  const saving = useTransferenciasStore((s) => s.saving)
  const error = useTransferenciasStore((s) => s.error)
  const addTransferencia = useTransferenciasStore((s) => s.addTransferencia)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TransferenciaFormValues>({
    resolver: zodResolver(transferenciaSchema),
    defaultValues: {
      cuenta_origen: '',
      cuenta_destino: '',
      monto: undefined,
      fecha: hoy(),
      descripcion: '',
    },
  })

  useEffect(() => {
    if (hogar) void fetchCuentas(hogar.id)
  }, [hogar, fetchCuentas])

  const cuentasActivas = useMemo(() => cuentas.filter((c) => !c.archivada), [cuentas])

  const onSubmit = handleSubmit(async (values) => {
    if (!hogar) return
    const ok = await addTransferencia(hogar.id, values)
    if (ok) onSuccess?.()
  })

  if (cuentasActivas.length < 2) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-body-md text-on-surface-variant">
          Necesitas al menos dos cuentas activas para registrar una transferencia.
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-outline-variant bg-white px-4 py-2.5 text-label-md text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Volver
          </button>
        )}
      </div>
    )
  }

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

      {/* Monto */}
      <div>
        <label htmlFor="tr-monto" className="sr-only">
          Monto
        </label>
        <div className="flex items-center justify-center gap-1 py-2">
          <span aria-hidden="true" className="text-headline-sm text-on-surface">
            $
          </span>
          <input
            id="tr-monto"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0.00"
            aria-label="Monto"
            aria-invalid={errors.monto != null}
            aria-describedby={errors.monto ? 'tr-monto-error' : undefined}
            {...register('monto', { valueAsNumber: true })}
            className="w-40 bg-transparent text-center text-headline-md font-semibold text-on-surface focus:outline-none"
          />
        </div>
        {errors.monto && (
          <p id="tr-monto-error" className="text-center text-label-sm text-error">
            {errors.monto.message}
          </p>
        )}
      </div>

      {/* Cuenta de origen */}
      <div>
        <label htmlFor="tr-origen" className="mb-2 block text-label-md text-on-surface-variant">
          Desde
        </label>
        <div className="relative">
          <select
            id="tr-origen"
            aria-invalid={errors.cuenta_origen != null}
            aria-describedby={errors.cuenta_origen ? 'tr-origen-error' : undefined}
            {...register('cuenta_origen')}
            className={`${INPUT_CLASS} appearance-none pr-10`}
          >
            <option value="" disabled>
              Selecciona la cuenta de origen
            </option>
            {cuentasActivas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} · {TIPO_CUENTA_LABELS[c.tipo]}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
          />
        </div>
        {errors.cuenta_origen && (
          <p id="tr-origen-error" className="mt-1 text-label-sm text-error">
            {errors.cuenta_origen.message}
          </p>
        )}
      </div>

      <div className="flex justify-center text-secondary" aria-hidden="true">
        <ArrowDown size={20} />
      </div>

      {/* Cuenta de destino */}
      <div>
        <label htmlFor="tr-destino" className="mb-2 block text-label-md text-on-surface-variant">
          Hacia
        </label>
        <div className="relative">
          <select
            id="tr-destino"
            aria-invalid={errors.cuenta_destino != null}
            aria-describedby={errors.cuenta_destino ? 'tr-destino-error' : undefined}
            {...register('cuenta_destino')}
            className={`${INPUT_CLASS} appearance-none pr-10`}
          >
            <option value="" disabled>
              Selecciona la cuenta de destino
            </option>
            {cuentasActivas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} · {TIPO_CUENTA_LABELS[c.tipo]}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
          />
        </div>
        {errors.cuenta_destino && (
          <p id="tr-destino-error" className="mt-1 text-label-sm text-error">
            {errors.cuenta_destino.message}
          </p>
        )}
      </div>

      {/* Fecha */}
      <div>
        <label htmlFor="tr-fecha" className="mb-2 block text-label-md text-on-surface-variant">
          Fecha
        </label>
        <input
          id="tr-fecha"
          type="date"
          aria-invalid={errors.fecha != null}
          aria-describedby={errors.fecha ? 'tr-fecha-error' : undefined}
          {...register('fecha')}
          className={INPUT_CLASS}
        />
        {errors.fecha && (
          <p id="tr-fecha-error" className="mt-1 text-label-sm text-error">
            {errors.fecha.message}
          </p>
        )}
      </div>

      {/* Descripción (opcional) */}
      <div>
        <label htmlFor="tr-descripcion" className="mb-2 block text-label-md text-on-surface-variant">
          Descripción <span className="text-outline-variant">(opcional)</span>
        </label>
        <input
          id="tr-descripcion"
          type="text"
          maxLength={120}
          placeholder="Ej. Pago de tarjeta"
          aria-invalid={errors.descripcion != null}
          aria-describedby={errors.descripcion ? 'tr-descripcion-error' : undefined}
          {...register('descripcion')}
          className={INPUT_CLASS}
        />
        {errors.descripcion && (
          <p id="tr-descripcion-error" className="mt-1 text-label-sm text-error">
            {errors.descripcion.message}
          </p>
        )}
      </div>

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
            'Registrar transferencia'
          )}
        </button>
      </div>
    </form>
  )
}
