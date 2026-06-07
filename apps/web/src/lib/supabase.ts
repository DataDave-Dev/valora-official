import { createSupabaseClient } from '@valora/shared'

/**
 * Instancia única del cliente Supabase para la web.
 * No crear más instancias: importar esta en stores y hooks.
 */
export const supabase = createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
