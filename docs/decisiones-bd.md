# Decisiones de arquitectura de base de datos — Valora (esquema v2)

> Registro de decisiones (ADR ligero). Cada entrada explica el **qué**, el **porqué**
> y las **alternativas descartadas**. Es el complemento de "por qué" que no cabe en la
> [especificación técnica](especificacion-tecnica.md), que documenta el "qué" en detalle.
>
> Las migraciones reales son la fuente de verdad del esquema:
> `supabase/migrations/20260525000001_schema.sql` … `_04_triggers.sql`.

---

## Índice

| # | Decisión |
|---|---|
| 1 | Tenancy por `hogar_id`, no por `user_id` |
| 2 | Tipos de cuenta; tarjeta de crédito como pasivo; archivar, no borrar |
| 3 | Saldo y patrimonio calculados con agregado ligero en cliente |
| 4 | Transferencias en tabla aparte |
| 5 | Un movimiento = una categoría; montos positivos + `tipo`; estado pendiente/confirmado |
| 6 | Movimientos recurrentes: modelo "pendiente por confirmar" disparado al iniciar sesión |
| 7 | Categorías configurables con subcategorías; 14 default por hogar |
| 8 | Etiquetas libres muchos-a-muchos |
| 9 | Metas siempre respaldadas por cuenta de ahorro; abono = transferencia; `monto_actual` por trigger |
| 10 | Deudas por cobrar / por pagar con pagos ligables a movimientos |
| 11 | Adjuntos: metadatos en BD, archivo en Storage |
| 12 | Perfil personal vs ajustes del hogar (moneda y `dia_inicio_mes` viven en `hogares`) |
| 13 | RLS por membresía con funciones `SECURITY DEFINER` anti-recursión |
| 14 | Triggers de integridad de mismo hogar y de tipo |
| 15 | Las cuentas de usuario no se borran, se inactivan (`creado_por` en `NO ACTION`) |

---

## 1. Tenancy por `hogar_id`, no por `user_id`

**Decisión.** La unidad de aislamiento es el **hogar**, no el usuario. Toda tabla de datos
lleva `hogar_id`. Un usuario pertenece a uno o varios hogares mediante `hogar_miembros`
(roles `dueno` / `miembro`, ambos lectura-escritura). Al registrarse, el trigger
`handle_new_user` crea automáticamente un hogar propio y lo añade como `dueno`. La UI
trabaja sobre **un hogar activo a la vez** (selector de hogar).

**Porqué.** El producto es de finanzas personales/familiares: pareja, familia o roommates
comparten un mismo "bolsón" de cuentas y movimientos. Aislar por usuario obligaría a
duplicar o sincronizar datos entre cuentas; el hogar modela el bolsón compartido de forma
natural y mantiene un único punto de verdad para saldos y dashboard.

**Aislamiento estricto entre hogares.** Los datos **no se consolidan** entre hogares
distintos a los que pertenece un mismo usuario. Cada hogar es un silo independiente; la app
nunca suma cuentas de dos hogares.

**Alternativas descartadas.**
- *Aislamiento por `user_id` + compartición ad-hoc por recurso:* complejidad de permisos
  fila a fila, difícil de cubrir con RLS sin recursión, y rompe el cálculo de saldo único.
- *Una cuenta de Supabase por familia (login compartido):* impide trazabilidad por usuario
  (`creado_por`), roles, y multi-hogar.

---

## 2. Tipos de cuenta; tarjeta de crédito como pasivo; archivar, no borrar

**Decisión.** `cuentas.tipo` ∈ {`efectivo`, `banco`, `tarjeta_credito`, `ahorro`, `inversion`}.
La **tarjeta de crédito es un pasivo**: su saldo es negativo (deuda) y *pagarla* es una
**transferencia** `banco → tarjeta_credito`. Campos opcionales específicos de tarjeta:
`limite_credito`, `dia_corte`, `dia_pago`. Las cuentas **no se eliminan**, se **archivan**
(`archivada = true`).

El tipo **`inversion`** (brokerage, fondos, cripto, etc.) es un **activo**, igual que
`efectivo`, `banco` y `ahorro`: suma en el patrimonio neto. A nivel de presentación el
dashboard separa "Activos líquidos" (`efectivo` + `banco`) de "Invertido" (`inversion`),
pero a nivel de modelo solo importa que es activo, por lo que **no** requiere reglas de
signo especiales. Importante: las **metas de ahorro siguen exigiendo `tipo = 'ahorro'`**
(garantía del trigger `trg_validar_hogar_meta`); una cuenta `inversion` **no** puede
respaldar una meta.

**Porqué.** Tratar la tarjeta como pasivo permite calcular patrimonio neto correctamente
(activos − pasivos) sin reglas especiales en el dashboard. Archivar en vez de borrar
preserva la integridad histórica: los movimientos y transferencias que referencian la cuenta
siguen siendo válidos (las FKs hacia `cuentas` son `on delete restrict`, lo que además
impide el borrado accidental de una cuenta con historial). Modelar `inversion` como un tipo
más de cuenta activo reutiliza toda la maquinaria existente (saldo, transferencias, RLS,
índices, archivado) sin tocar triggers ni el cálculo de patrimonio.

**Alternativas descartadas.**
- *Tarjeta como cuenta de saldo positivo "deuda":* invertir el signo en cada cálculo es
  propenso a error y ensucia el patrimonio neto.
- *Borrado físico de cuentas:* rompería movimientos/transferencias históricos.
- *Tratar `inversion` como `ahorro`:* permitiría por error vincularla a una meta de ahorro
  y mezclaría conceptos distintos (capital invertido con riesgo vs. ahorro objetivo). Se
  prefiere un tipo propio que el dashboard pueda presentar por separado.

---

## 3. Saldo y patrimonio calculados con agregado ligero en cliente

**Decisión.** El saldo de una cuenta se calcula así:

```
saldo = saldo_inicial
      + Σ ingresos (movimientos tipo='ingreso', estado='confirmado')
      − Σ gastos   (movimientos tipo='gasto',   estado='confirmado')
      − Σ transferencias salientes (cuenta_origen = cuenta)
      + Σ transferencias entrantes (cuenta_destino = cuenta)
```

El **patrimonio neto** = Σ saldos de activos − Σ saldos de pasivos (tarjetas de crédito).
Se obtiene con **agregados ligeros** (sumas sobre los movimientos del periodo ya cargados),
no con vistas SQL complejas ni columnas de saldo materializadas.

**Porqué.** Coincide con la regla de proyecto "dashboard se calcula en cliente". Evita el
*drift* de un saldo materializado y el coste de mantener triggers de saldo en cada
movimiento/transferencia. El volumen de un hogar es pequeño (decenas a cientos de
movimientos/mes), así que el agregado en cliente es barato.

**Alternativas descartadas.**
- *Columna `saldo` materializada en `cuentas` mantenida por triggers:* riesgo de drift,
  más triggers y más superficie de bug; innecesario al volumen esperado.
- *Vista SQL `v_saldos`:* contradice la regla de no usar vistas SQL complejas y complica
  la paridad de cálculo entre web y móvil (que comparten helpers puros de `@valora/shared`).

---

## 4. Transferencias en tabla aparte (`transferencias`)

**Decisión.** Las transferencias entre cuentas viven en su propia tabla, **no** como dos
movimientos espejo. Tienen `cuenta_origen`, `cuenta_destino` (con `check` de que difieran)
y `monto` positivo.

**Porqué.** Una transferencia **no es ingreso ni gasto**: incluirla en `movimientos`
contaminaría los KPIs (ingresos/gastos/% de ahorro) y la gráfica por categoría. Separarla
mantiene los KPIs limpios y deja la transferencia disponible para casos especiales
(pago de tarjeta, abono a meta).

**Alternativas descartadas.**
- *Dos movimientos espejo (gasto en origen + ingreso en destino):* doble conteo en KPIs y
  necesidad de excluirlos por un flag; más frágil.

---

## 5. Un movimiento = una categoría; montos positivos; estado pendiente/confirmado

**Decisión.** Cada movimiento tiene **una sola** `categoria_id` (opcional). El `monto` es
siempre **positivo**; el campo `tipo` (`ingreso`/`gasto`) define el signo lógico. La columna
`estado` (`confirmado`/`pendiente`) permite movimientos provisionales; **los `pendiente` se
excluyen** de saldos y del dashboard hasta confirmarse.

**Porqué.** Una categoría por movimiento simplifica reportes y presupuestos (la dimensión
transversal se cubre con etiquetas, ver #8). El estado `pendiente` habilita el flujo de
recurrentes (#6) sin afectar los números reales hasta que el usuario confirme.

**Alternativas descartadas.**
- *Montos con signo:* duplica la fuente de verdad (signo + tipo) y abre inconsistencias.
- *Multi-categoría por movimiento:* complica presupuestos y agregados; las etiquetas
  resuelven la clasificación transversal sin ese coste.

---

## 6. Movimientos recurrentes: modelo "pendiente por confirmar" disparado al iniciar sesión

**Decisión.** `movimientos_recurrentes` es una **plantilla** (cuenta, categoría, tipo, monto,
`frecuencia` ∈ {semanal, quincenal, mensual, anual}, `proxima_fecha`, `fecha_fin`, `activa`).
Al **iniciar sesión**, el cliente materializa las plantillas vencidas (`proxima_fecha <= hoy`,
`activa = true`) como movimientos con `estado = 'pendiente'`. El usuario los **confirma**
(pudiendo editar el monto) o los descarta. El disparo es **del lado cliente al abrir la app**;
**no** se usa `pg_cron` ni Edge Functions por ahora.

**Porqué.** El modelo "pendiente por confirmar" da control al usuario sobre montos variables
(p. ej. recibos de luz) y evita registrar gastos que quizá no ocurrieron. Disparar en cliente
al iniciar sesión es lo más simple para v1 y no requiere infraestructura de cron ni jobs en
el servidor.

**Alternativas descartadas.**
- *`pg_cron` / Edge Function que inserta confirmados automáticamente:* requiere
  infraestructura adicional, no deja editar el monto antes de confirmar y puede registrar
  gastos inexistentes. Queda como mejora futura si se necesita materialización sin abrir la app.

---

## 7. Categorías configurables con subcategorías; 14 default por hogar

**Decisión.** `categorias` es configurable por hogar, con **subcategorías** vía auto-referencia
`categoria_padre_id` (un nivel; `null` = principal). Un movimiento puede asociarse a una
categoría principal o a una subcategoría; los **reportes agrupan hacia el padre**. Al crear un
hogar se **siembran 14 categorías default** (9 de gasto, 5 de ingreso) vía `handle_new_user`.

**Porqué.** Las subcategorías permiten granularidad (p. ej. *Transporte → Gasolina*) sin
explotar el número de categorías principales del dashboard. Sembrar defaults da una
experiencia útil desde el minuto cero.

**Sincronización.** Las 14 default deben mantenerse en sincronía con
`packages/shared/src/constants/defaultCategories.ts` (fuente de verdad para la app) y el SQL
del trigger.

**Alternativas descartadas.**
- *Árbol multinivel arbitrario:* complica el rollup de reportes y la UI; un nivel basta.
- *Categorías globales del sistema (no por hogar):* impide personalización y choca con el
  aislamiento por hogar.

---

## 8. Etiquetas libres muchos-a-muchos (`etiquetas` + `movimiento_etiquetas`)

**Decisión.** Tags libres por hogar (`unique (hogar_id, nombre)`), relacionados con
movimientos en N:M a través de la tabla puente `movimiento_etiquetas`. Son **transversales**
a la categoría.

**Porqué.** Permiten clasificaciones cruzadas que una sola categoría no captura
(p. ej. `#vacaciones-2026`, `#reembolsable`, `#regalo`) sin forzar una jerarquía. Complementan
a la categoría única (#5) cubriendo la necesidad multidimensional.

**Alternativas descartadas.**
- *Multi-categoría:* ver #5; ensucia presupuestos y agregados.
- *Campo de texto libre con separadores:* sin integridad referencial ni reuso/colores.

---

## 9. Metas siempre respaldadas por una cuenta de ahorro; abono = transferencia; `monto_actual` por trigger

**Decisión.** Toda `meta` está vinculada a una cuenta de tipo `ahorro`
(`cuenta_ahorro_id` **NOT NULL**); una misma cuenta de ahorro puede respaldar varias metas.
Cada `abonos_meta` referencia una `transferencia` (`transferencia_id` **NOT NULL**):
- **abono** = transferencia *hacia* la cuenta de ahorro,
- **retiro** = transferencia *desde* la cuenta de ahorro.

`metas.monto_actual` lo mantiene el trigger `trg_sincronizar_monto_actual` (con la auxiliar
`_recalcular_meta`): **recalcula desde cero** `Σ abonos − Σ retiros` (con **piso en 0**) y
marca `completada` automáticamente cuando `monto_actual >= monto_objetivo`.

> **Nota importante:** `monto_actual` y `completada` son **100 % derivados del trigger**.
> La aplicación **nunca** los escribe directamente; solo inserta/elimina filas en `abonos_meta`.

**Porqué.** Vincular la meta a una cuenta de ahorro real evita "dinero de fantasía": el
progreso de la meta refleja saldo realmente apartado. Modelar cada abono como transferencia
reusa el mecanismo de #4 (afecta saldos de forma consistente) y da trazabilidad. Recalcular
desde cero en el trigger elimina el *drift* que tendría un acumulador incremental.

**Alternativas descartadas.**
- *Meta como simple contador sin cuenta:* dinero no respaldado por saldo real; engañoso.
- *`monto_actual` incremental (sumar/restar en cada abono):* acumula drift ante ediciones y
  borrados; recalcular desde cero es más robusto.
- *Marcar `completada` desde la app:* fuente de verdad duplicada; se delega al trigger.

---

## 10. Deudas por cobrar / por pagar con pagos ligables a movimientos

**Decisión.** `deudas.tipo` ∈ {`por_cobrar` (te deben), `por_pagar` (debes)}, con
`contraparte`, `monto_original`, `fecha_limite` opcional y `liquidada`. Los `pagos_deuda`
registran abonos parciales/totales y pueden ligarse a un **movimiento real**
(`movimiento_id` opcional, `on delete set null`).

**Porqué.** Separar deudas de las cuentas permite seguir préstamos informales (a familiares,
amigos) que no siempre pasan por una cuenta. El `movimiento_id` opcional permite, cuando el
pago sí pasa por una cuenta, enlazarlo para trazabilidad sin obligar a ello.

**Alternativas descartadas.**
- *Modelar deudas como cuentas:* mezcla conceptos (una deuda informal no tiene saldo
  operable como una cuenta) y ensucia el patrimonio.

---

## 11. Adjuntos: metadatos en BD, archivo en Storage

**Decisión.** `adjuntos` guarda **metadatos** (`nombre`, `tipo_mime`, `tamano_bytes`) y la
`ruta` del archivo en **Supabase Storage** (bucket `recibos`). El binario no se almacena en
Postgres. Las **políticas de Storage** del bucket se crearán **cuando se implemente el módulo**.

**Porqué.** Postgres no es un blob store; Storage es más barato y eficiente para imágenes/PDF
de comprobantes. Guardar metadatos en BD permite listar y filtrar adjuntos por movimiento con
RLS por hogar.

**Pendiente.** Definir el bucket `recibos` y sus políticas (lectura/escritura por miembro del
hogar dueño del movimiento) al construir el módulo de adjuntos.

**Alternativas descartadas.**
- *`bytea` en Postgres:* infla la BD, encarece backups y degrada el rendimiento.

---

## 12. Perfil personal vs ajustes del hogar

**Decisión.** `profiles` guarda datos **personales** del usuario: `nombre`,
`apellido_paterno`, `apellido_materno`, `avatar_url`, `telefono`, `fecha_nacimiento`,
`idioma`, `tema`, `notif_email`, `onboarding_completo`. La **moneda** y el **`dia_inicio_mes`**
viven en `hogares`, **no** en el perfil.

**Porqué.** Moneda y día de inicio del mes describen el **bolsón compartido** (el hogar), no
a la persona: todos los miembros de un hogar comparten la misma moneda y la misma frontera de
"mes financiero". Ponerlos en el perfil generaría inconsistencias entre miembros del mismo
hogar.

`dia_inicio_mes` define la **frontera del mes financiero** del dashboard (p. ej. del día 25 al
24 del mes siguiente para quien cobra el 25), independiente del mes calendario.

**Alternativas descartadas.**
- *Moneda/`dia_inicio_mes` en `profiles`:* dos miembros del mismo hogar podrían ver totales
  distintos; rompe el bolsón compartido.

---

## 13. RLS por membresía con funciones `SECURITY DEFINER` anti-recursión

**Decisión.** RLS habilitado en las **16 tablas**. El acceso a las tablas con `hogar_id` se
concede si `es_miembro_hogar(hogar_id)`. `profiles` se aísla por `id = auth.uid()`. La tabla
puente `movimiento_etiquetas` (sin `hogar_id`) deriva su RLS del movimiento padre.
La gestión de miembros (insert/update/delete en `hogar_miembros`) y el delete de `hogares`
se restringen al **dueño** vía `es_dueno_hogar()`; un miembro puede eliminar su **propia** fila.

Las dos funciones (`es_miembro_hogar`, `es_dueno_hogar`) son **`SECURITY DEFINER` con
`search_path` fijado** a `public`.

**Porqué (anti-recursión).** Si una política de `hogar_miembros` hiciera un subselect directo
sobre `hogar_miembros`, PostgreSQL volvería a evaluar la política de esa misma tabla para el
subselect → **recursión infinita** en runtime. Al encapsular la consulta en una función
`SECURITY DEFINER` (que se ejecuta con los permisos del propietario y **omite RLS** en su
cuerpo), se rompe el ciclo. Por eso **ninguna política consulta `hogar_miembros`
directamente**: todas pasan por estas funciones. Fijar `search_path` evita secuestro de
nombres (seguridad de funciones `SECURITY DEFINER`).

**Alternativas descartadas.**
- *Subselects directos a `hogar_miembros` en las políticas:* recursión infinita (validado).
- *Funciones `SECURITY INVOKER`:* no rompen la recursión, porque la consulta interna seguiría
  evaluando la política de `hogar_miembros`.

---

## 14. Triggers de integridad de mismo hogar y de tipo

**Decisión.** Nueve funciones `validar_hogar_*` (`BEFORE INSERT OR UPDATE`, todas
`SECURITY DEFINER` con `search_path` fijado) validan que las **FKs cruzadas pertenezcan al
mismo hogar** que la fila, y que el **`tipo` de la categoría coincida con el `tipo` del
movimiento/recurrente** (un gasto no puede usar una categoría de ingreso). Lanzan **excepción
en español** con el id conflictivo. Adicionalmente, `validar_hogar_meta` exige que la cuenta
sea de tipo `ahorro`, y `validar_hogar_abono_meta` que la transferencia involucre la cuenta de
ahorro de la meta.

**Porqué.** RLS aísla por hogar, pero un usuario miembro de **varios** hogares podría, por un
bug de la app, referenciar una cuenta del hogar A en un movimiento del hogar B (ambos visibles
para él). Los triggers son la **segunda línea de defensa** que impide mezclar entidades de
hogares distintos y garantizan la coherencia categoría↔movimiento que el `check` de columna no
puede expresar (cruza dos tablas).

**Alternativas descartadas.**
- *Validar solo en la aplicación:* la BD quedaría sin garantía ante bugs del cliente o accesos
  directos a la API.
- *Constraints `CHECK` de columna:* no pueden consultar otras tablas (cruce de `hogar_id` o de
  `tipo` categoría↔movimiento).

---

## 15. Las cuentas de usuario no se borran, se inactivan

**Decisión.** Las **cuentas de usuario de la aplicación** (filas de `auth.users`) **no se
borran** (de momento); se **inactivan** vía Supabase Auth (`banned_until`) sin eliminar la fila
ni perder `creado_por`. Por eso las FKs `creado_por` hacia `auth.users` se dejan en
**`NO ACTION`** (sin `on delete cascade`): actúan como **barrera** contra borrados accidentales
de usuarios que aún tienen historial.

> No reintroducir un *hard-delete* de usuario. Si se borrara un usuario con `creado_por`
> referenciado, el `NO ACTION` lo impediría a propósito.

**Porqué.** Borrar un usuario destruiría la trazabilidad de quién creó cada movimiento,
transferencia o deuda dentro de un hogar compartido. Inactivar (banear) revoca el acceso sin
perder ese historial. `NO ACTION` materializa la decisión a nivel de esquema.

**A futuro.** Podría añadirse un flag `activo` en `profiles` para reflejar la inactivación
también a nivel de aplicación, pero queda **fuera de v1**.

**Alternativas descartadas.**
- *`on delete cascade` en `creado_por`:* un borrado de usuario arrastraría/huérfanaría
  historial compartido del hogar.
- *Hard-delete del usuario:* pierde trazabilidad de autoría; explícitamente rechazado.

> Nota de contraste: las FKs hacia `hogares(id)` sí usan `on delete cascade` (al borrar un
> hogar se borran sus datos), y las FKs hacia `cuentas(id)` usan `on delete restrict` (no se
> borra una cuenta con historial; se archiva, ver #2). El `NO ACTION` aplica específicamente a
> `creado_por → auth.users`.
