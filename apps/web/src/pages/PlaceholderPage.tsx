import { Construction } from 'lucide-react'

interface IPlaceholderPageProps {
  titulo: string
}

/** Página provisional para rutas aún sin implementar (Cuentas, Reportes, Perfil). */
export function PlaceholderPage({ titulo }: IPlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Construction size={48} className="text-primary-container mb-4" aria-hidden="true" />
      <h1 className="text-headline-md text-on-surface">{titulo}</h1>
      <p className="text-body-md text-on-surface-variant mt-2">
        Esta sección estará disponible próximamente.
      </p>
    </div>
  )
}
