import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { TipoMovimiento } from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import { useCategoriasStore } from '@/store/useCategoriasStore'
import { CategoriaForm } from '@/components/CategoriaForm'

const CATALOGO = '/catalogos/categorias'

/**
 * Página dedicada para crear (`/catalogos/categorias/nueva`) o editar
 * (`/catalogos/categorias/:id/editar`) una categoría. No es un modal: envuelve
 * el formulario reutilizable `CategoriaForm` y resuelve la navegación.
 */
export function CategoriaFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()

  const hogar = useHogarStore((s) => s.hogar)
  const categorias = useCategoriasStore((s) => s.categorias)
  const loading = useCategoriasStore((s) => s.loading)
  const fetchCategorias = useCategoriasStore((s) => s.fetchCategorias)

  const hogarId = hogar?.id
  useEffect(() => {
    if (id && hogarId && categorias.length === 0) void fetchCategorias(hogarId)
  }, [id, hogarId, categorias.length, fetchCategorias])

  const categoria = id ? categorias.find((c) => c.id === id) : undefined
  const esEdicion = id != null

  const tipoParam = searchParams.get('tipo')
  const tipoInicial: TipoMovimiento | undefined =
    tipoParam === 'gasto' || tipoParam === 'ingreso' ? tipoParam : undefined

  const volver = () => navigate(CATALOGO)

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="rounded-lg p-1 text-secondary transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h1 className="text-headline-sm text-on-surface">
          {esEdicion ? 'Editar categoría' : 'Nueva categoría'}
        </h1>
      </header>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          {esEdicion && !categoria ? (
            loading ? (
              <div className="flex items-center justify-center py-6 text-secondary">
                <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                <span className="ml-2 text-body-sm">Cargando categoría…</span>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-body-md text-on-surface-variant">
                  No se encontró la categoría solicitada.
                </p>
                <button
                  type="button"
                  onClick={volver}
                  className="rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  Volver a Categorías
                </button>
              </div>
            )
          ) : (
            <CategoriaForm
              categoria={categoria}
              tipoInicial={tipoInicial}
              onSuccess={volver}
              onCancel={() => navigate(-1)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
