import { lazy, Suspense, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useHogarStore } from '@/store/useHogarStore'
import { useHogaresStore } from '@/store/useHogaresStore'
import { useCuentasStore } from '@/store/useCuentasStore'
import { useCategoriasStore } from '@/store/useCategoriasStore'
import { useEtiquetasStore } from '@/store/useEtiquetasStore'
import { useRecurrentesStore } from '@/store/useRecurrentesStore'
import { useDeudasStore } from '@/store/useDeudasStore'
import { useMovimientosStore } from '@/store/useMovimientosStore'
import { useTransferenciasStore } from '@/store/useTransferenciasStore'
import { usePresupuestosStore } from '@/store/usePresupuestosStore'
import { useMetasStore } from '@/store/useMetasStore'
import { LoginPage } from '@/pages/LoginPage'
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { MovimientosPage } from '@/pages/MovimientosPage'
import { NuevoMovimientoPage } from '@/pages/NuevoMovimientoPage'
import { CuentasPage } from '@/pages/CuentasPage'
import { CuentaFormPage } from '@/pages/CuentaFormPage'
import { CategoriasPage } from '@/pages/CategoriasPage'
import { CategoriaFormPage } from '@/pages/CategoriaFormPage'
import { EtiquetasPage } from '@/pages/EtiquetasPage'
import { EtiquetaFormPage } from '@/pages/EtiquetaFormPage'
import { TransferenciasPage } from '@/pages/TransferenciasPage'
import { TransferenciaFormPage } from '@/pages/TransferenciaFormPage'
import { PresupuestosPage } from '@/pages/PresupuestosPage'
import { PresupuestoFormPage } from '@/pages/PresupuestoFormPage'
import { MetasPage } from '@/pages/MetasPage'
import { MetaFormPage } from '@/pages/MetaFormPage'
import { MetaAbonoPage } from '@/pages/MetaAbonoPage'
import { RecurrentesPage } from '@/pages/RecurrentesPage'
import { RecurrenteFormPage } from '@/pages/RecurrenteFormPage'
import { DeudasPage } from '@/pages/DeudasPage'
import { DeudaFormPage } from '@/pages/DeudaFormPage'
import { PerfilMenuPage } from '@/pages/PerfilMenuPage'
import { HogarPage } from '@/pages/HogarPage'
import { HogarFormPage } from '@/pages/HogarFormPage'
import { InvitacionFormPage } from '@/pages/InvitacionFormPage'
import { InvitacionAceptarPage } from '@/pages/InvitacionAceptarPage'
import { AppLayout } from '@/components/AppLayout'

/** Clave en localStorage para recordar una invitación abierta sin sesión. */
export const INVITACION_PENDIENTE_KEY = 'valora:invitacion-pendiente'

// El dashboard es la única ruta que usa Recharts; se carga en diferido para
// sacar ese chunk del bundle inicial (login/onboarding).
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)

/** Pantalla de carga a página completa mientras se resuelve la sesión/perfil. */
function FullScreenLoader() {
  return (
    <div className="bg-background text-primary flex min-h-screen items-center justify-center">
      <Loader2 size={32} className="animate-spin" aria-hidden="true" />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}

/**
 * Captura el token de una invitación abierta sin sesión: lo guarda para
 * retomarlo tras iniciar sesión y redirige al login.
 */
function GuardarInvitacionYLogin() {
  const { token } = useParams<{ token: string }>()
  useEffect(() => {
    if (token) localStorage.setItem(INVITACION_PENDIENTE_KEY, token)
  }, [token])
  return <Navigate to="/login" replace />
}

export default function App() {
  const navigate = useNavigate()

  const initialize = useAuthStore((s) => s.initialize)
  const session = useAuthStore((s) => s.session)
  const authLoading = useAuthStore((s) => s.loading)

  const profile = useProfileStore((s) => s.profile)
  const profileLoaded = useProfileStore((s) => s.loaded)
  const profileLoading = useProfileStore((s) => s.loading)
  const fetchProfile = useProfileStore((s) => s.fetchProfile)
  const resetProfile = useProfileStore((s) => s.reset)

  const fetchHogares = useHogaresStore((s) => s.fetchHogares)
  const hogares = useHogaresStore((s) => s.hogares)
  const resetHogares = useHogaresStore((s) => s.reset)

  const inicializarHogarActivo = useHogarStore((s) => s.inicializarHogarActivo)
  const hogar = useHogarStore((s) => s.hogar)
  const resetHogar = useHogarStore((s) => s.reset)

  useEffect(() => initialize(), [initialize])

  // Al iniciar sesión, carga perfil + hogares; al cerrarla, limpia los stores.
  useEffect(() => {
    if (session) {
      void fetchProfile()
      void fetchHogares()
    } else {
      resetProfile()
      resetHogar()
      resetHogares()
      useCuentasStore.getState().reset()
      useCategoriasStore.getState().reset()
      useEtiquetasStore.getState().reset()
      useRecurrentesStore.getState().reset()
      useDeudasStore.getState().reset()
      useMovimientosStore.getState().reset()
      useTransferenciasStore.getState().reset()
      usePresupuestosStore.getState().reset()
      useMetasStore.getState().reset()
    }
  }, [session, fetchProfile, fetchHogares, resetProfile, resetHogar, resetHogares])

  // Resuelve el hogar activo a partir de los hogares disponibles. Si el activo
  // persistido ya no pertenece al usuario (lo abandonó/eliminó), cae al primero.
  useEffect(() => {
    if (session && hogares.length > 0) {
      void inicializarHogarActivo(hogares)
    }
  }, [session, hogares, inicializarHogarActivo])

  // Retoma una invitación abierta sin sesión una vez autenticado.
  useEffect(() => {
    if (!session) return
    const token = localStorage.getItem(INVITACION_PENDIENTE_KEY)
    if (token) {
      localStorage.removeItem(INVITACION_PENDIENTE_KEY)
      navigate(`/invitacion/${token}`)
    }
  }, [session, navigate])

  // Materializa los movimientos recurrentes vencidos al activar el hogar.
  // Idempotente: si ya están al día, no inserta nada.
  useEffect(() => {
    if (!hogar) return
    void useRecurrentesStore.getState().materializarVencidos(hogar.id)
  }, [hogar])

  if (authLoading) return <FullScreenLoader />

  // Sin sesión: solo el login (y la captura de invitación) son accesibles.
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invitacion/:token" element={<GuardarInvitacionYLogin />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Con sesión pero sin perfil resuelto todavía: espera.
  if (profileLoading || (!profileLoaded && !profile)) {
    return <FullScreenLoader />
  }

  const onboardingCompleto = profile?.onboarding_completo === true

  // Con sesión pero onboarding pendiente: el wizard es la única ruta, salvo la
  // aceptación de invitaciones (un invitado nuevo puede llegar por un enlace).
  if (!onboardingCompleto) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/invitacion/:token" element={<InvitacionAceptarPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    )
  }

  // Onboarding completo: app principal. El hogar es necesario para los stores.
  if (!hogar) return <FullScreenLoader />

  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/movimientos" element={<MovimientosPage />} />
          <Route path="/movimientos/nuevo" element={<NuevoMovimientoPage />} />
          <Route path="/transferencias" element={<TransferenciasPage />} />
          <Route path="/transferencias/nueva" element={<TransferenciaFormPage />} />
          <Route path="/presupuestos" element={<PresupuestosPage />} />
          <Route path="/presupuestos/nuevo" element={<PresupuestoFormPage />} />
          <Route path="/presupuestos/:id/editar" element={<PresupuestoFormPage />} />
          <Route path="/metas" element={<MetasPage />} />
          <Route path="/metas/nueva" element={<MetaFormPage />} />
          <Route path="/metas/:id/editar" element={<MetaFormPage />} />
          <Route path="/metas/:id/abonar" element={<MetaAbonoPage />} />
          <Route path="/cuentas" element={<CuentasPage />} />
          <Route path="/cuentas/nueva" element={<CuentaFormPage />} />
          <Route path="/cuentas/:id/editar" element={<CuentaFormPage />} />
          <Route path="/reportes" element={<PlaceholderPage titulo="Reportes" />} />
          <Route path="/catalogos/categorias" element={<CategoriasPage />} />
          <Route path="/catalogos/categorias/nueva" element={<CategoriaFormPage />} />
          <Route path="/catalogos/categorias/:id/editar" element={<CategoriaFormPage />} />
          <Route path="/catalogos/etiquetas" element={<EtiquetasPage />} />
          <Route path="/catalogos/etiquetas/nueva" element={<EtiquetaFormPage />} />
          <Route path="/recurrentes" element={<RecurrentesPage />} />
          <Route path="/recurrentes/nuevo" element={<RecurrenteFormPage />} />
          <Route path="/recurrentes/:id/editar" element={<RecurrenteFormPage />} />
          <Route path="/deudas" element={<DeudasPage />} />
          <Route path="/deudas/nueva" element={<DeudaFormPage />} />
          <Route path="/perfil" element={<PerfilMenuPage />} />
          <Route path="/perfil/hogar" element={<HogarPage />} />
          <Route path="/perfil/hogar/nuevo" element={<HogarFormPage />} />
          <Route path="/perfil/hogar/invitar" element={<InvitacionFormPage />} />
          <Route path="/perfil/hogar/:id/editar" element={<HogarFormPage />} />
          <Route path="/perfil/cuenta" element={<PlaceholderPage titulo="Mi cuenta" />} />
          <Route path="/perfil/configuracion" element={<PlaceholderPage titulo="Configuración" />} />
          <Route path="/invitacion/:token" element={<InvitacionAceptarPage />} />
        </Route>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
