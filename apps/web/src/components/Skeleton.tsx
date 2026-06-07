interface ISkeletonProps {
  /** Clases utilitarias para forma/tamaño (ancho, alto, radio, etc.). */
  className?: string
}

/**
 * Bloque de carga reutilizable: pulso suave con el color de superficie del
 * theme. Componer varios para reproducir la forma del contenido real.
 */
export function Skeleton({ className = '' }: ISkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-surface-container-high ${className}`}
    />
  )
}
