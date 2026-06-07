import { z } from 'zod'

/** Un requisito de contraseña con su prueba. Fuente de verdad de la política. */
export interface PasswordRequirement {
  id: string
  /** Texto en español para el checklist de la UI. */
  label: string
  test: (value: string) => boolean
}

/**
 * Política de contraseña estándar (debe mantenerse alineada con
 * `password_requirements` y `minimum_password_length` en supabase/config.toml:
 * `lower_upper_letters_digits_symbols`, mínimo 8).
 */
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'length', label: 'Al menos 8 caracteres', test: (v) => v.length >= 8 },
  { id: 'uppercase', label: 'Una letra mayúscula', test: (v) => /[A-Z]/.test(v) },
  { id: 'lowercase', label: 'Una letra minúscula', test: (v) => /[a-z]/.test(v) },
  { id: 'number', label: 'Un número', test: (v) => /[0-9]/.test(v) },
  { id: 'special', label: 'Un carácter especial (!@#$…)', test: (v) => /[^A-Za-z0-9]/.test(v) },
]

export interface PasswordRequirementStatus extends PasswordRequirement {
  cumple: boolean
}

/** Evalúa cada requisito para mostrar un checklist en vivo. */
export function evaluarPassword(value: string): PasswordRequirementStatus[] {
  return PASSWORD_REQUIREMENTS.map((r) => ({ ...r, cumple: r.test(value) }))
}

/** true si la contraseña cumple todos los requisitos. */
export function esPasswordSegura(value: string): boolean {
  return PASSWORD_REQUIREMENTS.every((r) => r.test(value))
}

/** Schema de contraseña: agrega un issue por cada requisito no cumplido. */
export const passwordSchema = z.string().superRefine((value, ctx) => {
  for (const r of PASSWORD_REQUIREMENTS) {
    if (!r.test(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: r.label })
    }
  }
})

/** Schema del formulario de registro (correo + contraseña segura). */
export const registroSchema = z.object({
  email: z.string().trim().min(1, 'El correo es obligatorio').email('Correo inválido'),
  password: passwordSchema,
})

export type RegistroFormValues = z.infer<typeof registroSchema>
