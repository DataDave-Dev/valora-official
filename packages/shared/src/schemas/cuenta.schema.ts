import { z } from 'zod'

/**
 * Datos que el usuario completa al crear una cuenta en el onboarding (paso 3)
 * o más tarde. `nombre` y `saldo_inicial` aplican a todas las cuentas; los
 * campos de tarjeta de crédito (`limite_credito`, `dia_corte`, `dia_pago`)
 * son opcionales y solo relevantes cuando `tipo === 'tarjeta_credito'`.
 * El `tipo` lo fija la UI según la tarjeta de cuenta seleccionada.
 */
/** Trata las cadenas vacías de inputs opcionales como `undefined`. */
const opcionalVacio = (valor: unknown) =>
  valor === '' || valor === null ? undefined : valor

export const cuentaSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(60, 'Máximo 60 caracteres'),
  tipo: z.enum(['efectivo', 'banco', 'tarjeta_credito', 'ahorro', 'inversion'], {
    message: 'Selecciona el tipo de cuenta',
  }),
  saldo_inicial: z.coerce
    .number({ message: 'Ingresa un monto válido' })
    .min(0, 'El saldo no puede ser negativo'),
  limite_credito: z.preprocess(
    opcionalVacio,
    z.coerce
      .number({ message: 'Ingresa un monto válido' })
      .min(0, 'El límite no puede ser negativo')
      .optional(),
  ),
  dia_corte: z.preprocess(
    opcionalVacio,
    z.coerce
      .number({ message: 'Ingresa un día válido' })
      .int('Debe ser un número entero')
      .min(1, 'Entre 1 y 31')
      .max(31, 'Entre 1 y 31')
      .optional(),
  ),
  dia_pago: z.preprocess(
    opcionalVacio,
    z.coerce
      .number({ message: 'Ingresa un día válido' })
      .int('Debe ser un número entero')
      .min(1, 'Entre 1 y 31')
      .max(31, 'Entre 1 y 31')
      .optional(),
  ),
})

export type CuentaFormValues = z.infer<typeof cuentaSchema>
