import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { IHogar } from '@valora/shared'

const STORAGE_KEY = 'valora:hogar-activo'

/** Datos mínimos del hogar activo que el resto de la app necesita. */
export interface IHogarActivo {
  id: string
  nombre: string
  moneda: string
  dia_inicio_mes: number
}

interface IHogarState {
  hogar: IHogarActivo | null
  loading: boolean
  error: string | null
  /** Establece el hogar activo (y lo persiste). */
  setHogarActivo: (hogar: IHogarActivo | null) => void
  /** Carga el hogar activo desde localStorage o resuelve el primero disponible. */
  inicializarHogarActivo: (hogaresDisponibles: IHogar[]) => Promise<void>
  reset: () => void
}

export const useHogarStore = create<IHogarState>()(
  persist(
    (set, get) => ({
      hogar: null,
      loading: false,
      error: null,

      setHogarActivo: (hogar) => {
        set({ hogar })
      },

      inicializarHogarActivo: async (hogaresDisponibles) => {
        const almacenado = get().hogar
        if (almacenado && hogaresDisponibles.some((h) => h.id === almacenado.id)) {
          set({ loading: false })
          return
        }

        const primero = hogaresDisponibles[0]
        if (primero) {
          const hogarActivo: IHogarActivo = {
            id: primero.id,
            nombre: primero.nombre,
            moneda: primero.moneda,
            dia_inicio_mes: primero.dia_inicio_mes,
          }
          set({ hogar: hogarActivo, loading: false })
        } else {
          set({ hogar: null, loading: false })
        }
      },

      reset: () => set({ hogar: null, loading: false, error: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ hogar: state.hogar }),
    },
  ),
)

export function selectHogarActivo(state: IHogarState): IHogarActivo | null {
  return state.hogar
}