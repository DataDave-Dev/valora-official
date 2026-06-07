import { create } from 'zustand'
import { mensajeError, type DeudaFormValues, type IDeuda, type IDeudaConProgreso, type IPagoDeuda, type IPagoDeudaInsert, type PagoDeudaFormValues } from '@valora/shared'
import { supabase } from '@/lib/supabase'

interface IDeudasState {
  deudas: IDeudaConProgreso[]
  loading: boolean
  saving: boolean
  error: string | null
  fetchDeudas: (hogarId: string) => Promise<void>
  addDeuda: (hogarId: string, values: DeudaFormValues) => Promise<boolean>
  removeDeuda: (id: string) => Promise<boolean>
  /**
   * Registra un pago (parcial o total) contra una deuda. Si el pago acumulado
   * alcanza o supera el `monto_original`, marca la deuda como `liquidada`.
   * No crea un movimiento (vínculo opcional, fuera de v1).
   */
  addPago: (deudaId: string, hogarId: string, values: PagoDeudaFormValues) => Promise<boolean>
  reset: () => void
}

/** Construye `IDeudaConProgreso` a partir de la deuda + sus pagos. */
function conProgreso(d: IDeuda, pagos: IPagoDeuda[]): IDeudaConProgreso {
  const pagado = pagos.reduce((acc, p) => acc + p.monto, 0)
  const restante = Math.max(0, d.monto_original - pagado)
  const porcentaje =
    d.monto_original > 0 ? Math.min(100, (pagado / d.monto_original) * 100) : 0
  return { ...d, pagos, pagado, restante, porcentaje }
}

export const useDeudasStore = create<IDeudasState>((set) => ({
  deudas: [],
  loading: false,
  saving: false,
  error: null,

  fetchDeudas: async (hogarId) => {
    set({ loading: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error('No hay una sesión activa.')

      const { data: deudasData, error: errDeudas } = await supabase
        .from('deudas')
        .select('*')
        .eq('hogar_id', hogarId)
        .order('fecha', { ascending: false })
      if (errDeudas) throw errDeudas

      const { data: pagosData, error: errPagos } = await supabase
        .from('pagos_deuda')
        .select('*')
        .eq('hogar_id', hogarId)
        .order('fecha', { ascending: true })
      if (errPagos) throw errPagos

      const pagosPorDeuda = new Map<string, IPagoDeuda[]>()
      for (const p of (pagosData ?? []) as IPagoDeuda[]) {
        const lista = pagosPorDeuda.get(p.deuda_id) ?? []
        lista.push(p)
        pagosPorDeuda.set(p.deuda_id, lista)
      }

      const deudas = ((deudasData ?? []) as IDeuda[]).map((d) =>
        conProgreso(d, pagosPorDeuda.get(d.id) ?? []),
      )
      set({ deudas, loading: false })
    } catch (error) {
      set({ loading: false, error: mensajeError(error, 'No se pudieron cargar las deudas.') })
    }
  },

  addDeuda: async (hogarId, values) => {
    set({ saving: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('No hay una sesión activa.')

      const payload = {
        hogar_id: hogarId,
        creado_por: userId,
        tipo: values.tipo,
        contraparte: values.contraparte,
        monto_original: values.monto_original,
        fecha: values.fecha,
        fecha_limite: values.fecha_limite ?? null,
        descripcion: values.descripcion ?? null,
      }
      const { data, error } = await supabase
        .from('deudas')
        .insert(payload)
        .select('*')
        .single()
      if (error) throw error

      const nueva = conProgreso(data as IDeuda, [])
      set((s) => ({ deudas: [nueva, ...s.deudas], saving: false }))
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo guardar la deuda.') })
      return false
    }
  },

  removeDeuda: async (id) => {
    set({ saving: true, error: null })
    try {
      const { error } = await supabase.from('deudas').delete().eq('id', id)
      if (error) throw error
      set((s) => ({
        deudas: s.deudas.filter((d) => d.id !== id),
        saving: false,
      }))
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo eliminar la deuda.') })
      return false
    }
  },

  addPago: async (deudaId, hogarId, values) => {
    set({ saving: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error('No hay una sesión activa.')

      const payload: IPagoDeudaInsert = {
        hogar_id: hogarId,
        deuda_id: deudaId,
        monto: values.monto,
        fecha: values.fecha,
      }
      const { data, error } = await supabase
        .from('pagos_deuda')
        .insert(payload)
        .select('*')
        .single()
      if (error) throw error
      const pago = data as IPagoDeuda

      set((s) => {
        const next = s.deudas.map((d) => {
          if (d.id !== deudaId) return d
          const pagos = [...d.pagos, pago]
          const actualizada = conProgreso(d, pagos)
          // Si el progreso alcanza el 100%, marcamos liquidada (best-effort)
          if (actualizada.porcentaje >= 100 && !d.liquidada) {
            void supabase.from('deudas').update({ liquidada: true }).eq('id', d.id)
            return { ...actualizada, liquidada: true }
          }
          return actualizada
        })
        return { deudas: next, saving: false }
      })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo registrar el pago.') })
      return false
    }
  },

  reset: () => set({ deudas: [], loading: false, saving: false, error: null }),
}))
