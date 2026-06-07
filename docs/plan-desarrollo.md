# Plan detallado de desarrollo — Valora (Web)

## Contexto

`Valora` ya tiene andamiaje de monorepo (`pnpm workspaces`) y la **base de datos v2
(multi-hogar)** implementada y validada en runtime: migraciones en
`supabase/migrations/20260525000001..04` (`_schema`, `_rls`, `_indexes`, `_triggers`),
RLS sin recursión, triggers funcionando y tipos TS regenerados.

Documentación relacionada:
- [`especificacion-tecnica.md`](especificacion-tecnica.md) — dominio, 16 tablas, RLS, triggers, reglas de cálculo.
- [`decisiones-bd.md`](decisiones-bd.md) — el "porqué" de cada decisión de diseño (1–15).

Este plan detalla la arquitectura para desarrollar la **web**: base funcional + dashboard +
control financiero, más los módulos nuevos del esquema v2 (cuentas, transferencias, recurrentes,
etiquetas, deudas, adjuntos, hogares/miembros). La app móvil (fase final) se planificará por
separado, pero el paquete `shared` se diseña desde ya para soportarla sin reescritura. Este es el
**primer SPA de React + Vite** del desarrollador (sus proyectos previos son Astro o Electron).

**Decisiones bloqueadas con el usuario:**
- Monorepo con **pnpm workspaces**.
- Supabase en **local con CLI + Docker** (migraciones versionadas, seed reproducible, push a cloud cuando esté listo).
- **Tailwind CSS v4** (`@tailwindcss/vite` + tokens `@theme`) + **componentes propios** (sin librería de componentes), igual que ISEAS / la-velada / strate-code.
- Alcance: **web** (base funcional, dashboard, control financiero, multi-hogar y adjuntos — Fases 1-5). La app móvil se planifica aparte.
- Base de datos: **esquema v2 multi-hogar** (16 tablas, aislamiento por `hogar_id`), ya implementado.

**Convenciones reutilizadas de los proyectos existentes del usuario:**
- TypeScript strict + alias `@/*` (patrón de ISEAS y la-velada).
- Cliente Supabase tipado con `<Database>` generado por CLI (patrón de `ISEAS/src/lib/supabase.ts`).
- ESLint + Prettier con `printWidth: 100`, `semi: false`, `singleQuote: true`, `trailingComma: all`, `prettier-plugin-tailwindcss` (config de la-velada).
- Componentes organizados por feature (patrón de ISEAS `components/accounting`, `components/admin`...).
- Tipos de dominio ricos con etiquetas en español como `Record<...>` (patrón de `ISEAS/src/types/accounting.types.ts`).

---

## Stack y decisiones técnicas adicionales (huecos del CLAUDE.md, resueltos)

| Área | Decisión | Motivo |
|---|---|---|
| Routing web | **React Router v7** (data router, `createBrowserRouter`) | Estándar para SPA; rutas protegidas con `loader`/wrapper |
| Formularios | **react-hook-form + zod + @hookform/resolvers** | Validación tipada; esquemas zod viven en `shared` y se reusan en móvil |
| Estado servidor | **Zustand** (un store por dominio, cada store hace sus llamadas a Supabase) | Lo exige el CLAUDE.md explícitamente; sin React Query |
| Iconos | **lucide-react** | Cubre el campo `icono` de categorías; ligero |
| Gráficas | **Recharts 2.x** (web) | Definido en CLAUDE.md |
| Fechas | **date-fns** | Filtros mes/año, rangos de "últimos 6 meses", sin peso de moment |
| Tests | **Vitest + Testing Library** (mínimo, opcional) | El usuario no tiene tests hoy; se deja andamiaje ligero para helpers de `shared` |
| Lint/format | ESLint flat config + Prettier (config de la-velada) | Consistencia con su trabajo previo |

---

## Estructura del monorepo

```
valora/
├── pnpm-workspace.yaml          # packages: apps/*, packages/*
├── package.json                 # raíz: scripts orquestadores, devDeps comunes (eslint, prettier)
├── tsconfig.base.json           # config TS compartida (strict, paths)
├── .env.example                 # nombres de variables, sin valores
├── .gitignore                   # node_modules, .env*, dist, .vercel, supabase/.temp
├── README.md
├── eslint.config.js             # flat config en la raíz
├── .prettierrc
│
├── packages/
│   └── shared/                  # @valora/shared  (web + móvil)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                 # barrel export
│           ├── types/
│           │   ├── database.types.ts     # GENERADO por supabase gen types (16 tablas v2)
│           │   └── domain.ts             # IHogar, ICuenta, IMovimiento, ITransferencia,
│           │                             #   ICategoria, IEtiqueta, IPresupuesto, IMeta,
│           │                             #   IDeuda, IRecurrente, IAdjunto + labels
│           ├── lib/
│           │   └── createSupabaseClient.ts  # factory (recibe url + anonKey)
│           ├── schemas/                  # esquemas zod (validación de formularios)
│           │   ├── hogar.schema.ts
│           │   ├── cuenta.schema.ts
│           │   ├── movimiento.schema.ts
│           │   ├── transferencia.schema.ts
│           │   ├── categoria.schema.ts
│           │   ├── etiqueta.schema.ts
│           │   ├── presupuesto.schema.ts
│           │   ├── meta.schema.ts
│           │   ├── recurrente.schema.ts
│           │   └── deuda.schema.ts
│           ├── utils/
│           │   ├── formatCurrency.ts     # formatMXN (del CLAUDE.md)
│           │   ├── dateUtils.ts          # rango de mes, últimos 6 meses, etiquetas es-MX
│           │   └── calculations.ts       # KPIs, progreso de presupuesto/meta (puro)
│           └── constants/
│               └── defaultCategories.ts  # categorías predefinidas (fuente de verdad)
│
├── apps/
│   ├── web/                     # React 18 + Vite 5 + TS
│   │   ├── package.json
│   │   ├── vite.config.ts        # plugin react + @tailwindcss/vite + alias @
│   │   ├── tsconfig.json         # extiende ../../tsconfig.base.json
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx           # RouterProvider
│   │       ├── router.tsx        # createBrowserRouter + rutas protegidas
│   │       ├── lib/
│   │       │   └── supabase.ts   # llama a createSupabaseClient con VITE_ env
│   │       ├── store/            # Zustand: useAuthStore, useMovimientosStore, ...
│   │       ├── hooks/            # useSession, useMonthSelector, ...
│   │       ├── components/       # por feature: auth/, movimientos/, dashboard/, ...
│   │       │   └── ui/           # primitivos propios: Button, Input, Card, Modal, Spinner, ...
│   │       ├── pages/            # Login, Register, Dashboard, Movimientos, Presupuestos, Metas, Categorias
│   │       ├── layouts/          # AppLayout (sidebar/nav), AuthLayout
│   │       └── styles/
│   │           └── global.css    # @import "tailwindcss" + @theme (tokens)
│   │
│   └── mobile/                  # placeholder Fase 4 (solo README por ahora)
│
└── supabase/
    ├── config.toml              # generado por supabase init
    ├── migrations/              # SQL versionado v2 (16 tablas, RLS, índices, triggers)
    │   ├── 20260525000001_schema.sql    # 16 tablas + recurrente_id (ALTER al final)
    │   ├── 20260525000002_rls.sql       # es_miembro_hogar / es_dueno_hogar + políticas
    │   ├── 20260525000003_indexes.sql   # índices de FKs y filtros frecuentes
    │   └── 20260525000004_triggers.sql  # handle_new_user, monto_actual, validar_hogar_*
    └── seed.sql                 # datos de prueba para desarrollo local
```

---

## Diseño del paquete `shared` (el corazón reutilizable)

Es lo que evita duplicar lógica entre web y móvil. Cuatro piezas:

1. **`lib/createSupabaseClient.ts`** — factory que recibe `url` y `anonKey` y devuelve `createClient<Database>(...)`. No lee `import.meta.env` ni `process.env` (eso es específico de plataforma).
   - `apps/web/src/lib/supabase.ts` la invoca con `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` y exporta el `supabase` ya configurado (patrón de `ISEAS/src/lib/supabase.ts`, pero solo cliente anon — RLS protege; no se necesita admin/server en un SPA).
   - Móvil (Fase 4) la invocará con `process.env.EXPO_PUBLIC_*` + `AsyncStorage`.

2. **`types/`** — `database.types.ts` generado por CLI (16 tablas v2) + `domain.ts` con interfaces (`IHogar`, `ICuenta`, `IMovimiento`, `ITransferencia`, `ICategoria`, `IEtiqueta`, `IPresupuesto`, `IMeta`, `IDeuda`, `IRecurrente`, prefijo `I` según CLAUDE.md) y mapas de etiquetas en español (`Record<TipoCuenta, string>`, `Record<TipoMovimiento, string>`, etc.), siguiendo el patrón de `accounting.types.ts` de ISEAS.

3. **`schemas/`** — esquemas zod por entidad. Sirven tanto para validar formularios (react-hook-form) como para inferir tipos. Un solo lugar de verdad para las reglas (`monto > 0`, `descripcion` requerida, `cuenta_origen <> cuenta_destino`, etc.).

4. **`utils/calculations.ts`** — funciones **puras** (testeables, sin Supabase) que el dashboard, cuentas, presupuestos y metas reusan:
   - `calcularSaldoCuenta(cuenta, movimientos, transferencias)` → saldo según la fórmula de la spec (excluye `estado='pendiente'`).
   - `calcularPatrimonioNeto(cuentas, ...)` → Σ activos − Σ pasivos (tarjetas de crédito).
   - `calcularKPIs(movimientos)` → `{ balance, ingresos, gastos, porcentajeAhorro }` (solo confirmados; transferencias **no** cuentan).
   - `gastosPorCategoria(movimientos, categorias)` → datos para gráfica de dona (agrupa subcategorías hacia el padre).
   - `ingresosVsGastosUltimos6Meses(movimientos)` → datos para gráfica de barras.
   - `progresoPresupuesto(gastado, limite)` → `{ porcentaje, estado: 'ok' | 'alerta' | 'excedido' }` (umbrales 80% / 100%).
   - `progresoMeta(actual, objetivo)` → `{ porcentaje, completada }`.

5. **`utils/dateUtils.ts`** — rangos de mes según `hogares.dia_inicio_mes` (mes financiero, no calendario), "últimos 6 meses" y etiquetas es-MX. Reusado por dashboard, movimientos y presupuestos.

   El dashboard se calcula en cliente con los datos del mes ya traídos (regla del CLAUDE.md: nada de vistas SQL complejas).

---

## Base de datos y flujo Supabase local

> El esquema v2 (multi-hogar) **ya está implementado y validado**. Esta sección resume su
> estructura; el detalle exhaustivo está en [`especificacion-tecnica.md`](especificacion-tecnica.md)
> y el porqué en [`decisiones-bd.md`](decisiones-bd.md). Las migraciones en
> `supabase/migrations/` son la fuente de verdad. Se aplican con `supabase db reset` en local.

- **`20260525000001_schema.sql`** — las **16 tablas**: `profiles`, `hogares`, `hogar_miembros`
  (tenancy); `cuentas`, `categorias` (con subcategorías self-ref), `etiquetas` (catálogos del
  hogar); `movimientos_recurrentes`, `movimientos`, `movimiento_etiquetas`, `transferencias`
  (transacciones); `presupuestos`, `metas`, `abonos_meta` (planificación); `deudas`,
  `pagos_deuda`, `adjuntos` (extras). `movimientos.recurrente_id` se añade con `ALTER TABLE` al
  final. Aislamiento por **`hogar_id`** (no `user_id`).
- **`20260525000002_rls.sql`** — RLS habilitado en las 16 tablas. Dos funciones helper
  `SECURITY DEFINER` (`es_miembro_hogar`, `es_dueno_hogar`) que **evitan la recursión infinita**
  de RLS en `hogar_miembros`/`hogares`. `profiles` se aísla por `id = auth.uid()`;
  `movimiento_etiquetas` deriva su RLS del movimiento padre; la gestión de miembros se restringe
  al dueño.
- **`20260525000003_indexes.sql`** — índices de FKs y de los filtros/joins frecuentes
  (`movimientos (hogar_id, fecha desc)`, `presupuestos (hogar_id, anio, mes)`,
  recurrentes activos por `proxima_fecha`, deudas pendientes, etc.).
- **`20260525000004_triggers.sql`** — tres grupos de triggers:
  1. `handle_new_user` (al alta crea perfil + hogar propio + membresía `dueno` + 14 categorías default).
  2. `sincronizar_monto_actual` / `_recalcular_meta` (mantienen `metas.monto_actual` y `completada`).
  3. nueve `validar_hogar_*` (integridad de mismo hogar + coherencia de tipo categoría↔movimiento).

  Las categorías default viven en `shared/constants/defaultCategories.ts` como fuente de verdad y
  se reflejan en el SQL del trigger; **mantenerlas sincronizadas**.

- **`seed.sql`** — solo datos de prueba para desarrollo local, no para producción.

**Borrado de categorías con movimientos:** `movimientos.categoria_id` es `on delete set null`,
así que borrar una categoría no rompe los movimientos (quedan sin categoría). Si se quiere impedir
el borrado de categorías con historial, **bloquear en la app** con un conteo previo y mostrar el
error al usuario.

**Generación de tipos:**
```bash
supabase gen types typescript --local > packages/shared/src/types/database.types.ts
# o, vía script del monorepo:
pnpm db:types
```

---

## Arquitectura de la web por feature

Cada store Zustand encapsula sus llamadas a Supabase, maneja `loading`/`error`, y los componentes nunca llaman a Supabase directo (regla del CLAUDE.md). Patrón común de store: `{ data, loading, error, fetch(), create(), update(), remove() }` con `try/catch` y error visible. **Todas las queries filtran por el `hogar_id` activo**; RLS es la red de seguridad, no el único control.

### Fase 1 — Base funcional (tenancy + transacciones)
- **Auth** (`useAuthStore`, `pages/Login`, `pages/Register`, `AuthLayout`):
  - Registro email+password, login, logout, recuperación de contraseña (`supabase.auth.resetPasswordForEmail`).
  - `useSession` hook + `onAuthStateChange` para hidratar sesión al cargar.
  - **Ruta protegida:** wrapper que redirige a `/login` si no hay sesión.
  - Al alta, el trigger `handle_new_user` ya deja perfil + hogar propio + 14 categorías; no hay que crearlos en cliente.
- **Hogar activo y perfil** (`useHogarStore`, `pages/Perfil`, `pages/Hogar`):
  - Cargar los hogares del usuario (vía `hogar_miembros`) y mantener el **hogar activo** (selector). Persistirlo en cliente.
  - Onboarding post-registro: completar perfil y ajustes del hogar (nombre, **moneda**, **`dia_inicio_mes`** — viven en `hogares`, no en el perfil).
  - **Materializar recurrentes vencidos al iniciar sesión** (ver Fase 3): el `useRecurrentesStore` corre el chequeo tras hidratar el hogar activo.
- **Cuentas** (`useCuentasStore`, `pages/Cuentas`, `components/cuentas/`):
  - CRUD de cuentas (efectivo, banco, tarjeta_credito, ahorro); campos de tarjeta (`limite_credito`, `dia_corte`, `dia_pago`) según tipo.
  - **Archivar** en vez de borrar (`archivada`). Saldo por cuenta con `calcularSaldoCuenta`. Tarjeta como pasivo (saldo negativo = deuda).
- **Categorías** (`useCategoriasStore`, `pages/Categorias`):
  - CRUD con **subcategorías** (un nivel, `categoria_padre_id`); las default llegan por trigger.
  - Selector de color e icono (lucide). Bloqueo de borrado si tiene movimientos (conteo previo).
- **Movimientos** (`useMovimientosStore`, `pages/Movimientos`):
  - CRUD (react-hook-form + zod): tipo, monto, cuenta, categoría, descripción, fecha, notas, **etiquetas**, **estado**.
  - Lista con filtros (mes/año, tipo, categoría, cuenta, etiqueta, estado) y **paginación de 20 en 20** (`range()` de Supabase).
  - Montos positivos; `tipo` define ingreso/gasto. El trigger valida que la categoría sea del mismo hogar y del mismo `tipo`.

### Fase 2 — Dashboard
- `pages/Dashboard` + `components/dashboard/`:
  - Tarjetas KPI del **mes financiero** (`calcularKPIs`, según `dia_inicio_mes`): balance, ingresos, gastos, % ahorro. Las transferencias **no** cuentan; los movimientos `pendiente` se excluyen.
  - **Patrimonio neto** (`calcularPatrimonioNeto`): activos − pasivos.
  - Gráfica de **dona** (Recharts) de gastos por categoría (agrupando subcategorías al padre).
  - Gráfica de **barras** ingresos vs gastos últimos 6 meses.
  - Selector de mes/año (`useMonthSelector`, basado en `dateUtils`). Todo en cliente con helpers puros de `shared`.

### Fase 3 — Control financiero
- **Transferencias** (`useTransferenciasStore`, `pages/Transferencias`):
  - Mover fondos entre dos cuentas del hogar (origen ≠ destino). Caso especial: **pago de tarjeta** (`banco → tarjeta_credito`).
  - No contaminan KPIs (tabla aparte). Pueden vincularse a un abono de meta.
- **Presupuestos** (`usePresupuestosStore`, `pages/Presupuestos`):
  - CRUD de límite por categoría/mes (`unique (hogar_id, categoria_id, mes, anio)`).
  - Progreso con `progresoPresupuesto`: barra **amarilla ≥80%**, **roja ≥100%**. No se copian al mes siguiente.
- **Metas** (`useMetasStore`, `pages/Metas`):
  - CRUD de meta (nombre, monto objetivo, **cuenta de ahorro obligatoria** del mismo hogar, fecha límite opcional).
  - **Abonar = crear una transferencia** hacia la cuenta de ahorro + insertar `abonos_meta`; retirar = transferencia desde ella. La app **nunca** escribe `monto_actual` ni `completada`: los mantiene el trigger.
  - Barra de progreso (`progresoMeta`); listar activas y completadas por separado.
- **Movimientos recurrentes** (`useRecurrentesStore`, `pages/Recurrentes`):
  - CRUD de plantillas (frecuencia semanal/quincenal/mensual/anual, `proxima_fecha`, `fecha_fin`, `activa`).
  - **Materialización al iniciar sesión** (modelo "pendiente por confirmar"): generar movimientos `estado='pendiente'` para las vencidas; el usuario confirma (editando el monto) o descarta. Sin `pg_cron` en v1.
- **Etiquetas** (`useEtiquetasStore`, `pages/Etiquetas`):
  - CRUD de tags del hogar; asignar varias a un movimiento (`movimiento_etiquetas`); filtrar por etiqueta.
- **Deudas** (`useDeudasStore`, `pages/Deudas`):
  - CRUD de deudas `por_cobrar` / `por_pagar`; pagos parciales/totales (`pagos_deuda`), opcionalmente ligados a un movimiento; marcar `liquidada`.

### Fase 4 — Multi-hogar y colaboración
- **Gestión de miembros** (`pages/Hogar`): ver miembros y roles; el **dueño** invita (por email/enlace) y gestiona roles; un miembro puede abandonar su propia membresía. Restricciones de mutación reforzadas por `es_dueno_hogar()` en RLS.
- **Hogares múltiples:** crear/cambiar entre varios hogares (selector ya presente desde Fase 1; aquí se completa la creación e invitación).

### Fase 5 — Adjuntos y extras
- **Adjuntos** (`pages/Movimientos` + Storage): subir comprobantes al bucket `recibos`; guardar metadatos en `adjuntos`. **Crear las políticas de Storage** del bucket al implementar este módulo.

---

## Aspectos transversales (a respetar en todo el código)

- **Idioma:** código en inglés, UI en español. Componentes PascalCase, funciones camelCase, interfaces con prefijo `I`, sin `any`.
- **Moneda:** usar `formatCurrency(amount, hogar.moneda)` de `shared` (`formatMXN` como atajo/predeterminado). La moneda vive en `hogares.moneda`; nunca formatear a mano.
- **Async:** siempre `try/catch` con error visible al usuario (toast/inline). Nunca pantalla en blanco: estados de carga y error en cada lista/formulario.
- **Sesión:** verificar sesión activa antes de llamadas; si expiró, redirigir a `/login`.
- **Diseño mobile-first** aunque la web sea la plataforma principal.
- **Env:** `apps/web/.env.local` con `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Solo se commitea `.env.example`.

---

## Dependencias principales

**Raíz (devDeps):** `typescript`, `eslint`, `@typescript-eslint/*`, `prettier`, `prettier-plugin-tailwindcss`, `supabase` (CLI).

**`packages/shared`:** `@supabase/supabase-js`, `zod`, `date-fns`. (deps peer/normales; consumido por web vía workspace `@valora/shared`.)

**`apps/web`:** `react`, `react-dom`, `react-router-dom`, `zustand`, `react-hook-form`, `@hookform/resolvers`, `recharts`, `lucide-react`, `@valora/shared` (workspace:*). Dev: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `@testing-library/react`, `jsdom`.

---

## Orden de ejecución (milestones)

1. **Andamiaje del monorepo** *(hecho)*: `pnpm-workspace.yaml`, `package.json` raíz, `tsconfig.base.json`, ESLint/Prettier, `.gitignore`, `.env.example`, `README`.
2. **`packages/shared`**: barrel + `formatMXN`/`formatCurrency` + `defaultCategories` + `createSupabaseClient`; añadir `domain.ts`, `schemas/`, `calculations.ts`, `dateUtils.ts`.
3. **Supabase local** *(hecho)*: las 4 migraciones v2 + seed aplican con `supabase db reset`; regenerar `database.types.ts` (`pnpm db:types`).
4. **`apps/web`** scaffold: Vite + React + TS, Tailwind v4 (`@tailwindcss/vite` + `global.css` con `@theme`), alias `@`, `lib/supabase.ts`, router con layout y ruta protegida.
5. **Fase 1**: auth → hogar activo/perfil (+ materialización de recurrentes al login) → cuentas → categorías → movimientos.
6. **Fase 2**: helpers de `calculations.ts` + dashboard (KPIs + patrimonio + 2 gráficas + selector de período).
7. **Fase 3**: transferencias → presupuestos (alertas 80/100%) → metas (abonos vía transferencia) → recurrentes → etiquetas → deudas.
8. **Fase 4**: gestión de miembros e invitaciones; hogares múltiples.
9. **Fase 5**: adjuntos (bucket `recibos` + políticas de Storage).
10. Repasar transversales (errores/carga, mobile-first) y tests de los helpers puros de `shared`.

---

## Verificación

- **DB** *(validado)*: `supabase db reset` aplica las 4 migraciones v2 sin error; crear un usuario de prueba dispara `handle_new_user` (perfil + hogar + membresía dueño + 14 categorías); RLS sin recursión; consultas como un usuario de otro hogar no devuelven datos ajenos.
- **Tipos**: `pnpm db:types` regenera `database.types.ts`; `pnpm -w tsc --noEmit` sin errores en `shared` y `web`.
- **App web**: `pnpm --filter web dev` arranca; flujo manual end-to-end:
  1. Registro → redirige autenticado; hogar y categorías predefinidas presentes.
  2. Crear cuenta(s); el saldo refleja `saldo_inicial` y se actualiza con movimientos/transferencias.
  3. Crear/editar/eliminar movimiento; filtros (incl. etiqueta/estado) y "cargar más" funcionan.
  4. Dashboard muestra KPIs, patrimonio y gráficas coherentes con el mes financiero; cambiar período actualiza.
  5. Transferencia entre cuentas mueve saldos sin alterar KPIs.
  6. Presupuesto al 80% pinta amarillo, al 100% rojo.
  7. Abonar a una meta (vía transferencia a su cuenta de ahorro) sube `monto_actual` (mantenido por trigger); al 100% se marca `completada`.
  8. Movimiento recurrente vencido aparece como `pendiente` al iniciar sesión y puede confirmarse editando el monto.
  9. Intentar borrar categoría con movimientos muestra error controlado.
  10. Cerrar sesión y acceder a ruta privada redirige a `/login`.
- **Helpers**: `pnpm --filter @valora/shared test` (Vitest) verde para `calcularSaldoCuenta`, `calcularKPIs`, `progresoPresupuesto`, `progresoMeta`, `formatCurrency`.
- **Lint**: `pnpm -w lint` sin errores.

---

## Fuera de alcance (planificación posterior)

- App móvil (Expo) y notificaciones push: el `shared` queda listo para soportarla, pero su plan se hará aparte.
- OAuth con Google (fase posterior según CLAUDE.md).
- Materialización de recurrentes sin abrir la app (`pg_cron` / Edge Function): explícitamente fuera de v1 (decisión #6).
- Flag `activo` en `profiles` para reflejar inactivación de usuario: fuera de v1 (decisión #15).
- Deploy a Vercel y CI (se aborda al cerrar las fases web).
