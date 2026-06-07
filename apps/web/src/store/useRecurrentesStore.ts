import { create } from 'zustand'
import {
  fechasVencidasHasta,
  mensajeError,
  type FrecuenciaRecurrente,
  type IMovimiento,
  type IMovimientoRecurrente,
  type IMovimientoRecurrenteInsert,
  type IMovimientoRecurrenteUpdate,
  type IMovimientoUpdate,
  type RecurrenteFormValues,
} from '@valora/shared'
import { supabase } from '@/lib/supabase'

interface IRecurrentesState {
  recurrentes: IMovimientoRecurrente[]
  loading: boolean
  saving: boolean
  error: string | null
  /**
   * Cache de los movimientos `pendiente` ligados a un recurrente del hogar.
   * Se hidrata al materializar y se actualiza al confirmar/descartar.
   * Estructura: `recurrenteId → IMovimiento[]` (solo pendientes).
   */
  pendientesPorRecurrente: Record<string, IMovimiento[]>
  loadingMaterializar: boolean
  fetchRecurrentes: (hogarId: string) => Promise<void>
  addRecurrente: (hogarId: string, values: RecurrenteFormValues) => Promise<boolean>
  updateRecurrente: (id: string, values: RecurrenteFormValues) => Promise<boolean>
  /**
   * Elimina la plantilla. Si tiene hijos confirmados, el `on delete set null`
   * de la FK mantiene los movimientos huérfanos (sin enlace al recurrente).
   * Si tiene hijos `pendiente`, NO los borra: la app debe mostrarlos al usuario
   * para que decida qué hacer (este método asume que ya se gestionaron).
   */
  removeRecurrente: (id: string) => Promise<boolean>
  /**
   * Recorre las plantillas activas y crea los movimientos `pendiente` que
   * deberían existir hasta hoy (inclusive). Se llama al activar el hogar
   * y al iniciar sesión. Idempotente: si ya hay un movimiento generado
   * para una fecha, no duplica.
   */
  materializarVencidos: (hogarId: string) => Promise<number>
  /**
   * Confirma un movimiento `pendiente` ligado a un recurrente: lo marca
   * `confirmado` (con opción de editar monto/descripción/fecha al vuelo) y
   * avanza la `proxima_fecha` del recurrente al siguiente ciclo.
   * Devuelve `true` si se confirmó correctamente.
   */
  confirmarPendiente: (
    movimientoId: string,
    movimientoUpdates: { monto?: number; descripcion?: string; fecha?: string },
  ) => Promise<boolean>
  reset: () => void
}

/** Hoy como `yyyy-MM-dd` (formato columna `date` de la BD). Usa la hora local. */
function hoy(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Avanza la `proxima_fecha` de un recurrente a la siguiente ocurrencia futura. */
function siguienteProxima(
  proximaFecha: string,
  frecuencia: FrecuenciaRecurrente,
): string {
  return fechasVencidasHasta(proximaFecha, frecuencia, '2999-12-31')[0] ?? proximaFecha
}

export const useRecurrentesStore = create<IRecurrentesState>((set) => ({
  recurrentes: [],
  loading: false,
  saving: false,
  error: null,
  pendientesPorRecurrente: {},
  loadingMaterializar: false,

  fetchRecurrentes: async (hogarId) => {
    set({ loading: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error('No hay una sesión activa.')

      const { data, error } = await supabase
        .from('movimientos_recurrentes')
        .select('*')
        .eq('hogar_id', hogarId)
        .order('created_at', { ascending: false })
      if (error) throw error

      set({
        recurrentes: (data ?? []) as IMovimientoRecurrente[],
        loading: false,
      })
    } catch (error) {
      set({ loading: false, error: mensajeError(error, 'No se pudieron cargar los recurrentes.') })
    }
  },

  addRecurrente: async (hogarId, values) => {
    set({ saving: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('No hay una sesión activa.')

      const payload: IMovimientoRecurrenteInsert = {
        hogar_id: hogarId,
        creado_por: userId,
        tipo: values.tipo,
        monto: values.monto,
        descripcion: values.descripcion,
        cuenta_id: values.cuenta_id,
        categoria_id: values.categoria_id ?? null,
        frecuencia: values.frecuencia,
        proxima_fecha: values.proxima_fecha,
        fecha_fin: values.fecha_fin ?? null,
        dia_del_mes: values.dia_del_mes ?? null,
        activa: values.activa ?? true,
      }
      const { data, error } = await supabase
        .from('movimientos_recurrentes')
        .insert(payload)
        .select('*')
        .single()
      if (error) throw error

      set((s) => ({
        recurrentes: [data as IMovimientoRecurrente, ...s.recurrentes],
        saving: false,
      }))
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo guardar el recurrente.') })
      return false
    }
  },

  updateRecurrente: async (id, values) => {
    set({ saving: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error('No hay una sesión activa.')

      const patch: IMovimientoRecurrenteUpdate = {
        tipo: values.tipo,
        monto: values.monto,
        descripcion: values.descripcion,
        cuenta_id: values.cuenta_id,
        categoria_id: values.categoria_id ?? null,
        frecuencia: values.frecuencia,
        proxima_fecha: values.proxima_fecha,
        fecha_fin: values.fecha_fin ?? null,
        dia_del_mes: values.dia_del_mes ?? null,
        activa: values.activa ?? true,
      }
      const { data, error } = await supabase
        .from('movimientos_recurrentes')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error

      set((s) => ({
        recurrentes: s.recurrentes.map((r) => (r.id === id ? (data as IMovimientoRecurrente) : r)),
        saving: false,
      }))
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo actualizar el recurrente.') })
      return false
    }
  },

  removeRecurrente: async (id) => {
    set({ saving: true, error: null })
    try {
      const { error } = await supabase.from('movimientos_recurrentes').delete().eq('id', id)
      if (error) throw error

      set((s) => {
        const nextPendientes = { ...s.pendientesPorRecurrente }
        delete nextPendientes[id]
        return {
          recurrentes: s.recurrentes.filter((r) => r.id !== id),
          pendientesPorRecurrente: nextPendientes,
          saving: false,
        }
      })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo eliminar el recurrente.') })
      return false
    }
  },

  materializarVencidos: async (hogarId) => {
    const hoyStr = hoy()
    set({ loadingMaterializar: true, error: null })
    let totalGenerados = 0
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error('No hay una sesión activa.')

      // Plantillas activas del hogar
      const { data: plantillas, error: errPlantillas } = await supabase
        .from('movimientos_recurrentes')
        .select('*')
        .eq('hogar_id', hogarId)
        .eq('activa', true)
      if (errPlantillas) throw errPlantillas

      const recs = (plantillas ?? []) as IMovimientoRecurrente[]
      if (recs.length === 0) {
        set({ loadingMaterializar: false })
        return 0
      }

      const userId = sessionData.session.user.id
      const nuevosPendientes: Record<string, IMovimiento[]> = {}
      const updatesDePlantilla: { id: string; proxima_fecha: string }[] = []

      for (const r of recs) {
        // Si tiene fecha_fin y ya pasó, lo desactivamos
        if (r.fecha_fin && r.fecha_fin < hoyStr) {
          await supabase
            .from('movimientos_recurrentes')
            .update({ activa: false })
            .eq('id', r.id)
          continue
        }

        const tope = r.fecha_fin && r.fecha_fin < hoyStr ? r.fecha_fin : hoyStr
        const fechas = fechasVencidasHasta(r.proxima_fecha, r.frecuencia, tope)
        if (fechas.length === 0) continue

        // Fechas ya materializadas (para evitar duplicar si el usuario ya confirmó)
        const { data: existentes, error: errExist } = await supabase
          .from('movimientos')
          .select('fecha, estado')
          .eq('recurrente_id', r.id)
        if (errExist) throw errExist

        const yaGeneradas = new Set((existentes ?? []).map((m) => m.fecha))
        const faltantes = fechas.filter((f) => !yaGeneradas.has(f))
        if (faltantes.length === 0) {
          // El recurrente ya está al día: avanzar la cabecera a la próxima futura
          const cabecera = fechas[fechas.length - 1]
          if (cabecera) {
            const nuevaProxima = siguienteProxima(cabecera, r.frecuencia)
            updatesDePlantilla.push({ id: r.id, proxima_fecha: nuevaProxima })
          }
          continue
        }

        // Insertar los movimientos pendientes (uno por fecha faltante)
        const filas = faltantes.map((fecha) => ({
          hogar_id: hogarId,
          creado_por: userId,
          tipo: r.tipo,
          monto: r.monto,
          descripcion: r.descripcion,
          cuenta_id: r.cuenta_id,
          categoria_id: r.categoria_id ?? null,
          fecha,
          estado: 'pendiente' as const,
          recurrente_id: r.id,
        }))
        const { data: insertados, error: errInsert } = await supabase
          .from('movimientos')
          .insert(filas)
          .select('*')
        if (errInsert) throw errInsert

        const insertadosArr = (insertados ?? []) as IMovimiento[]
        totalGenerados += insertadosArr.length
        nuevosPendientes[r.id] = insertadosArr

        // Avanzar cabecera: a la fecha más reciente materializada + 1 ocurrencia
        const ultima = faltantes[faltantes.length - 1]
        if (ultima) {
          updatesDePlantilla.push({
            id: r.id,
            proxima_fecha: siguienteProxima(ultima, r.frecuencia),
          })
        }
      }

      // Persistir cabeceras y refrescar en memoria
      for (const u of updatesDePlantilla) {
        await supabase
          .from('movimientos_recurrentes')
          .update({ proxima_fecha: u.proxima_fecha })
          .eq('id', u.id)
      }

      set((s) => ({
        loadingMaterializar: false,
        recurrentes: s.recurrentes.map((r) => {
          const upd = updatesDePlantilla.find((u) => u.id === r.id)
          return upd ? { ...r, proxima_fecha: upd.proxima_fecha } : r
        }),
        pendientesPorRecurrente: { ...s.pendientesPorRecurrente, ...nuevosPendientes },
      }))

      return totalGenerados
    } catch (error) {
      set({
        loadingMaterializar: false,
        error: mensajeError(error, 'No se pudieron materializar los recurrentes.'),
      })
      return 0
    }
  },

  confirmarPendiente: async (movimientoId, updates) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error('No hay una sesión activa.')

      // 1) Traer el movimiento pendiente para conocer su recurrente_id y fecha
      const { data: mov, error: errMov } = await supabase
        .from('movimientos')
        .select('*')
        .eq('id', movimientoId)
        .single()
      if (errMov) throw errMov
      const movRow = mov as IMovimiento
      if (movRow.estado !== 'pendiente') {
        // Ya estaba confirmado o no es un pendiente de recurrente
        return true
      }

      // 2) Marcar como confirmado, aplicando edits opcionales (monto, descripción, fecha)
      const patch: IMovimientoUpdate = { estado: 'confirmado' }
      if (updates.monto !== undefined) patch.monto = updates.monto
      if (updates.descripcion !== undefined) patch.descripcion = updates.descripcion
      if (updates.fecha !== undefined) patch.fecha = updates.fecha

      const { error: errUpd } = await supabase
        .from('movimientos')
        .update(patch)
        .eq('id', movimientoId)
      if (errUpd) throw errUpd

      // 3) Si está ligado a un recurrente, avanzar la cabecera a la siguiente
      //    ocurrencia. La fecha que cuenta es la efectiva (la editada, o la
      //    original del mov). Esto es importante cuando el usuario "mueve" un
      //    pendiente a otro día: el próximo ciclo se calcula desde ahí.
      if (movRow.recurrente_id) {
        const fechaEfectiva = updates.fecha ?? movRow.fecha
        const { data: rec, error: errRec } = await supabase
          .from('movimientos_recurrentes')
          .select('*')
          .eq('id', movRow.recurrente_id)
          .single()
        if (errRec) throw errRec
        const recRow = rec as IMovimientoRecurrente
        const nuevaProxima = siguienteProxima(fechaEfectiva, recRow.frecuencia)
        // Solo avanzamos si la nueva fecha es posterior a la cabecera actual
        // (defensa frente a confirmaciones desordenadas o re-aplicaciones).
        if (nuevaProxima > recRow.proxima_fecha) {
          const { error: errRecUpd } = await supabase
            .from('movimientos_recurrentes')
            .update({ proxima_fecha: nuevaProxima })
            .eq('id', recRow.id)
          if (errRecUpd) throw errRecUpd
          set((s) => ({
            recurrentes: s.recurrentes.map((r) =>
              r.id === recRow.id ? { ...r, proxima_fecha: nuevaProxima } : r,
            ),
          }))
        }
      }

      // 4) Quitar del cache local de pendientes
      set((s) => {
        const next: Record<string, IMovimiento[]> = {}
        for (const [k, v] of Object.entries(s.pendientesPorRecurrente)) {
          next[k] = v.filter((m) => m.id !== movimientoId)
        }
        return { pendientesPorRecurrente: next }
      })

      return true
    } catch (error) {
      set({ error: mensajeError(error, 'No se pudo confirmar el movimiento.') })
      return false
    }
  },

  reset: () =>
    set({
      recurrentes: [],
      loading: false,
      saving: false,
      error: null,
      pendientesPorRecurrente: {},
      loadingMaterializar: false,
    }),
}))

// Export auxiliar para tests / consumidores que necesiten la fecha "hoy" en formato BD.
export const _interno = { hoy }
