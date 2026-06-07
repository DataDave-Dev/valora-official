import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useProfileStore } from '@/store/useProfileStore'
import { OnboardingShell } from './OnboardingShell'
import { StepPerfil } from './StepPerfil'
import { StepCategorias } from './StepCategorias'
import { StepCuentas } from './StepCuentas'

type Step = 1 | 2 | 3

const SHELL_CONFIG: Record<Step, { stepLabel: string; title: string; description: string }> = {
  1: {
    stepLabel: 'Básico',
    title: 'Personaliza tu perfil',
    description: 'Ingresa tus datos para comenzar a organizar tu economía personal.',
  },
  2: {
    stepLabel: 'Categorías',
    title: 'Personaliza tus categorías',
    description:
      'Organiza tus gastos a tu manera. Preparamos algunas categorías comunes para que empieces.',
  },
  3: {
    stepLabel: 'Cuentas',
    title: 'Configura tus cuentas',
    description: 'Para empezar a rastrear tu dinero, añade las cuentas que usas en tu día a día.',
  },
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const signOut = useAuthStore((s) => s.signOut)
  const completeOnboarding = useProfileStore((s) => s.completeOnboarding)

  const [step, setStep] = useState<Step>(1)
  const [finishing, setFinishing] = useState(false)
  const [finishError, setFinishError] = useState<string | null>(null)

  const config = SHELL_CONFIG[step]

  async function handleCancel() {
    // Cancelar la configuración cierra la sesión y vuelve al login.
    await signOut()
    navigate('/login', { replace: true })
  }

  async function handleFinish() {
    setFinishError(null)
    setFinishing(true)
    const ok = await completeOnboarding()
    setFinishing(false)
    if (ok) {
      navigate('/', { replace: true })
    } else {
      setFinishError('No se pudo finalizar la configuración. Inténtalo de nuevo.')
    }
  }

  return (
    <OnboardingShell
      step={step}
      stepLabel={config.stepLabel}
      title={config.title}
      description={config.description}
    >
      {step === 1 && <StepPerfil onNext={() => setStep(2)} />}
      {step === 2 && (
        <StepCategorias
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
          onCancel={() => void handleCancel()}
        />
      )}
      {step === 3 && (
        <StepCuentas
          onBack={() => setStep(2)}
          onFinish={() => void handleFinish()}
          onCancel={() => void handleCancel()}
          finishing={finishing}
          finishError={finishError}
        />
      )}
    </OnboardingShell>
  )
}
