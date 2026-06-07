import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  PiggyBank,
  Plus,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import {
  cuentaSchema,
  type CuentaFormValues,
  type ICuenta,
  type TipoCuenta,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { useMoneda } from '@/hooks/useMoneda'
import { Modal } from '@/components/Modal'

interface IStepCuentasProps {
  onBack: () => void
  onFinish: () => void
  onCancel: () => void
  finishing: boolean
  finishError: string | null
}

/** Tipos de cuenta ofrecidos en el onboarding, en orden, con su etiqueta UI e icono. */
const TIPOS_CUENTA: { tipo: TipoCuenta; label: string; Icon: LucideIcon }[] = [
  { tipo: 'banco', label: 'Cuenta de Débito', Icon: Wallet },
  { tipo: 'tarjeta_credito', label: 'Tarjeta de Crédito', Icon: CreditCard },
  { tipo: 'efectivo', label: 'Efectivo', Icon: Banknote },
  { tipo: 'ahorro', label: 'Cuenta de Ahorro', Icon: PiggyBank },
  { tipo: 'inversion', label: 'Inversiones', Icon: TrendingUp },
]

export function StepCuentas({
  onBack,
  onFinish,
  onCancel,
  finishing,
  finishError,
}: IStepCuentasProps) {
  const hogar = useHogarStore((s) => s.hogar)
  const cuentas = useCuentasStore((s) => s.cuentas)
  const loading = useCuentasStore((s) => s.loading)
  const error = useCuentasStore((s) => s.error)
  const fetchCuentas = useCuentasStore((s) => s.fetchCuentas)
  const fmt = useMoneda()

  const [tipoActivo, setTipoActivo] = useState<{ tipo: TipoCuenta; label: string } | null>(null)

  useEffect(() => {
    if (hogar) void fetchCuentas(hogar.id)
  }, [hogar, fetchCuentas])

  const cuentasPorTipo = (tipo: TipoCuenta): ICuenta[] => cuentas.filter((c) => c.tipo === tipo)

  return (
    <div className="space-y-4">
      {(error ?? finishError) && (
        <div
          role="alert"
          className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
        >
          {error ?? finishError}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4 text-secondary">
          <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          <span className="ml-2 text-body-sm">Cargando cuentas…</span>
        </div>
      )}

      <div className="space-y-2">
        {TIPOS_CUENTA.map(({ tipo, label, Icon }) => {
          const existentes = cuentasPorTipo(tipo)
          return (
            <div
              key={tipo}
              className="stagger-item flex flex-col rounded-2xl border border-surface-container-high bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-primary">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <h3 className="text-body-md font-semibold text-on-surface">{label}</h3>
                </div>
                <button
                  type="button"
                  aria-label={`Añadir ${label}`}
                  onClick={() => setTipoActivo({ tipo, label })}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant text-secondary transition-colors hover:border-primary-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <Plus size={20} aria-hidden="true" />
                </button>
              </div>

              {existentes.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 border-t border-surface-container-high pt-3">
                  {existentes.map((c) => (
                    <li key={c.id} className="flex items-center justify-between text-body-sm">
                      <span className="text-on-surface-variant">{c.nombre}</span>
                      <span className="font-medium text-on-surface">
                        {fmt(c.saldo_inicial)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={finishing}
          className="flex min-h-[44px] w-1/3 items-center justify-center gap-1 rounded-lg border border-outline-variant bg-white py-3 text-label-md text-secondary transition-colors duration-200 hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Atrás
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={finishing}
          className="flex min-h-[44px] w-2/3 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-label-md text-on-primary transition-colors duration-200 hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          {finishing ? (
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          ) : (
            <>
              Finalizar
              <CheckCircle2 size={18} aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-1 text-label-md text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Cancelar configuración
        </button>
      </div>

      {tipoActivo && (
        <NuevaCuentaModal
          hogarId={hogar?.id ?? null}
          tipo={tipoActivo.tipo}
          label={tipoActivo.label}
          onClose={() => setTipoActivo(null)}
        />
      )}
    </div>
  )
}

interface INuevaCuentaModalProps {
  hogarId: string | null
  tipo: TipoCuenta
  label: string
  onClose: () => void
}

function NuevaCuentaModal({ hogarId, tipo, label, onClose }: INuevaCuentaModalProps) {
  const saving = useCuentasStore((s) => s.saving)
  const addCuenta = useCuentasStore((s) => s.addCuenta)

  const esTarjeta = tipo === 'tarjeta_credito'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CuentaFormValues>({
    resolver: zodResolver(cuentaSchema),
    defaultValues: {
      nombre: '',
      tipo,
      saldo_inicial: 0,
      limite_credito: undefined,
      dia_corte: undefined,
      dia_pago: undefined,
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (!hogarId) return
    const ok = await addCuenta(hogarId, { ...values, tipo })
    if (ok) onClose()
  })

  return (
    <Modal title={label} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <input type="hidden" {...register('tipo')} value={tipo} />

        <div>
          <label htmlFor="cta-nombre" className="mb-2 block text-label-md text-on-surface-variant">
            Nombre de la cuenta
          </label>
          <input
            id="cta-nombre"
            type="text"
            placeholder={`Ej. ${label}`}
            aria-invalid={errors.nombre != null}
            aria-describedby={errors.nombre ? 'cta-nombre-error' : undefined}
            {...register('nombre')}
            className="block w-full rounded-lg border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            className="block w-full rounded-lg border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              <label
                htmlFor="cta-limite"
                className="mb-2 block text-label-md text-on-surface-variant"
              >
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
                className="block w-full rounded-lg border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {errors.limite_credito && (
                <p id="cta-limite-error" className="mt-1 text-label-sm text-error">
                  {errors.limite_credito.message}
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label
                  htmlFor="cta-corte"
                  className="mb-2 block text-label-md text-on-surface-variant"
                >
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
                  className="block w-full rounded-lg border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {errors.dia_corte && (
                  <p id="cta-corte-error" className="mt-1 text-label-sm text-error">
                    {errors.dia_corte.message}
                  </p>
                )}
              </div>
              <div className="flex-1">
                <label
                  htmlFor="cta-pago"
                  className="mb-2 block text-label-md text-on-surface-variant"
                >
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
                  className="block w-full rounded-lg border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
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

        <button
          type="submit"
          disabled={saving}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-label-md text-on-primary transition-colors duration-200 hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          Crear cuenta
        </button>
      </form>
    </Modal>
  )
}
