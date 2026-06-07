import { describe, expect, it } from 'vitest'
import {
  calcularKPIs,
  calcularVariacionGastos,
  gastosPorCategoria,
  progresoMeta,
  presupuestosConProgreso,
  progresoPresupuesto,
  saldoCuenta,
  saldosPorCuenta,
} from './calculations'
import type { IPresupuesto } from '../types/domain'
import { rangoDelMes, ultimosMeses } from './dateUtils'
import type { ICategoria, ICuenta, IMovimiento, ITransferencia } from '../types/domain'

const mov = (over: Partial<IMovimiento>): IMovimiento => ({
  id: crypto.randomUUID(),
  hogar_id: 'h1',
  creado_por: 'u1',
  cuenta_id: 'cta1',
  categoria_id: null,
  recurrente_id: null,
  tipo: 'gasto',
  monto: 0,
  descripcion: 'x',
  fecha: '2026-05-10',
  notas: null,
  estado: 'confirmado',
  created_at: '2026-05-10T00:00:00Z',
  ...over,
})

const cat = (over: Partial<ICategoria>): ICategoria => ({
  id: 'c1',
  hogar_id: 'h1',
  categoria_padre_id: null,
  nombre: 'Alimentación',
  tipo: 'gasto',
  color: '#ef4444',
  icono: 'utensils',
  es_default: true,
  created_at: '2026-05-01T00:00:00Z',
  ...over,
})

const cuenta = (over: Partial<ICuenta>): ICuenta => ({
  id: 'cta1',
  hogar_id: 'h1',
  nombre: 'Efectivo',
  tipo: 'efectivo',
  saldo_inicial: 0,
  limite_credito: null,
  dia_corte: null,
  dia_pago: null,
  color: '#6b7280',
  icono: 'wallet',
  archivada: false,
  created_at: '2026-05-01T00:00:00Z',
  ...over,
})

const transf = (over: Partial<ITransferencia>): ITransferencia => ({
  id: crypto.randomUUID(),
  hogar_id: 'h1',
  creado_por: 'u1',
  cuenta_origen: 'cta1',
  cuenta_destino: 'cta2',
  monto: 0,
  fecha: '2026-05-12',
  descripcion: null,
  created_at: '2026-05-12T00:00:00Z',
  ...over,
})

describe('calcularKPIs', () => {
  it('suma ingresos y gastos y calcula balance y % de ahorro', () => {
    const kpis = calcularKPIs([
      mov({ tipo: 'ingreso', monto: 1000 }),
      mov({ tipo: 'gasto', monto: 250 }),
      mov({ tipo: 'gasto', monto: 250 }),
    ])
    expect(kpis.ingresos).toBe(1000)
    expect(kpis.gastos).toBe(500)
    expect(kpis.balance).toBe(500)
    expect(kpis.porcentajeAhorro).toBe(50)
  })

  it('% de ahorro es 0 sin ingresos', () => {
    expect(calcularKPIs([mov({ tipo: 'gasto', monto: 100 })]).porcentajeAhorro).toBe(0)
  })

  it('excluye los movimientos pendientes', () => {
    const kpis = calcularKPIs([
      mov({ tipo: 'ingreso', monto: 1000 }),
      mov({ tipo: 'gasto', monto: 400, estado: 'pendiente' }),
      mov({ tipo: 'ingreso', monto: 500, estado: 'pendiente' }),
    ])
    expect(kpis.ingresos).toBe(1000)
    expect(kpis.gastos).toBe(0)
  })
})

describe('saldoCuenta', () => {
  it('parte del saldo inicial y suma confirmados, excluyendo pendientes', () => {
    const c = cuenta({ id: 'cta1', saldo_inicial: 100 })
    const saldo = saldoCuenta(c, [
      mov({ cuenta_id: 'cta1', tipo: 'ingreso', monto: 50 }),
      mov({ cuenta_id: 'cta1', tipo: 'gasto', monto: 30, estado: 'pendiente' }),
      mov({ cuenta_id: 'otra', tipo: 'gasto', monto: 999 }),
    ])
    // 100 + 50 confirmado; el gasto pendiente no resta y la otra cuenta no aplica.
    expect(saldo).toBe(150)
  })

  it('resta cuando la cuenta es origen y suma cuando es destino de una transferencia', () => {
    const origen = cuenta({ id: 'cta1', saldo_inicial: 500 })
    const destino = cuenta({ id: 'cta2', saldo_inicial: 0 })
    const transferencias = [transf({ cuenta_origen: 'cta1', cuenta_destino: 'cta2', monto: 200 })]

    expect(saldoCuenta(origen, [], transferencias)).toBe(300)
    expect(saldoCuenta(destino, [], transferencias)).toBe(200)
  })
})

describe('saldosPorCuenta', () => {
  it('aplica movimientos confirmados y transferencias en una sola pasada', () => {
    const cuentas = [
      cuenta({ id: 'cta1', saldo_inicial: 1000 }),
      cuenta({ id: 'cta2', saldo_inicial: 100 }),
    ]
    const movimientos = [
      mov({ cuenta_id: 'cta1', tipo: 'gasto', monto: 150 }),
      mov({ cuenta_id: 'cta2', tipo: 'ingreso', monto: 50, estado: 'pendiente' }),
    ]
    const transferencias = [transf({ cuenta_origen: 'cta1', cuenta_destino: 'cta2', monto: 300 })]

    const saldos = saldosPorCuenta(cuentas, movimientos, transferencias)
    // cta1: 1000 - 150 (gasto) - 300 (transferencia) = 550
    expect(saldos.get('cta1')).toBe(550)
    // cta2: 100 + 300 (transferencia); el ingreso pendiente no cuenta = 400
    expect(saldos.get('cta2')).toBe(400)
  })
})

describe('gastosPorCategoria', () => {
  it('agrupa solo gastos por categoría y ordena descendente', () => {
    const c1 = cat({ id: 'c1', nombre: 'Comida' })
    const c2 = cat({ id: 'c2', nombre: 'Transporte', color: '#f97316' })
    const result = gastosPorCategoria(
      [
        mov({ tipo: 'gasto', monto: 100, categoria_id: 'c1' }),
        mov({ tipo: 'gasto', monto: 300, categoria_id: 'c2' }),
        mov({ tipo: 'ingreso', monto: 999, categoria_id: 'c1' }),
      ],
      [c1, c2],
    )
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ nombre: 'Transporte', total: 300 })
    expect(result[1]).toMatchObject({ nombre: 'Comida', total: 100 })
  })

  it('excluye gastos pendientes', () => {
    const c1 = cat({ id: 'c1', nombre: 'Comida' })
    const result = gastosPorCategoria(
      [
        mov({ tipo: 'gasto', monto: 100, categoria_id: 'c1' }),
        mov({ tipo: 'gasto', monto: 500, categoria_id: 'c1', estado: 'pendiente' }),
      ],
      [c1],
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ nombre: 'Comida', total: 100 })
  })
})

describe('progresoPresupuesto', () => {
  it('clasifica ok / alerta / excedido', () => {
    expect(progresoPresupuesto(50, 100).estado).toBe('ok')
    expect(progresoPresupuesto(80, 100).estado).toBe('alerta')
    expect(progresoPresupuesto(100, 100).estado).toBe('excedido')
    expect(progresoPresupuesto(120, 100).estado).toBe('excedido')
  })
})

describe('presupuestosConProgreso', () => {
  const presupuesto = (over: Partial<IPresupuesto>): IPresupuesto => ({
    id: crypto.randomUUID(),
    hogar_id: 'h1',
    categoria_id: 'c1',
    monto_limite: 1000,
    mes: 5,
    anio: 2026,
    created_at: '2026-05-01T00:00:00Z',
    ...over,
  })

  it('suma el gasto de la categoría y sus subcategorías dentro del período', () => {
    const padre = cat({ id: 'c1', nombre: 'Comida' })
    const sub = cat({ id: 'c1a', nombre: 'Restaurantes', categoria_padre_id: 'c1' })
    const result = presupuestosConProgreso(
      [presupuesto({ categoria_id: 'c1', monto_limite: 1000, mes: 5, anio: 2026 })],
      [padre, sub],
      [
        mov({ tipo: 'gasto', monto: 600, categoria_id: 'c1', fecha: '2026-05-10' }),
        mov({ tipo: 'gasto', monto: 200, categoria_id: 'c1a', fecha: '2026-05-20' }),
        mov({ tipo: 'gasto', monto: 999, categoria_id: 'c1', fecha: '2026-04-30' }), // otro mes
        mov({ tipo: 'gasto', monto: 50, categoria_id: 'c1', fecha: '2026-05-15', estado: 'pendiente' }),
      ],
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ gastado: 800, porcentaje: 80, estado: 'alerta' })
  })

  it('marca excedido cuando el gasto supera el límite', () => {
    const padre = cat({ id: 'c1' })
    const result = presupuestosConProgreso(
      [presupuesto({ categoria_id: 'c1', monto_limite: 100 })],
      [padre],
      [mov({ tipo: 'gasto', monto: 150, categoria_id: 'c1', fecha: '2026-05-10' })],
    )
    expect(result[0]?.estado).toBe('excedido')
  })
})

describe('progresoMeta', () => {
  it('acota el porcentaje a 100 y marca completada', () => {
    expect(progresoMeta(50, 200)).toEqual({ porcentaje: 25, completada: false })
    expect(progresoMeta(250, 200)).toEqual({ porcentaje: 100, completada: true })
  })
})

describe('calcularVariacionGastos', () => {
  // Fechas reales dentro del mes anterior y del actual (independientes del reloj).
  const [anterior, actual] = ultimosMeses(2)
  const fechaAnterior = rangoDelMes(anterior!).desde
  const fechaActual = rangoDelMes(actual!).desde

  it('calcula la variación porcentual del gasto mes a mes', () => {
    const variacion = calcularVariacionGastos([
      mov({ tipo: 'gasto', monto: 100, fecha: fechaAnterior }),
      mov({ tipo: 'gasto', monto: 150, fecha: fechaActual }),
    ])
    // (150 - 100) / 100 = +50%
    expect(variacion).toEqual({ porcentaje: 50 })
  })

  it('devuelve null si no hay histórico del mes anterior', () => {
    const variacion = calcularVariacionGastos([
      mov({ tipo: 'gasto', monto: 150, fecha: fechaActual }),
    ])
    expect(variacion).toBeNull()
  })
})
