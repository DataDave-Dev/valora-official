-- ============================================================
-- Valora — Triggers v2
--
-- 1. set_updated_at          — mantiene profiles.updated_at automáticamente.
-- 2. handle_new_user         — al registrar un usuario crea:
--      a) su fila en profiles
--      b) un hogar propio
--      c) su fila en hogar_miembros como 'dueno'
--      d) las categorías default en ese hogar
-- 3. sincronizar_monto_actual — mantiene metas.monto_actual y metas.completada
--      en sincronía con los abonos_meta / transferencias asociadas.
--      Se dispara after insert/update/delete en abonos_meta.
-- 4. validar_mismo_hogar     — before insert/update en varias tablas:
--      impide mezclar entidades de hogares distintos en una misma fila.
--      También valida que cuenta_ahorro_id sea tipo='ahorro' en metas,
--      y que categoria_id.tipo coincida con movimientos.tipo / recurrentes.tipo.
--
-- IMPORTANTE: mantener las categorías default sincronizadas con
--   packages/shared/src/constants/defaultCategories.ts
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Trigger updated_at para profiles
-- ────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. Trigger de alta de usuario
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hogar_id uuid;
  v_nombre   text;
begin
  -- a) Crear perfil básico
  insert into public.profiles (id)
  values (new.id);

  -- b) Crear hogar propio
  -- Intentamos usar el email como nombre provisional del hogar;
  -- el usuario puede cambiarlo en el onboarding.
  v_nombre := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1),
    'Mi hogar'
  );

  insert into public.hogares (nombre, creado_por, moneda)
  values (v_nombre || '''s hogar', new.id, 'MXN')
  returning id into v_hogar_id;

  -- c) Insertar al usuario como dueño del hogar
  insert into public.hogar_miembros (hogar_id, user_id, rol)
  values (v_hogar_id, new.id, 'dueno');

  -- d) Categorías predefinidas en ese hogar
  insert into public.categorias (hogar_id, nombre, tipo, color, icono, es_default)
  values
    -- Gastos
    (v_hogar_id, 'Alimentación',    'gasto',   '#ef4444', 'utensils',       true),
    (v_hogar_id, 'Transporte',      'gasto',   '#f97316', 'car',            true),
    (v_hogar_id, 'Vivienda',        'gasto',   '#8b5cf6', 'house',          true),
    (v_hogar_id, 'Salud',           'gasto',   '#ec4899', 'heart-pulse',    true),
    (v_hogar_id, 'Entretenimiento', 'gasto',   '#06b6d4', 'clapperboard',   true),
    (v_hogar_id, 'Educación',       'gasto',   '#3b82f6', 'graduation-cap', true),
    (v_hogar_id, 'Servicios',       'gasto',   '#14b8a6', 'plug',           true),
    (v_hogar_id, 'Ropa',            'gasto',   '#a855f7', 'shirt',          true),
    (v_hogar_id, 'Otros',           'gasto',   '#6b7280', 'tag',            true),
    -- Ingresos
    (v_hogar_id, 'Sueldo',          'ingreso', '#22c55e', 'briefcase',      true),
    (v_hogar_id, 'Freelance',       'ingreso', '#10b981', 'laptop',         true),
    (v_hogar_id, 'Ventas',          'ingreso', '#84cc16', 'shopping-bag',   true),
    (v_hogar_id, 'Inversiones',     'ingreso', '#eab308', 'trending-up',    true),
    (v_hogar_id, 'Otros',           'ingreso', '#6b7280', 'tag',            true);

  return new;
end;
$$;

-- Reemplaza el trigger anterior (si existía de la migración v1)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 3. Trigger: sincronizar metas.monto_actual
--
-- Se dispara AFTER INSERT, UPDATE o DELETE en abonos_meta.
-- Recalcula monto_actual desde cero (suma agregada) para la meta
-- afectada, evitando drift acumulado. También actualiza completada.
--
-- Lógica de dirección de la transferencia respecto a la meta:
--   Si transferencia.cuenta_destino = meta.cuenta_ahorro_id → abono (+monto)
--   Si transferencia.cuenta_origen  = meta.cuenta_ahorro_id → retiro (−monto)
--   (una transferencia podría ser ninguna de las dos si la cuenta de ahorro
--    no está involucrada; esos abonos suman 0 y se ignoran en el cálculo)
--
-- UPDATE: si cambió meta_id, recalcula la meta antigua y la nueva.
-- ────────────────────────────────────────────────────────────
create or replace function public.sincronizar_monto_actual()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta_id     uuid;
  v_nuevo_monto numeric(12, 2);
begin
  -- Determinar qué meta(s) recalcular.
  -- En UPDATE con cambio de meta_id hay que recalcular ambas.
  if tg_op = 'DELETE' then
    perform public._recalcular_meta(old.meta_id);
  elsif tg_op = 'INSERT' then
    perform public._recalcular_meta(new.meta_id);
  else -- UPDATE
    perform public._recalcular_meta(new.meta_id);
    if new.meta_id is distinct from old.meta_id then
      perform public._recalcular_meta(old.meta_id);
    end if;
  end if;

  return null; -- AFTER trigger; valor de retorno ignorado
end;
$$;

-- Función auxiliar: recalcula monto_actual y completada para una meta dada.
-- Se llama desde sincronizar_monto_actual() para cada meta afectada.
create or replace function public._recalcular_meta(_meta_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuenta_ahorro_id uuid;
  v_monto_objetivo   numeric(12, 2);
  v_nuevo_monto      numeric(12, 2);
begin
  -- Obtener la cuenta de ahorro y el objetivo de la meta
  select cuenta_ahorro_id, monto_objetivo
    into v_cuenta_ahorro_id, v_monto_objetivo
    from metas
   where id = _meta_id;

  if not found then
    return; -- La meta fue eliminada; nada que actualizar
  end if;

  -- Calcular monto_actual sumando abonos y restando retiros.
  -- Un abono a la meta es una transferencia cuya cuenta_destino es la cuenta
  -- de ahorro de la meta. Un retiro es una transferencia cuya cuenta_origen
  -- es la cuenta de ahorro. El resultado tiene piso en 0.
  select greatest(
    coalesce(
      sum(
        case
          when t.cuenta_destino = v_cuenta_ahorro_id then  t.monto
          when t.cuenta_origen  = v_cuenta_ahorro_id then -t.monto
          else 0
        end
      ),
      0
    ),
    0
  )
    into v_nuevo_monto
    from abonos_meta am
    join transferencias t on t.id = am.transferencia_id
   where am.meta_id = _meta_id;

  -- Actualizar la meta (evitar write si no cambió, para no disparar cascadas)
  update metas
     set monto_actual = v_nuevo_monto,
         completada   = (v_nuevo_monto >= v_monto_objetivo)
   where id = _meta_id
     and (monto_actual is distinct from v_nuevo_monto
          or completada is distinct from (v_nuevo_monto >= v_monto_objetivo));
end;
$$;

create trigger trg_sincronizar_monto_actual
  after insert or update or delete on abonos_meta
  for each row execute function public.sincronizar_monto_actual();

-- ────────────────────────────────────────────────────────────
-- 4. Triggers de validación de mismo hogar e integridad de tipo
--
-- Antes de insertar o actualizar, verifica que todas las FKs hijas
-- pertenezcan al mismo hogar_id que la fila padre, y que el tipo de
-- categoría coincida con el tipo del movimiento / recurrente.
--
-- Una función por tabla para claridad de mensajes de error.
-- Todas son SECURITY DEFINER con search_path fijado.
-- ────────────────────────────────────────────────────────────

-- ── movimientos ──────────────────────────────────────────────
create or replace function public.validar_hogar_movimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuenta_hogar    uuid;
  v_categoria_hogar uuid;
  v_categoria_tipo  text;
  v_recurrente_hogar uuid;
begin
  -- cuenta_id debe pertenecer al mismo hogar
  select hogar_id into v_cuenta_hogar
    from cuentas where id = new.cuenta_id;
  if v_cuenta_hogar is distinct from new.hogar_id then
    raise exception 'La cuenta (id=%) no pertenece al hogar del movimiento.', new.cuenta_id;
  end if;

  -- categoria_id (si presente) debe pertenecer al mismo hogar y tener el mismo tipo
  if new.categoria_id is not null then
    select hogar_id, tipo into v_categoria_hogar, v_categoria_tipo
      from categorias where id = new.categoria_id;
    if v_categoria_hogar is distinct from new.hogar_id then
      raise exception 'La categoría (id=%) no pertenece al hogar del movimiento.', new.categoria_id;
    end if;
    if v_categoria_tipo is distinct from new.tipo then
      raise exception 'El tipo de la categoría (%) no coincide con el tipo del movimiento (%).', v_categoria_tipo, new.tipo;
    end if;
  end if;

  -- recurrente_id (si presente) debe pertenecer al mismo hogar
  if new.recurrente_id is not null then
    select hogar_id into v_recurrente_hogar
      from movimientos_recurrentes where id = new.recurrente_id;
    if v_recurrente_hogar is distinct from new.hogar_id then
      raise exception 'El movimiento recurrente (id=%) no pertenece al hogar del movimiento.', new.recurrente_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validar_hogar_movimiento
  before insert or update on movimientos
  for each row execute function public.validar_hogar_movimiento();

-- ── movimientos_recurrentes ───────────────────────────────────
create or replace function public.validar_hogar_recurrente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuenta_hogar    uuid;
  v_categoria_hogar uuid;
  v_categoria_tipo  text;
begin
  -- cuenta_id debe pertenecer al mismo hogar
  select hogar_id into v_cuenta_hogar
    from cuentas where id = new.cuenta_id;
  if v_cuenta_hogar is distinct from new.hogar_id then
    raise exception 'La cuenta (id=%) no pertenece al hogar del movimiento recurrente.', new.cuenta_id;
  end if;

  -- categoria_id (si presente) debe pertenecer al mismo hogar y tener el mismo tipo
  if new.categoria_id is not null then
    select hogar_id, tipo into v_categoria_hogar, v_categoria_tipo
      from categorias where id = new.categoria_id;
    if v_categoria_hogar is distinct from new.hogar_id then
      raise exception 'La categoría (id=%) no pertenece al hogar del movimiento recurrente.', new.categoria_id;
    end if;
    if v_categoria_tipo is distinct from new.tipo then
      raise exception 'El tipo de la categoría (%) no coincide con el tipo del movimiento recurrente (%).', v_categoria_tipo, new.tipo;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validar_hogar_recurrente
  before insert or update on movimientos_recurrentes
  for each row execute function public.validar_hogar_recurrente();

-- ── transferencias ────────────────────────────────────────────
create or replace function public.validar_hogar_transferencia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_origen_hogar  uuid;
  v_destino_hogar uuid;
begin
  select hogar_id into v_origen_hogar
    from cuentas where id = new.cuenta_origen;
  if v_origen_hogar is distinct from new.hogar_id then
    raise exception 'La cuenta de origen (id=%) no pertenece al hogar de la transferencia.', new.cuenta_origen;
  end if;

  select hogar_id into v_destino_hogar
    from cuentas where id = new.cuenta_destino;
  if v_destino_hogar is distinct from new.hogar_id then
    raise exception 'La cuenta de destino (id=%) no pertenece al hogar de la transferencia.', new.cuenta_destino;
  end if;

  return new;
end;
$$;

create trigger trg_validar_hogar_transferencia
  before insert or update on transferencias
  for each row execute function public.validar_hogar_transferencia();

-- ── presupuestos ──────────────────────────────────────────────
create or replace function public.validar_hogar_presupuesto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_categoria_hogar uuid;
begin
  select hogar_id into v_categoria_hogar
    from categorias where id = new.categoria_id;
  if v_categoria_hogar is distinct from new.hogar_id then
    raise exception 'La categoría (id=%) no pertenece al hogar del presupuesto.', new.categoria_id;
  end if;

  return new;
end;
$$;

create trigger trg_validar_hogar_presupuesto
  before insert or update on presupuestos
  for each row execute function public.validar_hogar_presupuesto();

-- ── metas ─────────────────────────────────────────────────────
create or replace function public.validar_hogar_meta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cuenta_hogar uuid;
  v_cuenta_tipo  text;
begin
  -- cuenta_ahorro_id debe pertenecer al mismo hogar y ser de tipo 'ahorro'
  select hogar_id, tipo into v_cuenta_hogar, v_cuenta_tipo
    from cuentas where id = new.cuenta_ahorro_id;
  if v_cuenta_hogar is distinct from new.hogar_id then
    raise exception 'La cuenta de ahorro (id=%) no pertenece al hogar de la meta.', new.cuenta_ahorro_id;
  end if;
  if v_cuenta_tipo is distinct from 'ahorro' then
    raise exception 'La cuenta (id=%) debe ser de tipo ''ahorro'' para vincularse a una meta (tipo actual: %).', new.cuenta_ahorro_id, v_cuenta_tipo;
  end if;

  return new;
end;
$$;

create trigger trg_validar_hogar_meta
  before insert or update on metas
  for each row execute function public.validar_hogar_meta();

-- ── abonos_meta ───────────────────────────────────────────────
create or replace function public.validar_hogar_abono_meta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta_hogar         uuid;
  v_cuenta_ahorro_id   uuid;
  v_transferencia_hogar uuid;
  v_t_origen           uuid;
  v_t_destino          uuid;
begin
  -- meta_id debe pertenecer al mismo hogar
  select hogar_id, cuenta_ahorro_id into v_meta_hogar, v_cuenta_ahorro_id
    from metas where id = new.meta_id;
  if v_meta_hogar is distinct from new.hogar_id then
    raise exception 'La meta (id=%) no pertenece al hogar del abono.', new.meta_id;
  end if;

  -- transferencia_id debe pertenecer al mismo hogar
  select hogar_id, cuenta_origen, cuenta_destino
    into v_transferencia_hogar, v_t_origen, v_t_destino
    from transferencias where id = new.transferencia_id;
  if v_transferencia_hogar is distinct from new.hogar_id then
    raise exception 'La transferencia (id=%) no pertenece al hogar del abono.', new.transferencia_id;
  end if;

  -- La transferencia debe involucrar la cuenta de ahorro de la meta
  -- (ya sea como origen —retiro— o como destino —abono—)
  if v_t_origen is distinct from v_cuenta_ahorro_id
     and v_t_destino is distinct from v_cuenta_ahorro_id then
    raise exception 'La transferencia (id=%) no involucra la cuenta de ahorro de la meta (cuenta_ahorro_id=%).', new.transferencia_id, v_cuenta_ahorro_id;
  end if;

  return new;
end;
$$;

create trigger trg_validar_hogar_abono_meta
  before insert or update on abonos_meta
  for each row execute function public.validar_hogar_abono_meta();

-- ── pagos_deuda ───────────────────────────────────────────────
create or replace function public.validar_hogar_pago_deuda()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deuda_hogar      uuid;
  v_movimiento_hogar uuid;
begin
  -- deuda_id debe pertenecer al mismo hogar
  select hogar_id into v_deuda_hogar
    from deudas where id = new.deuda_id;
  if v_deuda_hogar is distinct from new.hogar_id then
    raise exception 'La deuda (id=%) no pertenece al hogar del pago.', new.deuda_id;
  end if;

  -- movimiento_id (si presente) debe pertenecer al mismo hogar
  if new.movimiento_id is not null then
    select hogar_id into v_movimiento_hogar
      from movimientos where id = new.movimiento_id;
    if v_movimiento_hogar is distinct from new.hogar_id then
      raise exception 'El movimiento (id=%) no pertenece al hogar del pago de deuda.', new.movimiento_id;
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_validar_hogar_pago_deuda
  before insert or update on pagos_deuda
  for each row execute function public.validar_hogar_pago_deuda();

-- ── movimiento_etiquetas ──────────────────────────────────────
-- Esta tabla no tiene hogar_id propio; derivamos el hogar de la FK.
create or replace function public.validar_hogar_mov_etiqueta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mov_hogar      uuid;
  v_etiqueta_hogar uuid;
begin
  select hogar_id into v_mov_hogar
    from movimientos where id = new.movimiento_id;
  select hogar_id into v_etiqueta_hogar
    from etiquetas where id = new.etiqueta_id;

  if v_mov_hogar is distinct from v_etiqueta_hogar then
    raise exception 'El movimiento (id=%) y la etiqueta (id=%) pertenecen a hogares distintos.', new.movimiento_id, new.etiqueta_id;
  end if;

  return new;
end;
$$;

create trigger trg_validar_hogar_mov_etiqueta
  before insert or update on movimiento_etiquetas
  for each row execute function public.validar_hogar_mov_etiqueta();

-- ── adjuntos ──────────────────────────────────────────────────
create or replace function public.validar_hogar_adjunto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movimiento_hogar uuid;
begin
  select hogar_id into v_movimiento_hogar
    from movimientos where id = new.movimiento_id;
  if v_movimiento_hogar is distinct from new.hogar_id then
    raise exception 'El movimiento (id=%) no pertenece al hogar del adjunto.', new.movimiento_id;
  end if;

  return new;
end;
$$;

create trigger trg_validar_hogar_adjunto
  before insert or update on adjuntos
  for each row execute function public.validar_hogar_adjunto();
