import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Loader2 } from 'lucide-react'
import { metaSchema, type MetaFormValues, type IMeta } from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { useMetasStore } from '@/store/useMetasStore'

interface IMetaFormProps {
  /** Meta a editar; si se omite, el formulario crea una nueva. */
  meta?: IMeta
  onSuccess: () => void
  onCancel: () => void
}

const INPUT_CLASS =
  'block w-full rounded-xl border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/**
 * Formulario para crear o editar una meta de ahorro. La meta se respalda en una
 * cuenta de tipo 'ahorro' (obligatoria, el trigger lo valida). Al editar, la
 * cuenta de ahorro es fija: cambiarla desincronizaría el monto acumulado con
 * las transferencias ya vinculadas.
 */
export function MetaForm({ meta, onSuccess, onCancel }: IMetaFormProps) {
  const navigate = useNavigate()
  const hogar = useHogarStore((s) => s.hogar)
  const cuentas = useCuentasStore((s) => s.cuentas)
  const saving = useMetasStore((s) => s.saving)
  const addMeta = useMetasStore((s) => s.addMeta)
  const updateMeta = useMetasStore((s) => s.updateMeta)

  const esEdicion = meta != null

  const cuentasAhorro = useMemo(
    () => cuentas.filter((c) => c.tipo === 'ahorro' && !c.archivada),
    [cuentas],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MetaFormValues>({
    resolver: zodResolver(metaSchema),
    defaultValues: {
      nombre: meta?.nombre ?? '',
      cuenta_ahorro_id: meta?.cuenta_ahorro_id ?? '',
      monto_objetivo: meta?.monto_objetivo ?? undefined,
      fecha_limite: meta?.fecha_limite ?? '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const ok = esEdicion
      ? await updateMeta(meta.id, values)
      : hogar
        ? await addMeta(hogar.id, values)
        : false
    if (ok) onSuccess()
  })

  // Sin cuentas de ahorro no se puede crear una meta.
  if (!esEdicion && cuentasAhorro.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-body-md text-on-surface-variant">
          Necesitas una cuenta de tipo <span className="font-semibold">Ahorro</span> para crear una
          meta. Crea una primero.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-outline-variant bg-white px-4 py-2.5 text-label-md text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => navigate('/cuentas/nueva')}
            className="rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Crear cuenta de ahorro
          </button>
        </div>
      </div>
    )
  }

  const nombreCuentaAhorro = cuentas.find((c) => c.id === meta?.cuenta_ahorro_id)?.nombre

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="meta-nombre" className="mb-2 block text-label-md text-on-surface-variant">
          Nombre de la meta
        </label>
        <input
          id="meta-nombre"
          type="text"
          placeholder="Ej. Fondo de emergencia"
          aria-invalid={errors.nombre != null}
          aria-describedby={errors.nombre ? 'meta-nombre-error' : undefined}
          {...register('nombre')}
          className={INPUT_CLASS}
        />
        {errors.nombre && (
          <p id="meta-nombre-error" className="mt-1 text-label-sm text-error">
            {errors.nombre.message}
          </p>
        )}
      </div>

      {/* Cuenta de ahorro: select en creación, texto fijo en edición. */}
      {esEdicion ? (
        <div>
          <span className="mb-2 block text-label-md text-on-surface-variant">Cuenta de ahorro</span>
          <p className="rounded-xl bg-surface-container-low px-4 py-3 text-body-sm font-medium text-on-surface">
            {nombreCuentaAhorro ?? 'Cuenta de ahorro'}
          </p>
          <input type="hidden" {...register('cuenta_ahorro_id')} />
        </div>
      ) : (
        <div>
          <label htmlFor="meta-cuenta" className="mb-2 block text-label-md text-on-surface-variant">
            Cuenta de ahorro
          </label>
          <div className="relative">
            <select
              id="meta-cuenta"
              aria-invalid={errors.cuenta_ahorro_id != null}
              aria-describedby={errors.cuenta_ahorro_id ? 'meta-cuenta-error' : undefined}
              {...register('cuenta_ahorro_id')}
              className={`${INPUT_CLASS} appearance-none pr-10`}
            >
              <option value="" disabled>
                Selecciona una cuenta de ahorro
              </option>
              {cuentasAhorro.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
            />
          </div>
          {errors.cuenta_ahorro_id && (
            <p id="meta-cuenta-error" className="mt-1 text-label-sm text-error">
              {errors.cuenta_ahorro_id.message}
            </p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="meta-objetivo" className="mb-2 block text-label-md text-on-surface-variant">
          Monto objetivo
        </label>
        <input
          id="meta-objetivo"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="0.00"
          aria-invalid={errors.monto_objetivo != null}
          aria-describedby={errors.monto_objetivo ? 'meta-objetivo-error' : undefined}
          {...register('monto_objetivo', { valueAsNumber: true })}
          className={INPUT_CLASS}
        />
        {errors.monto_objetivo && (
          <p id="meta-objetivo-error" className="mt-1 text-label-sm text-error">
            {errors.monto_objetivo.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="meta-fecha" className="mb-2 block text-label-md text-on-surface-variant">
          Fecha límite <span className="text-outline-variant">(opcional)</span>
        </label>
        <input
          id="meta-fecha"
          type="date"
          {...register('fecha_limite')}
          className={INPUT_CLASS}
        />
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
          disabled={saving}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {esEdicion ? 'Guardar cambios' : 'Crear meta'}
        </button>
      </div>
    </form>
  )
}
