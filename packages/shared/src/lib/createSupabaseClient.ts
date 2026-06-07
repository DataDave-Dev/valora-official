import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

/**
 * Crea un cliente Supabase tipado. No lee variables de entorno directamente
 * (eso es específico de cada plataforma): la web pasa `import.meta.env.VITE_*`
 * y la app móvil pasará `process.env.EXPO_PUBLIC_*`.
 *
 * Cada app debe crear una sola instancia y exportarla (ver apps/web/src/lib/supabase.ts).
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<'public'>,
) {
  if (!url || !anonKey) {
    throw new Error(
      'Faltan las variables de Supabase (URL o ANON KEY). Revisa tu archivo .env.',
    )
  }

  return createClient<Database>(url, anonKey, options)
}

/** Tipo del cliente ya configurado, para anotar stores y helpers. */
export type SupabaseClient = ReturnType<typeof createSupabaseClient>
