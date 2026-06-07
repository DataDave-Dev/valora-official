import { z } from 'zod'

export const presupuestoSchema = z.object({
  categoria_id: z.string().uuid('Selecciona una categoría'),
  monto_limite: z
    .number({ message: 'El límite es obligatorio' })
    .positive('El límite debe ser mayor que cero'),
  mes: z.number().int().min(1).max(12),
  anio: z.number().int().min(2000).max(2100),
})

export type PresupuestoFormValues = z.infer<typeof presupuestoSchema>
