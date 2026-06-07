import { formatFechaCorta, type ICategoria, type IEtiqueta, type IMovimiento } from '@valora/shared'
import { Clock } from 'lucide-react'
import { DynamicIcon } from '@/components/DynamicIcon'
import { Skeleton } from '@/components/Skeleton'
import { useMoneda } from '@/hooks/useMoneda'

interface ITransaccionRowProps {
  movimiento: IMovimiento
  categoria: ICategoria | null
  /** Etiquetas aplicadas al movimiento. Si no se pasa, no se muestran chips. */
  etiquetas?: IEtiqueta[]
}

/** Fila de una transacción: icono+chip de categoría, descripción, fecha y monto con signo. */
export function TransaccionRow({ movimiento, categoria, etiquetas = [] }: ITransaccionRowProps) {
  const fmt = useMoneda()
  const esIngreso = movimiento.tipo === 'ingreso'
  const signo = esIngreso ? '+' : '−'
  const color = categoria?.color ?? '#6b7280'
  const visibles = etiquetas.slice(0, 2)
  const restantes = etiquetas.length - visibles.length
  const esPendiente = movimiento.estado === 'pendiente'
  return (
    <li className="stagger-item flex items-center justify-between py-4">
      <div className="flex items-center gap-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <DynamicIcon name={categoria?.icono ?? 'tag'} size={20} />
        </div>
        <div className="min-w-0">
          <p
            className={`truncate text-body-md font-medium ${
              esPendiente ? 'text-secondary' : 'text-on-surface'
            }`}
          >
            {movimiento.descripcion}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {categoria && (
              <span
                className="rounded-full px-2 py-0.5 text-label-sm"
                style={{ backgroundColor: `${color}1a`, color }}
              >
                {categoria.nombre}
              </span>
            )}
            {esPendiente && (
              <span className="inline-flex items-center gap-1 rounded-full bg-tertiary-container px-2 py-0.5 text-label-sm text-on-tertiary-container">
                <Clock size={12} aria-hidden="true" />
                Pendiente
              </span>
            )}
            {visibles.map((et) => (
              <span
                key={et.id}
                className="rounded-full px-2 py-0.5 text-label-sm"
                style={{ backgroundColor: `${et.color}1a`, color: et.color }}
                title={et.nombre}
              >
                #{et.nombre}
              </span>
            ))}
            {restantes > 0 && (
              <span className="text-label-sm text-secondary">+{restantes}</span>
            )}
            <span className="text-body-sm text-secondary">
              {formatFechaCorta(movimiento.fecha)}
            </span>
          </div>
        </div>
      </div>
      <span
        className={`text-label-md ${esPendiente ? 'text-secondary' : esIngreso ? 'text-primary' : 'text-on-surface'}`}
      >
        {signo}
        {fmt(movimiento.monto)}
      </span>
    </li>
  )
}

/** Esqueleto de carga de una fila de transacción. */
export function TransaccionRowSkeleton() {
  return (
    <li className="flex items-center justify-between py-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <Skeleton className="h-4 w-20" />
    </li>
  )
}
