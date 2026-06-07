import { z } from 'zod'

/**
 * Formulario de deuda. La contraparte es texto libre (no es un FK a usuarios
 * ni cuentas: refleja un acuerdo externo, p. ej. un préstamo a un familiar).
 */
export const deudaSchema = z.object({
  tipo: z.enum(['por_cobrar', 'por_pagar'], { message: 'Selecciona el tipo' }),
  contraparte: z
    .string()
    .trim()
    .min(1, 'Indica con quién es la deuda')
    .max(120, 'Máximo 120 caracteres'),
  monto_original: z
    .number({ message: 'El monto es obligatorio' })
    .positive('El monto debe ser mayor que cero'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  fecha_limite: z
    .string()
    .nullable()
    .optional()
    .refine((v) => v == null || v !== '', 'Fecha límite inválida'),
  descripcion: z.string().trim().max(500, 'Máximo 500 caracteres').nullable().optional(),
})

export type DeudaFormValues = z.infer<typeof deudaSchema>

/** Pago parcial o total contra una deuda. */
export const pagoDeudaSchema = z.object({
  monto: z
    .number({ message: 'El monto es obligatorio' })
    .positive('El monto debe ser mayor que cero'),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
})

export type PagoDeudaFormValues = z.infer<typeof pagoDeudaSchema>
