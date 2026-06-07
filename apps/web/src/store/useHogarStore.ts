import { create } from 'zustand'
import { mensajeError } from '@valora/shared'
import { supabase } from '@/lib/supabase'

/** Datos mínimos del hogar activo que el resto de la app necesita. */
export interface IHogar {
  id: string
  nombre: string
  moneda: string
}

interface IHogarState {
  hogar: IHogar | null
  loading: boolean
  error: string | null
  /** Resuelve el hogar del que el usuario es miembro. */
  fetchHogar: () => Promise<void>
  reset: () => void
}

export const useHogarStore = create<IHogarState>((set) => ({
  hogar: null,
  loading: false,
  error: null,

  fetchHogar: async () => {
    set({ loading: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('No hay una sesión activa.')

      // El trigger de alta crea el hogar y la membresía como `dueno`.
      // RLS limita el acceso a hogares de los que el usuario es miembro.
      const { data, error } = await supabase
        .from('hogar_miembros')
        .select('hogar:hogares(id, nombre, moneda)')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()
      if (error) throw error

      // supabase-js puede tipar el join `hogares(...)` como objeto o array;
      // normalizamos ambas formas sin recurrir a `any`.
      const raw = (data as { hogar: IHogar | IHogar[] | null }).hogar
      const hogar = Array.isArray(raw) ? (raw[0] ?? null) : raw
      if (!hogar) throw new Error('No se encontró un hogar para tu cuenta.')

      set({ hogar, loading: false })
    } catch (error) {
      set({ loading: false, error: mensajeError(error, 'No se pudo cargar tu hogar.') })
    }
  },

  reset: () => set({ hogar: null, loading: false, error: null }),
}))
