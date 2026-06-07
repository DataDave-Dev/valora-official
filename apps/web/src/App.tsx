import { lazy, Suspense, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useHogarStore } from '@/store/useHogarStore'
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
import { AppLayout } from '@/components/AppLayout'

// El dashboard es la única ruta que usa Recharts; se carga en diferido para
// sacar ese chunk del bundle inicial (login/onboarding).
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)

/** Pantalla de carga a página completa mientras se resuelve la sesión/perfil. */
function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-primary">
      <Loader2 size={32} className="animate-spin" aria-hidden="true" />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const session = useAuthStore((s) => s.session)
  const authLoading = useAuthStore((s) => s.loading)

  const profile = useProfileStore((s) => s.profile)
  const profileLoaded = useProfileStore((s) => s.loaded)
  const profileLoading = useProfileStore((s) => s.loading)
  const fetchProfile = useProfileStore((s) => s.fetchProfile)
  const resetProfile = useProfileStore((s) => s.reset)

  const fetchHogar = useHogarStore((s) => s.fetchHogar)
  const hogar = useHogarStore((s) => s.hogar)
  const resetHogar = useHogarStore((s) => s.reset)

  useEffect(() => initialize(), [initialize])

  // Al iniciar sesión, carga perfil + hogar; al cerrarla, limpia los stores.
  useEffect(() => {
    if (session) {
      void fetchProfile()
      void fetchHogar()
    } else {
      resetProfile()
      resetHogar()
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
  }, [session, fetchProfile, fetchHogar, resetProfile, resetHogar])

  // Materializa los movimientos recurrentes vencidos al activar el hogar.
  // Idempotente: si ya están al día, no inserta nada.
  // El efecto se declara antes de los `return` tempranos para no violar
  // las reglas de hooks; si no hay hogar, simplemente no hace nada.
  useEffect(() => {
    if (!hogar) return
    void useRecurrentesStore.getState().materializarVencidos(hogar.id)
  }, [hogar])

  if (authLoading) return <FullScreenLoader />

  // Sin sesión: solo el login es accesible.
  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Con sesión pero sin perfil resuelto todavía: espera.
  if (profileLoading || (!profileLoaded && !profile)) {
    return <FullScreenLoader />
  }

  const onboardingCompleto = profile?.onboarding_completo === true

  // Con sesión pero onboarding pendiente: el wizard es la única ruta.
  if (!onboardingCompleto) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
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
          <Route path="/analisis" element={<PlaceholderPage titulo="Análisis" />} />
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
          <Route path="/perfil/cuenta" element={<PlaceholderPage titulo="Mi cuenta" />} />
          <Route
            path="/perfil/configuracion"
            element={<PlaceholderPage titulo="Configuración" />}
          />
        </Route>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
