import { z } from 'zod'

/**
 * Esquema para crear/editar una etiqueta. La unicidad del nombre por hogar la
 * garantiza la BD (`unique (hogar_id, nombre)`); la app traduce la violación a
 * un mensaje legible (ver `useEtiquetasStore`).
 */
export const etiquetaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(40, 'Máximo 40 caracteres'),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Color inválido'),
})

export type EtiquetaFormValues = z.infer<typeof etiquetaSchema>
