import { create } from 'zustand'
import { mensajeError } from '@valora/shared'
import type { Session, User } from '@valora/shared'
import { supabase } from '@/lib/supabase'

interface IAuthState {
  session: Session | null
  user: User | null
  /** true hasta que se resuelve la sesión inicial. */
  loading: boolean
  /** Hidrata la sesión y se suscribe a cambios de auth. Llamar una vez al arrancar. */
  initialize: () => () => void
  /** Inicia sesión con correo y contraseña. Devuelve null si todo va bien, o un mensaje de error. */
  signIn: (email: string, password: string) => Promise<string | null>
  /** Registra un usuario nuevo. Devuelve null si todo va bien, o un mensaje de error. */
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const useAuthStore = create<IAuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  initialize: () => {
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        set({ session: data.session, user: data.session?.user ?? null, loading: false })
      })
      .catch(() => {
        // No dejar la app atascada en el loader si falla la sesión inicial.
        set({ session: null, user: null, loading: false })
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false })
    })

    return () => subscription.unsubscribe()
  },
  signIn: async (email, password) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return null
    } catch (error) {
      return mensajeError(error, 'No se pudo iniciar sesión. Verifica tus datos.')
    }
  },
  signUp: async (email, password) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      return null
    } catch (error) {
      return mensajeError(error, 'No se pudo crear la cuenta. Inténtalo de nuevo.')
    }
  },
  signOut: async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Aunque el servidor falle, limpiamos el estado local para cerrar sesión.
    } finally {
      set({ session: null, user: null })
    }
  },
}))
