import { create } from 'zustand'
import { filtrosMovimientosSchema, mensajeError, rangoDelMes } from '@valora/shared'
import type {
  FiltrosMovimientos,
  IEtiqueta,
  IMovimiento,
  IMovimientoInsert,
  IMovimientoUpdate,
  MovimientoFormValues,
} from '@valora/shared'
import { supabase } from '@/lib/supabase'

/** Tamaño de página para la paginación de movimientos (de 20 en 20 según spec). */
const PAGE_SIZE = 20

interface IMovimientosState {
  /** Todos los movimientos del hogar (necesarios para calcular saldos). */
  movimientos: IMovimiento[]
  loading: boolean
  saving: boolean
  error: string | null
  /** Movimientos del período/filtros aplicados en la vista de Movimientos. */
  movimientosFiltrados: IMovimiento[]
  loadingFiltrados: boolean
  errorFiltrados: string | null
  /** Mapa `movimiento_id → etiquetas aplicadas`. */
  etiquetasPorMovimiento: Record<string, IEtiqueta[]>
  /** Filtros activos en la última consulta (necesarios para "cargar más"). */
  filtrosActivos: FiltrosMovimientos | null
  /** Hay más resultados por cargar en el período actual. */
  hasMore: boolean
  /** Cargando una página adicional (no la primera). */
  loadingMore: boolean
  /** Devuelve los IDs de los movimientos que ya hay cargados (paginación). */
  loadedIds: Set<string>
  fetchMovimientos: (hogarId: string) => Promise<void>
  /**
   * Carga la primera página de movimientos del período (año+mes obligatorios)
   * y filtros dados. Reinicia la paginación.
   */
  fetchMovimientosFiltrados: (hogarId: string, filtros: FiltrosMovimientos) => Promise<void>
  /** Carga la siguiente página respetando los filtros activos. */
  cargarMas: (hogarId: string) => Promise<void>
  addMovimiento: (hogarId: string, values: MovimientoFormValues) => Promise<boolean>
  /** Actualiza un movimiento existente (diff de etiquetas incluido). */
  updateMovimiento: (id: string, values: MovimientoFormValues) => Promise<boolean>
  /** Borra un movimiento (las etiquetas caen por CASCADE en la BD). */
  removeMovimiento: (id: string) => Promise<boolean>
  reset: () => void
}

/** Tipo de la fila que devuelve PostgREST con el join de `etiquetas(*)`. */
type IMovimientoEtiquetaJoin = {
  movimiento_id: string
  etiquetas: IEtiqueta | null
}

/** Devuelve el mapa `movimientoId → IEtiqueta[]` para los ids dados. Vacío si no hay ids. */
async function cargarEtiquetasDeMovimientos(
  movimientoIds: string[],
): Promise<Record<string, IEtiqueta[]>> {
  const resultado: Record<string, IEtiqueta[]> = {}
  if (movimientoIds.length === 0) return resultado

  const { data, error } = await supabase
    .from('movimiento_etiquetas')
    .select('movimiento_id, etiquetas(*)')
    .in('movimiento_id', movimientoIds)
  if (error) throw error

  for (const fila of (data ?? []) as unknown as IMovimientoEtiquetaJoin[]) {
    if (!fila.etiquetas) continue
    const lista = resultado[fila.movimiento_id] ?? []
    lista.push(fila.etiquetas)
    resultado[fila.movimiento_id] = lista
  }
  return resultado
}

/** Inserta los vínculos movimiento↔etiqueta; si algo falla, propaga el error. */
async function vincularEtiquetas(
  movimientoId: string,
  etiquetaIds: string[],
): Promise<void> {
  if (etiquetaIds.length === 0) return
  const filas = etiquetaIds.map((etiqueta_id) => ({
    movimiento_id: movimientoId,
    etiqueta_id,
  }))
  const { error } = await supabase.from('movimiento_etiquetas').insert(filas)
  if (error) throw error
}

/**
 * Reconcilia etiquetas: deja la relación `movimiento_id` con exactamente
 * `deseadas`. Borra las que sobran e inserta las que faltan.
 */
async function reconciliarEtiquetas(
  movimientoId: string,
  deseadas: string[],
): Promise<Record<string, IEtiqueta[]>> {
  const { data: actuales, error: errActuales } = await supabase
    .from('movimiento_etiquetas')
    .select('etiqueta_id')
    .eq('movimiento_id', movimientoId)
  if (errActuales) throw errActuales

  const actualesIds = new Set((actuales ?? []).map((r) => r.etiqueta_id))
  const deseadasSet = new Set(deseadas)

  const aBorrar = [...actualesIds].filter((id) => !deseadasSet.has(id))
  const aInsertar = deseadas.filter((id) => !actualesIds.has(id))

  if (aBorrar.length > 0) {
    const { error: errDel } = await supabase
      .from('movimiento_etiquetas')
      .delete()
      .eq('movimiento_id', movimientoId)
      .in('etiqueta_id', aBorrar)
    if (errDel) throw errDel
  }
  if (aInsertar.length > 0) {
    await vincularEtiquetas(movimientoId, aInsertar)
  }
  return cargarEtiquetasDeMovimientos([movimientoId])
}

/** Aplica la paginación con `range()` de Supabase a un query base. */
function conPaginacion(
  query: ReturnType<typeof supabase.from>,
  loadedCount: number,
  pageSize: number,
) {
  return query.range(loadedCount, loadedCount + pageSize - 1)
}

/** Resuelve el set de IDs que se deben usar como filtro `.in('id', ...)`. */
async function resolverIdsPorEtiqueta(etiquetaId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('movimiento_etiquetas')
    .select('movimiento_id')
    .eq('etiqueta_id', etiquetaId)
  if (error) throw error
  return (data ?? []).map((r) => r.movimiento_id)
}

export const useMovimientosStore = create<IMovimientosState>((set, get) => ({
  movimientos: [],
  loading: false,
  saving: false,
  error: null,
  movimientosFiltrados: [],
  loadingFiltrados: false,
  errorFiltrados: null,
  etiquetasPorMovimiento: {},
  filtrosActivos: null,
  hasMore: false,
  loadingMore: false,
  loadedIds: new Set(),

  fetchMovimientos: async (hogarId) => {
    set({ loading: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error('No hay una sesión activa.')

      const { data, error } = await supabase
        .from('movimientos')
        .select('*')
        .eq('hogar_id', hogarId)
        .order('fecha', { ascending: false })
      if (error) throw error

      const movimientos = (data ?? []) as IMovimiento[]
      const mapa = await cargarEtiquetasDeMovimientos(movimientos.map((m) => m.id))
      set({ movimientos, loading: false, etiquetasPorMovimiento: mapa })
    } catch (error) {
      set({ loading: false, error: mensajeError(error, 'No se pudieron cargar los movimientos.') })
    }
  },

  fetchMovimientosFiltrados: async (hogarId, filtros) => {
    const parsed = filtrosMovimientosSchema.safeParse(filtros)
    if (!parsed.success) {
      set({
        loadingFiltrados: false,
        errorFiltrados: parsed.error.issues[0]?.message ?? 'Filtros inválidos.',
      })
      return
    }
    const f = parsed.data

    set({
      loadingFiltrados: true,
      errorFiltrados: null,
      movimientosFiltrados: [],
      filtrosActivos: f,
      loadedIds: new Set(),
      hasMore: false,
    })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error('No hay una sesión activa.')

      // Si hay etiqueta, resolvemos primero los movimiento_ids que la llevan
      // para no traer todo el mes y filtrar en cliente. RLS ya acota por hogar.
      let idsPorEtiqueta: string[] | null = null
      if (f.etiqueta_id) {
        const ids = await resolverIdsPorEtiqueta(f.etiqueta_id)
        if (ids.length === 0) {
          set({ movimientosFiltrados: [], loadingFiltrados: false, hasMore: false })
          return
        }
        idsPorEtiqueta = ids
      }

      const { desde, hasta } = rangoDelMes({ mes: f.mes, anio: f.anio })
      let query = supabase
        .from('movimientos')
        .select('*')
        .eq('hogar_id', hogarId)
        .gte('fecha', desde)
        .lte('fecha', hasta)
      if (f.tipo) query = query.eq('tipo', f.tipo)
      if (f.estado) query = query.eq('estado', f.estado)
      if (f.cuenta_id) query = query.eq('cuenta_id', f.cuenta_id)
      if (idsPorEtiqueta) query = query.in('id', idsPorEtiqueta)
      query = conPaginacion(query.order('fecha', { ascending: false }), 0, PAGE_SIZE)

      const { data, error } = await query
      if (error) throw error

      const movimientos = (data ?? []) as IMovimiento[]
      const mapa = await cargarEtiquetasDeMovimientos(movimientos.map((m) => m.id))
      const loadedIds = new Set(movimientos.map((m) => m.id))

      set((s) => ({
        movimientosFiltrados: movimientos,
        loadingFiltrados: false,
        hasMore: movimientos.length === PAGE_SIZE,
        loadedIds,
        etiquetasPorMovimiento: { ...s.etiquetasPorMovimiento, ...mapa },
      }))
    } catch (error) {
      set({
        loadingFiltrados: false,
        errorFiltrados: mensajeError(error, 'No se pudieron cargar los movimientos.'),
      })
    }
  },

  cargarMas: async (hogarId) => {
    const { filtrosActivos, hasMore, loadingMore, loadedIds } = get()
    if (!filtrosActivos || !hasMore || loadingMore) return

    set({ loadingMore: true })
    try {
      const f = filtrosActivos
      let idsPorEtiqueta: string[] | null = null
      if (f.etiqueta_id) {
        const ids = await resolverIdsPorEtiqueta(f.etiqueta_id)
        if (ids.length === 0) {
          set({ loadingMore: false, hasMore: false })
          return
        }
        idsPorEtiqueta = ids
      }

      const { desde, hasta } = rangoDelMes({ mes: f.mes, anio: f.anio })
      let query = supabase
        .from('movimientos')
        .select('*')
        .eq('hogar_id', hogarId)
        .gte('fecha', desde)
        .lte('fecha', hasta)
      if (f.tipo) query = query.eq('tipo', f.tipo)
      if (f.estado) query = query.eq('estado', f.estado)
      if (f.cuenta_id) query = query.eq('cuenta_id', f.cuenta_id)
      if (idsPorEtiqueta) query = query.in('id', idsPorEtiqueta)
      query = conPaginacion(query.order('fecha', { ascending: false }), loadedIds.size, PAGE_SIZE)

      const { data, error } = await query
      if (error) throw error

      const nuevos = (data ?? []) as IMovimiento[]
      // Evita duplicados si el front llamó cargarMas dos veces en rápida sucesión.
      const filtrados = nuevos.filter((m) => !loadedIds.has(m.id))
      const mapa = await cargarEtiquetasDeMovimientos(filtrados.map((m) => m.id))

      set((s) => {
        const nextIds = new Set(s.loadedIds)
        for (const m of filtrados) nextIds.add(m.id)
        return {
          movimientosFiltrados: [...s.movimientosFiltrados, ...filtrados],
          loadingMore: false,
          hasMore: nuevos.length === PAGE_SIZE,
          loadedIds: nextIds,
          etiquetasPorMovimiento: { ...s.etiquetasPorMovimiento, ...mapa },
        }
      })
    } catch (error) {
      set({ loadingMore: false, errorFiltrados: mensajeError(error, 'No se pudieron cargar más movimientos.') })
    }
  },

  addMovimiento: async (hogarId, values) => {
    set({ saving: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) throw new Error('No hay una sesión activa.')

      const payload: IMovimientoInsert = {
        hogar_id: hogarId,
        creado_por: userId,
        estado: values.estado ?? 'confirmado',
        recurrente_id: null,
        tipo: values.tipo,
        monto: values.monto,
        descripcion: values.descripcion,
        cuenta_id: values.cuenta_id,
        categoria_id: values.categoria_id ?? null,
        fecha: values.fecha,
        notas: values.notas ?? null,
      }
      const { data, error } = await supabase
        .from('movimientos')
        .insert(payload)
        .select('*')
        .single()
      if (error) throw error

      const nuevo = data as IMovimiento
      const etiquetaIds = values.etiquetaIds ?? []
      await vincularEtiquetas(nuevo.id, etiquetaIds)

      let mapaActualizado = get().etiquetasPorMovimiento
      if (etiquetaIds.length > 0) {
        mapaActualizado = await cargarEtiquetasDeMovimientos([nuevo.id])
        mapaActualizado = { ...get().etiquetasPorMovimiento, ...mapaActualizado }
      }

      set({
        movimientos: [nuevo, ...get().movimientos],
        saving: false,
        etiquetasPorMovimiento: mapaActualizado,
      })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo guardar el movimiento.') })
      return false
    }
  },

  updateMovimiento: async (id, values) => {
    set({ saving: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error('No hay una sesión activa.')

      const patch: IMovimientoUpdate = {
        tipo: values.tipo,
        monto: values.monto,
        descripcion: values.descripcion,
        cuenta_id: values.cuenta_id,
        categoria_id: values.categoria_id ?? null,
        fecha: values.fecha,
        notas: values.notas ?? null,
        estado: values.estado ?? 'confirmado',
      }
      const { data, error } = await supabase
        .from('movimientos')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error

      const actualizado = data as IMovimiento
      const mapaEtiquetas = await reconciliarEtiquetas(id, values.etiquetaIds ?? [])

      set((s) => {
        // Conservamos el resto del mapa y sobreescribimos la entrada de este mov.
        // Quitamos también cualquier clave "huérfana" por si viene vacía.
        const next = { ...s.etiquetasPorMovimiento, ...mapaEtiquetas }
        if ((values.etiquetaIds ?? []).length === 0) delete next[id]
        return {
          movimientos: s.movimientos.map((m) => (m.id === id ? actualizado : m)),
          movimientosFiltrados: s.movimientosFiltrados.map((m) => (m.id === id ? actualizado : m)),
          etiquetasPorMovimiento: next,
          saving: false,
        }
      })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo actualizar el movimiento.') })
      return false
    }
  },

  removeMovimiento: async (id) => {
    set({ saving: true, error: null })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) throw new Error('No hay una sesión activa.')

      const { error } = await supabase.from('movimientos').delete().eq('id', id)
      if (error) throw error

      set((s) => {
        const next = { ...s.etiquetasPorMovimiento }
        delete next[id]
        const nextIds = new Set(s.loadedIds)
        nextIds.delete(id)
        return {
          movimientos: s.movimientos.filter((m) => m.id !== id),
          movimientosFiltrados: s.movimientosFiltrados.filter((m) => m.id !== id),
          etiquetasPorMovimiento: next,
          loadedIds: nextIds,
          saving: false,
        }
      })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo eliminar el movimiento.') })
      return false
    }
  },

  reset: () =>
    set({
      movimientos: [],
      loading: false,
      saving: false,
      error: null,
      movimientosFiltrados: [],
      loadingFiltrados: false,
      errorFiltrados: null,
      etiquetasPorMovimiento: {},
      filtrosActivos: null,
      hasMore: false,
      loadingMore: false,
      loadedIds: new Set(),
    }),
}))
