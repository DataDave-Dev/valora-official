import {
  Banknote,
  BriefcaseBusiness,
  Car,
  Clapperboard,
  CreditCard,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Laptop,
  PiggyBank,
  Plug,
  ShoppingBag,
  Shirt,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

/**
 * Mapa de nombres de icono (los que guardamos en `categorias.icono` /
 * `cuentas.icono`, estilo kebab-case de lucide) a sus componentes.
 * Si un nombre no está mapeado se usa `Tag` como respaldo.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  house: House,
  'heart-pulse': HeartPulse,
  clapperboard: Clapperboard,
  'graduation-cap': GraduationCap,
  plug: Plug,
  shirt: Shirt,
  tag: Tag,
  briefcase: BriefcaseBusiness,
  laptop: Laptop,
  'shopping-bag': ShoppingBag,
  'trending-up': TrendingUp,
  // Cuentas
  wallet: Wallet,
  'credit-card': CreditCard,
  banknote: Banknote,
  'piggy-bank': PiggyBank,
  landmark: Landmark,
}

interface IDynamicIconProps {
  name: string
  size?: number
  className?: string
}

/** Renderiza un icono de lucide-react a partir de su nombre en la BD. */
export function DynamicIcon({ name, size = 20, className }: IDynamicIconProps) {
  const Icon = ICON_MAP[name] ?? Tag
  return <Icon size={size} className={className} aria-hidden="true" />
}
