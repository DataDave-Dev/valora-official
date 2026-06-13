import { create } from 'zustand'
import { DEFAULT_CATEGORIES, mensajeError } from '@valora/shared'
import type {
  HogarFormValues,
  ICategoriaInsert,
  IHogar,
  IHogarInsert,
  IHogarMiembro,
  IInvitacion,
  IInvitacionAceptada,
  IInvitacionDetalle,
  IProfile,
  RolHogar,
} from '@valora/shared'
import { supabase } from '@/lib/supabase'

/** Devuelve el id del usuario autenticado o lanza si no hay sesión. */
async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id
  if (!userId) throw new Error('No hay una sesión activa.')
  return userId
}

interface IHogaresState {
  /** Hogares de los que el usuario es miembro (con su rol). */
  hogares: IHogar[]
  /** Miembros del hogar seleccionado en la vista de gestión. */
  miembros: IHogarMiembro[]
  /** Invitaciones pendientes del hogar seleccionado. */
  invitaciones: IInvitacion[]
  loading: boolean
  miembrosLoading: boolean
  saving: boolean
  error: string | null

  /** Carga todos los hogares del usuario autenticado. */
  fetchHogares: () => Promise<void>
  /** Crea un hogar y añade al usuario como dueño. Devuelve el hogar creado. */
  addHogar: (values: HogarFormValues) => Promise<IHogar | null>
  /** Actualiza datos del hogar (cualquier miembro según RLS). */
  updateHogar: (id: string, values: Partial<IHogarInsert>) => Promise<boolean>
  /** Elimina un hogar (solo dueño). */
  removeHogar: (id: string) => Promise<boolean>

  /** Carga los miembros (con perfil) de un hogar. */
  fetchMiembros: (hogarId: string) => Promise<void>
  /** Cambia el rol de un miembro (solo dueño). */
  updateRolMiembro: (hogarId: string, userId: string, rol: RolHogar) => Promise<boolean>
  /** Expulsa a un miembro del hogar (solo dueño). */
  removeMiembro: (hogarId: string, userId: string) => Promise<boolean>
  /** El usuario actual abandona el hogar (elimina su propia membresía). */
  abandonarHogar: (hogarId: string) => Promise<boolean>

  /** Carga las invitaciones pendientes de un hogar. */
  fetchInvitaciones: (hogarId: string) => Promise<void>
  /** Crea una invitación por email; devuelve la fila (con su token). */
  crearInvitacion: (hogarId: string, email: string, rol: RolHogar) => Promise<IInvitacion | null>
  /** Cancela (elimina) una invitación pendiente. */
  cancelarInvitacion: (id: string) => Promise<boolean>
  /** Lee el detalle de una invitación por token (página de aceptación). */
  detalleInvitacion: (token: string) => Promise<IInvitacionDetalle | null>
  /** Acepta una invitación por token; refresca la lista de hogares. */
  aceptarInvitacion: (token: string) => Promise<IInvitacionAceptada | null>

  reset: () => void
}

export const useHogaresStore = create<IHogaresState>((set, get) => ({
  hogares: [],
  miembros: [],
  invitaciones: [],
  loading: false,
  miembrosLoading: false,
  saving: false,
  error: null,

  fetchHogares: async () => {
    set({ loading: true, error: null })
    try {
      const userId = await requireUserId()

      const { data, error } = await supabase
        .from('hogar_miembros')
        .select('rol, created_at, hogar:hogares(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const filas = (data ?? []) as unknown as { rol: RolHogar; hogar: IHogar }[]
      const hogares: IHogar[] = filas
        .filter((fila) => fila.hogar != null)
        .map(({ hogar, rol }) => ({ ...hogar, rol_actual: rol, es_dueno: rol === 'dueno' }))

      set({ hogares, loading: false })
    } catch (error) {
      set({ loading: false, error: mensajeError(error, 'No se pudieron cargar los hogares.') })
    }
  },

  addHogar: async (values) => {
    set({ saving: true, error: null })
    try {
      const userId = await requireUserId()

      const { data: hogar, error: errorHogar } = await supabase
        .from('hogares')
        .insert({
          nombre: values.nombre,
          creado_por: userId,
          moneda: values.moneda,
          dia_inicio_mes: values.dia_inicio_mes,
        })
        .select('*')
        .single()

      if (errorHogar) throw errorHogar

      const nuevoHogar = hogar as IHogar

      const { error: errorMiembro } = await supabase
        .from('hogar_miembros')
        .insert({ hogar_id: nuevoHogar.id, user_id: userId, rol: 'dueno' })

      if (errorMiembro) {
        // Compensación: si falla la membresía, deshacemos el hogar huérfano.
        await supabase.from('hogares').delete().eq('id', nuevoHogar.id)
        throw errorMiembro
      }

      // Siembra las categorías predefinidas (misma fuente de verdad que el
      // trigger de registro). A diferencia del alta de usuario, crear un hogar
      // manualmente no dispara ese trigger. Es best-effort: si falla, el hogar
      // queda creado y el usuario puede añadir categorías a mano.
      const categoriasDefault: ICategoriaInsert[] = DEFAULT_CATEGORIES.map((cat) => ({
        hogar_id: nuevoHogar.id,
        nombre: cat.nombre,
        tipo: cat.tipo,
        color: cat.color,
        icono: cat.icono,
        categoria_padre_id: null,
        es_default: true,
      }))
      await supabase.from('categorias').insert(categoriasDefault)

      const conRol: IHogar = { ...nuevoHogar, rol_actual: 'dueno', es_dueno: true }
      set((s) => ({ hogares: [...s.hogares, conRol], saving: false }))
      return conRol
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo crear el hogar.') })
      return null
    }
  },

  updateHogar: async (id, values) => {
    set({ saving: true, error: null })
    try {
      const { data, error } = await supabase
        .from('hogares')
        .update(values)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      const actualizado = data as IHogar
      set((s) => ({
        hogares: s.hogares.map((h) => (h.id === id ? { ...h, ...actualizado } : h)),
        saving: false,
      }))
      return true
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo actualizar el hogar.') })
      return false
    }
  },

  removeHogar: async (id) => {
    set({ error: null })
    try {
      const { error } = await supabase.from('hogares').delete().eq('id', id)
      if (error) throw error

      set((s) => ({ hogares: s.hogares.filter((h) => h.id !== id) }))
      return true
    } catch (error) {
      set({ error: mensajeError(error, 'No se pudo eliminar el hogar.') })
      return false
    }
  },

  fetchMiembros: async (hogarId) => {
    set({ miembrosLoading: true, error: null })
    try {
      const { data: filas, error } = await supabase
        .from('hogar_miembros')
        .select('hogar_id, user_id, rol, created_at')
        .eq('hogar_id', hogarId)
        .order('created_at', { ascending: true })

      if (error) throw error

      const miembrosBase = (filas ?? []) as IHogarMiembro[]
      const ids = miembrosBase.map((m) => m.user_id)

      // El perfil vive en otra tabla sin FK directa con hogar_miembros (ambas
      // referencian auth.users), así que se trae aparte y se fusiona. La RLS
      // de profiles permite a co-miembros leerse entre sí (comparten_hogar).
      let perfiles: Record<string, IProfile> = {}
      if (ids.length > 0) {
        const { data: profs, error: errProf } = await supabase
          .from('profiles')
          .select('*')
          .in('id', ids)
        if (errProf) throw errProf
        perfiles = Object.fromEntries(((profs ?? []) as IProfile[]).map((p) => [p.id, p]))
      }

      const miembros = miembrosBase.map((m) => ({ ...m, profile: perfiles[m.user_id] ?? null }))
      set({ miembros, miembrosLoading: false })
    } catch (error) {
      set({
        miembrosLoading: false,
        error: mensajeError(error, 'No se pudieron cargar los miembros.'),
      })
    }
  },

  updateRolMiembro: async (hogarId, userId, rol) => {
    set({ error: null })
    try {
      const { error } = await supabase
        .from('hogar_miembros')
        .update({ rol })
        .eq('hogar_id', hogarId)
        .eq('user_id', userId)

      if (error) throw error

      set((s) => ({
        miembros: s.miembros.map((m) => (m.user_id === userId ? { ...m, rol } : m)),
      }))
      return true
    } catch (error) {
      set({ error: mensajeError(error, 'No se pudo cambiar el rol.') })
      return false
    }
  },

  removeMiembro: async (hogarId, userId) => {
    set({ error: null })
    try {
      const { error } = await supabase
        .from('hogar_miembros')
        .delete()
        .eq('hogar_id', hogarId)
        .eq('user_id', userId)

      if (error) throw error

      set((s) => ({ miembros: s.miembros.filter((m) => m.user_id !== userId) }))
      return true
    } catch (error) {
      set({ error: mensajeError(error, 'No se pudo eliminar al miembro.') })
      return false
    }
  },

  abandonarHogar: async (hogarId) => {
    set({ error: null })
    try {
      const userId = await requireUserId()
      const { error } = await supabase
        .from('hogar_miembros')
        .delete()
        .eq('hogar_id', hogarId)
        .eq('user_id', userId)

      if (error) throw error

      set((s) => ({ hogares: s.hogares.filter((h) => h.id !== hogarId) }))
      return true
    } catch (error) {
      set({ error: mensajeError(error, 'No se pudo abandonar el hogar.') })
      return false
    }
  },

  fetchInvitaciones: async (hogarId) => {
    set({ error: null })
    try {
      const { data, error } = await supabase
        .from('invitaciones')
        .select('*')
        .eq('hogar_id', hogarId)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ invitaciones: (data ?? []) as IInvitacion[] })
    } catch (error) {
      set({ error: mensajeError(error, 'No se pudieron cargar las invitaciones.') })
    }
  },

  crearInvitacion: async (hogarId, email, rol) => {
    set({ saving: true, error: null })
    try {
      const userId = await requireUserId()
      const { data, error } = await supabase
        .from('invitaciones')
        .insert({
          hogar_id: hogarId,
          email: email.trim().toLowerCase(),
          rol,
          invitado_por: userId,
        })
        .select('*')
        .single()

      if (error) throw error

      const inv = data as IInvitacion
      set((s) => ({ invitaciones: [inv, ...s.invitaciones], saving: false }))
      return inv
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo crear la invitación.') })
      return null
    }
  },

  cancelarInvitacion: async (id) => {
    set({ error: null })
    try {
      const { error } = await supabase.from('invitaciones').delete().eq('id', id)
      if (error) throw error

      set((s) => ({ invitaciones: s.invitaciones.filter((i) => i.id !== id) }))
      return true
    } catch (error) {
      set({ error: mensajeError(error, 'No se pudo cancelar la invitación.') })
      return false
    }
  },

  detalleInvitacion: async (token) => {
    set({ error: null })
    try {
      const { data, error } = await supabase.rpc('detalle_invitacion', { p_token: token })
      if (error) throw error
      return (data as unknown as IInvitacionDetalle | null) ?? null
    } catch (error) {
      set({ error: mensajeError(error, 'No se pudo cargar la invitación.') })
      return null
    }
  },

  aceptarInvitacion: async (token) => {
    set({ saving: true, error: null })
    try {
      const { data, error } = await supabase.rpc('aceptar_invitacion', { p_token: token })
      if (error) throw error

      const resultado = data as unknown as IInvitacionAceptada
      await get().fetchHogares()
      set({ saving: false })
      return resultado
    } catch (error) {
      set({ saving: false, error: mensajeError(error, 'No se pudo aceptar la invitación.') })
      return null
    }
  },

  reset: () =>
    set({
      hogares: [],
      miembros: [],
      invitaciones: [],
      loading: false,
      miembrosLoading: false,
      saving: false,
      error: null,
    }),
}))
