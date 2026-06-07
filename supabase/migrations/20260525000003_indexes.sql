-- ============================================================
-- Valora — Índices v2 (multi-hogar)
-- Se indexan todas las FKs que aparecen en filtros y joins frecuentes.
-- Prefijo de nombre: idx_<tabla>_<columnas>.
-- ============================================================

-- ════════════ hogar_miembros ════════════
-- Lookup más frecuente: dado un user_id, ¿a qué hogares pertenece?
create index idx_hogar_miembros_user on hogar_miembros (user_id);

-- ════════════ cuentas ════════════
create index idx_cuentas_hogar on cuentas (hogar_id);

-- ════════════ categorias ════════════
create index idx_categorias_hogar on categorias (hogar_id);
-- Árbol de subcategorías
create index idx_categorias_padre on categorias (categoria_padre_id)
  where categoria_padre_id is not null;

-- ════════════ etiquetas ════════════
create index idx_etiquetas_hogar on etiquetas (hogar_id);

-- ════════════ movimientos_recurrentes ════════════
create index idx_recurrentes_hogar       on movimientos_recurrentes (hogar_id);
create index idx_recurrentes_cuenta      on movimientos_recurrentes (cuenta_id);
create index idx_recurrentes_categoria   on movimientos_recurrentes (categoria_id)
  where categoria_id is not null;
-- Consulta cron: buscar recurrentes activos con proxima_fecha <= hoy
create index idx_recurrentes_proxima     on movimientos_recurrentes (proxima_fecha)
  where activa = true;

-- ════════════ movimientos ════════════
-- Filtro principal: hogar + fecha (paginación cronológica del mes)
create index idx_movimientos_hogar_fecha      on movimientos (hogar_id, fecha desc);
create index idx_movimientos_cuenta           on movimientos (cuenta_id);
create index idx_movimientos_categoria        on movimientos (categoria_id)
  where categoria_id is not null;
create index idx_movimientos_recurrente       on movimientos (recurrente_id)
  where recurrente_id is not null;
-- Filtro por estado (pendiente / confirmado)
create index idx_movimientos_estado           on movimientos (hogar_id, estado)
  where estado = 'pendiente';

-- ════════════ movimiento_etiquetas ════════════
-- La PK (movimiento_id, etiqueta_id) ya crea un índice compuesto.
-- Añadimos el inverso para buscar todos los movimientos de una etiqueta.
create index idx_mov_etiquetas_etiqueta on movimiento_etiquetas (etiqueta_id);

-- ════════════ transferencias ════════════
create index idx_transferencias_hogar         on transferencias (hogar_id, fecha desc);
create index idx_transferencias_cuenta_origen on transferencias (cuenta_origen);
create index idx_transferencias_cuenta_dest   on transferencias (cuenta_destino);

-- ════════════ presupuestos ════════════
-- Consulta habitual: presupuestos del hogar para mes/año concreto
create index idx_presupuestos_hogar_periodo on presupuestos (hogar_id, anio, mes);
create index idx_presupuestos_categoria     on presupuestos (categoria_id);

-- ════════════ metas ════════════
create index idx_metas_hogar         on metas (hogar_id);
-- cuenta_ahorro_id es NOT NULL (ver migración 0001), por lo que no se necesita
-- predicado parcial; el índice cubre todas las filas.
create index idx_metas_cuenta_ahorro on metas (cuenta_ahorro_id);

-- ════════════ abonos_meta ════════════
create index idx_abonos_meta_hogar        on abonos_meta (hogar_id);
create index idx_abonos_meta_meta         on abonos_meta (meta_id);
create index idx_abonos_meta_transferencia on abonos_meta (transferencia_id);

-- ════════════ deudas ════════════
create index idx_deudas_hogar     on deudas (hogar_id);
-- Consulta habitual: deudas pendientes (no liquidadas) de un hogar
create index idx_deudas_pendientes on deudas (hogar_id, liquidada)
  where liquidada = false;

-- ════════════ pagos_deuda ════════════
create index idx_pagos_deuda_hogar      on pagos_deuda (hogar_id);
create index idx_pagos_deuda_deuda      on pagos_deuda (deuda_id);
create index idx_pagos_deuda_movimiento on pagos_deuda (movimiento_id)
  where movimiento_id is not null;

-- ════════════ adjuntos ════════════
create index idx_adjuntos_hogar      on adjuntos (hogar_id);
create index idx_adjuntos_movimiento on adjuntos (movimiento_id);
