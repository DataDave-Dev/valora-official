import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Loader2 } from 'lucide-react'
import {
  abonoSchema,
  TIPO_CUENTA_LABELS,
  type AbonoFormValues,
  type IMeta,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { useMetasStore } from '@/store/useMetasStore'
import { useMoneda } from '@/hooks/useMoneda'

type Direccion = 'abonar' | 'retirar'

interface IMetaAbonoFormProps {
  meta: IMeta
  onSuccess: () => void
  onCancel: () => void
}

const INPUT_CLASS =
  'block w-full rounded-xl border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/**
 * Formulario para abonar a o retirar de una meta. Ambas operaciones son una
 * transferencia entre la cuenta de ahorro de la meta y otra cuenta del hogar;
 * el store crea la transferencia + el registro en `abonos_meta` y el trigger
 * recalcula el monto acumulado.
 */
export function MetaAbonoForm({ meta, onSuccess, onCancel }: IMetaAbonoFormProps) {
  const hogar = useHogarStore((s) => s.hogar)
  const cuentas = useCuentasStore((s) => s.cuentas)
  const saving = useMetasStore((s) => s.saving)
  const error = useMetasStore((s) => s.error)
  const abonar = useMetasStore((s) => s.abonar)
  const retirar = useMetasStore((s) => s.retirar)

  const [direccion, setDireccion] = useState<Direccion>('abonar')
  const fmt = useMoneda()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AbonoFormValues>({
    resolver: zodResolver(abonoSchema),
    defaultValues: { monto: undefined, cuenta_id: '' },
  })

  // La contraparte es cualquier cuenta activa distinta de la de ahorro de la meta.
  const cuentasContraparte = useMemo(
    () => cuentas.filter((c) => !c.archivada && c.id !== meta.cuenta_ahorro_id),
    [cuentas, meta.cuenta_ahorro_id],
  )

  const onSubmit = handleSubmit(async (values) => {
    if (!hogar) return
    const ok =
      direccion === 'abonar'
        ? await abonar(hogar.id, meta, values.monto, values.cuenta_id)
        : await retirar(hogar.id, meta, values.monto, values.cuenta_id)
    if (ok) onSuccess()
  })

  const esAbono = direccion === 'abonar'
  const labelCuenta = esAbono ? 'Desde la cuenta' : 'Hacia la cuenta'

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

      <div className="rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
        Acumulado:{' '}
        <span className="font-semibold text-on-surface">{fmt(meta.monto_actual)}</span> de{' '}
        {fmt(meta.monto_objetivo)}
      </div>

      {/* Dirección */}
      <div
        role="group"
        aria-label="Tipo de operación"
        className="grid grid-cols-2 gap-2 rounded-xl bg-surface-container-low p-1"
      >
        <button
          type="button"
          aria-pressed={esAbono}
          onClick={() => setDireccion('abonar')}
          className={`flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 text-label-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            esAbono ? 'bg-primary-container text-on-primary-container' : 'text-secondary hover:text-on-surface'
          }`}
        >
          Abonar
        </button>
        <button
          type="button"
          aria-pressed={!esAbono}
          onClick={() => setDireccion('retirar')}
          className={`flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 text-label-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            !esAbono ? 'bg-error-container text-on-error-container' : 'text-secondary hover:text-on-surface'
          }`}
        >
          Retirar
        </button>
      </div>

      {/* Monto */}
      <div>
        <label htmlFor="abono-monto" className="mb-2 block text-label-md text-on-surface-variant">
          Monto
        </label>
        <input
          id="abono-monto"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="0.00"
          aria-invalid={errors.monto != null}
          aria-describedby={errors.monto ? 'abono-monto-error' : undefined}
          {...register('monto', { valueAsNumber: true })}
          className={INPUT_CLASS}
        />
        {errors.monto && (
          <p id="abono-monto-error" className="mt-1 text-label-sm text-error">
            {errors.monto.message}
          </p>
        )}
      </div>

      {/* Cuenta contraparte */}
      <div>
        <label htmlFor="abono-cuenta" className="mb-2 block text-label-md text-on-surface-variant">
          {labelCuenta}
        </label>
        {cuentasContraparte.length === 0 ? (
          <p className="rounded-xl bg-surface-container-low px-4 py-3 text-body-sm text-on-surface-variant">
            Necesitas otra cuenta activa para mover fondos.
          </p>
        ) : (
          <div className="relative">
            <select
              id="abono-cuenta"
              aria-invalid={errors.cuenta_id != null}
              aria-describedby={errors.cuenta_id ? 'abono-cuenta-error' : undefined}
              {...register('cuenta_id')}
              className={`${INPUT_CLASS} appearance-none pr-10`}
            >
              <option value="" disabled>
                Selecciona una cuenta
              </option>
              {cuentasContraparte.map((c) => (
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
        )}
        {errors.cuenta_id && (
          <p id="abono-cuenta-error" className="mt-1 text-label-sm text-error">
            {errors.cuenta_id.message}
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
          disabled={saving || cuentasContraparte.length === 0}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {esAbono ? 'Abonar' : 'Retirar'}
        </button>
      </div>
    </form>
  )
}
