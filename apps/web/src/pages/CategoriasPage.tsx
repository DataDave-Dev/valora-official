import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  subcategoriaSchema,
  type SubcategoriaFormValues,
  type ICategoria,
  type TipoMovimiento,
} from '@valora/shared'
import { useHogarStore } from '@/store/useHogarStore'
import {
  useCategoriasStore,
  agruparPorPadre,
  type ICategoriaConSub,
} from '@/store/useCategoriasStore'
import { DynamicIcon } from '@/components/DynamicIcon'
import { Skeleton } from '@/components/Skeleton'
import { Modal } from '@/components/Modal'

/** Categoría marcada para borrar, con los IDs cuyos movimientos hay que contar. */
interface IObjetivoBorrado {
  categoria: ICategoria
  ids: string[]
  esRaiz: boolean
}

/**
 * Catálogo de categorías con gestión completa (CRUD): crear, editar y borrar
 * categorías raíz, y añadir/renombrar/borrar subcategorías. El borrado se
 * bloquea si la categoría tiene movimientos asociados (conteo previo).
 */
export function CategoriasPage() {
  const hogar = useHogarStore((s) => s.hogar)
  const categorias = useCategoriasStore((s) => s.categorias)
  const loading = useCategoriasStore((s) => s.loading)
  const error = useCategoriasStore((s) => s.error)
  const fetchCategorias = useCategoriasStore((s) => s.fetchCategorias)

  const [aBorrar, setABorrar] = useState<IObjetivoBorrado | null>(null)

  const hogarId = hogar?.id
  useEffect(() => {
    if (hogarId) void fetchCategorias(hogarId)
  }, [hogarId, fetchCategorias])

  const gastos = useMemo(
    () => agruparPorPadre(categorias.filter((c) => c.tipo === 'gasto')),
    [categorias],
  )
  const ingresos = useMemo(
    () => agruparPorPadre(categorias.filter((c) => c.tipo === 'ingreso')),
    [categorias],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-sm text-on-surface">Categorías</h1>
        <p className="mt-0.5 text-label-md text-secondary">
          Crea, edita y organiza tus categorías y subcategorías.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ColumnaTipo titulo="Gastos" tipo="gasto" raices={gastos} loading={loading} onBorrar={setABorrar} />
        <ColumnaTipo
          titulo="Ingresos"
          tipo="ingreso"
          raices={ingresos}
          loading={loading}
          onBorrar={setABorrar}
        />
      </div>

      {aBorrar && <BorrarConfirm objetivo={aBorrar} onClose={() => setABorrar(null)} />}
    </div>
  )
}

interface IColumnaTipoProps {
  titulo: string
  tipo: TipoMovimiento
  raices: ICategoriaConSub[]
  loading: boolean
  onBorrar: (objetivo: IObjetivoBorrado) => void
}

function ColumnaTipo({ titulo, tipo, raices, loading, onBorrar }: IColumnaTipoProps) {
  const navigate = useNavigate()
  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
        <button
          type="button"
          onClick={() => navigate(`/catalogos/categorias/nueva?tipo=${tipo}`)}
          className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-2 text-label-md text-primary transition-colors hover:bg-primary-container/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus size={16} aria-hidden="true" />
          Añadir
        </button>
      </div>

      {loading ? (
        <ul className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-4 w-40" />
            </li>
          ))}
        </ul>
      ) : raices.length === 0 ? (
        <p className="py-6 text-center text-body-sm text-on-surface-variant">
          No hay categorías de este tipo. Añade una para empezar.
        </p>
      ) : (
        <ul className="divide-y divide-outline-variant/40">
          {raices.map((cat) => (
            <CategoriaRaiz key={cat.id} categoria={cat} onBorrar={onBorrar} />
          ))}
        </ul>
      )}
    </section>
  )
}

interface ICategoriaRaizProps {
  categoria: ICategoriaConSub
  onBorrar: (objetivo: IObjetivoBorrado) => void
}

function CategoriaRaiz({ categoria, onBorrar }: ICategoriaRaizProps) {
  const navigate = useNavigate()
  const color = categoria.color

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <DynamicIcon name={categoria.icono} size={20} />
        </div>
        <span className="min-w-0 flex-1 truncate text-body-md font-medium text-on-surface">
          {categoria.nombre}
        </span>
        {categoria.es_default && (
          <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-secondary">
            Sugerida
          </span>
        )}
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => navigate(`/catalogos/categorias/${categoria.id}/editar`)}
            aria-label={`Editar ${categoria.nombre}`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() =>
              onBorrar({
                categoria,
                ids: [categoria.id, ...categoria.subcategorias.map((s) => s.id)],
                esRaiz: true,
              })
            }
            aria-label={`Eliminar ${categoria.nombre}`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:bg-error-container hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <ul className="ml-5 mt-2 space-y-1 border-l border-outline-variant pl-4">
        {categoria.subcategorias.map((sub) => (
          <SubcategoriaRow key={sub.id} sub={sub} color={color} onBorrar={onBorrar} />
        ))}
        <li>
          <AgregarSubcategoria padre={categoria} />
        </li>
      </ul>
    </li>
  )
}

interface ISubcategoriaRowProps {
  sub: ICategoria
  color: string
  onBorrar: (objetivo: IObjetivoBorrado) => void
}

function SubcategoriaRow({ sub, color, onBorrar }: ISubcategoriaRowProps) {
  const saving = useCategoriasStore((s) => s.saving)
  const renameSubcategoria = useCategoriasStore((s) => s.renameSubcategoria)

  const [editando, setEditando] = useState(false)
  const { register, handleSubmit, reset } = useForm<SubcategoriaFormValues>({
    resolver: zodResolver(subcategoriaSchema),
    defaultValues: { nombre: sub.nombre },
  })

  const onSubmit = handleSubmit(async (values) => {
    const ok = await renameSubcategoria(sub.id, values.nombre)
    if (ok) setEditando(false)
  })

  if (editando) {
    return (
      <li>
        <form onSubmit={onSubmit} className="flex items-center gap-2 py-1">
          <input
            autoFocus
            type="text"
            {...register('nombre')}
            className="flex-1 rounded-lg border border-outline-variant px-3 py-1.5 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={saving}
            aria-label="Guardar nombre"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={16} />}
          </button>
          <button
            type="button"
            onClick={() => {
              reset({ nombre: sub.nombre })
              setEditando(false)
            }}
            aria-label="Cancelar"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-2 py-1">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface-variant">
        {sub.nombre}
      </span>
      <button
        type="button"
        onClick={() => setEditando(true)}
        aria-label={`Renombrar ${sub.nombre}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Pencil size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onBorrar({ categoria: sub, ids: [sub.id], esRaiz: false })}
        aria-label={`Eliminar ${sub.nombre}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-secondary transition-colors hover:bg-error-container hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </li>
  )
}

function AgregarSubcategoria({ padre }: { padre: ICategoria }) {
  const hogar = useHogarStore((s) => s.hogar)
  const saving = useCategoriasStore((s) => s.saving)
  const addSubcategoria = useCategoriasStore((s) => s.addSubcategoria)

  const [agregando, setAgregando] = useState(false)
  const { register, handleSubmit, reset } = useForm<SubcategoriaFormValues>({
    resolver: zodResolver(subcategoriaSchema),
    defaultValues: { nombre: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    if (!hogar) return
    const ok = await addSubcategoria(hogar.id, padre, values)
    if (ok) {
      reset({ nombre: '' })
      setAgregando(false)
    }
  })

  if (!agregando) {
    return (
      <button
        type="button"
        onClick={() => setAgregando(true)}
        className="flex items-center gap-1 py-1 text-label-sm text-primary transition-colors hover:text-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Plus size={14} aria-hidden="true" />
        Añadir subcategoría
      </button>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 py-1">
      <input
        autoFocus
        type="text"
        placeholder="Nombre de la subcategoría"
        {...register('nombre')}
        className="flex-1 rounded-lg border border-outline-variant px-3 py-1.5 text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-primary px-3 py-1.5 text-label-sm text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : 'Añadir'}
      </button>
      <button
        type="button"
        onClick={() => setAgregando(false)}
        aria-label="Cancelar"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </form>
  )
}

function BorrarConfirm({ objetivo, onClose }: { objetivo: IObjetivoBorrado; onClose: () => void }) {
  const saving = useCategoriasStore((s) => s.saving)
  const removeCategoria = useCategoriasStore((s) => s.removeCategoria)
  const contarMovimientos = useCategoriasStore((s) => s.contarMovimientos)

  // `null` mientras se cuenta; luego el número de movimientos que bloquean.
  const [conteo, setConteo] = useState<number | null>(null)
  const [errorConteo, setErrorConteo] = useState<string | null>(null)

  const { categoria, ids, esRaiz } = objetivo

  useEffect(() => {
    let activo = true
    contarMovimientos(ids)
      .then((n) => {
        if (activo) setConteo(n)
      })
      .catch(() => {
        if (activo) setErrorConteo('No se pudo verificar el historial de la categoría.')
      })
    return () => {
      activo = false
    }
  }, [ids, contarMovimientos])

  const confirmar = async () => {
    const ok = await removeCategoria(categoria.id)
    if (ok) onClose()
  }

  const tieneMovimientos = conteo != null && conteo > 0
  const titulo = esRaiz ? 'Eliminar categoría' : 'Eliminar subcategoría'

  return (
    <Modal title={titulo} onClose={onClose}>
      <div className="space-y-5">
        {conteo == null && !errorConteo ? (
          <div className="flex items-center justify-center py-4 text-secondary">
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            <span className="ml-2 text-body-sm">Verificando historial…</span>
          </div>
        ) : errorConteo ? (
          <p className="text-body-sm text-error">{errorConteo}</p>
        ) : tieneMovimientos ? (
          <p className="text-body-sm text-on-surface-variant">
            No puedes eliminar <span className="font-semibold">{categoria.nombre}</span> porque tiene{' '}
            <span className="font-semibold">
              {conteo} {conteo === 1 ? 'movimiento asociado' : 'movimientos asociados'}
            </span>
            . Reasigna esos movimientos a otra categoría antes de eliminarla.
          </p>
        ) : (
          <p className="text-body-sm text-on-surface-variant">
            ¿Seguro que quieres eliminar <span className="font-semibold">{categoria.nombre}</span>?
            {esRaiz && ids.length > 1 ? ' También se eliminarán sus subcategorías.' : ''}{' '}
            Esta acción no se puede deshacer.
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-[44px] flex-1 rounded-lg border border-outline-variant bg-white py-3 text-label-md text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {tieneMovimientos || errorConteo ? 'Cerrar' : 'Cancelar'}
          </button>
          {!tieneMovimientos && !errorConteo && (
            <button
              type="button"
              onClick={() => void confirmar()}
              disabled={saving || conteo == null}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-error py-3 text-label-md text-on-error transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {saving && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
              Eliminar
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
