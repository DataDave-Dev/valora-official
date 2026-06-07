import { z } from 'zod'

export const metaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(60, 'Máximo 60 caracteres'),
  /** Cuenta de tipo 'ahorro' que respalda la meta (el trigger lo valida en BD). */
  cuenta_ahorro_id: z.string().uuid('Selecciona la cuenta de ahorro'),
  monto_objetivo: z
    .number({ message: 'El monto objetivo es obligatorio' })
    .positive('El objetivo debe ser mayor que cero'),
  fecha_limite: z.string().nullable().optional(),
})

export type MetaFormValues = z.infer<typeof metaSchema>

/**
 * Esquema para abonar a (o retirar de) una meta. Un abono/retiro es una
 * transferencia entre la cuenta de ahorro de la meta y otra cuenta del hogar:
 * `cuenta_id` es esa otra cuenta (origen del dinero al abonar, destino al
 * retirar). La dirección la decide la operación, no el formulario.
 */
export const abonoSchema = z.object({
  monto: z
    .number({ message: 'El monto es obligatorio' })
    .positive('El monto debe ser mayor que cero'),
  cuenta_id: z.string().uuid('Selecciona la cuenta'),
})

export type AbonoFormValues = z.infer<typeof abonoSchema>
