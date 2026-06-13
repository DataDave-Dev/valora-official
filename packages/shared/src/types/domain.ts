import type { Database } from './database.types'

/** Un movimiento o categoría es de tipo ingreso o gasto. */
export type TipoMovimiento = 'ingreso' | 'gasto'

/** Preferencia de tema visual del usuario. */
export type TemaPreferencia = 'claro' | 'oscuro' | 'sistema'

/**
 * Estado de un movimiento. Los `pendiente` (p. ej. recurrentes materializados
 * sin confirmar) NO afectan saldos ni dashboard hasta confirmarse.
 */
export type EstadoMovimiento = 'confirmado' | 'pendiente'

/**
 * Tipo de cuenta del hogar.
 * Activos: efectivo, banco, ahorro, inversion. Pasivo: tarjeta_credito.
 * Solo las cuentas tipo 'ahorro' pueden respaldar una meta (lo garantiza el
 * trigger `trg_validar_hogar_meta`); 'inversion' es un activo pero no es válido
 * como cuenta de ahorro de una meta.
 */
export type TipoCuenta = 'efectivo' | 'banco' | 'tarjeta_credito' | 'ahorro' | 'inversion'

// --- Filas (Row) tal como las devuelve Supabase ---
// `tipo` se estrecha a TipoMovimiento (el CHECK de Postgres lo garantiza,
// pero los tipos generados lo exponen como `string`).
export type ICategoria = Omit<Database['public']['Tables']['categorias']['Row'], 'tipo'> & {
  tipo: TipoMovimiento
}
export type IMovimiento = Omit<
  Database['public']['Tables']['movimientos']['Row'],
  'tipo' | 'estado'
> & {
  tipo: TipoMovimiento
  estado: EstadoMovimiento
}
export type IProfile = Omit<Database['public']['Tables']['profiles']['Row'], 'tema'> & {
  tema: TemaPreferencia
}
export type ICuenta = Omit<Database['public']['Tables']['cuentas']['Row'], 'tipo'> & {
  tipo: TipoCuenta
}
export type IPresupuesto = Database['public']['Tables']['presupuestos']['Row']
export type IMeta = Database['public']['Tables']['metas']['Row']
export type ITransferencia = Database['public']['Tables']['transferencias']['Row']
export type IEtiqueta = Database['public']['Tables']['etiquetas']['Row']
export type IDeuda = Omit<Database['public']['Tables']['deudas']['Row'], 'tipo'> & {
  tipo: TipoDeuda
}
export type IPagoDeuda = Database['public']['Tables']['pagos_deuda']['Row']
export type IMovimientoRecurrente = Omit<
  Database['public']['Tables']['movimientos_recurrentes']['Row'],
  'tipo' | 'frecuencia'
> & {
  tipo: TipoMovimiento
  frecuencia: FrecuenciaRecurrente
}

/** Periodicidad con la que se materializa un movimiento recurrente. */
export type FrecuenciaRecurrente = 'semanal' | 'quincenal' | 'mensual' | 'anual'

/**
 * Dirección de una deuda:
 * - `por_cobrar`: alguien le debe al hogar (es un activo esperado).
 * - `por_pagar`: el hogar le debe a alguien (es un pasivo esperado).
 */
export type TipoDeuda = 'por_cobrar' | 'por_pagar'

// --- Payloads de inserción ---
export type ICategoriaInsert = Database['public']['Tables']['categorias']['Insert']
export type ICuentaInsert = Database['public']['Tables']['cuentas']['Insert']
export type IMovimientoInsert = Database['public']['Tables']['movimientos']['Insert']
export type IPresupuestoInsert = Database['public']['Tables']['presupuestos']['Insert']
export type IMetaInsert = Database['public']['Tables']['metas']['Insert']
export type ITransferenciaInsert = Database['public']['Tables']['transferencias']['Insert']
export type IEtiquetaInsert = Database['public']['Tables']['etiquetas']['Insert']
export type IDeudaInsert = Omit<Database['public']['Tables']['deudas']['Insert'], 'tipo'> & {
  tipo: TipoDeuda
}
export type IPagoDeudaInsert = Database['public']['Tables']['pagos_deuda']['Insert']
export type IMovimientoRecurrenteInsert = Omit<
  Database['public']['Tables']['movimientos_recurrentes']['Insert'],
  'tipo' | 'frecuencia'
> & {
  tipo: TipoMovimiento
  frecuencia: FrecuenciaRecurrente
}

// --- Payloads de actualización ---
export type ICategoriaUpdate = Database['public']['Tables']['categorias']['Update']
export type ICuentaUpdate = Database['public']['Tables']['cuentas']['Update']
export type IMovimientoUpdate = Database['public']['Tables']['movimientos']['Update']
export type IProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type IPresupuestoUpdate = Database['public']['Tables']['presupuestos']['Update']
export type IMetaUpdate = Database['public']['Tables']['metas']['Update']
export type IEtiquetaUpdate = Database['public']['Tables']['etiquetas']['Update']
export type IDeudaUpdate = Omit<Database['public']['Tables']['deudas']['Update'], 'tipo'> & {
  tipo?: TipoDeuda
}
export type IMovimientoRecurrenteUpdate = Omit<
  Database['public']['Tables']['movimientos_recurrentes']['Update'],
  'tipo' | 'frecuencia'
> & {
  tipo?: TipoMovimiento
  frecuencia?: FrecuenciaRecurrente
}

/** Deuda con los pagos agregados y el progreso calculado en cliente. */
export type IDeudaConProgreso = IDeuda & {
  pagos: IPagoDeuda[]
  pagado: number
  restante: number
  porcentaje: number
}

/** Movimiento con su categoría embebida (join). */
export type IMovimientoConCategoria = IMovimiento & {
  categoria: ICategoria | null
}

/** Transferencia con las cuentas de origen y destino embebidas (join). */
export type ITransferenciaConCuentas = ITransferencia & {
  origen: ICuenta | null
  destino: ICuenta | null
}

/** Presupuesto con su categoría y el progreso ya calculado. */
export type IPresupuestoConProgreso = IPresupuesto & {
  categoria: ICategoria | null
  gastado: number
  porcentaje: number
  estado: EstadoPresupuesto
}

/** Estado visual de un presupuesto según el % gastado. */
export type EstadoPresupuesto = 'ok' | 'alerta' | 'excedido'

// --- Etiquetas en español para la UI ---
export const TIPO_MOVIMIENTO_LABELS: Record<TipoMovimiento, string> = {
  ingreso: 'Ingreso',
  gasto: 'Gasto',
}

export const TEMA_LABELS: Record<TemaPreferencia, string> = {
  claro: 'Claro',
  oscuro: 'Oscuro',
  sistema: 'Sistema',
}

export const TIPO_CUENTA_LABELS: Record<TipoCuenta, string> = {
  efectivo: 'Efectivo',
  banco: 'Banco',
  tarjeta_credito: 'Tarjeta de crédito',
  ahorro: 'Ahorro',
  inversion: 'Inversión',
}

export const ESTADO_MOVIMIENTO_LABELS: Record<EstadoMovimiento, string> = {
  confirmado: 'Confirmado',
  pendiente: 'Pendiente',
}

export const FRECUENCIA_LABELS: Record<FrecuenciaRecurrente, string> = {
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
  anual: 'Anual',
}

export const TIPO_DEUDA_LABELS: Record<TipoDeuda, string> = {
  por_cobrar: 'Por cobrar',
  por_pagar: 'Por pagar',
}

export type RolHogar = 'dueno' | 'miembro'

export const ROL_HOGAR_LABELS: Record<RolHogar, string> = {
  dueno: 'Dueño',
  miembro: 'Miembro',
}

export type EstadoInvitacion = 'pendiente' | 'aceptada' | 'cancelada'

export const ESTADO_INVITACION_LABELS: Record<EstadoInvitacion, string> = {
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  cancelada: 'Cancelada',
}

/** Miembro de un hogar, con su perfil cuando es visible para co-miembros. */
export type IHogarMiembro = Database['public']['Tables']['hogar_miembros']['Row'] & {
  profile?: IProfile | null
}

/** Hogar con metadatos del rol del usuario actual (derivados al cargar). */
export type IHogar = Database['public']['Tables']['hogares']['Row'] & {
  rol_actual?: RolHogar
  es_dueno?: boolean
}

export type IHogarInsert = Database['public']['Tables']['hogares']['Insert']

export type IHogarUpdate = Database['public']['Tables']['hogares']['Update']

export type IHogarMiembroInsert = Database['public']['Tables']['hogar_miembros']['Insert']

export type IHogarMiembroUpdate = Database['public']['Tables']['hogar_miembros']['Update']

export type IInvitacion = Database['public']['Tables']['invitaciones']['Row']

export type IInvitacionInsert = Database['public']['Tables']['invitaciones']['Insert']

/** Resultado de la RPC `detalle_invitacion` (preview por token). */
export interface IInvitacionDetalle {
  hogar_id: string
  hogar_nombre: string
  email: string
  rol: RolHogar
  estado: EstadoInvitacion
  expirada: boolean
}

/** Resultado de la RPC `aceptar_invitacion`. */
export interface IInvitacionAceptada {
  hogar_id: string
  hogar_nombre: string
}
