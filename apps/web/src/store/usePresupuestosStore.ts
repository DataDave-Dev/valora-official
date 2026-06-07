import { create } from 'zustand'
import { mensajeError, type Periodo } from '@valora/shared'
import type {
  IPresupuesto,
  IPresupuestoInsert,
  PresupuestoFormValues,
} from '@valora/shared'
import { supabase } from '@/lib/supabase'

/** Código Postgres de violación de restricción UNIQUE. */
const PG_UNIQUE_VIOLATION = '23505'

interface IPresupuestosState {
  presupuestos: IPresupuesto[]
  loading: boolean
  saving: boolean
  error: string | null
  fetchPresupuestos: (hogarId: string, periodo: Periodo) => Promise<void>
  addPresupuesto: (hogarId: string, values: PresupuestoFormValues) => Promise<boolean>
  updatePresupuesto: (id: string, montoLimite: number) => Promise<boolean>
  removePresupuesto: (id: string) => Promise<boolean>
  reset: () => void
}

export const usePresupuestosStore = create<IPresupuestosState>((set, get) => ({
  presupuestos: [],
  loading: false,
  saving: false,
  error: null,

  fetchPresupuestos: async (hogarId, periodo) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('hogar_id', hogarId)
        .eq('mes', periodo.mes)
        .eq('anio', periodo.anio)
        .order('created_at', { ascending: true })
      if (error) throw error

      set({ presupuestos: (data ?? []) as IPresupuesto[], loading: false })
    } catch (error) {
      set({
        loading: false,
        error: mensajeError(error, 'No se pudieron cargar los presupuestos.'),
      })
    }
  },

  addPresupuesto: async (hogarId, values) => {
    set({ saving: true, error: null })
    try {
      const payload: IPresupuestoInsert = {
        hogar_id: hogarId,
        categoria_id: values.categoria_id,
        monto_limite: values.monto_limite,
        mes: values.mes,
        anio: values.anio,
      }
      const { data, error } = await supabase
        .from('presupuestos')
        .insert(payload)
        .select('*')
        .single()
      if (error) {
        if (error.code === PG_UNIQUE_VIOLATION) {
          throw new Error('Ya existe un presupuesto para esta categoría en este mes.')
        }
        throw error
      }

      set({ presupuestos: [...get().presupuestos, data as IPresupuesto], saving: false })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo crear el presupuesto.') })
      return false
    }
  },

  updatePresupuesto: async (id, montoLimite) => {
    set({ saving: true, error: null })
    try {
      const { data, error } = await supabase
        .from('presupuestos')
        .update({ monto_limite: montoLimite })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error

      const actualizado = data as IPresupuesto
      set({
        presupuestos: get().presupuestos.map((p) => (p.id === id ? actualizado : p)),
        saving: false,
      })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo actualizar el presupuesto.') })
      return false
    }
  },

  removePresupuesto: async (id) => {
    set({ saving: true, error: null })
    try {
      const { error } = await supabase.from('presupuestos').delete().eq('id', id)
      if (error) throw error

      set({ presupuestos: get().presupuestos.filter((p) => p.id !== id), saving: false })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo eliminar el presupuesto.') })
      return false
    }
  },

  reset: () => set({ presupuestos: [], loading: false, saving: false, error: null }),
}))
