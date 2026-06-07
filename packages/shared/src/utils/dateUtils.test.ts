import { describe, expect, it } from 'vitest'
import { fechasVencidasHasta, siguienteFechaRecurrente } from './dateUtils'

describe('siguienteFechaRecurrente', () => {
  it('semanal avanza 7 días', () => {
    expect(siguienteFechaRecurrente('2026-06-06', 'semanal')).toBe('2026-06-13')
  })

  it('quincenal avanza 14 días', () => {
    expect(siguienteFechaRecurrente('2026-06-01', 'quincenal')).toBe('2026-06-15')
  })

  it('mensual cae en el mismo día del mes siguiente', () => {
    expect(siguienteFechaRecurrente('2026-06-15', 'mensual')).toBe('2026-07-15')
  })

  it('mensual: si el día no existe, va al último del mes', () => {
    // 31 de marzo → abril (30 días)
    expect(siguienteFechaRecurrente('2026-03-31', 'mensual')).toBe('2026-04-30')
  })

  it('mensual: 31 de enero → 28 de febrero (no bisiesto)', () => {
    expect(siguienteFechaRecurrente('2026-01-31', 'mensual')).toBe('2026-02-28')
  })

  it('mensual: 31 de enero → 29 de febrero (bisiesto)', () => {
    expect(siguienteFechaRecurrente('2024-01-31', 'mensual')).toBe('2024-02-29')
  })

  it('anual avanza un año', () => {
    expect(siguienteFechaRecurrente('2026-06-15', 'anual')).toBe('2027-06-15')
  })

  it('anual: 29-feb se mantiene solo en bisiesto', () => {
    expect(siguienteFechaRecurrente('2024-02-29', 'anual')).toBe('2025-02-28')
  })
})

describe('fechasVencidasHasta', () => {
  it('semanal: 3 ocurrencias si hay 21 días de diferencia', () => {
    expect(fechasVencidasHasta('2026-06-01', 'semanal', '2026-06-22')).toEqual([
      '2026-06-08',
      '2026-06-15',
      '2026-06-22',
    ])
  })

  it('mensual: ninguna si ya está al día', () => {
    expect(fechasVencidasHasta('2026-06-15', 'mensual', '2026-06-15')).toEqual([])
  })

  it('mensual: genera la cadena completa hasta el tope', () => {
    expect(fechasVencidasHasta('2026-01-15', 'mensual', '2026-04-20')).toEqual([
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
    ])
  })

  it('anual: solo 1 ocurrencia en 18 meses', () => {
    expect(fechasVencidasHasta('2026-01-01', 'anual', '2027-08-01')).toEqual(['2027-01-01'])
  })

  it('se detiene en el tope sin incluirlo si la frecuencia lo pasa de largo', () => {
    // tope '2026-06-10', mensual desde '2026-06-01' → next 2026-07-01, ya > tope
    expect(fechasVencidasHasta('2026-06-01', 'mensual', '2026-06-10')).toEqual([])
  })
})
