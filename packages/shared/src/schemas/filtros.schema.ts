import { z } from 'zod'

/** Rango de años aceptado para el filtro de período. */
export const ANIO_MIN = 2000
export const ANIO_MAX = 2100

/**
 * Filtros de la lista de movimientos. El período (año + mes) es OBLIGATORIO:
 * las transacciones siempre se consultan acotadas a un mes. `tipo` y `cuenta_id`
 * son refinamientos opcionales. Este schema es la fuente única de validación y
 * lo reusan tanto el formulario (front) como el store antes de consultar (back).
 */
export const filtrosMovimientosSchema = z.object({
  anio: z
    .number({ message: 'El año es obligatorio' })
    .int('Año inválido')
    .min(ANIO_MIN, `El año debe ser ${ANIO_MIN} o posterior`)
    .max(ANIO_MAX, `El año debe ser ${ANIO_MAX} o anterior`),
  mes: z
    .number({ message: 'El mes es obligatorio' })
    .int('Mes inválido')
    .min(1, 'El mes debe estar entre 1 y 12')
    .max(12, 'El mes debe estar entre 1 y 12'),
  tipo: z.enum(['ingreso', 'gasto']).nullable().optional(),
  cuenta_id: z.string().uuid('Cuenta inválida').nullable().optional(),
  etiqueta_id: z.string().uuid('Etiqueta inválida').nullable().optional(),
  estado: z.enum(['confirmado', 'pendiente']).nullable().optional(),
})

export type FiltrosMovimientos = z.infer<typeof filtrosMovimientosSchema>
