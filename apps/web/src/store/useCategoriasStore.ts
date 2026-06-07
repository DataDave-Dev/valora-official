import { create } from 'zustand'
import { mensajeError } from '@valora/shared'
import type {
  CategoriaFormValues,
  ICategoria,
  ICategoriaInsert,
  ICategoriaUpdate,
  SubcategoriaFormValues,
} from '@valora/shared'
import { supabase } from '@/lib/supabase'

/** Categoría raíz con sus subcategorías ya agrupadas. */
export interface ICategoriaConSub extends ICategoria {
  subcategorias: ICategoria[]
}

interface ICategoriasState {
  categorias: ICategoria[]
  loading: boolean
  saving: boolean
  error: string | null
  fetchCategorias: (hogarId: string) => Promise<void>
  /** Crea una categoría raíz personalizada. */
  addCategoria: (hogarId: string, values: CategoriaFormValues) => Promise<boolean>
  /** Crea una subcategoría que hereda tipo/color/icono del padre. */
  addSubcategoria: (
    hogarId: string,
    padre: ICategoria,
    values: SubcategoriaFormValues,
  ) => Promise<boolean>
  /** Actualiza una categoría raíz o subcategoría (nombre, color, icono, tipo). */
  updateCategoria: (id: string, values: CategoriaFormValues) => Promise<boolean>
  /** Renombra una subcategoría (las subcategorías solo exponen el nombre). */
  renameSubcategoria: (id: string, nombre: string) => Promise<boolean>
  /** Elimina una categoría o subcategoría. */
  removeCategoria: (id: string) => Promise<boolean>
  /**
   * Cuenta los movimientos asociados a una o varias categorías. Se usa para
   * bloquear el borrado de categorías con historial (los IDs incluyen las
   * subcategorías cuando se borra una raíz).
   */
  contarMovimientos: (categoriaIds: string[]) => Promise<number>
  reset: () => void
}

export const useCategoriasStore = create<ICategoriasState>((set, get) => ({
  categorias: [],
  loading: false,
  saving: false,
  error: null,

  fetchCategorias: async (hogarId) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('hogar_id', hogarId)
        .order('nombre', { ascending: true })
      if (error) throw error

      set({ categorias: (data ?? []) as ICategoria[], loading: false })
    } catch (error) {
      set({ loading: false, error: mensajeError(error, 'No se pudieron cargar las categorías.') })
    }
  },

  addCategoria: async (hogarId, values) => {
    set({ saving: true, error: null })
    try {
      const payload: ICategoriaInsert = {
        hogar_id: hogarId,
        nombre: values.nombre,
        tipo: values.tipo,
        color: values.color,
        icono: values.icono,
        categoria_padre_id: null,
        es_default: false,
      }
      const { data, error } = await supabase
        .from('categorias')
        .insert(payload)
        .select('*')
        .single()
      if (error) throw error

      set({ categorias: [...get().categorias, data as ICategoria], saving: false })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo crear la categoría.') })
      return false
    }
  },

  addSubcategoria: async (hogarId, padre, values) => {
    set({ saving: true, error: null })
    try {
      const payload: ICategoriaInsert = {
        hogar_id: hogarId,
        nombre: values.nombre,
        tipo: padre.tipo,
        color: padre.color,
        icono: padre.icono,
        categoria_padre_id: padre.id,
        es_default: false,
      }
      const { data, error } = await supabase
        .from('categorias')
        .insert(payload)
        .select('*')
        .single()
      if (error) throw error

      set({ categorias: [...get().categorias, data as ICategoria], saving: false })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo crear la subcategoría.') })
      return false
    }
  },

  updateCategoria: async (id, values) => {
    set({ saving: true, error: null })
    try {
      const payload: ICategoriaUpdate = {
        nombre: values.nombre,
        tipo: values.tipo,
        color: values.color,
        icono: values.icono,
      }
      const { data, error } = await supabase
        .from('categorias')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error

      const actualizada = data as ICategoria
      set({
        categorias: get().categorias.map((c) => (c.id === id ? actualizada : c)),
        saving: false,
      })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo actualizar la categoría.') })
      return false
    }
  },

  renameSubcategoria: async (id, nombre) => {
    set({ saving: true, error: null })
    try {
      const { data, error } = await supabase
        .from('categorias')
        .update({ nombre })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error

      const actualizada = data as ICategoria
      set({
        categorias: get().categorias.map((c) => (c.id === id ? actualizada : c)),
        saving: false,
      })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo renombrar la subcategoría.') })
      return false
    }
  },

  removeCategoria: async (id) => {
    set({ saving: true, error: null })
    try {
      const { error } = await supabase.from('categorias').delete().eq('id', id)
      if (error) throw error

      set({
        // Quita la categoría y cualquier subcategoría que colgase de ella.
        categorias: get().categorias.filter((c) => c.id !== id && c.categoria_padre_id !== id),
        saving: false,
      })
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo eliminar la categoría.') })
      return false
    }
  },

  contarMovimientos: async (categoriaIds) => {
    if (categoriaIds.length === 0) return 0
    const { count, error } = await supabase
      .from('movimientos')
      .select('id', { count: 'exact', head: true })
      .in('categoria_id', categoriaIds)
    if (error) throw error
    return count ?? 0
  },

  reset: () => set({ categorias: [], loading: false, saving: false, error: null }),
}))

/** Agrupa una lista plana de categorías en raíces con sus subcategorías. */
export function agruparPorPadre(categorias: ICategoria[]): ICategoriaConSub[] {
  const raices = categorias.filter((c) => c.categoria_padre_id === null)
  const hijasPorPadre = new Map<string, ICategoria[]>()
  for (const c of categorias) {
    if (!c.categoria_padre_id) continue
    const lista = hijasPorPadre.get(c.categoria_padre_id) ?? []
    lista.push(c)
    hijasPorPadre.set(c.categoria_padre_id, lista)
  }
  return raices.map((raiz) => ({
    ...raiz,
    subcategorias: hijasPorPadre.get(raiz.id) ?? [],
  }))
}
