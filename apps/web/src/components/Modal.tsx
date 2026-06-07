import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface IModalProps {
  /** Título visible; se enlaza vía `aria-labelledby`. */
  title: string
  onClose: () => void
  children: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Diálogo modal accesible (sin librerías): focus-trap, cierre con Escape,
 * retorno de foco al disparador, bloqueo de scroll del fondo y
 * `role="dialog" aria-modal`. Hoja inferior en móvil, centrado en escritorio.
 */
export function Modal({ title, onClose, children }: IModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null

    // Bloquea el scroll del fondo mientras el modal está abierto.
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Mueve el foco al primer elemento enfocable del panel.
    const panel = panelRef.current
    const enfocables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE)
    enfocables?.[0]?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panel) return

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (items.length === 0) return

      const primero = items[0]
      const ultimo = items[items.length - 1]
      if (!primero || !ultimo) return
      const activo = document.activeElement

      if (e.shiftKey && activo === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = overflowPrevio
      previousFocus.current?.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md animate-[slideUp_0.25s_ease-out] rounded-t-2xl bg-surface-container-lowest p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-headline-sm text-on-surface">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
