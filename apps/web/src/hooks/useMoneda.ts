import { useCallback } from 'react'
import { formatCurrency } from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'

/**
 * Devuelve un formateador de moneda ligado a la moneda del hogar activo
 * (`hogares.moneda`). Cae a 'MXN' si todavía no hay un hogar resuelto.
 *
 * Uso: `const fmt = useMoneda(); fmt(monto)`.
 */
export function useMoneda(): (amount: number) => string {
  const moneda = useHogarStore((s) => s.hogar?.moneda ?? 'MXN')
  return useCallback((amount: number) => formatCurrency(amount, moneda), [moneda])
}
