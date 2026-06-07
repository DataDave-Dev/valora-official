import { NavLink } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { NAV_ITEMS, type INavItem } from '@/components/navItems'

const IZQUIERDA = NAV_ITEMS.slice(0, 2)
const DERECHA = NAV_ITEMS.slice(2)

interface IBottomNavProps {
  /** Abre el modal "Nuevo movimiento". */
  onAñadirMovimiento: () => void
}

/** Navegación inferior fija para móvil con un FAB central de "añadir". */
export function BottomNav({ onAñadirMovimiento }: IBottomNavProps) {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-between border-t border-outline-variant bg-surface px-2 py-4 shadow-lg md:hidden"
    >
      {IZQUIERDA.map((item) => (
        <NavItemLink key={item.to} item={item} />
      ))}
      <button
        type="button"
        aria-label="Añadir movimiento"
        onClick={onAñadirMovimiento}
        className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-surface bg-primary text-on-primary shadow-lg transition-colors duration-200 hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95"
      >
        <Plus size={28} aria-hidden="true" />
      </button>
      {DERECHA.map((item) => (
        <NavItemLink key={item.to} item={item} />
      ))}
    </nav>
  )
}

function NavItemLink({ item }: { item: INavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        `flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          isActive ? 'text-primary' : 'text-secondary'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={22} aria-hidden="true" />
          <span className={`text-label-sm ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
          {/* Indicador no cromático del estado activo (además del color). */}
          <span
            aria-hidden="true"
            className={`h-1 w-1 rounded-full ${isActive ? 'bg-primary' : 'bg-transparent'}`}
          />
        </>
      )}
    </NavLink>
  )
}
