import { create } from 'zustand'
import { mensajeError } from '@valora/shared'
import type {
  CuentaFormValues,
  ICuenta,
  ICuentaInsert,
  ICuentaUpdate,
  TipoCuenta,
} from '@valora/shared'
import { supabase } from '@/lib/supabase'

/** Icono por defecto (nombre lucide) según el tipo de cuenta. */
const ICONO_POR_TIPO: Record<TipoCuenta, string> = {
  efectivo: 'banknote',
  banco: 'wallet',
  tarjeta_credito: 'credit-card',
  ahorro: 'piggy-bank',
  inversion: 'trending-up',
}

/**
 * Normaliza los valores del formulario al shape que espera la tabla `cuentas`:
 * el icono se deriva del tipo y los campos de tarjeta solo se conservan cuando
 * el tipo es `tarjeta_credito` (en otro caso quedan en `null`).
 */
function camposDeCuenta(values: CuentaFormValues) {
  const esTarjeta = values.tipo === 'tarjeta_credito'
  return {
    nombre: values.nombre,
    tipo: values.tipo,
    saldo_inicial: values.saldo_inicial,
    icono: ICONO_POR_TIPO[values.tipo],
    limite_credito: esTarjeta ? (values.limite_credito ?? null) : null,
    dia_corte: esTarjeta ? (values.dia_corte ?? null) : null,
    dia_pago: esTarjeta ? (values.dia_pago ?? null) : null,
  }
}

interface ICuentasState {
  cuentas: ICuenta[]
  loading: boolean
  saving: boolean
  error: string | null
  fetchCuentas: (hogarId: string) => Promise<void>
  addCuenta: (hogarId: string, values: CuentaFormValues) => Promise<boolean>
  updateCuenta: (id: string, values: CuentaFormValues) => Promise<boolean>
  setArchivada: (id: string, archivada: boolean) => Promise<boolean>
  reset: () => void
}

export const useCuentasStore = create<ICuentasState>((set, get) => ({
  cuentas: [],
  loading: false,
  saving: false,
  error: null,

  fetchCuentas: async (hogarId) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('cuentas')
        .select('*')
        .eq('hogar_id', hogarId)
        .order('created_at', { ascending: true })
      if (error) throw error

      set({ cuentas: (data ?? []) as ICuenta[], loading: false })
    } catch (error) {
      set({ loading: false, error: mensajeError(error, 'No se pudieron cargar las cuentas.') })
    }
  },

  addCuenta: async (hogarId, values) => {
    set({ saving: true, error: null })
    try {
      const payload: ICuentaInsert = { hogar_id: hogarId, ...camposDeCuenta(values) }
      const { data, error } = await supabase
        .from('cuentas')
        .insert(payload)
        .select('*')
        .single()
      if (error) throw error

      set({ cuentas: [...get().cuentas, data as ICuenta], saving: false })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo crear la cuenta.') })
      return false
    }
  },

  updateCuenta: async (id, values) => {
    set({ saving: true, error: null })
    try {
      const payload: ICuentaUpdate = camposDeCuenta(values)
      const { data, error } = await supabase
        .from('cuentas')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error

      const actualizada = data as ICuenta
      set({
        cuentas: get().cuentas.map((c) => (c.id === id ? actualizada : c)),
        saving: false,
      })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo actualizar la cuenta.') })
      return false
    }
  },

  setArchivada: async (id, archivada) => {
    set({ saving: true, error: null })
    try {
      const { data, error } = await supabase
        .from('cuentas')
        .update({ archivada })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error

      const actualizada = data as ICuenta
      set({
        cuentas: get().cuentas.map((c) => (c.id === id ? actualizada : c)),
        saving: false,
      })
      return true
    } catch (error) {
      const fallback = archivada
        ? 'No se pudo archivar la cuenta.'
        : 'No se pudo restaurar la cuenta.'
      set({ saving: false, error: mensajeError(error, fallback) })
      return false
    }
  },

  reset: () => set({ cuentas: [], loading: false, saving: false, error: null }),
}))
