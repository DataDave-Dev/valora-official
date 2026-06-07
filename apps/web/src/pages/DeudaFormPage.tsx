import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { DeudaForm } from '@/components/DeudaForm'

/** Página de creación de una deuda. */
export function DeudaFormPage() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-24">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Volver a deudas"
          className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h1 className="text-headline-sm text-on-surface">Nueva deuda</h1>
      </header>

      <DeudaForm
        onSuccess={() => navigate('/deudas')}
        onCancel={() => navigate('/deudas')}
      />
    </div>
  )
}
