import { create } from 'zustand'
import { mensajeError } from '@valora/shared'
import type { EtiquetaFormValues, IEtiqueta, IEtiquetaInsert } from '@valora/shared'
import { supabase } from '@/lib/supabase'

/** Código Postgres de violación de restricción UNIQUE. */
const PG_UNIQUE_VIOLATION = '23505'

interface IEtiquetasState {
  etiquetas: IEtiqueta[]
  loading: boolean
  saving: boolean
  error: string | null
  fetchEtiquetas: (hogarId: string) => Promise<void>
  addEtiqueta: (hogarId: string, values: EtiquetaFormValues) => Promise<IEtiqueta | null>
  updateEtiqueta: (id: string, values: EtiquetaFormValues) => Promise<boolean>
  removeEtiqueta: (id: string) => Promise<boolean>
  reset: () => void
}

export const useEtiquetasStore = create<IEtiquetasState>((set, get) => ({
  etiquetas: [],
  loading: false,
  saving: false,
  error: null,

  fetchEtiquetas: async (hogarId) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('etiquetas')
        .select('*')
        .eq('hogar_id', hogarId)
        .order('nombre', { ascending: true })
      if (error) throw error

      set({ etiquetas: (data ?? []) as IEtiqueta[], loading: false })
    } catch (error) {
      set({ loading: false, error: mensajeError(error, 'No se pudieron cargar las etiquetas.') })
    }
  },

  addEtiqueta: async (hogarId, values) => {
    set({ saving: true, error: null })
    try {
      const payload: IEtiquetaInsert = {
        hogar_id: hogarId,
        nombre: values.nombre.trim(),
        color: values.color,
      }
      const { data, error } = await supabase
        .from('etiquetas')
        .insert(payload)
        .select('*')
        .single()
      if (error) {
        if (error.code === PG_UNIQUE_VIOLATION) {
          throw new Error('Ya existe una etiqueta con ese nombre.')
        }
        throw error
      }

      const nueva = data as IEtiqueta
      // Insertamos en orden alfabético para no romper el `order('nombre')` del fetch.
      const siguiente = [...get().etiquetas, nueva].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es'),
      )
      set({ etiquetas: siguiente, saving: false })
      return nueva
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo crear la etiqueta.') })
      return null
    }
  },

  updateEtiqueta: async (id, values) => {
    set({ saving: true, error: null })
    try {
      const { data, error } = await supabase
        .from('etiquetas')
        .update({ nombre: values.nombre.trim(), color: values.color })
        .eq('id', id)
        .select('*')
        .single()
      if (error) {
        if (error.code === PG_UNIQUE_VIOLATION) {
          throw new Error('Ya existe una etiqueta con ese nombre.')
        }
        throw error
      }

      const actualizada = data as IEtiqueta
      const reordenadas = get()
        .etiquetas.map((e) => (e.id === id ? actualizada : e))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      set({ etiquetas: reordenadas, saving: false })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo actualizar la etiqueta.') })
      return false
    }
  },

  removeEtiqueta: async (id) => {
    set({ saving: true, error: null })
    try {
      // El cascade en `movimiento_etiquetas` la limpia automáticamente.
      const { error } = await supabase.from('etiquetas').delete().eq('id', id)
      if (error) throw error

      set({
        etiquetas: get().etiquetas.filter((e) => e.id !== id),
        saving: false,
      })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo eliminar la etiqueta.') })
      return false
    }
  },

  reset: () => set({ etiquetas: [], loading: false, saving: false, error: null }),
}))
