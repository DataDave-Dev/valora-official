# Valora

App de finanzas personales (web + móvil) para registrar ingresos y gastos, categorizarlos,
visualizar el estado financiero mensual, controlar presupuestos por categoría y gestionar
metas de ahorro.

## Stack

- **Web:** React 18 + TypeScript + Vite 5
- **Estilos:** Tailwind CSS v4
- **Estado:** Zustand
- **Routing:** React Router v7
- **Backend / Auth / DB:** Supabase (PostgreSQL)
- **Gráficas:** Recharts
- **Móvil (Fase 4):** Expo (React Native)
- **Monorepo:** pnpm workspaces

## Estructura

```
valora/
├── apps/
│   ├── web/            # React + Vite
│   └── mobile/         # Expo (Fase 4)
├── packages/
│   └── shared/         # @valora/shared — tipos, schemas, utils, cliente Supabase
├── supabase/           # migraciones + seed
└── docs/               # especificación técnica y plan de desarrollo
```

## Requisitos

- Node >= 20
- pnpm >= 11
- Docker (para Supabase en local)

## Puesta en marcha

```bash
# 1. Instalar dependencias (desde la raíz)
pnpm install

# 2. Levantar Supabase local (requiere Docker)
pnpm db:start
pnpm db:reset          # aplica migraciones + seed
pnpm db:types          # genera packages/shared/src/types/database.types.ts

# 3. Configurar variables de entorno de la web
cp .env.example apps/web/.env.local
# Rellenar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY con la salida de `pnpm db:start`

# 4. Arrancar la web en desarrollo
pnpm dev
```

## Scripts (raíz)

| Script | Acción |
|---|---|
| `pnpm dev` | Arranca la web en desarrollo |
| `pnpm build` | Build de producción de la web |
| `pnpm lint` | ESLint en todo el monorepo |
| `pnpm format` | Prettier sobre todo el repo |
| `pnpm typecheck` | Chequeo de tipos por paquete |
| `pnpm test` | Tests por paquete |
| `pnpm db:start` | Levanta Supabase local |
| `pnpm db:reset` | Reaplica migraciones + seed |
| `pnpm db:types` | Regenera los tipos de la BD |

## Documentación

- [`docs/especificacion-tecnica.md`](docs/especificacion-tecnica.md) — dominio, base de datos y convenciones.
- [`docs/plan-desarrollo.md`](docs/plan-desarrollo.md) — arquitectura y plan por fases.
