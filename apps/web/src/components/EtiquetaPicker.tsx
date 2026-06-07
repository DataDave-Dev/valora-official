import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Tag, X } from 'lucide-react'
import { useHogarStore } from '@/store/useHogarStore'
import { useEtiquetasStore } from '@/store/useEtiquetasStore'
import { EtiquetaForm } from '@/components/EtiquetaForm'
import { Modal } from '@/components/Modal'

interface IEtiquetaPickerProps {
  /** IDs de las etiquetas actualmente seleccionadas. */
  value: string[]
  /** Se invoca con el nuevo conjunto cada vez que cambia la selección. */
  onChange: (ids: string[]) => void
}

/**
 * Selector multi-etiqueta con dos áreas:
 * - Chips de las etiquetas seleccionadas (clic para quitar).
 * - Lista de las disponibles (clic para añadir) más un botón "+ Nueva" que
 *   abre un mini-modal con `EtiquetaForm` para crear sobre la marcha.
 * Al confirmar la creación la nueva etiqueta se añade automáticamente.
 */
export function EtiquetaPicker({ value, onChange }: IEtiquetaPickerProps) {
  const hogar = useHogarStore((s) => s.hogar)
  const etiquetas = useEtiquetasStore((s) => s.etiquetas)
  const fetchEtiquetas = useEtiquetasStore((s) => s.fetchEtiquetas)
  const saving = useEtiquetasStore((s) => s.saving)
  const error = useEtiquetasStore((s) => s.error)

  const [creando, setCreando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (hogar && etiquetas.length === 0) void fetchEtiquetas(hogar.id)
  }, [hogar, etiquetas.length, fetchEtiquetas])

  const seleccionadas = useMemo(
    () =>
      value
        .map((id) => etiquetas.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => e != null),
    [value, etiquetas],
  )

  const disponibles = useMemo(() => {
    const set = new Set(value)
    const q = busqueda.trim().toLowerCase()
    return etiquetas
      .filter((e) => !set.has(e.id))
      .filter((e) => (q.length === 0 ? true : e.nombre.toLowerCase().includes(q)))
  }, [etiquetas, value, busqueda])

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id))
    else onChange([...value, id])
  }

  const onCreada = (nuevaId: string) => {
    onChange([...value, nuevaId])
    setCreando(false)
  }

  return (
    <div>
      <label className="mb-2 block text-label-md text-on-surface-variant">Etiquetas</label>

      {/* Chips seleccionadas */}
      {seleccionadas.length > 0 ? (
        <ul className="mb-3 flex flex-wrap gap-2" aria-label="Etiquetas seleccionadas">
          {seleccionadas.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => toggle(e.id)}
                aria-label={`Quitar ${e.nombre}`}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm font-medium transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                style={{ backgroundColor: `${e.color}1a`, color: e.color }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: e.color }}
                  aria-hidden="true"
                />
                {e.nombre}
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-label-sm text-on-surface-variant">Sin etiquetas</p>
      ) }

      {/* Buscador + lista de disponibles + crear */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center gap-2 border-b border-outline-variant px-3 py-2">
          <Tag size={14} className="text-secondary" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar o filtrar…"
            aria-label="Buscar etiquetas"
            className="flex-1 bg-transparent text-body-sm focus:outline-none"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => {
                setBusqueda('')
                inputRef.current?.focus()
              }}
              aria-label="Limpiar búsqueda"
              className="rounded-full p-0.5 text-secondary hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="border-b border-outline-variant px-3 py-2 text-label-sm text-error">
            {error}
          </p>
        )}

        <ul className="max-h-44 overflow-y-auto py-1" aria-label="Etiquetas disponibles">
          {disponibles.length === 0 ? (
            <li className="px-3 py-3 text-center text-label-sm text-on-surface-variant">
              {busqueda
                ? 'No hay coincidencias.'
                : etiquetas.length === 0
                  ? 'Aún no has creado etiquetas.'
                  : 'Todas las etiquetas ya están seleccionadas.'}
            </li>
          ) : (
            disponibles.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => toggle(e.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm text-on-surface transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: e.color }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate">{e.nombre}</span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="border-t border-outline-variant p-1">
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-label-md text-primary transition-colors hover:bg-primary-container/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus size={16} aria-hidden="true" />
            Nueva etiqueta
          </button>
        </div>
      </div>

      {creando && (
        <Modal title="Nueva etiqueta" onClose={() => !saving && setCreando(false)}>
          <EtiquetaForm
            onSuccess={(nuevaId) => {
              if (nuevaId) onCreada(nuevaId)
            }}
            onCancel={() => setCreando(false)}
          />
        </Modal>
      )}
    </div>
  )
}
