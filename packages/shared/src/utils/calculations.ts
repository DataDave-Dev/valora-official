import { TIPO_CUENTA_LABELS } from '../types/domain'
import type {
  ICategoria,
  ICuenta,
  IMovimiento,
  IPresupuesto,
  IPresupuestoConProgreso,
  ITransferencia,
  EstadoPresupuesto,
} from '../types/domain'
import { esDelPeriodo, etiquetaCorta, ultimosMeses, type Periodo } from './dateUtils'

/**
 * Solo los movimientos confirmados afectan saldos y dashboard.
 * Los `estado='pendiente'` se excluyen hasta que el usuario los confirme
 * (ver docs/especificacion-tecnica.md, reglas de cálculo).
 */
const esConfirmado = (m: IMovimiento): boolean => m.estado === 'confirmado'

/**
 * Saldo actual de una cuenta: su saldo inicial, más los ingresos y menos los
 * gastos de los movimientos confirmados, ajustado por las transferencias
 * (sale dinero de `cuenta_origen`, entra a `cuenta_destino`). La tarjeta de
 * crédito se trata igual (los gastos reducen el saldo, los pagos lo aumentan);
 * el signo del patrimonio neto se decide en `calcularPatrimonio`.
 */
export function saldoCuenta(
  cuenta: ICuenta,
  movimientos: IMovimiento[],
  transferencias: ITransferencia[] = [],
): number {
  let saldo = cuenta.saldo_inicial
  for (const m of movimientos) {
    if (m.cuenta_id !== cuenta.id || !esConfirmado(m)) continue
    saldo += m.tipo === 'ingreso' ? m.monto : -m.monto
  }
  for (const t of transferencias) {
    if (t.cuenta_origen === cuenta.id) saldo -= t.monto
    if (t.cuenta_destino === cuenta.id) saldo += t.monto
  }
  return saldo
}

/**
 * Calcula el saldo de TODAS las cuentas en una sola pasada sobre los
 * movimientos y las transferencias, evitando recorrer las listas una vez por
 * cuenta. Inicializa cada saldo con `saldo_inicial` y aplica solo los
 * movimientos confirmados (mismo criterio que `saldoCuenta`; los pendientes se
 * excluyen) más el efecto de cada transferencia.
 */
export function saldosPorCuenta(
  cuentas: ICuenta[],
  movimientos: IMovimiento[],
  transferencias: ITransferencia[] = [],
): Map<string, number> {
  const saldos = new Map<string, number>()
  for (const cuenta of cuentas) {
    saldos.set(cuenta.id, cuenta.saldo_inicial)
  }
  for (const m of movimientos) {
    if (!esConfirmado(m)) continue
    const saldo = saldos.get(m.cuenta_id)
    if (saldo === undefined) continue
    saldos.set(m.cuenta_id, saldo + (m.tipo === 'ingreso' ? m.monto : -m.monto))
  }
  for (const t of transferencias) {
    const origen = saldos.get(t.cuenta_origen)
    if (origen !== undefined) saldos.set(t.cuenta_origen, origen - t.monto)
    const destino = saldos.get(t.cuenta_destino)
    if (destino !== undefined) saldos.set(t.cuenta_destino, destino + t.monto)
  }
  return saldos
}

/** Patrimonio neto del hogar, desglosado en activos líquidos e invertido. */
export interface Patrimonio {
  /** efectivo + banco + ahorro. */
  activosLiquidos: number
  /** inversion. */
  invertido: number
  /** deuda de tarjetas de crédito (valor positivo). */
  pasivos: number
  /** activosLiquidos + invertido - pasivos. */
  patrimonioNeto: number
}

/**
 * Calcula el patrimonio neto a partir de las cuentas y sus movimientos.
 * Activos: efectivo, banco, ahorro (líquidos) e inversion (invertido).
 * Pasivo: el saldo deudor de las tarjetas de crédito. Las cuentas archivadas
 * se ignoran.
 */
export function calcularPatrimonio(
  cuentas: ICuenta[],
  movimientos: IMovimiento[],
  transferencias: ITransferencia[] = [],
): Patrimonio {
  let activosLiquidos = 0
  let invertido = 0
  let pasivos = 0

  // Una sola pasada por movimientos/transferencias en vez de N (una por cuenta).
  const saldos = saldosPorCuenta(cuentas, movimientos, transferencias)
  for (const cuenta of cuentas) {
    if (cuenta.archivada) continue
    const saldo = saldos.get(cuenta.id) ?? cuenta.saldo_inicial
    if (cuenta.tipo === 'inversion') {
      invertido += saldo
    } else if (cuenta.tipo === 'tarjeta_credito') {
      // Un saldo deudor (negativo) suma a los pasivos.
      pasivos += saldo < 0 ? -saldo : 0
    } else {
      activosLiquidos += saldo
    }
  }

  return {
    activosLiquidos,
    invertido,
    pasivos,
    patrimonioNeto: activosLiquidos + invertido - pasivos,
  }
}

/** KPIs del dashboard para un conjunto de movimientos (normalmente, los del mes). */
export interface KPIs {
  ingresos: number
  gastos: number
  balance: number
  /** Balance como % de los ingresos. 0 si no hay ingresos. */
  porcentajeAhorro: number
}

export function calcularKPIs(movimientos: IMovimiento[]): KPIs {
  let ingresos = 0
  let gastos = 0
  for (const m of movimientos) {
    if (!esConfirmado(m)) continue
    if (m.tipo === 'ingreso') ingresos += m.monto
    else gastos += m.monto
  }
  const balance = ingresos - gastos
  const porcentajeAhorro = ingresos > 0 ? (balance / ingresos) * 100 : 0
  return { ingresos, gastos, balance, porcentajeAhorro }
}

/** Una porción de la gráfica de dona: gasto total por categoría. */
export interface GastoPorCategoria {
  categoriaId: string | null
  nombre: string
  color: string
  total: number
}

/**
 * Agrupa los gastos por categoría para la gráfica de dona.
 * Los movimientos sin categoría se agrupan como "Sin categoría".
 */
export function gastosPorCategoria(
  movimientos: IMovimiento[],
  categorias: ICategoria[],
): GastoPorCategoria[] {
  const porId = new Map<string, ICategoria>(categorias.map((c) => [c.id, c]))
  const acumulado = new Map<string | null, number>()

  for (const m of movimientos) {
    if (m.tipo !== 'gasto' || !esConfirmado(m)) continue
    acumulado.set(m.categoria_id, (acumulado.get(m.categoria_id) ?? 0) + m.monto)
  }

  return Array.from(acumulado.entries())
    .map(([categoriaId, total]) => {
      const cat = categoriaId ? porId.get(categoriaId) : undefined
      return {
        categoriaId,
        nombre: cat?.nombre ?? 'Sin categoría',
        color: cat?.color ?? '#6b7280',
        total,
      }
    })
    .sort((a, b) => b.total - a.total)
}

/** Un punto de la gráfica de barras: ingresos vs gastos de un mes. */
export interface PuntoMensual {
  etiqueta: string
  ingresos: number
  gastos: number
}

/**
 * Suma ingresos y gastos por mes para una lista de períodos.
 * `movimientos` debe contener al menos los meses solicitados.
 */
export function ingresosVsGastosPorMes(
  movimientos: IMovimiento[],
  periodos: Periodo[],
): PuntoMensual[] {
  return periodos.map((periodo) => {
    let ingresos = 0
    let gastos = 0
    for (const m of movimientos) {
      if (!esConfirmado(m) || !esDelPeriodo(m.fecha, periodo)) continue
      if (m.tipo === 'ingreso') ingresos += m.monto
      else gastos += m.monto
    }
    return { etiqueta: etiquetaCorta(periodo), ingresos, gastos }
  })
}

/** Umbrales de alerta de presupuesto (en %). */
export const UMBRAL_ALERTA = 80
export const UMBRAL_EXCEDIDO = 100

export interface ProgresoPresupuesto {
  porcentaje: number
  estado: EstadoPresupuesto
}

/** Progreso de un presupuesto: % gastado y estado visual (ok / alerta / excedido). */
export function progresoPresupuesto(gastado: number, limite: number): ProgresoPresupuesto {
  const porcentaje = limite > 0 ? (gastado / limite) * 100 : 0
  let estado: EstadoPresupuesto = 'ok'
  if (porcentaje >= UMBRAL_EXCEDIDO) estado = 'excedido'
  else if (porcentaje >= UMBRAL_ALERTA) estado = 'alerta'
  return { porcentaje, estado }
}

/**
 * Enriquece cada presupuesto con su categoría, lo gastado en su período y el
 * progreso (porcentaje + estado). El gasto de un presupuesto sobre una
 * categoría **padre** incluye el de sus subcategorías (un nivel); el de una
 * subcategoría cuenta solo lo suyo. Solo gastos confirmados del mes/año del
 * presupuesto cuentan.
 */
export function presupuestosConProgreso(
  presupuestos: IPresupuesto[],
  categorias: ICategoria[],
  movimientos: IMovimiento[],
): IPresupuestoConProgreso[] {
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]))
  const hijasPorPadre = new Map<string, string[]>()
  for (const c of categorias) {
    if (!c.categoria_padre_id) continue
    const ids = hijasPorPadre.get(c.categoria_padre_id) ?? []
    ids.push(c.id)
    hijasPorPadre.set(c.categoria_padre_id, ids)
  }

  return presupuestos.map((p) => {
    const categoria = categoriaPorId.get(p.categoria_id) ?? null
    const idsContados = new Set<string>([p.categoria_id, ...(hijasPorPadre.get(p.categoria_id) ?? [])])
    const periodo: Periodo = { mes: p.mes, anio: p.anio }

    let gastado = 0
    for (const m of movimientos) {
      if (m.tipo !== 'gasto' || !esConfirmado(m)) continue
      if (m.categoria_id === null || !idsContados.has(m.categoria_id)) continue
      if (!esDelPeriodo(m.fecha, periodo)) continue
      gastado += m.monto
    }

    const { porcentaje, estado } = progresoPresupuesto(gastado, p.monto_limite)
    return { ...p, categoria, gastado, porcentaje, estado }
  })
}

export interface ProgresoMeta {
  /** Porcentaje 0-100 (acotado). */
  porcentaje: number
  completada: boolean
}

/** Progreso de una meta de ahorro: % alcanzado (acotado a 100) y si está completada. */
export function progresoMeta(actual: number, objetivo: number): ProgresoMeta {
  const ratio = objetivo > 0 ? (actual / objetivo) * 100 : 0
  return {
    porcentaje: Math.min(Math.max(ratio, 0), 100),
    completada: actual >= objetivo && objetivo > 0,
  }
}

/**
 * Variación porcentual del gasto del mes actual respecto al mes anterior.
 * Devuelve `null` si no hay histórico suficiente (sin gasto el mes anterior):
 * no inventamos un valor. La dirección se deriva del signo de `porcentaje`.
 */
export function calcularVariacionGastos(
  movimientos: IMovimiento[],
): { porcentaje: number } | null {
  const [anterior, actual] = ultimosMeses(2)
  if (!anterior || !actual) return null

  const gastoActual = calcularKPIs(
    movimientos.filter((m) => esDelPeriodo(m.fecha, actual)),
  ).gastos
  const gastoAnterior = calcularKPIs(
    movimientos.filter((m) => esDelPeriodo(m.fecha, anterior)),
  ).gastos

  // Sin histórico suficiente: no inventamos un valor.
  if (gastoAnterior === 0) return null

  const porcentaje = ((gastoActual - gastoAnterior) / gastoAnterior) * 100
  return { porcentaje }
}

/** Metadato contextual de la tarjeta de cuenta según lo que el esquema soporta. */
export function metaDeCuenta(cuenta: ICuenta): string {
  if (cuenta.tipo === 'tarjeta_credito' && cuenta.dia_pago != null) {
    return `Vence el día ${cuenta.dia_pago}`
  }
  if (cuenta.dia_corte != null) {
    return `Corte el día ${cuenta.dia_corte}`
  }
  return TIPO_CUENTA_LABELS[cuenta.tipo]
}
