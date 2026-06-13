import { z } from 'zod'

export const hogarSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  moneda: z
    .string()
    .trim()
    .length(3, 'Código de moneda inválido (ISO 4217)')
    .transform((valor) => valor.toUpperCase())
    .default('MXN'),
  dia_inicio_mes: z.coerce
    .number({ message: 'Ingresa un día válido' })
    .int('Debe ser un número entero')
    .min(1, 'Entre 1 y 31')
    .max(31, 'Entre 1 y 31')
    .default(1),
})

export type HogarFormValues = z.infer<typeof hogarSchema>

export const hogarMiembroSchema = z.object({
  user_id: z.string().uuid('ID de usuario inválido'),
  rol: z.enum(['dueno', 'miembro']).default('miembro'),
})

export type HogarMiembroFormValues = z.infer<typeof hogarMiembroSchema>

export const invitacionHogarSchema = z.object({
  email: z.string().email('Correo inválido'),
  rol: z.enum(['dueno', 'miembro']).default('miembro'),
})

export type InvitacionHogarFormValues = z.infer<typeof invitacionHogarSchema>