import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useHogarStore } from '@/store/useHogarStore'
import { Logo } from '@/components/Logo'
import { SIDEBAR_NAV_ITEMS, type INavItem } from '@/components/navItems'

/**
 * Sidebar de escritorio fijo a la izquierda. Estructura tipo app de escritorio:
 * marca arriba, CTA primario, navegación con estado activo sólido y un widget
 * de cuenta abajo. Oculto en móvil (allí navega BottomNav).
 */
export function Sidebar() {
  const signOut = useAuthStore((s) => s.signOut)
  const profile = useProfileStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const hogar = useHogarStore((s) => s.hogar)

  const nombreCompleto = [profile?.nombre, profile?.apellido_paterno].filter(Boolean).join(' ')
  const nombreMostrado = nombreCompleto || user?.email || 'Mi cuenta'
  const inicial = (profile?.nombre ?? user?.email ?? '?').charAt(0).toUpperCase()

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-outline-variant bg-surface-container-lowest md:flex">
      <div className="flex h-full flex-col gap-6 px-4 py-6">
        {/* Marca */}
        <div className="flex items-center px-2">
          <Logo size={34} withWordmark />
        </div>

        {/* Navegación */}
        <nav aria-label="Navegación principal" className="flex flex-col gap-1">
          <p className="mb-1 px-3 text-label-sm uppercase tracking-wider text-secondary/70">Menú</p>
          {SIDEBAR_NAV_ITEMS.map((item) => (
            <SidebarItem key={item.to} item={item} nivel={0} />
          ))}
        </nav>

        {/* Widget de cuenta */}
        <div className="mt-auto">
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low p-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-label-md font-semibold text-on-primary">
              {inicial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-sm font-medium text-on-surface">{nombreMostrado}</p>
              {hogar && <p className="truncate text-label-sm text-secondary">{hogar.nombre}</p>}
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-container hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

/** ¿La ruta actual cae dentro de `item` o de alguno de sus descendientes? */
function rutaActivaEn(item: INavItem, pathname: string): boolean {
  if (pathname === item.to || (item.to !== '/' && pathname.startsWith(`${item.to}/`))) return true
  return (item.children ?? []).some((hijo) => rutaActivaEn(hijo, pathname))
}

/** Renderiza un ítem de navegación a cualquier profundidad: hoja o grupo expandible. */
function SidebarItem({ item, nivel }: { item: INavItem; nivel: number }) {
  if (item.children && item.children.length > 0) {
    return <SidebarGroup item={item} nivel={nivel} />
  }
  return <SidebarLeaf item={item} nivel={nivel} />
}

function SidebarLeaf({ item, nivel }: { item: INavItem; nivel: number }) {
  const Icon = item.icon
  const esRaiz = nivel === 0
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          esRaiz ? 'min-h-[44px] px-3 py-2.5 text-label-md' : 'min-h-[40px] px-3 py-2 text-body-sm'
        } ${
          isActive
            ? esRaiz
              ? 'bg-primary font-semibold text-on-primary shadow-sm'
              : 'bg-primary/10 font-semibold text-primary'
            : 'text-secondary hover:bg-surface-container hover:text-on-surface'
        }`
      }
    >
      <Icon size={esRaiz ? 20 : 18} aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  )
}

/** Ítem con subopciones: se expande/colapsa y se abre solo si un descendiente está activo. */
function SidebarGroup({ item, nivel }: { item: INavItem; nivel: number }) {
  const { pathname } = useLocation()
  const hijos = item.children ?? []
  const activo = hijos.some((hijo) => rutaActivaEn(hijo, pathname))
  const [abierto, setAbierto] = useState(activo)
  const Icon = item.icon
  const esRaiz = nivel === 0

  // Mantén el grupo abierto al navegar dentro de él.
  useEffect(() => {
    if (activo) setAbierto(true)
  }, [activo])

  return (
    <div>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className={`flex w-full items-center gap-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          esRaiz ? 'min-h-[44px] px-3 py-2.5 text-label-md' : 'min-h-[40px] px-3 py-2 text-body-sm'
        } ${
          activo ? 'font-semibold text-primary' : 'text-secondary hover:bg-surface-container hover:text-on-surface'
        }`}
      >
        <Icon size={esRaiz ? 20 : 18} aria-hidden="true" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <div className="mt-1 flex flex-col gap-1 pl-5">
          {hijos.map((hijo) => (
            <SidebarItem key={hijo.to} item={hijo} nivel={nivel + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
