import { addDays, addMonths, addYears, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import type { FrecuenciaRecurrente } from '../types/domain'

/** Período mes/año seleccionado en la app (mes 1-12). */
export interface Periodo {
  mes: number
  anio: number
}

/** Período del mes actual. */
export function periodoActual(reference: Date = new Date()): Periodo {
  return { mes: reference.getMonth() + 1, anio: reference.getFullYear() }
}

/**
 * Rango de fechas [desde, hasta] de un período, como strings 'yyyy-MM-dd'
 * (formato de la columna `fecha`). Útil para filtrar movimientos en Supabase.
 */
export function rangoDelMes({ mes, anio }: Periodo): { desde: string; hasta: string } {
  const inicio = startOfMonth(new Date(anio, mes - 1, 1))
  const fin = endOfMonth(inicio)
  return {
    desde: format(inicio, 'yyyy-MM-dd'),
    hasta: format(fin, 'yyyy-MM-dd'),
  }
}

/**
 * true si una fecha (columna `date`, formato 'yyyy-MM-dd') cae dentro del
 * período. Compara por string contra `rangoDelMes` (exacto para columnas
 * `date`) — evita `new Date(fecha)`, que parsea en UTC y desplaza el día en
 * zonas horarias negativas. Fuente única del filtrado por mes.
 */
export function esDelPeriodo(fecha: string, periodo: Periodo): boolean {
  const { desde, hasta } = rangoDelMes(periodo)
  const dia = fecha.slice(0, 10)
  return dia >= desde && dia <= hasta
}

/** Etiqueta legible de un período, p. ej. "mayo 2026". */
export function etiquetaPeriodo({ mes, anio }: Periodo): string {
  return format(new Date(anio, mes - 1, 1), 'LLLL yyyy', { locale: es })
}

/**
 * Los últimos `n` períodos (incluyendo el de referencia), del más antiguo
 * al más reciente. Base de la gráfica de barras de 6 meses.
 */
export function ultimosMeses(n: number, reference: Date = new Date()): Periodo[] {
  const periodos: Periodo[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = subMonths(reference, i)
    periodos.push({ mes: d.getMonth() + 1, anio: d.getFullYear() })
  }
  return periodos
}

/** Etiqueta corta de un período para ejes de gráficas, p. ej. "may 26". */
export function etiquetaCorta({ mes, anio }: Periodo): string {
  return format(new Date(anio, mes - 1, 1), 'LLL yy', { locale: es })
}

/**
 * Fecha legible y corta a partir de un string 'yyyy-MM-dd' (formato de la
 * columna `fecha`), p. ej. "24 oct 2023". Pensada para listas de movimientos.
 */
export function formatFechaCorta(fecha: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${fecha}T00:00:00`))
}

/**
 * Avanza una fecha según la periodicidad de un movimiento recurrente.
 * Reglas:
 * - `semanal`:  +7 días
 * - `quincenal`: +14 días (no día 1 / 15: va a 14 días desde la fecha dada)
 * - `mensual`:  mismo día del mes siguiente; si el mes no lo tiene, se usa el
 *               último día del mes (p. ej. 31-mar → 30-abr)
 * - `anual`:    +1 año
 *
 * Devuelve la fecha en formato `yyyy-MM-dd` (columna `date` de la BD).
 */
export function siguienteFechaRecurrente(
  fechaActual: string,
  frecuencia: FrecuenciaRecurrente,
): string {
  // Parseo local para evitar el desplazamiento UTC de `new Date('yyyy-MM-dd')`
  // (que se interpreta como UTC y puede devolver el día anterior en MX).
  const [y, m, d] = fechaActual.split('-').map(Number) as [number, number, number]
  const ref = new Date(y, m - 1, d)
  let next: Date
  switch (frecuencia) {
    case 'semanal':
      next = addDays(ref, 7)
      break
    case 'quincenal':
      next = addDays(ref, 14)
      break
    case 'mensual': {
      // Tomamos como "día objetivo" el original; si el mes destino no lo
      // tiene, `Date` lo normaliza al último día (p. ej. día 31 → 28/29/30).
      const objetivo = ref.getDate()
      next = addMonths(ref, 1)
      const ultimoDelMes = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next = new Date(next.getFullYear(), next.getMonth(), Math.min(objetivo, ultimoDelMes))
      break
    }
    case 'anual':
      next = addYears(ref, 1)
      break
  }
  return format(next, 'yyyy-MM-dd')
}

/**
 * Itera `siguienteFechaRecurrente` desde `fechaActual` mientras la fecha
 * resultante sea ≤ `tope`. Devuelve la lista completa de fechas en formato
 * `yyyy-MM-dd` (excluye la fecha original; solo las nuevas).
 * Se usa para materializar todos los movimientos vencidos de un recurrente.
 */
export function fechasVencidasHasta(
  fechaActual: string,
  frecuencia: FrecuenciaRecurrente,
  tope: string,
): string[] {
  const result: string[] = []
  let actual = fechaActual
  // Límite defensivo: nunca más de 366 ocurrencias (cubrir > 30 años anuales
  // y > 5 años semanales sin loop infinito).
  for (let i = 0; i < 366; i++) {
    const next = siguienteFechaRecurrente(actual, frecuencia)
    if (next > tope) break
    result.push(next)
    actual = next
  }
  return result
}
