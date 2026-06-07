import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, ChevronDown, Loader2, Palette, User } from 'lucide-react'
import {
  TEMA_LABELS,
  perfilSchema,
  type PerfilFormValues,
  type TemaPreferencia,
} from '@valora/shared'
import { useProfileStore } from '@/store/useProfileStore'

interface IStepPerfilProps {
  onNext: () => void
}

const TEMAS: TemaPreferencia[] = ['claro', 'oscuro', 'sistema']

export function StepPerfil({ onNext }: IStepPerfilProps) {
  const profile = useProfileStore((s) => s.profile)
  const saving = useProfileStore((s) => s.saving)
  const error = useProfileStore((s) => s.error)
  const saveProfile = useProfileStore((s) => s.saveProfile)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PerfilFormValues>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      tema: 'claro',
    },
  })

  // Precarga los datos existentes del perfil (el trigger ya creó la fila).
  useEffect(() => {
    if (!profile) return
    reset({
      nombre: profile.nombre ?? '',
      apellido_paterno: profile.apellido_paterno ?? '',
      apellido_materno: profile.apellido_materno ?? '',
      tema: profile.tema,
    })
  }, [profile, reset])

  const onSubmit = handleSubmit(async (values) => {
    const ok = await saveProfile(values)
    if (ok) onNext()
  })

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
        >
          {error}
        </div>
      )}

      <div>
        <label htmlFor="nombre" className="mb-2 block text-label-md text-on-surface-variant">
          Nombres
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-secondary">
            <User size={18} aria-hidden="true" />
          </span>
          <input
            id="nombre"
            type="text"
            placeholder="Ej. Juan Carlos"
            aria-invalid={errors.nombre != null}
            aria-describedby={errors.nombre ? 'nombre-error' : undefined}
            {...register('nombre')}
            className="block w-full rounded-lg border border-outline-variant bg-white py-3 pl-11 pr-4 text-body-sm text-on-surface shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {errors.nombre && (
          <p id="nombre-error" className="mt-1 text-label-sm text-error">
            {errors.nombre.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="apellido_paterno"
          className="mb-2 block text-label-md text-on-surface-variant"
        >
          Apellido Paterno
        </label>
        <input
          id="apellido_paterno"
          type="text"
          placeholder="Ej. Pérez"
          aria-invalid={errors.apellido_paterno != null}
          aria-describedby={errors.apellido_paterno ? 'apellido-paterno-error' : undefined}
          {...register('apellido_paterno')}
          className="block w-full rounded-lg border border-outline-variant bg-white px-4 py-3 text-body-sm text-on-surface shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {errors.apellido_paterno && (
          <p id="apellido-paterno-error" className="mt-1 text-label-sm text-error">
            {errors.apellido_paterno.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="apellido_materno"
          className="mb-2 block text-label-md text-on-surface-variant"
        >
          Apellido Materno
        </label>
        <input
          id="apellido_materno"
          type="text"
          placeholder="Ej. García"
          aria-invalid={errors.apellido_materno != null}
          aria-describedby={errors.apellido_materno ? 'apellido-materno-error' : undefined}
          {...register('apellido_materno')}
          className="block w-full rounded-lg border border-outline-variant bg-white px-4 py-3 text-body-sm text-on-surface shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {errors.apellido_materno && (
          <p id="apellido-materno-error" className="mt-1 text-label-sm text-error">
            {errors.apellido_materno.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="tema" className="mb-2 block text-label-md text-on-surface-variant">
          Tema
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-secondary">
            <Palette size={18} aria-hidden="true" />
          </span>
          <select
            id="tema"
            aria-invalid={errors.tema != null}
            aria-describedby={errors.tema ? 'tema-error' : undefined}
            {...register('tema')}
            className="block w-full appearance-none rounded-lg border border-outline-variant bg-white py-3 pl-11 pr-10 text-body-sm text-on-surface shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {TEMAS.map((t) => (
              <option key={t} value={t}>
                {TEMA_LABELS[t]}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-secondary">
            <ChevronDown size={18} aria-hidden="true" />
          </span>
        </div>
        {errors.tema && (
          <p id="tema-error" className="mt-1 text-label-sm text-error">
            {errors.tema.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-label-md text-on-primary transition-colors duration-200 hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
        Siguiente
        {!saving && <ArrowRight size={18} aria-hidden="true" />}
      </button>
    </form>
  )
}
