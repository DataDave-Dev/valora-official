import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { GastoPorCategoria } from '@valora/shared'
import { useMoneda } from '@/hooks/useMoneda'

interface ISpendingDonutProps {
  datos: GastoPorCategoria[]
}

function prefiereMenosMovimiento(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Dona de gastos por categoría (reemplaza el conic-gradient del mockup). */
export function SpendingDonut({ datos }: ISpendingDonutProps) {
  const fmt = useMoneda()
  const total = datos.reduce((acc, d) => acc + d.total, 0)
  const animar = !prefiereMenosMovimiento()

  if (datos.length === 0 || total === 0) {
    return (
      <p className="py-8 text-center text-body-sm text-on-surface-variant">
        No hay gastos registrados este mes.
      </p>
    )
  }

  return (
    <>
      <div className="relative mb-6 flex aspect-square w-full items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={datos}
              dataKey="total"
              nameKey="nombre"
              innerRadius="62%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={animar}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {datos.map((d) => (
                <Cell key={d.categoriaId ?? 'sin'} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-label-sm text-secondary">Total</span>
          <span className="text-headline-sm text-on-surface">{fmt(total)}</span>
        </div>
      </div>

      <ul className="space-y-4">
        {datos.map((d) => (
          <li key={d.categoriaId ?? 'sin'} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: d.color }}
                aria-hidden="true"
              />
              <span className="text-body-md text-on-surface">{d.nombre}</span>
            </div>
            <span className="text-label-md text-on-surface">{fmt(d.total)}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
