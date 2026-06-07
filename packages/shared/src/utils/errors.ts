/**
 * Extrae un mensaje legible de un error desconocido.
 * Si el error es una instancia de `Error` usa su `message`; en cualquier otro
 * caso devuelve el `fallback` proporcionado.
 */
export function mensajeError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  return fallback
}
