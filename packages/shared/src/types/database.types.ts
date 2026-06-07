export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      abonos_meta: {
        Row: {
          created_at: string | null
          hogar_id: string
          id: string
          meta_id: string
          transferencia_id: string
        }
        Insert: {
          created_at?: string | null
          hogar_id: string
          id?: string
          meta_id: string
          transferencia_id: string
        }
        Update: {
          created_at?: string | null
          hogar_id?: string
          id?: string
          meta_id?: string
          transferencia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abonos_meta_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonos_meta_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "metas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonos_meta_transferencia_id_fkey"
            columns: ["transferencia_id"]
            isOneToOne: false
            referencedRelation: "transferencias"
            referencedColumns: ["id"]
          },
        ]
      }
      adjuntos: {
        Row: {
          created_at: string | null
          hogar_id: string
          id: string
          movimiento_id: string
          nombre: string
          ruta: string
          tamano_bytes: number | null
          tipo_mime: string | null
        }
        Insert: {
          created_at?: string | null
          hogar_id: string
          id?: string
          movimiento_id: string
          nombre: string
          ruta: string
          tamano_bytes?: number | null
          tipo_mime?: string | null
        }
        Update: {
          created_at?: string | null
          hogar_id?: string
          id?: string
          movimiento_id?: string
          nombre?: string
          ruta?: string
          tamano_bytes?: number | null
          tipo_mime?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adjuntos_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adjuntos_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          categoria_padre_id: string | null
          color: string
          created_at: string | null
          es_default: boolean | null
          hogar_id: string
          icono: string
          id: string
          nombre: string
          tipo: string
        }
        Insert: {
          categoria_padre_id?: string | null
          color?: string
          created_at?: string | null
          es_default?: boolean | null
          hogar_id: string
          icono?: string
          id?: string
          nombre: string
          tipo: string
        }
        Update: {
          categoria_padre_id?: string | null
          color?: string
          created_at?: string | null
          es_default?: boolean | null
          hogar_id?: string
          icono?: string
          id?: string
          nombre?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_categoria_padre_id_fkey"
            columns: ["categoria_padre_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      cuentas: {
        Row: {
          archivada: boolean
          color: string
          created_at: string | null
          dia_corte: number | null
          dia_pago: number | null
          hogar_id: string
          icono: string
          id: string
          limite_credito: number | null
          nombre: string
          saldo_inicial: number
          tipo: string
        }
        Insert: {
          archivada?: boolean
          color?: string
          created_at?: string | null
          dia_corte?: number | null
          dia_pago?: number | null
          hogar_id: string
          icono?: string
          id?: string
          limite_credito?: number | null
          nombre: string
          saldo_inicial?: number
          tipo: string
        }
        Update: {
          archivada?: boolean
          color?: string
          created_at?: string | null
          dia_corte?: number | null
          dia_pago?: number | null
          hogar_id?: string
          icono?: string
          id?: string
          limite_credito?: number | null
          nombre?: string
          saldo_inicial?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuentas_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      deudas: {
        Row: {
          contraparte: string
          creado_por: string
          created_at: string | null
          descripcion: string | null
          fecha: string
          fecha_limite: string | null
          hogar_id: string
          id: string
          liquidada: boolean
          monto_original: number
          tipo: string
        }
        Insert: {
          contraparte: string
          creado_por: string
          created_at?: string | null
          descripcion?: string | null
          fecha?: string
          fecha_limite?: string | null
          hogar_id: string
          id?: string
          liquidada?: boolean
          monto_original: number
          tipo: string
        }
        Update: {
          contraparte?: string
          creado_por?: string
          created_at?: string | null
          descripcion?: string | null
          fecha?: string
          fecha_limite?: string | null
          hogar_id?: string
          id?: string
          liquidada?: boolean
          monto_original?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "deudas_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquetas: {
        Row: {
          color: string
          created_at: string | null
          hogar_id: string
          id: string
          nombre: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          hogar_id: string
          id?: string
          nombre: string
        }
        Update: {
          color?: string
          created_at?: string | null
          hogar_id?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "etiquetas_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      hogar_miembros: {
        Row: {
          created_at: string | null
          hogar_id: string
          rol: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          hogar_id: string
          rol?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          hogar_id?: string
          rol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hogar_miembros_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      hogares: {
        Row: {
          creado_por: string
          created_at: string | null
          dia_inicio_mes: number
          id: string
          moneda: string
          nombre: string
        }
        Insert: {
          creado_por: string
          created_at?: string | null
          dia_inicio_mes?: number
          id?: string
          moneda?: string
          nombre: string
        }
        Update: {
          creado_por?: string
          created_at?: string | null
          dia_inicio_mes?: number
          id?: string
          moneda?: string
          nombre?: string
        }
        Relationships: []
      }
      metas: {
        Row: {
          completada: boolean | null
          created_at: string | null
          cuenta_ahorro_id: string
          fecha_limite: string | null
          hogar_id: string
          id: string
          monto_actual: number
          monto_objetivo: number
          nombre: string
        }
        Insert: {
          completada?: boolean | null
          created_at?: string | null
          cuenta_ahorro_id: string
          fecha_limite?: string | null
          hogar_id: string
          id?: string
          monto_actual?: number
          monto_objetivo: number
          nombre: string
        }
        Update: {
          completada?: boolean | null
          created_at?: string | null
          cuenta_ahorro_id?: string
          fecha_limite?: string | null
          hogar_id?: string
          id?: string
          monto_actual?: number
          monto_objetivo?: number
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_cuenta_ahorro_id_fkey"
            columns: ["cuenta_ahorro_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metas_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      movimiento_etiquetas: {
        Row: {
          etiqueta_id: string
          movimiento_id: string
        }
        Insert: {
          etiqueta_id: string
          movimiento_id: string
        }
        Update: {
          etiqueta_id?: string
          movimiento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimiento_etiquetas_etiqueta_id_fkey"
            columns: ["etiqueta_id"]
            isOneToOne: false
            referencedRelation: "etiquetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_etiquetas_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos: {
        Row: {
          categoria_id: string | null
          creado_por: string
          created_at: string | null
          cuenta_id: string
          descripcion: string
          estado: string
          fecha: string
          hogar_id: string
          id: string
          monto: number
          notas: string | null
          recurrente_id: string | null
          tipo: string
        }
        Insert: {
          categoria_id?: string | null
          creado_por: string
          created_at?: string | null
          cuenta_id: string
          descripcion: string
          estado?: string
          fecha?: string
          hogar_id: string
          id?: string
          monto: number
          notas?: string | null
          recurrente_id?: string | null
          tipo: string
        }
        Update: {
          categoria_id?: string | null
          creado_por?: string
          created_at?: string | null
          cuenta_id?: string
          descripcion?: string
          estado?: string
          fecha?: string
          hogar_id?: string
          id?: string
          monto?: number
          notas?: string | null
          recurrente_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_recurrente_id_fkey"
            columns: ["recurrente_id"]
            isOneToOne: false
            referencedRelation: "movimientos_recurrentes"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_recurrentes: {
        Row: {
          activa: boolean
          categoria_id: string | null
          creado_por: string
          created_at: string | null
          cuenta_id: string
          descripcion: string
          dia_del_mes: number | null
          fecha_fin: string | null
          frecuencia: string
          hogar_id: string
          id: string
          monto: number
          proxima_fecha: string
          tipo: string
        }
        Insert: {
          activa?: boolean
          categoria_id?: string | null
          creado_por: string
          created_at?: string | null
          cuenta_id: string
          descripcion: string
          dia_del_mes?: number | null
          fecha_fin?: string | null
          frecuencia: string
          hogar_id: string
          id?: string
          monto: number
          proxima_fecha: string
          tipo: string
        }
        Update: {
          activa?: boolean
          categoria_id?: string | null
          creado_por?: string
          created_at?: string | null
          cuenta_id?: string
          descripcion?: string
          dia_del_mes?: number | null
          fecha_fin?: string | null
          frecuencia?: string
          hogar_id?: string
          id?: string
          monto?: number
          proxima_fecha?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_recurrentes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_recurrentes_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_recurrentes_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_deuda: {
        Row: {
          created_at: string | null
          deuda_id: string
          fecha: string
          hogar_id: string
          id: string
          monto: number
          movimiento_id: string | null
        }
        Insert: {
          created_at?: string | null
          deuda_id: string
          fecha?: string
          hogar_id: string
          id?: string
          monto: number
          movimiento_id?: string | null
        }
        Update: {
          created_at?: string | null
          deuda_id?: string
          fecha?: string
          hogar_id?: string
          id?: string
          monto?: number
          movimiento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_deuda_deuda_id_fkey"
            columns: ["deuda_id"]
            isOneToOne: false
            referencedRelation: "deudas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_deuda_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_deuda_movimiento_id_fkey"
            columns: ["movimiento_id"]
            isOneToOne: false
            referencedRelation: "movimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuestos: {
        Row: {
          anio: number
          categoria_id: string
          created_at: string | null
          hogar_id: string
          id: string
          mes: number
          monto_limite: number
        }
        Insert: {
          anio: number
          categoria_id: string
          created_at?: string | null
          hogar_id: string
          id?: string
          mes: number
          monto_limite: number
        }
        Update: {
          anio?: number
          categoria_id?: string
          created_at?: string | null
          hogar_id?: string
          id?: string
          mes?: number
          monto_limite?: number
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          apellido_materno: string | null
          apellido_paterno: string | null
          avatar_url: string | null
          created_at: string | null
          fecha_nacimiento: string | null
          id: string
          idioma: string
          nombre: string | null
          notif_email: boolean
          onboarding_completo: boolean
          telefono: string | null
          tema: string
          updated_at: string | null
        }
        Insert: {
          apellido_materno?: string | null
          apellido_paterno?: string | null
          avatar_url?: string | null
          created_at?: string | null
          fecha_nacimiento?: string | null
          id: string
          idioma?: string
          nombre?: string | null
          notif_email?: boolean
          onboarding_completo?: boolean
          telefono?: string | null
          tema?: string
          updated_at?: string | null
        }
        Update: {
          apellido_materno?: string | null
          apellido_paterno?: string | null
          avatar_url?: string | null
          created_at?: string | null
          fecha_nacimiento?: string | null
          id?: string
          idioma?: string
          nombre?: string | null
          notif_email?: boolean
          onboarding_completo?: boolean
          telefono?: string | null
          tema?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transferencias: {
        Row: {
          creado_por: string
          created_at: string | null
          cuenta_destino: string
          cuenta_origen: string
          descripcion: string | null
          fecha: string
          hogar_id: string
          id: string
          monto: number
        }
        Insert: {
          creado_por: string
          created_at?: string | null
          cuenta_destino: string
          cuenta_origen: string
          descripcion?: string | null
          fecha?: string
          hogar_id: string
          id?: string
          monto: number
        }
        Update: {
          creado_por?: string
          created_at?: string | null
          cuenta_destino?: string
          cuenta_origen?: string
          descripcion?: string | null
          fecha?: string
          hogar_id?: string
          id?: string
          monto?: number
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_cuenta_destino_fkey"
            columns: ["cuenta_destino"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_cuenta_origen_fkey"
            columns: ["cuenta_origen"]
            isOneToOne: false
            referencedRelation: "cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_hogar_id_fkey"
            columns: ["hogar_id"]
            isOneToOne: false
            referencedRelation: "hogares"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _recalcular_meta: { Args: { _meta_id: string }; Returns: undefined }
      es_dueno_hogar: { Args: { _hogar_id: string }; Returns: boolean }
      es_miembro_hogar: { Args: { _hogar_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

