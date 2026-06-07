import { z } from 'zod'

/**
 * Datos que el usuario completa en el paso "Perfil" del onboarding.
 * Solo recoge lo esencial; el resto de campos de `profiles`
 * (avatar, teléfono, fecha de nacimiento, notificaciones) se editan
 * más tarde en Ajustes. `onboarding_completo` lo fija el wizard al cerrar.
 */
export const perfilSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(60, 'Máximo 60 caracteres'),
  apellido_paterno: z
    .string()
    .trim()
    .max(60, 'Máximo 60 caracteres')
    .optional()
    .or(z.literal('')),
  apellido_materno: z
    .string()
    .trim()
    .max(60, 'Máximo 60 caracteres')
    .optional()
    .or(z.literal('')),
  tema: z.enum(['claro', 'oscuro', 'sistema'], { message: 'Selecciona un tema' }),
})

export type PerfilFormValues = z.infer<typeof perfilSchema>
