interface ILogoProps {
  /** Tamaño del monograma en píxeles. */
  size?: number
  /** Muestra el wordmark "Valora" junto al monograma. */
  withWordmark?: boolean
  className?: string
}

/**
 * Logo de Valora: monograma "V" en chevron (crecimiento) en verde esmeralda.
 * Portado del SVG de Stitch (`logo_valora_monograma_crecimiento`).
 */
export function Logo({ size = 40, withWordmark = false, className }: ILogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Valora"
        className="object-contain"
      >
        <path
          d="M20 30L50 80L80 30"
          fill="none"
          stroke="#10b981"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M35 20L50 45L65 20"
          fill="none"
          stroke="#10b981"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
      </svg>
      {withWordmark && (
        <span className="text-headline-md font-bold tracking-tight text-primary">Valora</span>
      )}
    </div>
  )
}
