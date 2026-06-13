import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import {
  invitacionHogarSchema,
  ROL_HOGAR_LABELS,
  type IInvitacion,
  type InvitacionHogarFormValues,
  type RolHogar,
} from '@valora/shared'
import { useHogaresStore } from '@/store/useHogaresStore'

const ROLES: RolHogar[] = ['miembro', 'dueno']

interface IInvitacionFormProps {
  hogarId: string
  /** Recibe la invitación creada (con su token) para mostrar el enlace. */
  onSuccess: (invitacion: IInvitacion) => void
  onCancel: () => void
}

const inputClass =
  'block w-full rounded-lg border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

/**
 * Formulario para invitar a alguien al hogar por correo. Genera una invitación
 * con token; el enlace se comparte manualmente y el invitado la acepta tras
 * iniciar sesión con ese mismo correo.
 */
export function InvitacionForm({ hogarId, onSuccess, onCancel }: IInvitacionFormProps) {
  const saving = useHogaresStore((s) => s.saving)
  const crearInvitacion = useHogaresStore((s) => s.crearInvitacion)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InvitacionHogarFormValues>({
    resolver: zodResolver(invitacionHogarSchema),
    defaultValues: { email: '', rol: 'miembro' },
  })

  const onSubmit = handleSubmit(async (values) => {
    const inv = await crearInvitacion(hogarId, values.email, values.rol)
    if (inv) onSuccess(inv)
  })

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="inv-email" className="mb-2 block text-label-md text-on-surface-variant">
          Correo del invitado
        </label>
        <input
          id="inv-email"
          type="email"
          autoComplete="off"
          placeholder="persona@correo.com"
          aria-invalid={errors.email != null}
          aria-describedby={errors.email ? 'inv-email-error' : 'inv-email-ayuda'}
          {...register('email')}
          className={inputClass}
        />
        {errors.email ? (
          <p id="inv-email-error" className="mt-1 text-label-sm text-error">
            {errors.email.message}
          </p>
        ) : (
          <p id="inv-email-ayuda" className="mt-1 text-label-sm text-secondary">
            Debe registrarse con este mismo correo para aceptar la invitación.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="inv-rol" className="mb-2 block text-label-md text-on-surface-variant">
          Rol
        </label>
        <select id="inv-rol" {...register('rol')} className={inputClass}>
          {ROLES.map((rol) => (
            <option key={rol} value={rol}>
              {ROL_HOGAR_LABELS[rol]}
            </option>
          ))}
        </select>
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
          Crear invitación
        </button>
      </div>
    </form>
  )
}
