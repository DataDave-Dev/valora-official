import { Bell } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Sidebar } from '@/components/Sidebar'
import { BottomNav } from '@/components/BottomNav'

/**
 * Layout de la app autenticada: provee el chrome común (sidebar de escritorio,
 * barra superior y navegación inferior móvil) y renderiza cada vista en el Outlet.
 * El sidebar (escritorio) y el FAB (móvil) navegan a la vista "Nuevo movimiento".
 */
export function AppLayout() {
  const navigate = useNavigate()

  // El FAB de la navegación móvil lleva a la lista de movimientos (en escritorio
  // el sidebar tiene su propio CTA hacia el formulario y un ítem "Movimientos").
  const abrirMovimiento = () => navigate('/movimientos')

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="flex min-h-screen flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/50 bg-surface-bright/80 px-4 py-4 backdrop-blur-md md:justify-end md:px-8">
          {/* El logo solo aparece en móvil; en escritorio ya vive en el sidebar. */}
          <Logo size={32} withWordmark className="md:hidden" />
          <button
            type="button"
            aria-label="Notificaciones"
            className="flex h-11 w-11 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Bell size={22} aria-hidden="true" />
          </button>
        </header>

        {/* Contenedor único de contenido: fluido (aprovecha todo el ancho
            disponible) con padding responsivo. Las vistas NO fijan su propio
            ancho máximo; solo renderizan su contenido. */}
        <main className="flex-1 px-4 py-6 pb-28 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      <BottomNav onAñadirMovimiento={abrirMovimiento} />
    </div>
  )
}
