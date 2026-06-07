import type { ReactNode } from 'react'
import { Logo } from '@/components/Logo'

interface IOnboardingShellProps {
  /** Paso actual (1-3). */
  step: number
  /** Etiqueta corta a la derecha de la barra de progreso. */
  stepLabel: string
  title: string
  description: string
  children: ReactNode
}

const TOTAL_STEPS = 3

/** Marco visual compartido por los 3 pasos del onboarding. */
export function OnboardingShell({
  step,
  stepLabel,
  title,
  description,
  children,
}: IOnboardingShellProps) {
  const progreso = Math.round((step / TOTAL_STEPS) * 100)

  return (
    <main className="flex min-h-screen flex-grow items-center justify-center bg-background p-4 md:p-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size={40} withWordmark />
        </div>

        <div className="rounded-xl border border-white/50 bg-white/80 p-6 shadow-[0_8px_32px_rgba(30,41,59,0.08)] backdrop-blur-md md:p-8">
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-label-sm uppercase tracking-wider text-primary">
                Paso {step} de {TOTAL_STEPS}
              </span>
              <span className="text-label-sm text-secondary">{stepLabel}</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest"
              role="progressbar"
              aria-valuenow={step}
              aria-valuemin={1}
              aria-valuemax={TOTAL_STEPS}
              aria-label={`Paso ${step} de ${TOTAL_STEPS}`}
            >
              <div
                className="h-2 rounded-full bg-primary-container transition-[width] duration-500 ease-out"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>

          {/* `key={step}` re-monta el bloque en cada paso para disparar la animación. */}
          <div key={step} className="animate-[stepIn_0.25s_ease-out]">
            <div className="mb-6 text-center">
              <h1 className="mb-2 text-headline-lg-mobile text-on-surface md:text-headline-lg">
                {title}
              </h1>
              <p className="text-body-md text-on-surface-variant">{description}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </main>
  )
}
