import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Loader2, Plus, PlusCircle, X } from 'lucide-react'
import {
  categoriaSchema,
  subcategoriaSchema,
  type CategoriaFormValues,
  type SubcategoriaFormValues,
  type TipoMovimiento,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import {
  agruparPorPadre,
  useCategoriasStore,
  type ICategoriaConSub,
} from '@/store/useCategoriasStore'
import { DynamicIcon } from '@/components/DynamicIcon'
import { Modal } from '@/components/Modal'

interface IStepCategoriasProps {
  onBack: () => void
  onNext: () => void
  onCancel: () => void
}

export function StepCategorias({ onBack, onNext, onCancel }: IStepCategoriasProps) {
  const hogar = useHogarStore((s) => s.hogar)
  const categorias = useCategoriasStore((s) => s.categorias)
  const loading = useCategoriasStore((s) => s.loading)
  const error = useCategoriasStore((s) => s.error)
  const fetchCategorias = useCategoriasStore((s) => s.fetchCategorias)

  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    if (hogar) void fetchCategorias(hogar.id)
  }, [hogar, fetchCategorias])

  const grupos = agruparPorPadre(categorias)

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-secondary">
          <Loader2 size={24} className="animate-spin" aria-hidden="true" />
          <span className="ml-2 text-body-sm">Cargando categorías…</span>
        </div>
      ) : grupos.length === 0 ? (
        <p className="py-8 text-center text-body-sm text-on-surface-variant">
          Aún no hay categorías. Añade una personalizada para empezar.
        </p>
      ) : (
        <div className="space-y-4">
          {grupos.map((grupo) => (
            <div key={grupo.id} className="stagger-item">
              <CategoriaCard grupo={grupo} hogarId={hogar?.id ?? null} />
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setModalAbierto(true)}
        className="flex min-h-[120px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-container-highest p-4 transition-colors hover:border-primary-container hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <PlusCircle size={32} className="mb-1 text-primary" aria-hidden="true" />
        <span className="text-label-md text-primary">Añadir Categoría Personalizada</span>
      </button>

      <div className="flex gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex min-h-[44px] w-1/3 items-center justify-center gap-1 rounded-lg border border-outline-variant bg-white py-3 text-label-md text-secondary transition-colors duration-200 hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Atrás
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex min-h-[44px] w-2/3 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-label-md text-on-primary transition-colors duration-200 hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          Siguiente
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-1 text-label-md text-secondary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Cancelar configuración
        </button>
      </div>

      {modalAbierto && (
        <NuevaCategoriaModal hogarId={hogar?.id ?? null} onClose={() => setModalAbierto(false)} />
      )}
    </div>
  )
}

interface ICategoriaCardProps {
  grupo: ICategoriaConSub
  hogarId: string | null
}

function CategoriaCard({ grupo, hogarId }: ICategoriaCardProps) {
  const saving = useCategoriasStore((s) => s.saving)
  const addSubcategoria = useCategoriasStore((s) => s.addSubcategoria)
  const removeCategoria = useCategoriasStore((s) => s.removeCategoria)

  const [agregando, setAgregando] = useState(false)
  const { register, handleSubmit, reset } = useForm<SubcategoriaFormValues>({
    resolver: zodResolver(subcategoriaSchema),
    defaultValues: { nombre: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (!hogarId) return
    const ok = await addSubcategoria(hogarId, grupo, values)
    if (ok) {
      reset({ nombre: '' })
      setAgregando(false)
    }
  })

  return (
    <div className="flex flex-col rounded-2xl border border-surface-container-high bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between border-b border-surface-container-high pb-2">
        <div className="flex items-center gap-2">
          <span style={{ color: grupo.color }}>
            <DynamicIcon name={grupo.icono} size={20} />
          </span>
          <h3 className="text-body-md font-semibold text-on-surface">{grupo.nombre}</h3>
        </div>
        {!grupo.es_default && (
          <button
            type="button"
            aria-label={`Eliminar ${grupo.nombre}`}
            disabled={saving}
            onClick={() => void removeCategoria(grupo.id)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-error transition-colors hover:bg-error-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {grupo.subcategorias.map((sub) => (
          <div key={sub.id} className="flex items-center justify-between">
            <span className="text-body-sm text-on-surface-variant">{sub.nombre}</span>
            <button
              type="button"
              aria-label={`Eliminar ${sub.nombre}`}
              disabled={saving}
              onClick={() => void removeCategoria(sub.id)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-error transition-colors hover:bg-error-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-40"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        ))}

        {agregando ? (
          <form onSubmit={onSubmit} className="flex items-center gap-2 pt-2">
            <input
              autoFocus
              type="text"
              placeholder="Nombre de la subcategoría"
              {...register('nombre')}
              className="flex-grow rounded-lg border border-outline-variant px-3 py-2 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-3 py-2 text-label-sm text-on-primary transition-colors duration-200 hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Añadir'}
            </button>
            <button
              type="button"
              onClick={() => setAgregando(false)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Cancelar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAgregando(true)}
            className="flex items-center rounded-lg pt-2 text-primary transition-colors hover:text-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus size={16} className="mr-1" aria-hidden="true" />
            <span className="text-label-sm">Añadir subcategoría</span>
          </button>
        )}
      </div>
    </div>
  )
}

interface INuevaCategoriaModalProps {
  hogarId: string | null
  onClose: () => void
}

const TIPOS: { value: TipoMovimiento; label: string }[] = [
  { value: 'gasto', label: 'Gasto' },
  { value: 'ingreso', label: 'Ingreso' },
]

function NuevaCategoriaModal({ hogarId, onClose }: INuevaCategoriaModalProps) {
  const saving = useCategoriasStore((s) => s.saving)
  const addCategoria = useCategoriasStore((s) => s.addCategoria)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nombre: '', tipo: 'gasto', color: '#10b981', icono: 'tag' },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (!hogarId) return
    const ok = await addCategoria(hogarId, values)
    if (ok) onClose()
  })

  return (
    <Modal title="Nueva categoría" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="cat-nombre" className="mb-2 block text-label-md text-on-surface-variant">
            Nombre
          </label>
          <input
            id="cat-nombre"
            type="text"
            placeholder="Ej. Mascotas"
            aria-invalid={errors.nombre != null}
            aria-describedby={errors.nombre ? 'cat-nombre-error' : undefined}
            {...register('nombre')}
            className="block w-full rounded-lg border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {errors.nombre && (
            <p id="cat-nombre-error" className="mt-1 text-label-sm text-error">
              {errors.nombre.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="cat-tipo" className="mb-2 block text-label-md text-on-surface-variant">
            Tipo
          </label>
          <select
            id="cat-tipo"
            {...register('tipo')}
            className="block w-full rounded-lg border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="cat-color" className="mb-2 block text-label-md text-on-surface-variant">
              Color
            </label>
            <input
              id="cat-color"
              type="color"
              aria-invalid={errors.color != null}
              aria-describedby={errors.color ? 'cat-color-error' : undefined}
              {...register('color')}
              className="h-12 w-full cursor-pointer rounded-lg border border-outline-variant"
            />
            {errors.color && (
              <p id="cat-color-error" className="mt-1 text-label-sm text-error">
                {errors.color.message}
              </p>
            )}
          </div>
          <div className="flex-1">
            <label htmlFor="cat-icono" className="mb-2 block text-label-md text-on-surface-variant">
              Icono
            </label>
            <input
              id="cat-icono"
              type="text"
              placeholder="tag"
              aria-invalid={errors.icono != null}
              aria-describedby={errors.icono ? 'cat-icono-error' : undefined}
              {...register('icono')}
              className="block w-full rounded-lg border border-outline-variant px-4 py-3 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {errors.icono && (
              <p id="cat-icono-error" className="mt-1 text-label-sm text-error">
                {errors.icono.message}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-label-md text-on-primary transition-colors duration-200 hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60"
        >
          {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          Crear categoría
        </button>
      </form>
    </Modal>
  )
}
