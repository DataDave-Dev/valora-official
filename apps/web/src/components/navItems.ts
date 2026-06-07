import {
  ArrowLeftRight,
  BarChart3,
  CalendarClock,
  HandCoins,
  IdCard,
  LayoutDashboard,
  Library,
  Menu,
  PiggyBank,
  Repeat,
  Settings,
  Tag,
  Tags,
  Target,
  User,
  Wallet,
} from 'lucide-react'

export interface INavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  /** Subopciones anidadas (escritorio: grupos del sidebar; móvil: pantalla-menú). */
  children?: INavItem[]
}

/**
 * Navegación móvil (BottomNav): 4 destinos alrededor del FAB central.
 * "Más" abre la pantalla-menú (/perfil) con las secciones que no caben aquí
 * (Catálogos, Perfil, Configuración…).
 */
export const NAV_ITEMS: INavItem[] = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard },
  { to: '/cuentas', label: 'Cuentas', icon: Wallet },
  { to: '/analisis', label: 'Análisis', icon: BarChart3 },
  { to: '/perfil', label: 'Más', icon: Menu },
]

/**
 * Navegación de escritorio (Sidebar). Máximo 2 niveles. "Catálogos" y "Perfil"
 * son grupos de nivel 1 separados. Sus hijos también alimentan la pantalla-menú
 * móvil (ver PerfilMenuPage).
 */
export const SIDEBAR_NAV_ITEMS: INavItem[] = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { to: '/transferencias', label: 'Transferencias', icon: Repeat },
  { to: '/presupuestos', label: 'Presupuestos', icon: Target },
  { to: '/metas', label: 'Metas', icon: PiggyBank },
  { to: '/recurrentes', label: 'Recurrentes', icon: CalendarClock },
  { to: '/deudas', label: 'Deudas', icon: HandCoins },
  { to: '/cuentas', label: 'Cuentas', icon: Wallet },
  { to: '/analisis', label: 'Análisis', icon: BarChart3 },
  {
    to: '/catalogos',
    label: 'Catálogos',
    icon: Library,
    children: [
      { to: '/catalogos/categorias', label: 'Categorías', icon: Tags },
      { to: '/catalogos/etiquetas', label: 'Etiquetas', icon: Tag },
    ],
  },
  {
    to: '/perfil',
    label: 'Perfil',
    icon: User,
    children: [
      { to: '/perfil/cuenta', label: 'Mi cuenta', icon: IdCard },
      { to: '/perfil/configuracion', label: 'Configuración', icon: Settings },
    ],
  },
]

/** Grupos (ítems con hijos) que alimentan la pantalla-menú móvil. */
export const MENU_GROUPS: INavItem[] = SIDEBAR_NAV_ITEMS.filter(
  (item) => item.children != null && item.children.length > 0,
)

/** Rutas que ya están en el bottom-nav móvil. */
const BOTTOM_NAV_PATHS = new Set(NAV_ITEMS.map((item) => item.to))

/**
 * Ítems top-level del sidebar sin hijos que NO están en el bottom-nav
 * (Movimientos, Transferencias, Presupuestos…). En móvil se exponen como
 * accesos directos en la pantalla-menú para que sean alcanzables.
 */
export const MENU_EXTRA_ITEMS: INavItem[] = SIDEBAR_NAV_ITEMS.filter(
  (item) => item.children == null && !BOTTOM_NAV_PATHS.has(item.to),
)
