import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  Copy,
  Crown,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  ROL_HOGAR_LABELS,
  type IHogar,
  type IHogarMiembro,
  type IInvitacion,
  type RolHogar,
} from '@valora/shared'
import { useAuthStore } from '@/store/useAuthStore'
import { useHogarStore } from '@/store/useHogarStore'
import { useHogaresStore } from '@/store/useHogaresStore'
import { Modal } from '@/components/Modal'

interface IConfirmacion {
  titulo: string
  mensaje: string
  textoConfirmar: string
  onConfirmar: () => Promise<void>
}

/**
 * Gestión de hogares (Fase 4): cambiar entre hogares, crear/editar/eliminar,
 * administrar miembros y roles, y enviar/cancelar invitaciones por enlace.
 */
export function HogarPage() {
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.user?.id)

  const hogarActivo = useHogarStore((s) => s.hogar)
  const setHogarActivo = useHogarStore((s) => s.setHogarActivo)

  const hogares = useHogaresStore((s) => s.hogares)
  const loading = useHogaresStore((s) => s.loading)
  const error = useHogaresStore((s) => s.error)
  const miembros = useHogaresStore((s) => s.miembros)
  const miembrosLoading = useHogaresStore((s) => s.miembrosLoading)
  const invitaciones = useHogaresStore((s) => s.invitaciones)
  const fetchMiembros = useHogaresStore((s) => s.fetchMiembros)
  const fetchInvitaciones = useHogaresStore((s) => s.fetchInvitaciones)
  const updateRolMiembro = useHogaresStore((s) => s.updateRolMiembro)
  const removeMiembro = useHogaresStore((s) => s.removeMiembro)
  const abandonarHogar = useHogaresStore((s) => s.abandonarHogar)
  const removeHogar = useHogaresStore((s) => s.removeHogar)
  const cancelarInvitacion = useHogaresStore((s) => s.cancelarInvitacion)

  const [confirmacion, setConfirmacion] = useState<IConfirmacion | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [tokenCopiado, setTokenCopiado] = useState<string | null>(null)

  const hogarActivoCompleto = hogares.find((h) => h.id === hogarActivo?.id)
  const esDueno = hogarActivoCompleto?.es_dueno === true
  const activoId = hogarActivo?.id

  // Carga miembros (y, si es dueño, invitaciones) del hogar activo.
  useEffect(() => {
    if (!activoId) return
    void fetchMiembros(activoId)
    if (esDueno) void fetchInvitaciones(activoId)
  }, [activoId, esDueno, fetchMiembros, fetchInvitaciones])

  const activar = (hogar: IHogar) => {
    setHogarActivo({
      id: hogar.id,
      nombre: hogar.nombre,
      moneda: hogar.moneda,
      dia_inicio_mes: hogar.dia_inicio_mes,
    })
  }

  const copiarEnlace = async (token: string) => {
    const url = `${window.location.origin}/invitacion/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setTokenCopiado(token)
      window.setTimeout(() => setTokenCopiado(null), 2000)
    } catch {
      // El navegador puede bloquear el portapapeles; el usuario puede copiar a mano.
    }
  }

  const ejecutarConfirmacion = async () => {
    if (!confirmacion) return
    setProcesando(true)
    await confirmacion.onConfirmar()
    setProcesando(false)
    setConfirmacion(null)
  }

  const nombreMiembro = (m: IHogarMiembro) => {
    const completo = [m.profile?.nombre, m.profile?.apellido_paterno].filter(Boolean).join(' ')
    if (m.user_id === userId) return completo ? `${completo} (tú)` : 'Tú'
    return completo || 'Miembro del hogar'
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-headline-sm text-on-surface">Hogar</h1>
          <p className="mt-0.5 text-label-md text-secondary">
            Cambia de hogar, administra miembros e invita a otras personas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/perfil/hogar/nuevo')}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <Plus size={18} aria-hidden="true" />
          Crear hogar
        </button>
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-error/10 px-4 py-3 text-body-sm text-error">
          {error}
        </p>
      )}

      {/* ── Mis hogares ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-title-md text-on-surface">Mis hogares</h2>
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-secondary">
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            <span className="text-body-sm">Cargando hogares…</span>
          </div>
        ) : (
          <ul className="space-y-2">
            {hogares.map((hogar) => {
              const activo = hogar.id === hogarActivo?.id
              return (
                <li
                  key={hogar.id}
                  className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 transition-colors ${
                    activo
                      ? 'border-primary bg-primary-container/10'
                      : 'border-outline-variant bg-surface-container-lowest'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-label-md font-semibold text-on-primary">
                    {hogar.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-body-md font-medium text-on-surface">
                      {hogar.nombre}
                      {hogar.es_dueno && (
                        <Crown size={14} className="shrink-0 text-primary" aria-label="Eres dueño" />
                      )}
                    </p>
                    <p className="text-label-sm text-secondary">
                      {hogar.moneda} · {ROL_HOGAR_LABELS[(hogar.rol_actual ?? 'miembro') as RolHogar]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activo ? (
                      <span className="rounded-full bg-primary/15 px-3 py-1 text-label-sm font-semibold text-primary">
                        Activo
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => activar(hogar)}
                        className="rounded-lg border border-outline-variant px-3 py-2 text-label-md text-secondary transition-colors hover:border-primary-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        Activar
                      </button>
                    )}
                    {hogar.es_dueno && (
                      <button
                        type="button"
                        onClick={() => navigate(`/perfil/hogar/${hogar.id}/editar`)}
                        aria-label={`Editar ${hogar.nombre}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-surface-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                    )}
                    {hogar.es_dueno && hogares.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmacion({
                            titulo: `Eliminar "${hogar.nombre}"`,
                            mensaje:
                              'Se borrarán todas sus cuentas, movimientos y datos. Esta acción no se puede deshacer.',
                            textoConfirmar: 'Eliminar hogar',
                            onConfirmar: async () => {
                              await removeHogar(hogar.id)
                            },
                          })
                        }
                        aria-label={`Eliminar ${hogar.nombre}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                    {!hogar.es_dueno && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmacion({
                            titulo: `Abandonar "${hogar.nombre}"`,
                            mensaje: 'Dejarás de tener acceso a este hogar y sus datos.',
                            textoConfirmar: 'Abandonar hogar',
                            onConfirmar: async () => {
                              await abandonarHogar(hogar.id)
                            },
                          })
                        }
                        aria-label={`Abandonar ${hogar.nombre}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2"
                      >
                        <LogOut size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Miembros del hogar activo ───────────────────────────── */}
      {hogarActivo && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" aria-hidden="true" />
            <h2 className="text-title-md text-on-surface">Miembros de {hogarActivo.nombre}</h2>
          </div>
          {miembrosLoading ? (
            <div className="flex items-center gap-2 py-4 text-secondary">
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              <span className="text-body-sm">Cargando miembros…</span>
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/40 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
              {miembros.map((m) => {
                const esYo = m.user_id === userId
                return (
                  <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary/15 text-label-md font-semibold text-secondary">
                      {(m.profile?.nombre ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
                      {nombreMiembro(m)}
                    </span>
                    {esDueno && !esYo ? (
                      <select
                        value={m.rol}
                        onChange={(e) =>
                          void updateRolMiembro(hogarActivo.id, m.user_id, e.target.value as RolHogar)
                        }
                        aria-label={`Rol de ${nombreMiembro(m)}`}
                        className="rounded-lg border border-outline-variant px-2 py-1.5 text-label-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="miembro">{ROL_HOGAR_LABELS.miembro}</option>
                        <option value="dueno">{ROL_HOGAR_LABELS.dueno}</option>
                      </select>
                    ) : (
                      <span className="rounded-full bg-surface-container px-3 py-1 text-label-sm text-secondary">
                        {ROL_HOGAR_LABELS[m.rol as RolHogar]}
                      </span>
                    )}
                    {esDueno && !esYo && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmacion({
                            titulo: 'Expulsar miembro',
                            mensaje: `¿Quitar a ${nombreMiembro(m)} de este hogar?`,
                            textoConfirmar: 'Expulsar',
                            onConfirmar: async () => {
                              await removeMiembro(hogarActivo.id, m.user_id)
                            },
                          })
                        }
                        aria-label={`Expulsar a ${nombreMiembro(m)}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {/* ── Invitaciones (solo dueño) ───────────────────────────── */}
      {hogarActivo && esDueno && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-primary" aria-hidden="true" />
              <h2 className="text-title-md text-on-surface">Invitaciones pendientes</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/perfil/hogar/invitar')}
              className="flex min-h-[40px] items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-label-md text-secondary transition-colors hover:border-primary-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <UserPlus size={16} aria-hidden="true" />
              Invitar
            </button>
          </div>
          {invitaciones.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-outline-variant px-4 py-6 text-center text-body-sm text-secondary">
              No hay invitaciones pendientes.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant/40 overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
              {invitaciones.map((inv) => (
                <InvitacionRow
                  key={inv.id}
                  invitacion={inv}
                  copiado={tokenCopiado === inv.token}
                  onCopiar={() => void copiarEnlace(inv.token)}
                  onCancelar={() =>
                    setConfirmacion({
                      titulo: 'Cancelar invitación',
                      mensaje: `¿Cancelar la invitación a ${inv.email}?`,
                      textoConfirmar: 'Cancelar invitación',
                      onConfirmar: async () => {
                        await cancelarInvitacion(inv.id)
                      },
                    })
                  }
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Confirmación de acciones destructivas (modal) ───────── */}
      {confirmacion && (
        <Modal title={confirmacion.titulo} onClose={() => setConfirmacion(null)}>
          <p className="text-body-md text-on-surface-variant">{confirmacion.mensaje}</p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmacion(null)}
              disabled={procesando}
              className="min-h-[44px] w-1/2 rounded-lg border border-outline-variant bg-white py-3 text-label-md text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={() => void ejecutarConfirmacion()}
              disabled={procesando}
              className="flex min-h-[44px] w-1/2 items-center justify-center gap-2 rounded-lg bg-error py-3 text-label-md text-white transition-colors hover:bg-error/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {procesando && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
              {confirmacion.textoConfirmar}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

interface IInvitacionRowProps {
  invitacion: IInvitacion
  copiado: boolean
  onCopiar: () => void
  onCancelar: () => void
}

/** Fila de una invitación pendiente con acciones de copiar enlace y cancelar. */
function InvitacionRow({ invitacion, copiado, onCopiar, onCancelar }: IInvitacionRowProps) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-md text-on-surface">{invitacion.email}</p>
        <p className="text-label-sm text-secondary">
          {ROL_HOGAR_LABELS[invitacion.rol as RolHogar]} · pendiente
        </p>
      </div>
      <button
        type="button"
        onClick={onCopiar}
        className="flex min-h-[36px] items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-label-sm text-secondary transition-colors hover:border-primary-container hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {copiado ? (
          <>
            <Check size={15} aria-hidden="true" /> Copiado
          </>
        ) : (
          <>
            <Copy size={15} aria-hidden="true" /> Copiar enlace
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onCancelar}
        aria-label={`Cancelar invitación a ${invitacion.email}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2"
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>
    </li>
  )
}
