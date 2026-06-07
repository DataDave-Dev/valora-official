import { useState, type FormEvent } from 'react'
import { Check, Eye, EyeOff, Loader2, Lock, Mail, X } from 'lucide-react'
import { evaluarPassword, esPasswordSegura } from '@valora/shared'
import { useAuthStore } from '@/store/useAuthStore'
import { Logo } from '@/components/Logo'

type Modo = 'login' | 'registro'

export function LoginPage() {
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)

  const [modo, setModo] = useState<Modo>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [recordarme, setRecordarme] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const esRegistro = modo === 'registro'
  const requisitos = evaluarPassword(password)
  const passwordSegura = esPasswordSegura(password)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setAviso(null)
    if (esRegistro && !esPasswordSegura(password)) {
      setError('La contraseña no cumple los requisitos de seguridad.')
      return
    }
    setSubmitting(true)
    try {
      const resultado = esRegistro
        ? await signUp(email.trim(), password)
        : await signIn(email.trim(), password)
      if (resultado) {
        setError(resultado)
        return
      }
      if (esRegistro) {
        setAviso('Cuenta creada. Si tu proyecto requiere confirmación por correo, revísalo.')
      }
      // En éxito, el cambio de sesión dispara la redirección desde App.tsx.
    } finally {
      setSubmitting(false)
    }
  }

  function alternarModo() {
    setModo((m) => (m === 'login' ? 'registro' : 'login'))
    setError(null)
    setAviso(null)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <header className="sticky top-0 z-50 flex w-full justify-center border-b border-white/50 bg-surface-bright/80 px-4 py-4 shadow-sm backdrop-blur-md md:justify-start md:px-8">
        <Logo size={36} withWordmark />
      </header>

      <main className="relative flex flex-grow items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-white/80 bg-white/80 p-8 shadow-[0_4px_30px_rgba(0,0,0,0.05)] backdrop-blur-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-headline-lg-mobile tracking-tight text-on-surface md:text-headline-lg">
              {esRegistro ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
            </h1>
            <p className="text-body-md text-secondary">
              {esRegistro
                ? 'Regístrate para empezar a organizar tu economía.'
                : 'Ingresa tus datos para acceder.'}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
            >
              {error}
            </div>
          )}
          {aviso && (
            <div
              role="status"
              className="mb-6 rounded-xl border border-primary/30 bg-primary-container/10 px-4 py-3 text-body-sm text-on-primary-container"
            >
              {aviso}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <div className="group">
              <label
                htmlFor="email"
                className="mb-2 block text-label-md text-on-surface-variant transition-colors group-focus-within:text-primary"
              >
                Correo electrónico
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-secondary">
                  <Mail size={20} aria-hidden="true" />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  aria-invalid={error != null}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="block w-full rounded-lg border border-outline-variant bg-white/80 py-3 pl-12 pr-4 text-body-sm text-on-surface shadow-sm transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="group">
              <label
                htmlFor="password"
                className="mb-2 block text-label-md text-on-surface-variant transition-colors group-focus-within:text-primary"
              >
                Contraseña
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-secondary">
                  <Lock size={20} aria-hidden="true" />
                </span>
                <input
                  id="password"
                  name="password"
                  type={verPassword ? 'text' : 'password'}
                  required
                  aria-invalid={error != null}
                  aria-describedby={esRegistro ? 'password-requisitos' : undefined}
                  autoComplete={esRegistro ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-outline-variant bg-white/80 py-3 pl-12 pr-12 text-body-sm text-on-surface shadow-sm transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setVerPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center rounded-lg pr-4 text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  {verPassword ? (
                    <EyeOff size={20} aria-hidden="true" />
                  ) : (
                    <Eye size={20} aria-hidden="true" />
                  )}
                </button>
              </div>
              {esRegistro && password.length > 0 && (
                <ul id="password-requisitos" aria-live="polite" className="mt-3 space-y-1.5">
                  {requisitos.map((r) => (
                    <li
                      key={r.id}
                      className={`flex items-center gap-2 text-body-sm transition-colors ${
                        r.cumple ? 'text-primary' : 'text-secondary'
                      }`}
                    >
                      {r.cumple ? (
                        <Check size={16} className="animate-[popIn_0.15s_ease-out]" aria-hidden="true" />
                      ) : (
                        <X size={16} className="opacity-50" aria-hidden="true" />
                      )}
                      <span>{r.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!esRegistro && (
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-body-sm text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={recordarme}
                    onChange={(e) => setRecordarme(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  Recordarme
                </label>
                <button
                  type="button"
                  className="rounded-lg px-1 text-label-sm font-semibold text-primary transition-colors hover:text-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || (esRegistro && !passwordSegura)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-label-md text-on-primary shadow-md transition-colors duration-200 hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
              {esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant" />
              </div>
              <div className="relative flex justify-center">
                <span className="rounded-full bg-white px-4 text-label-sm font-medium uppercase tracking-wider text-secondary">
                  O continúa con
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled
              title="Disponible próximamente"
              className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-outline-variant bg-white/80 px-4 py-2.5 text-label-md text-on-surface shadow-sm transition-colors duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              Iniciar sesión con Google
            </button>
          </div>

          <p className="mt-8 text-center text-body-sm">
            <span className="text-on-surface-variant">
              {esRegistro ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}
            </span>
            <button
              type="button"
              onClick={alternarModo}
              className="ml-1 rounded-lg px-1 text-label-md font-semibold text-primary transition-colors hover:text-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {esRegistro ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
