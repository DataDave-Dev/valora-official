import { create } from 'zustand'
import { mensajeError } from '@valora/shared'
import type { IMeta, IMetaInsert, MetaFormValues } from '@valora/shared'
import { supabase } from '@/lib/supabase'

/** Fecha de hoy en formato `YYYY-MM-DD` para la transferencia del abono. */
const hoy = (): string => new Date().toISOString().split('T')[0] ?? ''

interface IMetasState {
  metas: IMeta[]
  loading: boolean
  saving: boolean
  error: string | null
  fetchMetas: (hogarId: string) => Promise<void>
  addMeta: (hogarId: string, values: MetaFormValues) => Promise<boolean>
  /** Edita nombre, objetivo y fecha límite. La cuenta de ahorro es fija. */
  updateMeta: (id: string, values: MetaFormValues) => Promise<boolean>
  /** Abona: transferencia (cuentaOrigen → cuenta_ahorro de la meta) + abono. */
  abonar: (hogarId: string, meta: IMeta, monto: number, cuentaOrigenId: string) => Promise<boolean>
  /** Retira: transferencia (cuenta_ahorro de la meta → cuentaDestino) + abono. */
  retirar: (hogarId: string, meta: IMeta, monto: number, cuentaDestinoId: string) => Promise<boolean>
  removeMeta: (id: string) => Promise<boolean>
  reset: () => void
}

/**
 * Crea una transferencia y la vincula a una meta vía `abonos_meta`. Si el
 * segundo insert falla, compensa borrando la transferencia huérfana (no hay
 * RPC/transacción en v1; ver decisión #6). El trigger `sincronizar_monto_actual`
 * recalcula `metas.monto_actual` al insertar el abono.
 */
async function registrarAbono(params: {
  hogarId: string
  metaId: string
  creadoPor: string
  cuentaOrigen: string
  cuentaDestino: string
  monto: number
  descripcion: string
}): Promise<void> {
  const { hogarId, metaId, creadoPor, cuentaOrigen, cuentaDestino, monto, descripcion } = params

  const { data: transferencia, error: errorTransferencia } = await supabase
    .from('transferencias')
    .insert({
      hogar_id: hogarId,
      creado_por: creadoPor,
      cuenta_origen: cuentaOrigen,
      cuenta_destino: cuentaDestino,
      monto,
      fecha: hoy(),
      descripcion,
    })
    .select('id')
    .single()
  if (errorTransferencia) throw errorTransferencia

  const { error: errorAbono } = await supabase
    .from('abonos_meta')
    .insert({ hogar_id: hogarId, meta_id: metaId, transferencia_id: transferencia.id })
  if (errorAbono) {
    // Compensa: la transferencia ya existe pero no quedó vinculada a la meta.
    await supabase.from('transferencias').delete().eq('id', transferencia.id)
    throw errorAbono
  }
}

/** Relee una meta (su `monto_actual`/`completada` los acaba de fijar el trigger). */
async function releerMeta(metaId: string, hogarId: string): Promise<IMeta | null> {
  const { data } = await supabase
    .from('metas')
    .select('*')
    .eq('id', metaId)
    .eq('hogar_id', hogarId)
    .single()
  return (data as IMeta | null) ?? null
}

/** ID de sesión activo o lanza un error legible. */
async function userIdActivo(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) throw new Error('No hay una sesión activa.')
  return userId
}

export const useMetasStore = create<IMetasState>((set, get) => ({
  metas: [],
  loading: false,
  saving: false,
  error: null,

  fetchMetas: async (hogarId) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('hogar_id', hogarId)
        .order('completada', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error

      set({ metas: (data ?? []) as IMeta[], loading: false })
    } catch (error) {
      set({ loading: false, error: mensajeError(error, 'No se pudieron cargar las metas.') })
    }
  },

  addMeta: async (hogarId, values) => {
    set({ saving: true, error: null })
    try {
      // monto_actual y completada los mantiene el trigger; no se escriben aquí.
      const payload: IMetaInsert = {
        hogar_id: hogarId,
        cuenta_ahorro_id: values.cuenta_ahorro_id,
        nombre: values.nombre,
        monto_objetivo: values.monto_objetivo,
        fecha_limite: values.fecha_limite?.trim() ? values.fecha_limite : null,
      }
      const { data, error } = await supabase.from('metas').insert(payload).select('*').single()
      if (error) throw error

      set({ metas: [...get().metas, data as IMeta], saving: false })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo crear la meta.') })
      return false
    }
  },

  updateMeta: async (id, values) => {
    set({ saving: true, error: null })
    try {
      // La cuenta de ahorro NO se cambia (desincronizaría monto_actual con las
      // transferencias ya vinculadas). Solo nombre, objetivo y fecha límite.
      const { data, error } = await supabase
        .from('metas')
        .update({
          nombre: values.nombre,
          monto_objetivo: values.monto_objetivo,
          fecha_limite: values.fecha_limite?.trim() ? values.fecha_limite : null,
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error

      const actualizada = data as IMeta
      set({ metas: get().metas.map((m) => (m.id === id ? actualizada : m)), saving: false })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo actualizar la meta.') })
      return false
    }
  },

  abonar: async (hogarId, meta, monto, cuentaOrigenId) => {
    set({ saving: true, error: null })
    try {
      const userId = await userIdActivo()
      await registrarAbono({
        hogarId,
        metaId: meta.id,
        creadoPor: userId,
        cuentaOrigen: cuentaOrigenId,
        cuentaDestino: meta.cuenta_ahorro_id,
        monto,
        descripcion: `Abono a meta: ${meta.nombre}`,
      })

      const actualizada = await releerMeta(meta.id, hogarId)
      set((s) => ({
        metas: actualizada ? s.metas.map((m) => (m.id === meta.id ? actualizada : m)) : s.metas,
        saving: false,
      }))
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo registrar el abono.') })
      return false
    }
  },

  retirar: async (hogarId, meta, monto, cuentaDestinoId) => {
    set({ saving: true, error: null })
    try {
      const userId = await userIdActivo()
      await registrarAbono({
        hogarId,
        metaId: meta.id,
        creadoPor: userId,
        cuentaOrigen: meta.cuenta_ahorro_id,
        cuentaDestino: cuentaDestinoId,
        monto,
        descripcion: `Retiro de meta: ${meta.nombre}`,
      })

      const actualizada = await releerMeta(meta.id, hogarId)
      set((s) => ({
        metas: actualizada ? s.metas.map((m) => (m.id === meta.id ? actualizada : m)) : s.metas,
        saving: false,
      }))
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo registrar el retiro.') })
      return false
    }
  },

  removeMeta: async (id) => {
    set({ saving: true, error: null })
    try {
      // Borra la meta y sus abonos (cascade). Las transferencias permanecen:
      // el dinero realmente se movió entre cuentas.
      const { error } = await supabase.from('metas').delete().eq('id', id)
      if (error) throw error

      set({ metas: get().metas.filter((m) => m.id !== id), saving: false })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo eliminar la meta.') })
      return false
    }
  },

  reset: () => set({ metas: [], loading: false, saving: false, error: null }),
}))
