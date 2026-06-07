import { z } from 'zod'

/**
 * Schema del formulario de movimiento recurrente.
 * - `proxima_fecha`: fecha en la que se materializará el próximo movimiento.
 * - `fecha_fin`: tope superior opcional; al pasarlo el recurrente se desactiva.
 * - `dia_del_mes`: se guarda solo para frecuencia `mensual` (1-31) para mostrar
 *   en UI; el cálculo real del siguiente vencimiento usa `proxima_fecha`.
 */
export const recurrenteSchema = z
  .object({
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
    frecuencia: z.enum(['semanal', 'quincenal', 'mensual', 'anual'] as const, {
      message: 'Selecciona la frecuencia',
    }),
    proxima_fecha: z.string().min(1, 'La próxima fecha es obligatoria'),
    fecha_fin: z
      .string()
      .nullable()
      .optional()
      .refine((v) => v == null || v !== '', 'Fecha de fin inválida'),
    dia_del_mes: z
      .number()
      .int('Día inválido')
      .min(1, 'El día debe estar entre 1 y 31')
      .max(31, 'El día debe estar entre 1 y 31')
      .nullable()
      .optional(),
    activa: z.boolean().default(true),
  })
  .refine(
    (v) => {
      if (!v.fecha_fin) return true
      return v.fecha_fin >= v.proxima_fecha
    },
    {
      message: 'La fecha de fin debe ser igual o posterior a la próxima fecha',
      path: ['fecha_fin'],
    },
  )

export type RecurrenteFormValues = z.infer<typeof recurrenteSchema>
