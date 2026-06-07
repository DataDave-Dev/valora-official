import { useEffect, useRef, useState } from 'react'

/** Cubic ease-out: rápido al inicio, suave al final. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function prefiereMenosMovimiento(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Anima un número de 0 hacia `value` con requestAnimationFrame.
 * Respeta `prefers-reduced-motion`: si está activo, devuelve el valor final
 * de inmediato sin animar. Se reinicia cada vez que cambia `value`.
 */
export function useCountUp(value: number, duration = 800): number {
  const [display, setDisplay] = useState(() => (prefiereMenosMovimiento() ? value : 0))
  const frameRef = useRef<number | null>(null)
  const fromRef = useRef(0)

  useEffect(() => {
    if (prefiereMenosMovimiento()) {
      setDisplay(value)
      return
    }

    const from = fromRef.current
    const start = performance.now()

    const tick = (now: number) => {
      const progreso = Math.min((now - start) / duration, 1)
      const valor = from + (value - from) * easeOutCubic(progreso)
      setDisplay(valor)
      if (progreso < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = value
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    }
  }, [value, duration])

  return display
}
