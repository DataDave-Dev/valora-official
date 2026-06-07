import { create } from 'zustand'
import { mensajeError } from '@valora/shared'
import type {
  ITransferencia,
  ITransferenciaInsert,
  TransferenciaFormValues,
} from '@valora/shared'
import { supabase } from '@/lib/supabase'

interface ITransferenciasState {
  transferencias: ITransferencia[]
  loading: boolean
  saving: boolean
  error: string | null
  fetchTransferencias: (hogarId: string) => Promise<void>
  addTransferencia: (hogarId: string, values: TransferenciaFormValues) => Promise<boolean>
  removeTransferencia: (id: string) => Promise<boolean>
  reset: () => void
}

export const useTransferenciasStore = create<ITransferenciasState>((set, get) => ({
  transferencias: [],
  loading: false,
  saving: false,
  error: null,

  fetchTransferencias: async (hogarId) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('transferencias')
        .select('*')
        .eq('hogar_id', hogarId)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error

      set({ transferencias: (data ?? []) as ITransferencia[], loading: false })
    } catch (error) {
      set({
        loading: false,
        error: mensajeError(error, 'No se pudieron cargar las transferencias.'),
      })
    }
  },

  addTransferencia: async (hogarId, values) => {
    set({ saving: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('No hay una sesión activa.')

      const payload: ITransferenciaInsert = {
        hogar_id: hogarId,
        creado_por: userId,
        cuenta_origen: values.cuenta_origen,
        cuenta_destino: values.cuenta_destino,
        monto: values.monto,
        fecha: values.fecha,
        descripcion: values.descripcion?.trim() ? values.descripcion.trim() : null,
      }
      const { data, error } = await supabase
        .from('transferencias')
        .insert(payload)
        .select('*')
        .single()
      if (error) throw error

      set({ transferencias: [data as ITransferencia, ...get().transferencias], saving: false })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo registrar la transferencia.') })
      return false
    }
  },

  removeTransferencia: async (id) => {
    set({ saving: true, error: null })
    try {
      const { error } = await supabase.from('transferencias').delete().eq('id', id)
      if (error) throw error

      set({ transferencias: get().transferencias.filter((t) => t.id !== id), saving: false })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo eliminar la transferencia.') })
      return false
    }
  },

  reset: () => set({ transferencias: [], loading: false, saving: false, error: null }),
}))
