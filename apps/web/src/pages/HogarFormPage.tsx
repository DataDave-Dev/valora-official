import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { IHogar } from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useHogaresStore } from '@/store/useHogaresStore'
import { HogarForm } from '@/components/HogarForm'

/**
 * Página para crear (`/perfil/hogar/nuevo`) o editar (`/perfil/hogar/:id/editar`)
 * un hogar. Envuelve `HogarForm`; al crear, activa el hogar nuevo; al editar el
 * hogar activo, refresca su snapshot (moneda/día/nombre).
 */
export function HogarFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const hogares = useHogaresStore((s) => s.hogares)
  const hogarActivo = useHogarStore((s) => s.hogar)
  const setHogarActivo = useHogarStore((s) => s.setHogarActivo)

  const hogar = id ? hogares.find((h) => h.id === id) : undefined
  const esEdicion = id != null

  const volver = () => navigate('/perfil/hogar')

  const onSuccess = (resultado: IHogar) => {
    // Activa el hogar nuevo, o refresca el snapshot si se editó el activo.
    if (!esEdicion || resultado.id === hogarActivo?.id) {
      setHogarActivo({
        id: resultado.id,
        nombre: resultado.nombre,
        moneda: resultado.moneda,
        dia_inicio_mes: resultado.dia_inicio_mes,
      })
    }
    volver()
  }

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={volver}
          aria-label="Volver"
          className="rounded-lg p-1 text-secondary transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-headline-sm text-on-surface">
          {esEdicion ? 'Editar hogar' : 'Nuevo hogar'}
        </h1>
      </header>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          {esEdicion && !hogar ? (
            <div className="space-y-4 text-center">
              <p className="text-body-md text-on-surface-variant">No se encontró el hogar.</p>
              <button
                type="button"
                onClick={volver}
                className="rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Volver a Hogar
              </button>
            </div>
          ) : (
            <HogarForm hogar={hogar} onSuccess={onSuccess} onCancel={volver} />
          )}
        </div>
      </div>
    </div>
  )
}
