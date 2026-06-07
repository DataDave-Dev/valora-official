import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { MENU_EXTRA_ITEMS, MENU_GROUPS } from '@/components/navItems'

/**
 * Pantalla-menú (sobre todo para móvil): lista las secciones que no caben en el
 * bottom-nav (Movimientos, Transferencias, Presupuestos, Catálogos, Perfil…)
 * como filas tocables. En escritorio estas secciones se navegan desde el
 * sidebar; esta vista es su equivalente accesible en móvil.
 */
export function PerfilMenuPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-headline-sm text-on-surface">Más</h1>

      {MENU_EXTRA_ITEMS.length > 0 && (
        <div className="divide-y divide-outline-variant/40 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
          {MENU_EXTRA_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container/10 text-primary">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <span className="flex-1 text-body-md text-on-surface">{item.label}</span>
                <ChevronRight size={18} className="text-secondary" aria-hidden="true" />
              </Link>
            )
          })}
        </div>
      )}

      {MENU_GROUPS.map((grupo) => (
        <section key={grupo.to} className="space-y-2">
          <h2 className="px-1 text-label-sm uppercase tracking-wider text-secondary/70">
            {grupo.label}
          </h2>
          <div className="divide-y divide-outline-variant/40 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
            {(grupo.children ?? []).map((hijo) => {
              const Icon = hijo.icon
              return (
                <Link
                  key={hijo.to}
                  to={hijo.to}
                  className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container/10 text-primary">
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <span className="flex-1 text-body-md text-on-surface">{hijo.label}</span>
                  <ChevronRight size={18} className="text-secondary" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
