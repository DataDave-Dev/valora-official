-- ============================================================
-- Valora — Row Level Security v2 (multi-hogar)
--
-- ESTRATEGIA DE AISLAMIENTO:
--   • profiles          → id = auth.uid()
--   • hogares           → el usuario es miembro del hogar
--   • hogar_miembros    → el usuario es miembro del hogar (o es su propia fila)
--   • resto de tablas   → hogar_id está en los hogares del usuario
--
-- ANTI-RECURSIÓN:
--   Problema: si una política RLS de hogar_miembros hace un subselect directo
--   sobre hogar_miembros, PostgreSQL evalúa la política de esa misma tabla
--   para el subselect → recursión infinita en runtime.
--
--   SOLUCIÓN: dos funciones SECURITY DEFINER que leen hogar_miembros
--   sin que sus propias políticas RLS se disparen (porque se ejecutan
--   con los permisos del propietario de la función, que omite RLS):
--
--   • es_miembro_hogar(_hogar_id)  → cualquier membresía en el hogar
--   • es_dueno_hogar(_hogar_id)    → solo rol = 'dueno'
--
--   Las políticas de insert/update/delete de hogar_miembros y la de
--   delete de hogares usan es_dueno_hogar(). NINGUNA política consulta
--   hogar_miembros directamente — toda consulta pasa por estas funciones.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- FUNCIÓN HELPER: es_miembro_hogar
-- Retorna true si el usuario autenticado es miembro del hogar dado.
-- SECURITY DEFINER evita la recursión: la función consulta hogar_miembros
-- sin que las políticas de esa tabla se disparen de nuevo.
-- ────────────────────────────────────────────────────────────
create or replace function public.es_miembro_hogar(_hogar_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from hogar_miembros
    where hogar_id = _hogar_id
      and user_id  = auth.uid()
  );
$$;

-- ────────────────────────────────────────────────────────────
-- FUNCIÓN HELPER: es_dueno_hogar
-- Retorna true si el usuario autenticado es dueño del hogar dado.
-- Gemela de es_miembro_hogar con filtro adicional rol = 'dueno'.
-- Usada en políticas de mutación de hogar_miembros y delete de hogares
-- para evitar la recursión infinita que ocurriría si esas políticas
-- hicieran un subselect directo sobre hogar_miembros.
-- ────────────────────────────────────────────────────────────
create or replace function public.es_dueno_hogar(_hogar_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from hogar_miembros
    where hogar_id = _hogar_id
      and user_id  = auth.uid()
      and rol      = 'dueno'
  );
$$;

-- ════════════ profiles ════════════
alter table profiles enable row level security;

create policy "perfil: usuario ve el suyo"
  on profiles for select using (id = auth.uid());
create policy "perfil: usuario inserta el suyo"
  on profiles for insert with check (id = auth.uid());
create policy "perfil: usuario actualiza el suyo"
  on profiles for update using (id = auth.uid());
-- No se permite delete de profiles directamente; se borra en cascada con auth.users.

-- ════════════ hogares ════════════
alter table hogares enable row level security;

-- Un usuario ve los hogares de los que es miembro.
create policy "hogar: miembro puede ver"
  on hogares for select using (public.es_miembro_hogar(id));

-- Solo el propio usuario puede crear un hogar (el trigger lo completa como dueno).
create policy "hogar: usuario puede crear"
  on hogares for insert with check (creado_por = auth.uid());

-- Cualquier miembro puede actualizar datos del hogar.
-- (Si se quiere restringir solo al dueno, ajustar aquí.)
create policy "hogar: miembro puede actualizar"
  on hogares for update using (public.es_miembro_hogar(id));

-- Solo el dueño puede eliminar el hogar.
-- Usa es_dueno_hogar() (SECURITY DEFINER) para evitar recursión RLS.
create policy "hogar: dueno puede eliminar"
  on hogares for delete using (
    public.es_dueno_hogar(id)
  );

-- ════════════ hogar_miembros ════════════
alter table hogar_miembros enable row level security;

-- Un usuario puede ver todas las membresías del hogar si él mismo es miembro.
-- Usamos es_miembro_hogar() — es SECURITY DEFINER, no hay recursión.
create policy "hogar_miembros: miembro puede ver"
  on hogar_miembros for select using (public.es_miembro_hogar(hogar_id));

-- Solo el dueño puede insertar nuevas membresías.
-- Usa es_dueno_hogar() (SECURITY DEFINER) para evitar recursión RLS.
-- Excepción: el trigger handle_new_user inserta la primera membresía del
-- dueño antes de que él sea miembro. El trigger es SECURITY DEFINER y se
-- ejecuta como postgres, por lo que omite RLS. No se necesita ajuste aquí.
create policy "hogar_miembros: dueno puede insertar"
  on hogar_miembros for insert with check (
    public.es_dueno_hogar(hogar_miembros.hogar_id)
  );

-- El dueño puede actualizar roles de otros miembros.
-- Usa es_dueno_hogar() (SECURITY DEFINER) para evitar recursión RLS.
create policy "hogar_miembros: dueno puede actualizar"
  on hogar_miembros for update using (
    public.es_dueno_hogar(hogar_miembros.hogar_id)
  );

-- El dueño puede eliminar miembros; un miembro puede abandonar su propia fila.
-- La condición (user_id = auth.uid()) es segura porque no consulta la tabla.
-- La condición de dueño usa es_dueno_hogar() para evitar recursión RLS.
create policy "hogar_miembros: dueno o propio puede eliminar"
  on hogar_miembros for delete using (
    user_id = auth.uid()
    or public.es_dueno_hogar(hogar_miembros.hogar_id)
  );

-- ════════════ cuentas ════════════
alter table cuentas enable row level security;

create policy "cuentas: miembro puede ver"
  on cuentas for select using (public.es_miembro_hogar(hogar_id));
create policy "cuentas: miembro puede insertar"
  on cuentas for insert with check (public.es_miembro_hogar(hogar_id));
create policy "cuentas: miembro puede actualizar"
  on cuentas for update using (public.es_miembro_hogar(hogar_id));
create policy "cuentas: miembro puede eliminar"
  on cuentas for delete using (public.es_miembro_hogar(hogar_id));

-- ════════════ categorias ════════════
alter table categorias enable row level security;

create policy "categorias: miembro puede ver"
  on categorias for select using (public.es_miembro_hogar(hogar_id));
create policy "categorias: miembro puede insertar"
  on categorias for insert with check (public.es_miembro_hogar(hogar_id));
create policy "categorias: miembro puede actualizar"
  on categorias for update using (public.es_miembro_hogar(hogar_id));
create policy "categorias: miembro puede eliminar"
  on categorias for delete using (public.es_miembro_hogar(hogar_id));

-- ════════════ etiquetas ════════════
alter table etiquetas enable row level security;

create policy "etiquetas: miembro puede ver"
  on etiquetas for select using (public.es_miembro_hogar(hogar_id));
create policy "etiquetas: miembro puede insertar"
  on etiquetas for insert with check (public.es_miembro_hogar(hogar_id));
create policy "etiquetas: miembro puede actualizar"
  on etiquetas for update using (public.es_miembro_hogar(hogar_id));
create policy "etiquetas: miembro puede eliminar"
  on etiquetas for delete using (public.es_miembro_hogar(hogar_id));

-- ════════════ movimientos_recurrentes ════════════
alter table movimientos_recurrentes enable row level security;

create policy "recurrentes: miembro puede ver"
  on movimientos_recurrentes for select using (public.es_miembro_hogar(hogar_id));
create policy "recurrentes: miembro puede insertar"
  on movimientos_recurrentes for insert with check (public.es_miembro_hogar(hogar_id));
create policy "recurrentes: miembro puede actualizar"
  on movimientos_recurrentes for update using (public.es_miembro_hogar(hogar_id));
create policy "recurrentes: miembro puede eliminar"
  on movimientos_recurrentes for delete using (public.es_miembro_hogar(hogar_id));

-- ════════════ movimientos ════════════
alter table movimientos enable row level security;

create policy "movimientos: miembro puede ver"
  on movimientos for select using (public.es_miembro_hogar(hogar_id));
create policy "movimientos: miembro puede insertar"
  on movimientos for insert with check (public.es_miembro_hogar(hogar_id));
create policy "movimientos: miembro puede actualizar"
  on movimientos for update using (public.es_miembro_hogar(hogar_id));
create policy "movimientos: miembro puede eliminar"
  on movimientos for delete using (public.es_miembro_hogar(hogar_id));

-- ════════════ movimiento_etiquetas ════════════
-- Esta tabla puente no tiene hogar_id propio; la membresía se deriva
-- del movimiento al que pertenece la relación.
alter table movimiento_etiquetas enable row level security;

create policy "mov_etiquetas: miembro puede ver"
  on movimiento_etiquetas for select using (
    exists (
      select 1 from movimientos m
      where m.id = movimiento_id
        and public.es_miembro_hogar(m.hogar_id)
    )
  );
create policy "mov_etiquetas: miembro puede insertar"
  on movimiento_etiquetas for insert with check (
    exists (
      select 1 from movimientos m
      where m.id = movimiento_id
        and public.es_miembro_hogar(m.hogar_id)
    )
  );
create policy "mov_etiquetas: miembro puede eliminar"
  on movimiento_etiquetas for delete using (
    exists (
      select 1 from movimientos m
      where m.id = movimiento_id
        and public.es_miembro_hogar(m.hogar_id)
    )
  );

-- ════════════ transferencias ════════════
alter table transferencias enable row level security;

create policy "transferencias: miembro puede ver"
  on transferencias for select using (public.es_miembro_hogar(hogar_id));
create policy "transferencias: miembro puede insertar"
  on transferencias for insert with check (public.es_miembro_hogar(hogar_id));
create policy "transferencias: miembro puede actualizar"
  on transferencias for update using (public.es_miembro_hogar(hogar_id));
create policy "transferencias: miembro puede eliminar"
  on transferencias for delete using (public.es_miembro_hogar(hogar_id));

-- ════════════ presupuestos ════════════
alter table presupuestos enable row level security;

create policy "presupuestos: miembro puede ver"
  on presupuestos for select using (public.es_miembro_hogar(hogar_id));
create policy "presupuestos: miembro puede insertar"
  on presupuestos for insert with check (public.es_miembro_hogar(hogar_id));
create policy "presupuestos: miembro puede actualizar"
  on presupuestos for update using (public.es_miembro_hogar(hogar_id));
create policy "presupuestos: miembro puede eliminar"
  on presupuestos for delete using (public.es_miembro_hogar(hogar_id));

-- ════════════ metas ════════════
alter table metas enable row level security;

create policy "metas: miembro puede ver"
  on metas for select using (public.es_miembro_hogar(hogar_id));
create policy "metas: miembro puede insertar"
  on metas for insert with check (public.es_miembro_hogar(hogar_id));
create policy "metas: miembro puede actualizar"
  on metas for update using (public.es_miembro_hogar(hogar_id));
create policy "metas: miembro puede eliminar"
  on metas for delete using (public.es_miembro_hogar(hogar_id));

-- ════════════ abonos_meta ════════════
alter table abonos_meta enable row level security;

create policy "abonos_meta: miembro puede ver"
  on abonos_meta for select using (public.es_miembro_hogar(hogar_id));
create policy "abonos_meta: miembro puede insertar"
  on abonos_meta for insert with check (public.es_miembro_hogar(hogar_id));
create policy "abonos_meta: miembro puede eliminar"
  on abonos_meta for delete using (public.es_miembro_hogar(hogar_id));

-- ════════════ deudas ════════════
alter table deudas enable row level security;

create policy "deudas: miembro puede ver"
  on deudas for select using (public.es_miembro_hogar(hogar_id));
create policy "deudas: miembro puede insertar"
  on deudas for insert with check (public.es_miembro_hogar(hogar_id));
create policy "deudas: miembro puede actualizar"
  on deudas for update using (public.es_miembro_hogar(hogar_id));
create policy "deudas: miembro puede eliminar"
  on deudas for delete using (public.es_miembro_hogar(hogar_id));

-- ════════════ pagos_deuda ════════════
alter table pagos_deuda enable row level security;

create policy "pagos_deuda: miembro puede ver"
  on pagos_deuda for select using (public.es_miembro_hogar(hogar_id));
create policy "pagos_deuda: miembro puede insertar"
  on pagos_deuda for insert with check (public.es_miembro_hogar(hogar_id));
create policy "pagos_deuda: miembro puede actualizar"
  on pagos_deuda for update using (public.es_miembro_hogar(hogar_id));
create policy "pagos_deuda: miembro puede eliminar"
  on pagos_deuda for delete using (public.es_miembro_hogar(hogar_id));

-- ════════════ adjuntos ════════════
alter table adjuntos enable row level security;

create policy "adjuntos: miembro puede ver"
  on adjuntos for select using (public.es_miembro_hogar(hogar_id));
create policy "adjuntos: miembro puede insertar"
  on adjuntos for insert with check (public.es_miembro_hogar(hogar_id));
create policy "adjuntos: miembro puede eliminar"
  on adjuntos for delete using (public.es_miembro_hogar(hogar_id));
