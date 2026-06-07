// Cliente Supabase
export { createSupabaseClient, type SupabaseClient } from './lib/createSupabaseClient'
export type { Session, User, AuthError } from '@supabase/supabase-js'

// Tipos
export type { Database, Json } from './types/database.types'
export * from './types/domain'

// Constantes
export { DEFAULT_CATEGORIES, type DefaultCategory } from './constants/defaultCategories'

// Utilidades
export { formatMXN, formatCurrency } from './utils/formatCurrency'
export * from './utils/dateUtils'
export * from './utils/calculations'
export { mensajeError } from './utils/errors'

// Esquemas de validación
export * from './schemas/movimiento.schema'
export * from './schemas/categoria.schema'
export * from './schemas/cuenta.schema'
export * from './schemas/presupuesto.schema'
export * from './schemas/meta.schema'
export * from './schemas/transferencia.schema'
export * from './schemas/etiqueta.schema'
export * from './schemas/recurrente.schema'
export * from './schemas/deuda.schema'
export * from './schemas/profile.schema'
export * from './schemas/auth.schema'
export * from './schemas/filtros.schema'
