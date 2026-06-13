-- ════════════════════════════════════════════════════════════
-- Fase 4 — Invitaciones a hogares (colaboración multi-hogar)
--
-- Modelo "por enlace/token": el dueño crea una invitación (email + rol) y se
-- genera un `token`. El invitado, autenticado con ese mismo email, la acepta
-- vía la RPC SECURITY DEFINER `aceptar_invitacion`, que inserta la membresía
-- SIN relajar la RLS de hogar_miembros (cuya mutación sigue restringida al
-- dueño por `es_dueno_hogar()`). No se usa la service_role key en el cliente.
-- ════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- VISIBILIDAD DE CO-MIEMBROS
-- `profiles` solo era visible por su propio dueño (id = auth.uid()), así que un
-- miembro no podía ver el nombre de sus co-miembros (la lista de miembros
-- saldría sin datos). Esta función SECURITY DEFINER detecta si el usuario
-- autenticado comparte algún hogar con `_user_id`, leyendo hogar_miembros sin
-- disparar su propia RLS (evita la recursión, igual que es_miembro_hogar).
-- ────────────────────────────────────────────────────────────
create or replace function public.comparten_hogar(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from hogar_miembros propio
    join hogar_miembros otro on otro.hogar_id = propio.hogar_id
    where propio.user_id = auth.uid()
      and otro.user_id = _user_id
  );
$$;

-- Co-miembros del mismo hogar pueden leer el perfil (nombre, avatar) para
-- mostrarlo en la lista de miembros. La política propia (id = auth.uid()) ya
-- existe; esta se suma (OR lógico entre políticas SELECT).
create policy "perfil: co-miembros del mismo hogar lo ven"
  on profiles for select
  using (public.comparten_hogar(id));

-- ────────────────────────────────────────────────────────────
-- TABLA invitaciones
-- ────────────────────────────────────────────────────────────
create table invitaciones (
  id           uuid primary key default gen_random_uuid(),
  hogar_id     uuid references hogares(id) on delete cascade not null,
  email        text not null,
  rol          text check (rol in ('dueno', 'miembro')) not null default 'miembro',
  token        uuid not null default gen_random_uuid() unique,
  estado       text check (estado in ('pendiente', 'aceptada', 'cancelada'))
                 not null default 'pendiente',
  invitado_por uuid references auth.users(id) not null,
  created_at   timestamptz not null default now(),
  expira_en    timestamptz not null default (now() + interval '7 days')
);

-- Solo una invitación pendiente por (hogar, email): evita duplicados.
create unique index invitaciones_pendiente_unica
  on invitaciones (hogar_id, lower(email))
  where estado = 'pendiente';

create index invitaciones_hogar_idx on invitaciones (hogar_id);
create index invitaciones_token_idx on invitaciones (token);

-- ────────────────────────────────────────────────────────────
-- RLS — la gestión de invitaciones es exclusiva del dueño del hogar.
-- El invitado NO accede a la fila directamente: lee/acepta por token vía
-- las RPC SECURITY DEFINER de abajo.
-- ────────────────────────────────────────────────────────────
alter table invitaciones enable row level security;

create policy "invitaciones: dueño ve las de su hogar"
  on invitaciones for select
  using (public.es_dueno_hogar(hogar_id));

create policy "invitaciones: dueño crea"
  on invitaciones for insert
  with check (public.es_dueno_hogar(hogar_id) and invitado_por = auth.uid());

create policy "invitaciones: dueño actualiza"
  on invitaciones for update
  using (public.es_dueno_hogar(hogar_id));

create policy "invitaciones: dueño elimina"
  on invitaciones for delete
  using (public.es_dueno_hogar(hogar_id));

-- ────────────────────────────────────────────────────────────
-- RPC detalle_invitacion — preview por token (para la página de aceptación).
-- El token es el secreto (como cualquier enlace de invitación), por eso se
-- expone por token sin RLS. Devuelve null si el token no existe.
-- ────────────────────────────────────────────────────────────
create or replace function public.detalle_invitacion(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  inv invitaciones;
  v_hogar_nombre text;
begin
  select * into inv from invitaciones where token = p_token;
  if not found then
    return null;
  end if;

  select nombre into v_hogar_nombre from hogares where id = inv.hogar_id;

  return jsonb_build_object(
    'hogar_id', inv.hogar_id,
    'hogar_nombre', v_hogar_nombre,
    'email', inv.email,
    'rol', inv.rol,
    'estado', inv.estado,
    'expirada', (inv.expira_en < now())
  );
end;
$$;

-- ────────────────────────────────────────────────────────────
-- RPC aceptar_invitacion — el usuario autenticado debe coincidir (por email)
-- con la invitación. Inserta la membresía y marca la invitación como aceptada.
-- Lanza excepciones con mensaje legible para que el cliente las muestre.
-- ────────────────────────────────────────────────────────────
create or replace function public.aceptar_invitacion(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  inv invitaciones;
  v_correo text;
  v_hogar_nombre text;
begin
  select * into inv from invitaciones where token = p_token for update;
  if not found then
    raise exception 'Invitación no encontrada.';
  end if;

  if inv.estado <> 'pendiente' then
    raise exception 'Esta invitación ya no está disponible.';
  end if;

  if inv.expira_en < now() then
    raise exception 'Esta invitación ha expirado.';
  end if;

  v_correo := lower(auth.jwt() ->> 'email');
  if v_correo is null or v_correo <> lower(inv.email) then
    raise exception 'Esta invitación es para otro correo electrónico.';
  end if;

  insert into hogar_miembros (hogar_id, user_id, rol)
  values (inv.hogar_id, auth.uid(), inv.rol)
  on conflict (hogar_id, user_id) do nothing;

  update invitaciones set estado = 'aceptada' where id = inv.id;

  select nombre into v_hogar_nombre from hogares where id = inv.hogar_id;

  return jsonb_build_object('hogar_id', inv.hogar_id, 'hogar_nombre', v_hogar_nombre);
end;
$$;

grant execute on function public.comparten_hogar(uuid) to authenticated;
grant execute on function public.detalle_invitacion(uuid) to authenticated;
grant execute on function public.aceptar_invitacion(uuid) to authenticated;
