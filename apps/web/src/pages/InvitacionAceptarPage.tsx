import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Check, Loader2, MailWarning, Users } from 'lucide-react'
import { ROL_HOGAR_LABELS, type IInvitacionDetalle, type RolHogar } from '@valora/shared'
import { useAuthStore } from '@/store/useAuthStore'
import { useHogarStore } from '@/store/useHogarStore'
import { useHogaresStore } from '@/store/useHogaresStore'
import { Logo } from '@/components/Logo'

/**
 * Página de aceptación de una invitación por token (`/invitacion/:token`).
 * Muestra el hogar y el rol, valida que el correo de la sesión coincida y, al
 * aceptar, añade la membresía y activa el hogar recién unido.
 */
export function InvitacionAceptarPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const correoUsuario = useAuthStore((s) => s.user?.email)
  const setHogarActivo = useHogarStore((s) => s.setHogarActivo)
  const detalleInvitacion = useHogaresStore((s) => s.detalleInvitacion)
  const aceptarInvitacion = useHogaresStore((s) => s.aceptarInvitacion)
  const saving = useHogaresStore((s) => s.saving)

  const [cargando, setCargando] = useState(true)
  const [detalle, setDetalle] = useState<IInvitacionDetalle | null>(null)
  const [errorAceptar, setErrorAceptar] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setCargando(false)
      return
    }
    let activo = true
    void (async () => {
      const data = await detalleInvitacion(token)
      if (activo) {
        setDetalle(data)
        setCargando(false)
      }
    })()
    return () => {
      activo = false
    }
  }, [token, detalleInvitacion])

  const aceptar = async () => {
    if (!token) return
    setErrorAceptar(null)
    const resultado = await aceptarInvitacion(token)
    if (!resultado) {
      setErrorAceptar(useHogaresStore.getState().error ?? 'No se pudo aceptar la invitación.')
      return
    }
    // Activa el hogar recién unido (la lista ya se refrescó en el store).
    const hogar = useHogaresStore.getState().hogares.find((h) => h.id === resultado.hogar_id)
    if (hogar) {
      setHogarActivo({
        id: hogar.id,
        nombre: hogar.nombre,
        moneda: hogar.moneda,
        dia_inicio_mes: hogar.dia_inicio_mes,
      })
    }
    navigate('/')
  }

  const correoCoincide =
    detalle != null &&
    correoUsuario != null &&
    correoUsuario.toLowerCase() === detalle.email.toLowerCase()

  const disponible = detalle?.estado === 'pendiente' && !detalle.expirada

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo size={40} withWordmark />
        </div>

        {cargando ? (
          <div className="flex items-center justify-center gap-2 py-8 text-secondary">
            <Loader2 size={22} className="animate-spin" aria-hidden="true" />
            <span className="text-body-sm">Cargando invitación…</span>
          </div>
        ) : !detalle ? (
          <EstadoMensaje
            icon={<AlertTriangle size={40} className="text-error" aria-hidden="true" />}
            titulo="Invitación no encontrada"
            mensaje="El enlace no es válido o la invitación ya no existe."
            onVolver={() => navigate('/')}
          />
        ) : !disponible ? (
          <EstadoMensaje
            icon={<AlertTriangle size={40} className="text-error" aria-hidden="true" />}
            titulo={detalle.expirada ? 'Invitación expirada' : 'Invitación no disponible'}
            mensaje={
              detalle.expirada
                ? 'Esta invitación ha caducado. Pide al dueño del hogar que te envíe una nueva.'
                : 'Esta invitación ya fue aceptada o cancelada.'
            }
            onVolver={() => navigate('/')}
          />
        ) : (
          <div className="space-y-5 text-center">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container/15 text-primary">
                <Users size={28} aria-hidden="true" />
              </div>
            </div>
            <div>
              <h1 className="text-headline-sm text-on-surface">Te invitaron a un hogar</h1>
              <p className="mt-2 text-body-md text-on-surface-variant">
                Únete a <span className="font-semibold text-on-surface">{detalle.hogar_nombre}</span>{' '}
                como <span className="font-semibold">{ROL_HOGAR_LABELS[detalle.rol as RolHogar]}</span>.
              </p>
            </div>

            {!correoCoincide && (
              <div className="flex items-start gap-2 rounded-lg bg-error/10 px-4 py-3 text-left text-label-md text-error">
                <MailWarning size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  Esta invitación es para <strong>{detalle.email}</strong>. Inicia sesión con ese
                  correo para aceptarla.
                </span>
              </div>
            )}

            {errorAceptar && (
              <p role="alert" className="rounded-lg bg-error/10 px-4 py-3 text-body-sm text-error">
                {errorAceptar}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate('/')}
                disabled={saving}
                className="min-h-[44px] w-1/3 rounded-lg border border-outline-variant bg-white py-3 text-label-md text-secondary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
              >
                Ahora no
              </button>
              <button
                type="button"
                onClick={() => void aceptar()}
                disabled={saving || !correoCoincide}
                className="flex min-h-[44px] w-2/3 items-center justify-center gap-2 rounded-lg bg-primary py-3 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Check size={18} aria-hidden="true" />
                )}
                Unirme al hogar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface IEstadoMensajeProps {
  icon: React.ReactNode
  titulo: string
  mensaje: string
  onVolver: () => void
}

function EstadoMensaje({ icon, titulo, mensaje, onVolver }: IEstadoMensajeProps) {
  return (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">{icon}</div>
      <h1 className="text-headline-sm text-on-surface">{titulo}</h1>
      <p className="text-body-md text-on-surface-variant">{mensaje}</p>
      <button
        type="button"
        onClick={onVolver}
        className="min-h-[44px] rounded-lg bg-primary px-6 py-3 text-label-md text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Ir al inicio
      </button>
    </div>
  )
}
