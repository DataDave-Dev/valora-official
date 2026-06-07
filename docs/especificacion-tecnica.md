# Valora — Documentación técnica para Claude Code

## Contexto del proyecto

App de finanzas personales disponible en web y móvil. Permite registrar ingresos y gastos, categorizarlos, visualizar el estado financiero mensual, controlar presupuestos por categoría y gestionar metas de ahorro. A partir de la versión 2 del esquema, los datos se organizan por **hogar** (familia, pareja o usuario individual), lo que permite que varios miembros compartan y gestionen las finanzas conjuntamente.

> **El "por qué" de cada decisión** (alternativas descartadas y justificación) está en
> [`decisiones-bd.md`](decisiones-bd.md). Este documento describe el **qué**; ese registro
> de decisiones describe el **porqué**. La fuente de verdad del esquema son las migraciones en
> `supabase/migrations/20260525000001_schema.sql` … `_04_triggers.sql`.

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend Web | React + TypeScript + Vite | React 18, Vite 5 |
| Frontend Móvil | Expo (React Native) | SDK 51+ |
| Backend / Auth / DB | Supabase | última estable |
| Gráficas Web | Recharts | 2.x |
| Gráficas Móvil | Victory Native | última estable |
| Hosting web | Vercel | — |
| Repositorio | GitHub | — |

**Regla general:** todo el código compartible entre web y móvil (lógica, tipos, helpers, llamadas a Supabase) debe vivir en `packages/shared` (`@valora/shared`).

---

## Estructura de carpetas

```
valora/
├── apps/
│   ├── web/                  # React + Vite
│   │   ├── src/
│   │   │   ├── components/   # Componentes reutilizables
│   │   │   ├── pages/        # Vistas principales
│   │   │   ├── hooks/        # Custom hooks
│   │   │   ├── lib/          # Configuración de Supabase y helpers
│   │   │   ├── store/        # Estado global (Zustand)
│   │   │   └── types/        # Tipos TypeScript compartidos
│   │   ├── index.html
│   │   └── vite.config.ts
│   └── mobile/               # Expo React Native
│       ├── app/              # Rutas con Expo Router
│       ├── components/
│       ├── hooks/
│       └── lib/
├── packages/
│   └── shared/               # Tipos, helpers, llamadas a Supabase compartidas
├── supabase/
│   ├── migrations/           # Migraciones SQL versionadas
│   └── seed.sql              # Datos de prueba (solo desarrollo local)
├── .env.example
└── README.md
```

---

## Modelo de tenancy (v2): hogares y miembros

El modelo cambia de **aislamiento por usuario** a **aislamiento por hogar**.

- Cada usuario tiene exactamente un perfil (`profiles`).
- Al registrarse, se le crea automáticamente un hogar propio y se le añade como `dueno`.
- Un usuario puede pertenecer a varios hogares (por invitación) con rol `dueno` o `miembro`. Ambos roles tienen permiso de lectura y escritura.
- Todos los datos financieros (cuentas, categorías, movimientos, etc.) pertenecen a un `hogar_id`, no a un `user_id`.
- El aislamiento entre hogares es **estricto**: los datos **no se consolidan** entre hogares distintos a los que pertenece un mismo usuario. La UI trabaja sobre **un hogar activo a la vez** (selector de hogar).
- El aislamiento entre hogares lo garantiza RLS (ver sección RLS).

### Ciclo de vida de la cuenta de usuario: inactivar, no borrar (decisión #15)

Las **cuentas de usuario** (`auth.users`) **no se borran** en v1; se **inactivan** vía Supabase
Auth (`banned_until`) sin eliminar la fila ni perder `creado_por`. Por eso las FKs `creado_por`
hacia `auth.users` (en `hogares`, `movimientos`, `movimientos_recurrentes`, `transferencias`,
`deudas`) se dejan en **`NO ACTION`**: actúan como barrera contra borrados accidentales de un
usuario que aún tiene historial en un hogar compartido. Esto preserva la trazabilidad de autoría.

> **No reintroducir un *hard-delete* de usuario.** A futuro podría añadirse un flag `activo` en
> `profiles`, pero queda fuera de v1. Ver justificación completa en [`decisiones-bd.md`](decisiones-bd.md#15-las-cuentas-de-usuario-no-se-borran-se-inactivan).

---

## Base de datos (Supabase — PostgreSQL) — Esquema v2

### Diagrama de dependencias

Las 16 tablas. Entre paréntesis las FKs salientes; `?` marca FK opcional (nullable).

```
auth.users
  ├── profiles          (1:1, on delete cascade)
  ├── hogares           (creado_por → NO ACTION, ver decisión #15)
  └── hogar_miembros    (N:M entre hogares y auth.users)

hogares  (raíz de tenancy; casi todas las FKs hijas son on delete cascade)
  ├── cuentas                    (archivar, no borrar; FKs entrantes on delete restrict)
  ├── categorias                 (árbol self-ref: categoria_padre_id?)
  ├── etiquetas
  ├── movimientos_recurrentes    (→ cuentas[restrict], categorias?[set null])
  ├── movimientos                (→ cuentas[restrict], categorias?[set null], recurrentes?[set null])
  │   └── movimiento_etiquetas   (puente N:M → movimientos, etiquetas; sin hogar_id propio)
  ├── transferencias             (→ cuenta_origen, cuenta_destino [restrict, distintas])
  ├── presupuestos               (→ categorias)
  ├── metas                      (→ cuenta_ahorro_id [restrict, tipo='ahorro', NOT NULL])
  │   └── abonos_meta            (→ metas, transferencias [NOT NULL])
  ├── deudas
  │   └── pagos_deuda            (→ deudas, movimientos?[set null])
  └── adjuntos                   (→ movimientos)
```

**Convenciones de borrado (resumen):**

| Relación | `on delete` | Motivo |
|---|---|---|
| `hijas → hogares(id)` | `cascade` | Borrar un hogar borra todos sus datos |
| `* → cuentas(id)` | `restrict` | No borrar cuenta con historial; se **archiva** |
| `creado_por → auth.users(id)` | **`NO ACTION`** | Barrera anti-borrado de usuario (decisión #15) |
| `id → auth.users(id)` (profiles) | `cascade` | El perfil sigue al usuario |
| `categoria_id`, `recurrente_id`, `pagos_deuda.movimiento_id` | `set null` | Preservar el movimiento aunque se borre el catálogo |

---

### Tabla: `profiles`

Perfil extendido del usuario. Se crea automáticamente al registrarse (trigger).

```sql
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
  updated_at          timestamptz default now()   -- mantenido por trigger
);
```

### Tabla: `hogares`

Unidad de tenancy. Cada usuario tiene al menos uno.

```sql
create table hogares (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  creado_por     uuid references auth.users(id) not null,
  moneda         text not null default 'MXN',
  dia_inicio_mes int  not null default 1 check (dia_inicio_mes between 1 and 31),
  created_at     timestamptz default now()
);
```

### Tabla: `hogar_miembros`

Membresía N:M entre usuarios y hogares.

```sql
create table hogar_miembros (
  hogar_id   uuid references hogares(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  rol        text check (rol in ('dueno', 'miembro')) not null default 'miembro',
  created_at timestamptz default now(),
  primary key (hogar_id, user_id)
);
```

### Tabla: `cuentas`

Cuentas bancarias, efectivo, tarjetas de crédito, cuentas de ahorro o de inversión del hogar.

```sql
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
```

### Tabla: `categorias`

Categorías del hogar con soporte de subcategorías (árbol de un nivel, self-referencial).

```sql
create table categorias (
  id                 uuid primary key default gen_random_uuid(),
  hogar_id           uuid references hogares(id) on delete cascade not null,
  categoria_padre_id uuid references categorias(id) on delete cascade,  -- null = categoría principal
  nombre             text not null,
  tipo               text check (tipo in ('ingreso', 'gasto')) not null,
  color              text not null default '#6b7280',
  icono              text not null default 'tag',
  es_default         boolean default false,
  created_at         timestamptz default now()
);
```

### Tabla: `etiquetas`

Tags libres por hogar para clasificación transversal de movimientos.

```sql
create table etiquetas (
  id         uuid primary key default gen_random_uuid(),
  hogar_id   uuid references hogares(id) on delete cascade not null,
  nombre     text not null,
  color      text not null default '#6b7280',
  created_at timestamptz default now(),
  unique (hogar_id, nombre)
);
```

### Tabla: `movimientos_recurrentes`

Plantillas para movimientos periódicos (suscripciones, nómina, etc.).

```sql
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
```

### Tabla: `movimientos`

Registro central de ingresos y gastos. Cada movimiento pertenece a una cuenta del hogar.

```sql
create table movimientos (
  id            uuid primary key default gen_random_uuid(),
  hogar_id      uuid references hogares(id) on delete cascade not null,
  creado_por    uuid references auth.users(id) not null,
  cuenta_id     uuid references cuentas(id) on delete restrict not null,
  categoria_id  uuid references categorias(id) on delete set null,
  recurrente_id uuid references movimientos_recurrentes(id) on delete set null,
  tipo          text check (tipo in ('ingreso', 'gasto')) not null,
  monto         numeric(12, 2) not null check (monto > 0),
  descripcion   text not null,
  fecha         date not null default current_date,
  notas         text,
  estado        text not null default 'confirmado'
                  check (estado in ('confirmado', 'pendiente')),
  created_at    timestamptz default now()
);
```

Nota de implementación: `recurrente_id` se añade con `ALTER TABLE` al final de la migración de esquema. No existe ciclo real en el grafo de dependencias (la relación es unidireccional: `movimientos_recurrentes` no referencia `movimientos`); se difiere solo para dejar explícita la dependencia tardía y facilitar la lectura del DDL. Es **nullable**: los movimientos manuales no provienen de ninguna plantilla recurrente.

### Tabla: `movimiento_etiquetas`

Tabla puente N:M entre movimientos y etiquetas. No tiene `hogar_id` propio; el RLS deriva del movimiento padre.

```sql
create table movimiento_etiquetas (
  movimiento_id uuid references movimientos(id) on delete cascade not null,
  etiqueta_id   uuid references etiquetas(id) on delete cascade not null,
  primary key (movimiento_id, etiqueta_id)
);
```

### Tabla: `transferencias`

Movimiento de fondos entre dos cuentas del mismo hogar.

```sql
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
```

### Tabla: `presupuestos`

Límites de gasto por categoría, mes y año.

```sql
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
```

### Tabla: `metas`

Metas de ahorro del hogar, vinculadas obligatoriamente a una cuenta de tipo `'ahorro'` del mismo hogar.

`cuenta_ahorro_id` es **NOT NULL**: toda meta debe tener una cuenta de ahorro asociada. El trigger `trg_validar_hogar_meta` garantiza además que la cuenta pertenezca al mismo hogar y sea de tipo `'ahorro'`.

`monto_actual` es **mantenido automáticamente** por el trigger `trg_sincronizar_monto_actual` a partir de los `abonos_meta` registrados. No debe modificarse directamente desde la aplicación. Del mismo modo, `completada` se actualiza automáticamente cuando `monto_actual >= monto_objetivo`.

```sql
create table metas (
  id               uuid primary key default gen_random_uuid(),
  hogar_id         uuid references hogares(id) on delete cascade not null,
  -- NOT NULL: toda meta requiere una cuenta de ahorro del mismo hogar.
  cuenta_ahorro_id uuid references cuentas(id) on delete restrict not null,
  nombre           text not null,
  monto_objetivo   numeric(12, 2) not null check (monto_objetivo > 0),
  -- Mantenido por trigger trg_sincronizar_monto_actual; no editar directamente.
  monto_actual     numeric(12, 2) not null default 0 check (monto_actual >= 0),
  fecha_limite     date,
  completada       boolean default false,
  created_at       timestamptz default now()
);
```

### Tabla: `abonos_meta`

Vincula transferencias con metas de ahorro (trazabilidad de abonos).

```sql
create table abonos_meta (
  id               uuid primary key default gen_random_uuid(),
  hogar_id         uuid references hogares(id) on delete cascade not null,
  meta_id          uuid references metas(id) on delete cascade not null,
  transferencia_id uuid references transferencias(id) on delete cascade not null,
  created_at       timestamptz default now()
);
```

### Tabla: `deudas`

Deudas por cobrar o por pagar del hogar.

```sql
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
```

### Tabla: `pagos_deuda`

Registro de pagos parciales o totales de una deuda, opcionalmente vinculados a un movimiento.

```sql
create table pagos_deuda (
  id            uuid primary key default gen_random_uuid(),
  hogar_id      uuid references hogares(id) on delete cascade not null,
  deuda_id      uuid references deudas(id) on delete cascade not null,
  monto         numeric(12, 2) not null check (monto > 0),
  fecha         date not null default current_date,
  movimiento_id uuid references movimientos(id) on delete set null,
  created_at    timestamptz default now()
);
```

### Tabla: `adjuntos`

Archivos adjuntos (comprobantes, tickets) a movimientos. Solo se guardan **metadatos** en la BD; el binario vive en **Supabase Storage**, bucket `recibos`, referenciado por `ruta`. Las **políticas de Storage** del bucket (lectura/escritura por miembro del hogar dueño del movimiento) se crearán cuando se implemente el módulo (ver decisión #11).

```sql
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
```

---

## Row Level Security (RLS) — v2

**Principio:** todos los datos se aíslan por hogar. Un usuario accede a los datos de un hogar si y solo si tiene una fila en `hogar_miembros` para ese hogar.

### Funciones helper (SECURITY DEFINER)

Se definen dos funciones gemelas para evitar recursión infinita de RLS:

```sql
-- Retorna true si el usuario es miembro (cualquier rol) del hogar.
-- Usada en políticas SELECT de hogar_miembros y en todas las tablas con hogar_id.
create or replace function public.es_miembro_hogar(_hogar_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from hogar_miembros
    where hogar_id = _hogar_id and user_id = auth.uid()
  );
$$;

-- Retorna true si el usuario es dueño del hogar.
-- Usada en políticas INSERT/UPDATE/DELETE de hogar_miembros y DELETE de hogares.
create or replace function public.es_dueno_hogar(_hogar_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from hogar_miembros
    where hogar_id = _hogar_id and user_id = auth.uid() and rol = 'dueno'
  );
$$;
```

Por qué `SECURITY DEFINER`: las políticas de `hogar_miembros` no pueden hacer un subselect directo sobre sí mismas sin entrar en recursión infinita en runtime. Al ejecutarse con permisos del propietario de la función (postgres), la consulta interna a `hogar_miembros` omite RLS y rompe el ciclo. **Ninguna política consulta `hogar_miembros` directamente**; toda consulta pasa por estas funciones.

### Patrón de políticas (tablas con `hogar_id`)

```sql
-- Ejemplo para movimientos (el mismo patrón aplica a todas las tablas con hogar_id)
alter table movimientos enable row level security;

create policy "movimientos: miembro puede ver"
  on movimientos for select using (public.es_miembro_hogar(hogar_id));
create policy "movimientos: miembro puede insertar"
  on movimientos for insert with check (public.es_miembro_hogar(hogar_id));
create policy "movimientos: miembro puede actualizar"
  on movimientos for update using (public.es_miembro_hogar(hogar_id));
create policy "movimientos: miembro puede eliminar"
  on movimientos for delete using (public.es_miembro_hogar(hogar_id));
```

### Tablas con RLS especial

| Tabla | Política |
|---|---|
| `profiles` | `id = auth.uid()` (aislamiento individual) |
| `hogares` | select/update: `es_miembro_hogar(id)`; delete: `es_dueno_hogar(id)` |
| `hogar_miembros` | select: `es_miembro_hogar(hogar_id)`; insert/update: `es_dueno_hogar(hogar_id)`; delete: `es_dueno_hogar(hogar_id)` o propia fila |
| `movimiento_etiquetas` | Sin `hogar_id`; política via subquery a `movimientos.hogar_id` |

---

## Triggers del sistema

### Trigger de alta de usuario

Al insertar un registro en `auth.users`, el trigger `on_auth_user_created` (función `handle_new_user`, `SECURITY DEFINER`) realiza automáticamente:

1. Inserta una fila en `profiles`.
2. Crea un `hogar` con nombre provisional basado en el nombre o email del usuario.
3. Inserta al usuario en `hogar_miembros` como `dueno`.
4. Carga las 14 categorías predefinidas en ese hogar.

Las categorías predefinidas deben mantenerse sincronizadas con `packages/shared/src/constants/defaultCategories.ts`.

**Categorías predefinidas:**

Gastos (9): Alimentación, Transporte, Vivienda, Salud, Entretenimiento, Educación, Servicios, Ropa, Otros

Ingresos (5): Sueldo, Freelance, Ventas, Inversiones, Otros

### Trigger de sincronización de metas (`trg_sincronizar_monto_actual`)

Se dispara `AFTER INSERT OR UPDATE OR DELETE` en `abonos_meta`. Recalcula `metas.monto_actual` y `metas.completada` desde cero a partir de los abonos registrados para la meta afectada.

Lógica de dirección:
- Si `transferencias.cuenta_destino = metas.cuenta_ahorro_id` → abono (+monto).
- Si `transferencias.cuenta_origen = metas.cuenta_ahorro_id` → retiro (−monto).
- `monto_actual = max(0, Σ abonos − Σ retiros)`.
- `completada = (monto_actual >= monto_objetivo)`.

En UPDATE de `abonos_meta`, si cambia `meta_id`, se recalculan tanto la meta antigua como la nueva.

**La aplicación nunca debe escribir directamente en `metas.monto_actual` ni en `metas.completada`**; solo inserta/elimina filas en `abonos_meta`.

### Triggers de validación de integridad multi-hogar

Antes de insertar o actualizar en las siguientes tablas, un trigger `BEFORE INSERT OR UPDATE` verifica que todas las FKs hijas pertenezcan al mismo `hogar_id` que la fila. Si no coinciden, lanza una excepción en español con el id conflictivo.

| Tabla | Validaciones |
|---|---|
| `movimientos` | `cuenta_id` mismo hogar; `categoria_id` mismo hogar y `tipo` igual; `recurrente_id` mismo hogar |
| `movimientos_recurrentes` | `cuenta_id` mismo hogar; `categoria_id` mismo hogar y `tipo` igual |
| `transferencias` | `cuenta_origen` y `cuenta_destino` mismo hogar |
| `presupuestos` | `categoria_id` mismo hogar |
| `metas` | `cuenta_ahorro_id` mismo hogar y `tipo = 'ahorro'` |
| `abonos_meta` | `meta_id` mismo hogar; `transferencia_id` mismo hogar; la transferencia debe involucrar `cuenta_ahorro_id` de la meta |
| `pagos_deuda` | `deuda_id` mismo hogar; `movimiento_id` (si no nulo) mismo hogar |
| `movimiento_etiquetas` | `movimiento_id` y `etiqueta_id` deben pertenecer al mismo hogar (derivado) |
| `adjuntos` | `movimiento_id` mismo hogar |

Estas validaciones son la segunda línea de defensa (la primera es RLS). Impiden que un usuario miembro de varios hogares mezcle accidentalmente entidades de hogares distintos. Todas son `SECURITY DEFINER` con `search_path` fijado y lanzan excepción en español con el id conflictivo.

---

## Reglas de cálculo (cliente)

Todo se calcula en cliente con los datos del periodo ya cargados; **no se usan vistas SQL complejas ni columnas de saldo materializadas** (ver decisión #3).

### Saldo de cuenta

```
saldo = saldo_inicial
      + Σ ingresos (movimientos tipo='ingreso', estado='confirmado')
      − Σ gastos   (movimientos tipo='gasto',   estado='confirmado')
      − Σ transferencias salientes (cuenta_origen = cuenta)
      + Σ transferencias entrantes (cuenta_destino = cuenta)
```

- Los movimientos con `estado='pendiente'` **se excluyen** del saldo (y del dashboard).
- La **tarjeta de crédito** es un pasivo: su saldo suele ser **negativo** (deuda). Pagarla es una transferencia `banco → tarjeta_credito`.

### Patrimonio neto

```
patrimonio_neto = Σ saldos de cuentas de activo (efectivo, banco, ahorro, inversion)
                − Σ saldos de cuentas de pasivo (tarjeta_credito)
```

### Mes financiero (`hogares.dia_inicio_mes`)

El dashboard no usa necesariamente el mes calendario: `hogares.dia_inicio_mes` (1–31) define la **frontera del "mes financiero"**. Si vale `25`, el periodo va del día 25 de un mes al 24 del siguiente (útil para quien cobra a fin de mes). Es un ajuste **del hogar** (compartido por todos los miembros), no del perfil. El cálculo de rangos de mes vive en `@valora/shared` (`utils/dateUtils.ts`) y lo reusan dashboard, movimientos y presupuestos.

---

## Autenticación

Usar **Supabase Auth** con:
- Email + contraseña (obligatorio)
- OAuth con Google (opcional, fase posterior)

El cliente de Supabase se inicializa una sola vez en `packages/shared/src/lib/supabase.ts` y se exporta. No crear múltiples instancias.

```ts
// packages/shared/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_ANON_KEY ?? ''
)
```

Generar los tipos de TypeScript desde Supabase CLI:
```bash
pnpm db:types
```

---

## Variables de entorno

```env
# .env.local (web)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

```env
# .env (mobile — Expo)
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

**Nunca commitear archivos `.env` al repositorio.** Solo commitear `.env.example` con los nombres de las variables vacíos.

---

## Módulos y funciones principales

### 1. Autenticación y onboarding
- Registro con email + contraseña
- Login / logout
- Recuperación de contraseña por email
- Onboarding post-registro: completar perfil y configurar el hogar (nombre, moneda, día de inicio)
- Proteger todas las rutas privadas: redirigir a `/login` si no hay sesión activa

### 2. Gestión del hogar
- Ver y editar nombre, moneda y día de inicio del mes
- Ver miembros del hogar y sus roles
- Invitar nuevos miembros (por email o enlace)
- Cambiar el hogar activo si el usuario pertenece a varios

### 3. Cuentas
- CRUD de cuentas (efectivo, banco, tarjeta de crédito, ahorro)
- Saldo calculado en cliente: saldo_inicial + sum(ingresos) − sum(gastos) − sum(transferencias salientes) + sum(transferencias entrantes)
- Archivar cuentas sin eliminarlas

### 4. Movimientos
- Crear movimiento (tipo, monto, cuenta, categoría, descripción, fecha, notas, etiquetas, estado)
- Listar movimientos con filtros: mes/año, tipo, categoría, cuenta, etiqueta, estado
- Editar y eliminar movimiento
- Paginación: 20 registros por página con botón "cargar más"
- Adjuntar archivos a un movimiento (Supabase Storage)

### 5. Transferencias
- Mover fondos entre dos cuentas del hogar
- La transferencia puede vincularse a un abono de meta

### 6. Movimientos recurrentes
- Definir plantillas recurrentes (semanal, quincenal, mensual, anual), con `proxima_fecha` y `fecha_fin` opcional
- **Modelo "pendiente por confirmar":** al **iniciar sesión**, el cliente materializa las plantillas vencidas (`proxima_fecha <= hoy`, `activa = true`) como movimientos con `estado='pendiente'`. El usuario los confirma (pudiendo **editar el monto**) o los descarta. Los pendientes **no afectan** saldos ni dashboard hasta confirmarse.
- El disparo es **del lado cliente al abrir la app**; **no** se usa `pg_cron` ni Edge Functions por ahora (ver decisión #6).
- Activar / desactivar recurrentes (`activa`)

### 7. Categorías
- Categorías predefinidas creadas en el alta del usuario
- CRUD de categorías personalizadas con soporte de subcategorías (un nivel)
- No se puede eliminar una categoría con movimientos asociados (manejar el error)

### 8. Etiquetas
- CRUD de etiquetas del hogar
- Asignar múltiples etiquetas a un movimiento
- Filtrar movimientos por etiqueta

### 9. Dashboard
- Tarjetas KPI del mes activo: Balance, Ingresos totales, Gastos totales, % de ahorro
- Gráfica de dona: gastos por categoría del mes
- Gráfica de barras: comparación ingresos vs gastos de los últimos 6 meses
- Selector de mes/año para cambiar el período
- Todo calculado en cliente con los datos ya cargados

### 10. Presupuestos
- Definir límite de gasto por categoría por mes
- Mostrar progreso: gastado vs límite
- Alerta visual al 80% (amarillo) y 100% (rojo)
- Los presupuestos son mensuales; no se copian automáticamente

### 11. Metas de ahorro
- Crear meta con nombre, monto objetivo, **cuenta de ahorro obligatoria** (tipo `'ahorro'` del mismo hogar) y fecha límite opcional
- Registrar abonos vinculados a transferencias (la transferencia debe involucrar la cuenta de ahorro de la meta)
- `monto_actual` y `completada` se actualizan automáticamente por trigger; la app solo crea/elimina `abonos_meta`
- Barra de progreso: monto_actual / monto_objetivo
- Listar metas activas y completadas por separado

### 12. Deudas
- Registrar deudas por cobrar y por pagar
- Registrar pagos parciales o totales vinculados a movimientos
- Marcar deuda como liquidada

---

## Estado global (Zustand)

Un store por dominio. Los componentes nunca llaman a Supabase directamente.

Stores principales:
- `useAuthStore` — usuario actual, sesión, loading
- `useHogarStore` — hogar activo, lista de hogares del usuario, miembros
- `useCuentasStore` — cuentas del hogar activo
- `useMovimientosStore` — lista del mes activo, filtros, loading
- `useCategoriasStore` — árbol de categorías del hogar activo
- `useEtiquetasStore` — etiquetas del hogar activo
- `usePresupuestosStore` — presupuestos del mes activo
- `useMetasStore` — lista de metas
- `useDeudasStore` — lista de deudas

---

## Convenciones de código

- **Idioma del código:** inglés (variables, funciones, tipos)
- **Idioma de la UI:** español
- **Componentes:** PascalCase — `TransactionCard.tsx`
- **Funciones y variables:** camelCase — `getTotalByMonth()`
- **Archivos de utilidad:** camelCase — `formatCurrency.ts`
- **Tipos e interfaces:** PascalCase con prefijo `I` para interfaces — `IMovimiento`
- Siempre tipar con TypeScript estricto. Nunca `any`.
- Funciones asíncronas siempre con `try/catch` y error visible al usuario

### Formato de moneda

El helper `formatMXN` de `@valora/shared` sigue siendo el predeterminado. Para hogares con moneda distinta, pasar el código de moneda como parámetro:

```ts
// packages/shared/src/helpers/formatCurrency.ts
export const formatMXN = (amount: number): string =>
  formatCurrency(amount, 'MXN')

export const formatCurrency = (amount: number, currency: string): string =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
  }).format(amount)
```

La moneda del hogar activo se obtiene de `hogares.moneda`. Si no hay un hogar seleccionado, usar `'MXN'` como fallback.

---

## Fases de desarrollo

### Fase 1 — Base funcional
- [ ] Configurar monorepo con apps/web y apps/mobile
- [ ] Configurar proyecto en Supabase (migraciones v2, seed)
- [ ] Autenticación: registro, login, logout, ruta protegida
- [ ] Onboarding post-registro (perfil + hogar)
- [ ] CRUD de cuentas
- [ ] CRUD de categorías
- [ ] CRUD de movimientos
- [ ] Lista de movimientos con filtros básicos

### Fase 2 — Dashboard
- [ ] Cálculo de KPIs por mes en cliente
- [ ] Gráfica de dona por categoría
- [ ] Gráfica de barras histórica (6 meses)
- [ ] Selector de período

### Fase 3 — Control financiero
- [ ] CRUD de presupuestos mensuales
- [ ] Indicadores de progreso vs límite + alertas visuales
- [ ] CRUD de metas de ahorro con abonos
- [ ] Transferencias entre cuentas
- [ ] Movimientos recurrentes (creación manual + materialización)
- [ ] Etiquetas en movimientos
- [ ] Deudas y pagos de deuda

### Fase 4 — Multi-hogar y colaboración
- [ ] Invitación de miembros al hogar
- [ ] Gestión de hogares múltiples
- [ ] Selector de hogar activo

### Fase 5 — App móvil
- [ ] Configurar Expo Router
- [ ] Autenticación en móvil
- [ ] Movimientos en móvil
- [ ] Dashboard en móvil
- [ ] Notificaciones push para alertas de presupuesto (Expo Notifications)

---

## Comandos útiles

```bash
pnpm install          # instalar todo
pnpm dev              # web en desarrollo
pnpm db:start         # Supabase local (requiere Docker)
pnpm db:reset         # migraciones + seed
pnpm db:types         # regenerar tipos de la BD
pnpm lint             # ESLint
```

---

## Notas importantes para el desarrollo

1. **Siempre verificar la sesión activa** antes de cualquier llamada a Supabase. Si la sesión expiró, redirigir al login.
2. **El hogar activo es la unidad de aislamiento.** Todas las queries deben filtrar por `hogar_id` del hogar seleccionado; RLS es la red de seguridad, no el único control.
3. **Los montos siempre se almacenan como positivos.** El campo `tipo` determina si es ingreso o gasto.
4. **El dashboard se calcula en el cliente** con los datos ya traídos del mes activo. No crear vistas SQL complejas.
5. **Manejar estados de carga y error** en todos los formularios y listas. No dejar al usuario con pantalla en blanco.
6. **Mobile first en diseño** aunque la web sea la plataforma principal inicial.
7. **La moneda del hogar** se obtiene de `hogares.moneda`; usar `formatCurrency(amount, hogar.moneda)` en lugar de `formatMXN` cuando el hogar tenga una moneda diferente a MXN.
