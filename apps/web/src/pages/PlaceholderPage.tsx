import { Construction } from 'lucide-react'

interface IPlaceholderPageProps {
  titulo: string
}

/** Página provisional para rutas aún sin implementar (Cuentas, Análisis, Perfil). */
export function PlaceholderPage({ titulo }: IPlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Construction size={48} className="mb-4 text-primary-container" aria-hidden="true" />
      <h1 className="text-headline-md text-on-surface">{titulo}</h1>
      <p className="mt-2 text-body-md text-on-surface-variant">
        Esta sección estará disponible próximamente.
      </p>
    </div>
  )
}
