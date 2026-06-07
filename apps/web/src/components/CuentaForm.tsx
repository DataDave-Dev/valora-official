import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Banknote,
  CreditCard,
  Loader2,
  PiggyBank,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import {
  cuentaSchema,
  TIPO_CUENTA_LABELS,
  type CuentaFormValues,
  type ICuenta,
  type TipoCuenta,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'

/** Orden y opciones de tipo de cuenta ofrecidas en el selector. */
const TIPOS_CUENTA: { tipo: TipoCuenta; Icon: LucideIcon }[] = [
  { tipo: 'banco', Icon: Wallet },
  { tipo: 'tarjeta_credito', Icon: CreditCard },
  { tipo: 'efectivo', Icon: Banknote },
  { tipo: 'ahorro', Icon: PiggyBank },
  { tipo: 'inversion', Icon: TrendingUp },
]

interface ICuentaFormProps {
  /** Cuenta a editar; si se omite, el formulario crea una nueva. */
  cuenta?: ICuenta
  onSuccess: () => void
  onCancel: () => void
}

const inputClass =
  'block w-full rounded-lg border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/**
 * Formulario para crear o editar una cuenta. Reutilizable desde la página de
 * formulario (`/cuentas/nueva` y `/cuentas/:id/editar`). Los campos de tarjeta
 * de crédito solo aparecen cuando el tipo seleccionado lo es.
 */
export function CuentaForm({ cuenta, onSuccess, onCancel }: ICuentaFormProps) {
  const hogar = useHogarStore((s) => s.hogar)
  const saving = useCuentasStore((s) => s.saving)
  const addCuenta = useCuentasStore((s) => s.addCuenta)
  const updateCuenta = useCuentasStore((s) => s.updateCuenta)

  const esEdicion = cuenta != null

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CuentaFormValues>({
    resolver: zodResolver(cuentaSchema),
    defaultValues: {
      nombre: cuenta?.nombre ?? '',
      tipo: cuenta?.tipo ?? 'banco',
      saldo_inicial: cuenta?.saldo_inicial ?? 0,
      limite_credito: cuenta?.limite_credito ?? undefined,
      dia_corte: cuenta?.dia_corte ?? undefined,
      dia_pago: cuenta?.dia_pago ?? undefined,
    },
  })

  const tipo = watch('tipo')
  const esTarjeta = tipo === 'tarjeta_credito'

  const onSubmit = handleSubmit(async (values) => {
    const ok = esEdicion
      ? await updateCuenta(cuenta.id, values)
      : hogar
        ? await addCuenta(hogar.id, values)
        : false
    if (ok) onSuccess()
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <input type="hidden" {...register('tipo')} />

      <fieldset>
        <legend className="mb-2 block text-label-md text-on-surface-variant">Tipo de cuenta</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TIPOS_CUENTA.map(({ tipo: t, Icon }) => {
            const activo = tipo === t
            return (
              <button
                key={t}
                type="button"
                aria-pressed={activo}
                onClick={() => setValue('tipo', t, { shouldValidate: true })}
                className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2.5 text-label-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  activo
                    ? 'border-primary bg-primary-container/15 text-primary'
                    : 'border-outline-variant text-secondary hover:border-primary-container hover:text-primary'
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="truncate">{TIPO_CUENTA_LABELS[t]}</span>
              </button>
            )
          })}
        </div>
        {errors.tipo && <p className="mt-1 text-label-sm text-error">{errors.tipo.message}</p>}
      </fieldset>

      <div>
        <label htmlFor="cta-nombre" className="mb-2 block text-label-md text-on-surface-variant">
          Nombre de la cuenta
        </label>
        <input
          id="cta-nombre"
          type="text"
          placeholder={`Ej. ${TIPO_CUENTA_LABELS[tipo]}`}
          aria-invalid={errors.nombre != null}
          aria-describedby={errors.nombre ? 'cta-nombre-error' : undefined}
          {...register('nombre')}
          className={inputClass}
        />
        {errors.nombre && (
          <p id="cta-nombre-error" className="mt-1 text-label-sm text-error">
            {errors.nombre.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="cta-saldo" className="mb-2 block text-label-md text-on-surface-variant">
          Saldo inicial
        </label>
        <input
          id="cta-saldo"
          type="number"
          step="0.01"
          min="0"
          aria-invalid={errors.saldo_inicial != null}
          aria-describedby={errors.saldo_inicial ? 'cta-saldo-error' : undefined}
          {...register('saldo_inicial')}
          className={inputClass}
        />
        {errors.saldo_inicial && (
          <p id="cta-saldo-error" className="mt-1 text-label-sm text-error">
            {errors.saldo_inicial.message}
          </p>
        )}
      </div>

      {esTarjeta && (
        <>
          <div>
            <label htmlFor="cta-limite" className="mb-2 block text-label-md text-on-surface-variant">
              Límite de crédito (opcional)
            </label>
            <input
              id="cta-limite"
              type="number"
              step="0.01"
              min="0"
              aria-invalid={errors.limite_credito != null}
              aria-describedby={errors.limite_credito ? 'cta-limite-error' : undefined}
              {...register('limite_credito')}
              className={inputClass}
            />
            {errors.limite_credito && (
              <p id="cta-limite-error" className="mt-1 text-label-sm text-error">
                {errors.limite_credito.message}
              </p>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="cta-corte" className="mb-2 block text-label-md text-on-surface-variant">
                Día de corte
              </label>
              <input
                id="cta-corte"
                type="number"
                min="1"
                max="31"
                aria-invalid={errors.dia_corte != null}
                aria-describedby={errors.dia_corte ? 'cta-corte-error' : undefined}
                {...register('dia_corte')}
                className={inputClass}
              />
              {errors.dia_corte && (
                <p id="cta-corte-error" className="mt-1 text-label-sm text-error">
                  {errors.dia_corte.message}
                </p>
              )}
            </div>
            <div className="flex-1">
              <label htmlFor="cta-pago" className="mb-2 block text-label-md text-on-surface-variant">
                Día de pago
              </label>
              <input
                id="cta-pago"
                type="number"
                min="1"
                max="31"
                aria-invalid={errors.dia_pago != null}
                aria-describedby={errors.dia_pago ? 'cta-pago-error' : undefined}
                {...register('dia_pago')}
                className={inputClass}
              />
              {errors.dia_pago && (
                <p id="cta-pago-error" className="mt-1 text-label-sm text-error">
                  {errors.dia_pago.message}
                </p>
              )}
            </div>
          </div>
        </>
      )}

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
          {esEdicion ? 'Guardar cambios' : 'Crear cuenta'}
        </button>
      </div>
    </form>
  )
}
