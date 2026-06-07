/**
 * Formatea un monto en la moneda indicada (código ISO 4217, p. ej. 'MXN', 'USD').
 * La moneda del hogar activo vive en `hogares.moneda`.
 */
export const formatCurrency = (amount: number, moneda: string): string =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: moneda,
  }).format(amount)

/** Atajo para MXN, la moneda por defecto del proyecto. */
export const formatMXN = (amount: number): string => formatCurrency(amount, 'MXN')
