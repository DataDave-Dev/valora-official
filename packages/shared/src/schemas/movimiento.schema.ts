import { z } from 'zod'
import type { EstadoMovimiento } from '../types/domain'

export const movimientoSchema = z.object({
  tipo: z.enum(['ingreso', 'gasto'], { message: 'Selecciona el tipo' }),
  monto: z
    .number({ message: 'El monto es obligatorio' })
    .positive('El monto debe ser mayor que cero'),
  descripcion: z
    .string()
    .trim()
    .min(1, 'La descripción es obligatoria')
    .max(120, 'Máximo 120 caracteres'),
  cuenta_id: z.string().uuid('Selecciona una cuenta'),
  categoria_id: z.string().uuid('Selecciona una categoría').nullable(),
  fecha: z.string().min(1, 'La fecha es obligatoria'),
  notas: z.string().trim().max(500, 'Máximo 500 caracteres').nullable().optional(),
  /**
   * `confirmado` por defecto; los movimientos generados por recurrentes
   * nacen como `pendiente` hasta que el usuario los confirma o descarta.
   * La BD solo permite estos dos valores (ver CHECK en schema.sql).
   */
  estado: z.enum(['confirmado', 'pendiente']).default('confirmado'),
  /** IDs de etiquetas a vincular. Vacío = sin etiquetas. */
  etiquetaIds: z.array(z.string().uuid()).default([]),
})

export type MovimientoFormValues = z.infer<typeof movimientoSchema>
export type { EstadoMovimiento }
