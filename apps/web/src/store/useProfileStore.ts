import { create } from 'zustand'
import { mensajeError } from '@valora/shared'
import type { IProfile, IProfileUpdate, PerfilFormValues } from '@valora/shared'
import { supabase } from '@/lib/supabase'

interface IProfileState {
  profile: IProfile | null
  loading: boolean
  saving: boolean
  error: string | null
  /** true cuando ya se intentó cargar el perfil al menos una vez. */
  loaded: boolean
  /** Carga el perfil del usuario autenticado. */
  fetchProfile: () => Promise<void>
  /** Guarda los datos del paso "Perfil" del onboarding. */
  saveProfile: (values: PerfilFormValues) => Promise<boolean>
  /** Marca el onboarding como completado. */
  completeOnboarding: () => Promise<boolean>
  reset: () => void
}

export const useProfileStore = create<IProfileState>((set) => ({
  profile: null,
  loading: false,
  saving: false,
  error: null,
  loaded: false,

  fetchProfile: async () => {
    set({ loading: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('No hay una sesión activa.')

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error

      set({ profile: data as IProfile, loading: false, loaded: true })
    } catch (error) {
      set({
        loading: false,
        loaded: true,
        error: mensajeError(error, 'No se pudo cargar tu perfil.'),
      })
    }
  },

  saveProfile: async (values) => {
    set({ saving: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('No hay una sesión activa.')

      const payload: IProfileUpdate = {
        nombre: values.nombre,
        apellido_paterno: values.apellido_paterno || null,
        apellido_materno: values.apellido_materno || null,
        tema: values.tema,
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select('*')
        .single()
      if (error) throw error

      set({ profile: data as IProfile, saving: false })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo guardar tu perfil.') })
      return false
    }
  },

  completeOnboarding: async () => {
    set({ saving: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('No hay una sesión activa.')

      const { data, error } = await supabase
        .from('profiles')
        .update({ onboarding_completo: true })
        .eq('id', userId)
        .select('*')
        .single()
      if (error) throw error

      set({ profile: data as IProfile, saving: false })
      return true
    } catch (error) {
      set({
        saving: false,
        error: mensajeError(error, 'No se pudo finalizar la configuración.'),
      })
      return false
    }
  },

  reset: () => set({ profile: null, loading: false, saving: false, error: null, loaded: false }),
}))

/** Selector: el perfil ya está cargado y el onboarding completo. */
export function selectOnboardingCompleto(state: IProfileState): boolean {
  return state.profile?.onboarding_completo === true
}
