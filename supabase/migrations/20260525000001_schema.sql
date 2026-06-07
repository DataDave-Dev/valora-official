-- ============================================================
-- Valora — Esquema v2 (multi-hogar)
-- Todas las tablas de datos se aíslan por hogar_id + RLS por
-- membresía (ver migración 0002). profiles se aísla por auth.uid().
--
-- ORDEN DE CREACIÓN:
--   1. Identidad / tenancy  (profiles, hogares, hogar_miembros)
--   2. Catálogos del hogar  (cuentas, categorias, etiquetas)
--   3. movimientos_recurrentes  (antes de movimientos, para que
--      movimientos pueda referenciar su id con recurrente_id)
--   4. Transacciones        (movimientos, movimiento_etiquetas, transferencias)
--   5. Planificación        (presupuestos, metas, abonos_meta)
--   6. Extras               (deudas, pagos_deuda, adjuntos)
--   7. recurrente_id        (ALTER TABLE al final: movimientos ya existe
--      en este punto y movimientos_recurrentes también; no hay ciclo real,
--      solo se deja al final para hacer explícita la dependencia tardía)
-- ============================================================

-- ════════════ IDENTIDAD Y TENANCY ════════════

create table profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  nombre              text,
  apellido_paterno    text,
  apellido_materno    text,
  avatar_url          text,
  telefono            text,
  fecha_nacimiento    date,
  idioma              text not null default 'es-MX',
  tema                text not null default 'sistema'
                        check (tema in ('claro', 'oscuro', 'sistema')),
  notif_email         boolean not null default true,
  onboarding_completo boolean not null default false,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table hogares (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  creado_por     uuid references auth.users(id) not null,
  moneda         text not null default 'MXN',
  dia_inicio_mes int  not null default 1
                   check (dia_inicio_mes between 1 and 31),
  created_at     timestamptz default now()
);

create table hogar_miembros (
  hogar_id   uuid references hogares(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  rol        text check (rol in ('dueno', 'miembro')) not null default 'miembro',
  created_at timestamptz default now(),
  primary key (hogar_id, user_id)
);

-- ════════════ CATÁLOGOS DEL HOGAR ════════════

create table cuentas (
  id             uuid primary key default gen_random_uuid(),
  hogar_id       uuid references hogares(id) on delete cascade not null,
  nombre         text not null,
  tipo           text check (tipo in ('efectivo', 'banco', 'tarjeta_credito', 'ahorro', 'inversion')) not null,
  saldo_inicial  numeric(12, 2) not null default 0,
  limite_credito numeric(12, 2),
  dia_corte      int check (dia_corte between 1 and 31),
  dia_pago       int check (dia_pago between 1 and 31),
  color          text not null default '#6b7280',
  icono          text not null default 'wallet',
  archivada      boolean not null default false,
  created_at     timestamptz default now()
);

create table categorias (
  id                 uuid primary key default gen_random_uuid(),
  hogar_id           uuid references hogares(id) on delete cascade not null,
  categoria_padre_id uuid references categorias(id) on delete cascade,
  nombre             text not null,
  tipo               text check (tipo in ('ingreso', 'gasto')) not null,
  color              text not null default '#6b7280',
  icono              text not null default 'tag',
  es_default         boolean default false,
  created_at         timestamptz default now()
);

create table etiquetas (
  id         uuid primary key default gen_random_uuid(),
  hogar_id   uuid references hogares(id) on delete cascade not null,
  nombre     text not null,
  color      text not null default '#6b7280',
  created_at timestamptz default now(),
  unique (hogar_id, nombre)
);

-- ════════════ PLANIFICACIÓN RECURRENTE (antes de movimientos) ════════════
-- Se crea ANTES de movimientos para que movimientos pueda referenciar su id
-- mediante recurrente_id. La relación es unidireccional (movimientos_recurrentes
-- no referencia movimientos), así que no existe ningún ciclo real en el grafo
-- de dependencias. recurrente_id se añade con ALTER TABLE al final únicamente
-- para dejar explícito que depende de que ambas tablas ya existan.

create table movimientos_recurrentes (
  id            uuid primary key default gen_random_uuid(),
  hogar_id      uuid references hogares(id) on delete cascade not null,
  creado_por    uuid references auth.users(id) not null,
  cuenta_id     uuid references cuentas(id) on delete restrict not null,
  categoria_id  uuid references categorias(id) on delete set null,
  tipo          text check (tipo in ('ingreso', 'gasto')) not null,
  monto         numeric(12, 2) not null check (monto > 0),
  descripcion   text not null,
  frecuencia    text check (frecuencia in ('semanal', 'quincenal', 'mensual', 'anual')) not null,
  dia_del_mes   int check (dia_del_mes between 1 and 31),
  proxima_fecha date not null,
  fecha_fin     date,
  activa        boolean not null default true,
  created_at    timestamptz default now()
);

-- ════════════ TRANSACCIONES ════════════

create table movimientos (
  id            uuid primary key default gen_random_uuid(),
  hogar_id      uuid references hogares(id) on delete cascade not null,
  creado_por    uuid references auth.users(id) not null,
  cuenta_id     uuid references cuentas(id) on delete restrict not null,
  categoria_id  uuid references categorias(id) on delete set null,
  -- recurrente_id se añade con ALTER TABLE al final porque, aunque
  -- movimientos_recurrentes ya existe en este punto, se mantiene diferido
  -- para dejar explícita la dependencia tardía y facilitar lecturas del DDL.
  tipo          text check (tipo in ('ingreso', 'gasto')) not null,
  monto         numeric(12, 2) not null check (monto > 0),
  descripcion   text not null,
  fecha         date not null default current_date,
  notas         text,
  estado        text not null default 'confirmado'
                  check (estado in ('confirmado', 'pendiente')),
  created_at    timestamptz default now()
);

create table movimiento_etiquetas (
  movimiento_id uuid references movimientos(id) on delete cascade not null,
  etiqueta_id   uuid references etiquetas(id) on delete cascade not null,
  primary key (movimiento_id, etiqueta_id)
);

create table transferencias (
  id             uuid primary key default gen_random_uuid(),
  hogar_id       uuid references hogares(id) on delete cascade not null,
  creado_por     uuid references auth.users(id) not null,
  cuenta_origen  uuid references cuentas(id) on delete restrict not null,
  cuenta_destino uuid references cuentas(id) on delete restrict not null,
  monto          numeric(12, 2) not null check (monto > 0),
  fecha          date not null default current_date,
  descripcion    text,
  created_at     timestamptz default now(),
  check (cuenta_origen <> cuenta_destino)
);

-- ════════════ PLANIFICACIÓN ════════════

create table presupuestos (
  id           uuid primary key default gen_random_uuid(),
  hogar_id     uuid references hogares(id) on delete cascade not null,
  categoria_id uuid references categorias(id) on delete cascade not null,
  monto_limite numeric(12, 2) not null check (monto_limite > 0),
  mes          int check (mes between 1 and 12) not null,
  anio         int not null,
  created_at   timestamptz default now(),
  unique (hogar_id, categoria_id, mes, anio)
);

create table metas (
  id               uuid primary key default gen_random_uuid(),
  hogar_id         uuid references hogares(id) on delete cascade not null,
  -- NOT NULL: toda meta debe estar vinculada a una cuenta de tipo 'ahorro'
  -- del mismo hogar. El trigger trg_validar_mismo_hogar lo verifica en runtime.
  cuenta_ahorro_id uuid references cuentas(id) on delete restrict not null,
  nombre           text not null,
  monto_objetivo   numeric(12, 2) not null check (monto_objetivo > 0),
  -- monto_actual es mantenido automáticamente por el trigger
  -- trg_sincronizar_monto_actual (ver migración 0004); no editar directamente.
  monto_actual     numeric(12, 2) not null default 0 check (monto_actual >= 0),
  fecha_limite     date,
  completada       boolean default false,
  created_at       timestamptz default now()
);

create table abonos_meta (
  id               uuid primary key default gen_random_uuid(),
  hogar_id         uuid references hogares(id) on delete cascade not null,
  meta_id          uuid references metas(id) on delete cascade not null,
  transferencia_id uuid references transferencias(id) on delete cascade not null,
  created_at       timestamptz default now()
);

-- ════════════ EXTRAS ════════════

create table deudas (
  id             uuid primary key default gen_random_uuid(),
  hogar_id       uuid references hogares(id) on delete cascade not null,
  creado_por     uuid references auth.users(id) not null,
  tipo           text check (tipo in ('por_cobrar', 'por_pagar')) not null,
  contraparte    text not null,
  monto_original numeric(12, 2) not null check (monto_original > 0),
  fecha          date not null default current_date,
  fecha_limite   date,
  descripcion    text,
  liquidada      boolean not null default false,
  created_at     timestamptz default now()
);

create table pagos_deuda (
  id            uuid primary key default gen_random_uuid(),
  hogar_id      uuid references hogares(id) on delete cascade not null,
  deuda_id      uuid references deudas(id) on delete cascade not null,
  monto         numeric(12, 2) not null check (monto > 0),
  fecha         date not null default current_date,
  movimiento_id uuid references movimientos(id) on delete set null,
  created_at    timestamptz default now()
);

create table adjuntos (
  id            uuid primary key default gen_random_uuid(),
  hogar_id      uuid references hogares(id) on delete cascade not null,
  movimiento_id uuid references movimientos(id) on delete cascade not null,
  ruta          text not null,
  nombre        text not null,
  tipo_mime     text,
  tamano_bytes  bigint,
  created_at    timestamptz default now()
);

-- ════════════ recurrente_id: movimientos → movimientos_recurrentes ════════════
-- Se añade aquí porque ambas tablas ya existen.
-- El campo es nullable: los movimientos manuales (sin origen recurrente)
-- no necesitan vincularse a ninguna plantilla recurrente.

alter table movimientos
  add column recurrente_id uuid references movimientos_recurrentes(id) on delete set null;
