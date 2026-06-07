import type { TipoMovimiento } from '../types/domain'

/** Plantilla de una categoría predefinida (sin user_id ni id). */
export interface DefaultCategory {
  nombre: string
  tipo: TipoMovimiento
  color: string
  /** Nombre de icono de lucide-react. */
  icono: string
}

/**
 * Categorías predefinidas que recibe cada usuario al registrarse.
 * Esta es la fuente de verdad: el trigger SQL de Supabase
 * (supabase/migrations) debe reflejar exactamente estos valores.
 */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Gastos
  { nombre: 'Alimentación', tipo: 'gasto', color: '#ef4444', icono: 'utensils' },
  { nombre: 'Transporte', tipo: 'gasto', color: '#f97316', icono: 'car' },
  { nombre: 'Vivienda', tipo: 'gasto', color: '#8b5cf6', icono: 'house' },
  { nombre: 'Salud', tipo: 'gasto', color: '#ec4899', icono: 'heart-pulse' },
  { nombre: 'Entretenimiento', tipo: 'gasto', color: '#06b6d4', icono: 'clapperboard' },
  { nombre: 'Educación', tipo: 'gasto', color: '#3b82f6', icono: 'graduation-cap' },
  { nombre: 'Servicios', tipo: 'gasto', color: '#14b8a6', icono: 'plug' },
  { nombre: 'Ropa', tipo: 'gasto', color: '#a855f7', icono: 'shirt' },
  { nombre: 'Otros', tipo: 'gasto', color: '#6b7280', icono: 'tag' },
  // Ingresos
  { nombre: 'Sueldo', tipo: 'ingreso', color: '#22c55e', icono: 'briefcase' },
  { nombre: 'Freelance', tipo: 'ingreso', color: '#10b981', icono: 'laptop' },
  { nombre: 'Ventas', tipo: 'ingreso', color: '#84cc16', icono: 'shopping-bag' },
  { nombre: 'Inversiones', tipo: 'ingreso', color: '#eab308', icono: 'trending-up' },
  { nombre: 'Otros', tipo: 'ingreso', color: '#6b7280', icono: 'tag' },
]
