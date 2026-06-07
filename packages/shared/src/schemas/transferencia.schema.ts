import { z } from 'zod'

/**
 * Datos de una transferencia entre dos cuentas del hogar. El monto es positivo
 * y las cuentas deben ser distintas (el CHECK de Postgres y el trigger
 * `validar_hogar_transferencia` lo refuerzan en la BD). El caso "pago de
 * tarjeta" es una transferencia normal banco → tarjeta_credito, sin lógica
 * especial.
 */
export const transferenciaSchema = z
  .object({
    cuenta_origen: z.string().uuid('Selecciona la cuenta de origen'),
    cuenta_destino: z.string().uuid('Selecciona la cuenta de destino'),
    monto: z
      .number({ message: 'El monto es obligatorio' })
      .positive('El monto debe ser mayor que cero'),
    fecha: z.string().min(1, 'La fecha es obligatoria'),
    descripcion: z.string().trim().max(120, 'Máximo 120 caracteres').nullable().optional(),
  })
  .refine((data) => data.cuenta_origen !== data.cuenta_destino, {
    message: 'La cuenta de origen y la de destino deben ser distintas',
    path: ['cuenta_destino'],
  })

export type TransferenciaFormValues = z.infer<typeof transferenciaSchema>
