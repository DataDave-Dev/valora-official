import { z } from 'zod'

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(40, 'Máximo 40 caracteres'),
  tipo: z.enum(['ingreso', 'gasto'], { message: 'Selecciona el tipo' }),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido (formato #rrggbb)'),
  icono: z.string().trim().min(1, 'Selecciona un icono'),
})

export type CategoriaFormValues = z.infer<typeof categoriaSchema>

/**
 * Subcategoría de un nivel: hereda `tipo`, `color` e `icono` de su categoría
 * padre, así que el formulario solo pide el nombre. El `categoria_padre_id`
 * lo aporta la UI según la categoría desde la que se añade.
 */
export const subcategoriaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(40, 'Máximo 40 caracteres'),
})

export type SubcategoriaFormValues = z.infer<typeof subcategoriaSchema>
