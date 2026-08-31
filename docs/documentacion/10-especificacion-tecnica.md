# Especificación Técnica — INVICTOS (MVP)

## 1. Contexto

Traducción de los **53 casos de uso** de `02` a servicios concretos: qué recibe cada uno, qué reglas valida, qué escribe y qué devuelve. Es el documento que un desarrollador —o un agente— consulta para implementar, y la fuente de verdad de los contratos.

**Alcance:** cubre el **MVP** (`07`, sección 3). Los casos de uso de etapas posteriores se listan en la sección 11, sin desarrollar. **[Definido — D-94]** En la revisión 13 entraron al MVP **UC-32, UC-34, UC-36, UC-38, UC-44 y UC-47**; el **score y los rankings (UC-39 a UC-41) siguen siendo de etapa futura**.

**Stack** (`09`, D-77):

- Aplicación web **Next.js (React)**: renderizado en servidor para las superficies públicas, aplicación de una sola página con sesión, instalable como PWA.
- **Capa de servicios** en TypeScript dentro del mismo proyecto, separada de la interfaz.
- **PostgreSQL** (Supabase) como única persistencia; **Supabase Auth** para identidad; **Supabase Storage** para archivos.
- Email transaccional, Web Push, tareas programadas, red de publicidad y observabilidad como servicios externos.

Se apoya en: **`03`** (modelo de datos), **`04`** (valores exactos de cada enumeración), **`06`** (por qué cada regla es como es) y **`09`** (por qué el stack es este).

---

## 2. Convenciones generales

Aplican a **todos** los servicios. Un servicio que necesite apartarse de una convención tiene que declararlo explícitamente en su ficha.

### 2.1 Organización del código

**[Definido]** Un archivo de servicio **por caso de uso**, agrupado en carpetas por dominio funcional (`01`, sección 3):

```
src/
  services/
    identidad/        organizadores/    equipos/
    torneos/          descubrimiento/   inscripciones/
    competencia/      posiciones/       social/
    notificaciones/
  db/                 schema, migraciones, consultas
  lib/                auth, errores, validación, fechas
  app/                rutas de Next.js — solo interfaz
```

**Regla de dependencia, no negociable:** `app/` puede importar de `services/`; **`services/` nunca importa de `app/`**. Es lo que mantiene la lógica de negocio extraíble a un backend propio (`09`, 6.1) y lo que permite que las tareas programadas ejecuten exactamente el mismo código que un usuario.

**[Definido] Cada servicio expone una función con la firma `(input, contexto) → resultado`**, donde `contexto` trae el usuario autenticado y sus vínculos ya resueltos (2.3). Nunca recibe objetos de petición ni de respuesta HTTP: eso lo traduce la capa de rutas.

### 2.2 Autenticación

- La sesión la gestiona **Supabase Auth**. Cada invocación con sesión resuelve el `usuario_id` en el servidor; **nunca se recibe del cliente**.
- Las superficies públicas (`02` UC-22, UC-23, UC-35, UC-36, UC-37, UC-38, UC-03, UC-08, UC-14) **se sirven sin sesión** (`06`, D-04b). No es una excepción: es el caso normal del producto.
- Sin sesión válida en un servicio que la requiere → `NO_AUTENTICADO` (401).

**[Definido] El registro pide únicamente identificador de acceso y nombre visible** (`06`, D-52). Cualquier otro dato se pide más adelante y es opcional.

### 2.3 Autorización — el patrón central de este sistema

**[Definido] Los permisos no viven en la cuenta: viven en el vínculo de la persona con una cosa puntual** (`06`, D-23, D-32). Hay exactamente **tres** vínculos, y toda decisión de acceso se resuelve contra uno de ellos:

| Vínculo | Tabla | Alcance | Roles |
|---|---|---|---|
| Persona ↔ **equipo** | `integrante_equipo` | Ese equipo | `captain`, `delegate`, `player`, `coach` |
| Persona ↔ **organización** | `miembro_organizacion` | Todos los torneos de esa organización | `owner`, `admin` |
| Persona ↔ **torneo** | `colaborador_torneo` | **Un torneo puntual** | Permisos fijos, sin rol |

**[Definido] `resolverPermisos(usuario_id, recurso)` es una única función compartida.** Devuelve el conjunto de capacidades de esa persona sobre ese recurso, combinando los tres vínculos. Ningún servicio consulta las tablas de vínculos por su cuenta: si la lógica de permisos se reimplementa por servicio, en algún lado va a quedar mal.

**Reglas que la función tiene que garantizar:**

- Un **Administrador** puede todo lo de su organización, **excepto** crear o quitar Administradores (`06`, D-64).
- Un **Colaborador** puede cargar resultados y eventos, programar y reprogramar partidos, y registrar partidos no disputados — **solo en los torneos a los que está asignado**. Nada más, y no es configurable (`06`, D-32).
- El rol **`coach`** no otorga ninguna capacidad de gestión (`06`, D-25).
- El **Capitán** es único por equipo y no puede quitarse a sí mismo sin designar reemplazo (`02`, UC-13).

Sin permiso → `SIN_PERMISO` (403). **El mensaje de error nunca revela si el recurso existe** cuando el actor no debería saberlo.

### 2.4 Formato de respuesta y de error

**Éxito:** `{ ok: true, data: … }` · **Error:** `{ ok: false, error: { codigo, mensaje, detalle? } }`

**[Definido]** Los servicios lanzan errores tipados de un módulo central (sección 9); la capa de rutas los traduce a código HTTP. Un error no controlado se traduce a `ERROR_INTERNO` (500) **sin exponer nada del interior**.

**[Definido] El `mensaje` es texto para la interfaz, en español y accionable** (`08`, sección 8). El `codigo` es para el código; nunca se muestra crudo.

### 2.5 Transacciones y concurrencia

**[Definido] Toda operación que escriba en más de una tabla se ejecuta dentro de una transacción.** No es una recomendación de higiene: es lo que sostiene la regla de negocio de que **nunca puede existir un resultado cargado que no se refleje en la tabla, ni una tabla que no se explique por los resultados** (`02`, UC-31).

Las cuatro operaciones transaccionales del MVP:

| Operación | Qué escribe junto |
|---|---|
| **Cargar resultado** (UC-31) | `partido` + `posicion` de ambos equipos + `estadistica_jugador` si hay eventos |
| **Registrar partido no disputado** (UC-33) | `partido` + `posicion` de ambos equipos |
| **Generar fixture** (UC-29) | Todos los `partido` de la fase + asignación de `grupo` en cada `inscripcion` |
| **Resolver inscripción** (UC-25) | `inscripcion` + cierre automático del torneo si se alcanzó el cupo |

**[Definido] Control de concurrencia optimista en `partido` y en `torneo`.** Ambas entidades tienen `version`; toda actualización la incluye y falla con `CONFLICTO_DE_VERSION` si cambió. Fundamento concreto: **dos colaboradores cargando la misma fecha desde dos teléfonos, en el mismo complejo, al mismo tiempo** — es el escenario real, no el borde.

### 2.6 Idempotencia

**[Definido] Las operaciones que crean vínculos son idempotentes por diseño**, apoyándose en los identificadores determinísticos del modelo (`03`): invitar dos veces a la misma persona con el mismo rol, o asignar dos veces al mismo colaborador, **confirma el vínculo existente en vez de duplicarlo o fallar**.

Es la misma decisión que el sistema de referencia tomó para su entidad de membresía, y por el mismo fundamento: con clave determinística, la condición de carrera **deja de ser posible**, no solo inofensiva.

### 2.7 Paginación, orden y filtros

- Todo listado que pueda crecer se pagina con **cursor**, no con número de página: los listados de este producto se ordenan por fecha y se les insertan filas nuevas mientras alguien scrollea.
- **Vista por defecto del descubrimiento** (UC-22): **los torneos de la ciudad de la persona** (`06`, D-90). Dentro de esa ciudad el orden es inscripciones abiertas → fecha de inicio cercana, con las organizaciones verificadas por delante a igualdad de condiciones (`06`, D-26b, D-51).
- **La ciudad no es un filtro sino el contexto** de la consulta, y sale del catálogo (`03`, 3.22), no de texto libre. Los cuatro filtros restantes de UC-22 —modalidad, categoría, estado de inscripción y fecha— **operan dentro de la ciudad**. **No hay coordenadas ni distancias** (`06`, D-89).

### 2.8 Caché y revalidación

**[Definido]** Es una convención propia de este stack y no existía en el sistema de referencia:

| Superficie | Estrategia |
|---|---|
| Ficha del torneo, fixture, tabla, perfiles públicos | Renderizado en servidor **con caché**, invalidada por evento |
| Listado de descubrimiento | Caché corta |
| Todo lo que tiene sesión | Sin caché |

**[Definido] La invalidación es por evento, no por tiempo.** Cargar un resultado invalida la ficha, el fixture y la tabla de ese torneo, y los perfiles de los dos equipos. Fundamento: la tabla es la recompensa inmediata del trabajo de carga (`08`, 11.5) — si el organizador carga y no ve el cambio, la percepción es que el producto no funciona.

### 2.9 Archivos

- Escudos, fotos de perfil y archivos de reglamento se suben **desde el cliente directo al almacenamiento**, sin pasar por los servicios; después se informa la referencia.
- Cada archivo vive bajo una ruta ligada a su dueño, y las reglas del almacenamiento impiden escribir fuera de ella.
- **Validación obligatoria de tipo y tamaño** antes de aceptar la referencia.

### 2.10 Tareas programadas

**[Definido]** Los tres procesos automáticos (sección 8) **invocan los mismos servicios que un usuario**, con un contexto de sistema. No existe una segunda implementación de la misma regla: confirmar un resultado por vencimiento del plazo pasa exactamente por donde pasa confirmarlo a mano (`09`, 6.1).

---

## 3. Esquema de datos

Traducción directa del modelo conceptual de `03`. Nombres de tabla en minúsculas y singular; nombres de columna igual que los atributos del ER.

### 3.1 Claves determinísticas — las seis tablas sin `id` propio

**[Definido]** Seis tablas **no tienen identificador propio**: su clave primaria es la combinación que las define (`03`, sección 1). Es lo que vuelve **estructuralmente imposible** el error de datos que cada una podría tener:

| Tabla | Clave primaria | Qué error vuelve imposible |
|---|---|---|
| `integrante_equipo` | `(equipo_id, perfil_id, rol_equipo)` | Que la misma persona figure dos veces con el mismo rol en un equipo |
| `miembro_organizacion` | `(organizacion_id, usuario_id, rol)` | Ídem a nivel organización |
| `colaborador_torneo` | `(torneo_id, usuario_id)` | Que alguien quede asignado dos veces al mismo torneo |
| `inscripcion` | `(torneo_id, equipo_id)` | **Que un equipo aparezca dos veces en la misma tabla de posiciones** |
| `integrante_habilitado` | `(torneo_id, equipo_id, perfil_id)` | Que un jugador figure dos veces en la misma lista de buena fe |
| `posicion` | `(grupo_id, equipo_id)` | Que un equipo tenga dos filas en la misma tabla |

### 3.2 Restricciones que la base tiene que garantizar

**[Definido]** No alcanza con validarlas en el servicio: van también en el esquema, porque son las que sostienen reglas de negocio centrales.

| Restricción | Regla que protege |
|---|---|
| `equipo.perfil_capitan_id` **no nulo** | Todo equipo tiene siempre exactamente un capitán (`06`, D-13) |
| `organizacion.usuario_titular_id` **no nulo** | Toda organización tiene siempre un titular (`02`, UC-06) |
| Único parcial sobre `(torneo_id, perfil_id)` en `integrante_habilitado` **donde el rol es jugador** | Un jugador no puede estar habilitado en dos equipos del mismo torneo (`06`, D-17b) — configurable por torneo, así que la restricción se aplica según el parámetro |
| `partido.goles_local`, `goles_visitante` **≥ 0** | — |
| Clave foránea de `partido` hacia `inscripcion`, **no hacia `equipo`** | Un partido solo puede involucrar equipos efectivamente inscriptos en ese torneo (`03`, 3.9) |
| `reglamento` único por `(torneo_id, numero_version)` | El versionado no puede tener huecos ni repetidos (`06`, D-28) |

### 3.3 Índices críticos

Los que sostienen las consultas más frecuentes o más caras:

| Índice | Para qué |
|---|---|
| `torneo (estado, ciudad_id, modalidad, categoria_edad, fecha_inicio_estimada)` | **La vista por defecto y el filtro de descubrimiento** — la consulta más frecuente del producto |
| `ciudad (provincia_id, nombre)` | El selector de ciudad, y el escalón a provincia cuando una ciudad no tiene torneos |
| `partido (torneo_id, numero_fecha)` | Fixture por fecha, y la pantalla de carga de resultados |
| `partido (estado_resultado, fecha_carga_resultado)` | La tarea que confirma resultados vencidos, sin recorrer toda la tabla |
| `posicion (grupo_id, puntos DESC, diferencia_gol DESC, goles_favor DESC)` | La tabla de posiciones ya ordenada |
| `inscripcion (torneo_id, estado)` | Panel de inscripciones del organizador |
| `integrante_equipo (perfil_id)` | "Mis equipos" y el historial de una persona |
| `torneo (organizacion_id, estado)` | "Mis torneos" y la despublicación automática |

**[Definido] La ubicación no necesita ninguna estructura especial.** Provincia y Ciudad son **dos tablas y una clave foránea** (`03`, 3.22), no un árbol: filtrar es igualdad sobre `ciudad_id`, y el escalón a provincia es un `join`. **Se descartaron `ltree`, rutas materializadas y PostGIS**, que resolvían un problema que el modelo de dos niveles no tiene. **Sin coordenadas ni consultas espaciales** (`06`, D-89): la cercanía no se calcula, la vista por defecto ya es la ciudad de la persona.

**[Definido] El catálogo de ciudades es de solo lectura para la aplicación.** Se carga una vez con los datos de Argentina y solo lo modifica la administración de la plataforma (`06`, D-88). Ningún servicio de producto lo escribe.

### 3.4 Migraciones

**[Definido]** El esquema vive en el repositorio como **migraciones versionadas y aplicables en orden**, nunca como cambios hechos a mano en un panel. Fundamento (`09`, 7.3): con un agente construyendo, un esquema que solo existe en el proveedor es un estado que nadie puede reproducir ni revisar.

---

## 4. Servicios por dominio

> **Cómo leer las tablas:** cada fila es un servicio, con el caso de uso que lo origina, quién puede invocarlo, qué recibe y qué devuelve. Los servicios con reglas complejas se desarrollan aparte, después de la tabla de su dominio.

### 4.1 D1 — Identidad y perfiles

| Servicio | UC | Quién | Entrada | Salida |
|---|---|---|---|---|
| `registrar` | UC-01 | Público | identificador de acceso, nombre visible | sesión + `perfil_deportivo` creado |
| `obtenerMiPerfil` | UC-02 | Sesión | — | perfil propio completo |
| `actualizarMiPerfil` | UC-02 | Sesión | nombre visible, foto, posición, `ciudad_id` | perfil actualizado |
| `configurarVisibilidad` | UC-04 | Sesión | `public` \| `restricted` | perfil actualizado |
| `obtenerPerfilPublico` | UC-03, UC-38 | Público | `perfil_id` | perfil + equipos + torneos + estadísticas |

**[Definido] `registrar` crea el `perfil_deportivo` en el mismo movimiento.** Toda cuenta tiene su identidad deportiva desde el día uno, aunque nunca juegue: evita un estado intermedio de "cuenta sin perfil" que todas las demás pantallas tendrían que contemplar.

**[Definido] `obtenerPerfilPublico` filtra según visibilidad, pero nunca oculta la participación.** Un perfil restringido devuelve nombre visible y sus equipos; **las estadísticas del torneo que jugó siguen siendo públicas** porque son del torneo, no del perfil (`02`, UC-04). Es la distinción que hay que comunicar en la interfaz, y también la que hay que respetar acá.

**[Definido] `registrar` completa la acción pendiente.** Si el registro se disparó desde "seguir" o "inscribirse", el servicio recibe esa intención y **la ejecuta al terminar** (`06`, D-04b). Sin esto, el recorrido de adquisición se corta justo donde más duele.

### 4.2 D2 — Organizadores

| Servicio | UC | Quién | Entrada | Salida |
|---|---|---|---|---|
| `crearOrganizacion` | UC-06 | Sesión | nombre, descripción, logo, `ciudad_id`, contacto | organización en nivel `unverified` |
| `actualizarOrganizacion` | UC-06 | Titular, Admin | datos públicos | organización |
| `solicitarVerificacionBasica` | UC-06 | Titular | — | envío del correo de confirmación |
| `confirmarVerificacionBasica` | UC-06 | Público con token | token | nivel `basic` |
| `invitarMiembro` | UC-07 | Titular | identificador, rol (`admin`) | vínculo creado |
| `quitarMiembro` | UC-07 | Titular | `usuario_id` | vínculo eliminado |
| `listarMiembros` | UC-07 | Titular, Admin | — | miembros con su rol y estado |
| `asignarColaborador` | UC-52 | Titular, Admin del torneo | `torneo_id`, identificador | vínculo creado |
| `quitarColaborador` | UC-52 | Titular, Admin del torneo | `torneo_id`, `usuario_id` | vínculo en `removed` |
| `obtenerPerfilOrganizador` | UC-08 | Público | `organizacion_id` | datos públicos + torneos + trayectoria |

**Verificación — el circuito completo (`06`, D-51, D-76)**

1. Crear la organización es **libre y automático**: nace en `unverified`.
2. En ese nivel **puede todo** —crear, configurar, publicar, gestionar el torneo entero— pero **sus torneos nacen `unlisted`** y no pueden pasar a `public`.
3. `confirmarVerificacionBasica` la lleva a `basic` **confirmando el correo de acceso, sin SMS** (`06`, D-76). Desde ahí puede publicar en el descubrimiento.
4. El nivel `trusted` es manual o por trayectoria, y **es de la segunda etapa** (`07`, sección 4).

**[Definido] Dos controles automáticos acompañan, con valores de arranque a calibrar:** una organización `unverified` puede tener **un torneo publicado a la vez**, y un torneo publicado **sin inscripciones ni fixture durante 30 días vuelve a `unlisted`** (sección 8.2).

**[Definido] `quitarColaborador` no borra el vínculo: lo pasa a `removed`.** Su historial de cargas tiene que seguir siendo atribuible — es el dato que resuelve una discusión sobre quién cargó qué.

### 4.3 D3 — Equipos y planteles

| Servicio | UC | Quién | Entrada | Salida |
|---|---|---|---|---|
| `crearEquipo` | UC-10 | Sesión | nombre, escudo, colores, `ciudad_id`, modalidad, **`categoria_genero`** | equipo + quien lo crea como `captain` |
| `actualizarEquipo` | UC-10 | Capitán, Delegado | datos de identidad | equipo |
| `archivarEquipo` | UC-15 | Capitán | `equipo_id` | equipo en `archived` |
| `invitarIntegrante` | UC-11 | Capitán, Delegado | identificador **o** datos mínimos, **rol** | vínculo `invited` o `active` |
| `responderInvitacion` | UC-12 | Persona invitada | aceptar \| rechazar | vínculo `active` o `declined` |
| `cancelarInvitacion` | UC-11 | Capitán, Delegado | `perfil_id`, rol | vínculo `cancelled` |
| `cambiarRolIntegrante` | UC-13 | Capitán | `perfil_id`, rol nuevo | vínculos reconciliados |
| `quitarIntegrante` | UC-13 | Capitán; la persona sobre sí misma | `perfil_id` | vínculo `left` |
| `solicitarIngreso` | UC-53 | Sesión con perfil | `equipo_id` | vínculo `requested` (rol `player`) |
| `resolverSolicitudIngreso` | UC-53 | Capitán, Delegado | `perfil_id`, aceptar \| rechazar | vínculo `active` o `declined` |
| `retirarSolicitudIngreso` | UC-53 | Quien la hizo | `equipo_id` | vínculo `cancelled` |
| `obtenerEquipoPublico` | UC-14, UC-37 | Público | `equipo_id` | equipo + plantel + cuerpo técnico + historial + score |

**[Definido — `06`, D-81] `categoria_genero` es obligatoria en `crearEquipo`, sin valor por defecto.** Misma enumeración que `torneo.categoria_genero` (`04`, 5.2). Falta o valor fuera de la lista → `DATOS_INVALIDOS`. No es un dato descriptivo como `modalidad_habitual`: junto con `ciudad_id` y `modalidad_habitual` **es una de las tres dimensiones del recorte del ranking** (7.3, UC-41), y el insumo de la advertencia de inscripción (4.6). Derivarla de los torneos jugados haría incalculable el recorte para todo equipo sin historial.

**[Definido — `06`, D-83] No existe `club_id` ni ninguna entidad agrupadora de equipos.** Dos equipos de una misma institución son dos filas independientes en `equipo`. El agrupador es de la segunda etapa (`07`) y **no se resuelve con `organizacion`**: esa tabla es la de quien publica torneos, y su `nivel_verificacion` habilita a hacerlo (4.2).

**`invitarIntegrante` — tres caminos según a quién se invita (`02`, UC-11)**

| Caso | Qué hace |
|---|---|
| La persona **tiene cuenta** | Crea el vínculo en `invited` y notifica. **Nunca entra al plantel sin aceptar**: aparecer en un plantel tiene consecuencias públicas |
| La persona **no tiene cuenta** | Crea un `perfil_deportivo` en `unclaimed` y el vínculo directo en `active`. No hay a quién preguntarle; el consentimiento llega con el reclamo posterior (UC-05) |
| El vínculo **ya existe** | Idempotente (2.6): confirma el existente |

**[Definido] El rol viaja en la invitación.** Invitar a alguien como DT y como jugador son **dos vínculos** (`06`, D-23). El servicio acepta varios roles en una sola invitación y crea un vínculo por cada uno.

**`solicitarIngreso` — el camino inverso (`02`, UC-53)**

| Regla | Comportamiento |
|---|---|
| Rol | **Siempre `player`**, no parametrizable. `captain`, `delegate` y `coach` son designaciones del capitán (UC-13) y no se pueden solicitar |
| Ya es integrante `active` de ese equipo | `DATOS_INVALIDOS` — no hay nada que solicitar |
| Ya tiene una solicitud `requested` | **Idempotente** (2.6): confirma la existente |
| **Existe una invitación `invited` pendiente** para ese mismo vínculo | **Pasa a `active` directamente.** Las dos partes ya consintieron, en distinto orden; pedir un paso más sería pedirle a alguien que confirme lo que acaba de pedir (`06`, D-85) |
| Vínculo previo en `declined` o `left` | Se puede volver a solicitar: **la misma fila** vuelve a `requested`, conservando su historial de estados |
| Equipo `archived` | `DATOS_INVALIDOS` |

**[Definido — `06`, D-85] La solicitud no crea perfil ni cuenta.** A diferencia de `invitarIntegrante`, acá el actor ya tiene sesión y perfil: no existe el camino de "persona sin cuenta". Es la asimetría natural entre proponer hacia afuera y pedir desde adentro.

**[Definido — `06`, D-86] `resolverSolicitudIngreso` la resuelven Capitán y Delegado**, exactamente los mismos que `invitarIntegrante`. Aceptar → `active` y la persona **pasa a seguir al equipo** con `origen = automatico` (UC-43). Rechazar → `declined`, que **no se expone en ninguna superficie pública** (`04`, 3.6).

**[Definido — `06`, D-87] `quitarIntegrante` sobre uno mismo es inmediato y no admite intermediación.** No hay estado de "baja pendiente" ni servicio de aprobación: escribe `left` y termina. Las dos únicas validaciones son las ya definidas — `CAPITAN_SIN_REEMPLAZO` (`02`, UC-13) y la permanencia en `integrante_habilitado` de los torneos en curso (`06`, D-18b), que **no bloquea la baja**: el vínculo con el equipo se corta y la habilitación al torneo sobrevive. La respuesta devuelve esa advertencia para que la interfaz pueda explicarla.

**[Definido] `quitarIntegrante` no toca la lista de buena fe de un torneo en curso.** La persona sale del plantel permanente pero **sigue habilitada en los torneos donde ya lo estaba** hasta que terminen (`06`, D-18b): un cambio administrativo del equipo no puede alterar en silencio quién podía jugar.

**[Definido] `archivarEquipo` falla con `EQUIPO_EN_TORNEO_EN_CURSO`** si el equipo participa de un torneo activo (`06`, D-68). Primero hay que resolverlo como baja del torneo.

### 4.4 D4 — Torneos

| Servicio | UC | Quién | Entrada | Salida |
|---|---|---|---|---|
| `crearTorneo` | UC-16 | Titular, Admin | datos generales, cupo, categorías, puntajes, desempates, mín/máx de lista | torneo en `draft` |
| `definirFormato` | UC-17 | Titular, Admin | formato + parámetros | fases y grupos creados |
| `actualizarTorneo` | UC-19 | Titular, Admin | campos a modificar | torneo + notificaciones si el cambio es relevante |
| `publicarTorneo` | UC-18 | Titular, Admin | `torneo_id` | torneo en `registration_open` |
| `avanzarEstado` | UC-20 | Titular, Admin | transición solicitada | torneo |
| `cancelarTorneo` | UC-21 | Titular, Admin | motivo (`04`) + texto libre | torneo `cancelled` + notificaciones |
| `publicarReglamento` | UC-51 | Titular, Admin | texto y/o archivo | versión nueva; la anterior a `superseded` |
| `obtenerFichaPublica` | UC-23 | Público | `torneo_id` | ficha completa según estado |

**`publicarTorneo` — validación y consecuencia (`02`, UC-18)**

1. Valida los **datos mínimos**: nombre, modalidad, formato, **ciudad y dirección**, fecha estimada y cupo. Falta alguno → `DATOS_MINIMOS_INCOMPLETOS`, con el detalle de cuál.
2. **El reglamento no es requisito** (`06`, D-29).
3. Según el nivel de verificación de la organización: `basic` o superior → `public`; `unverified` → **`unlisted`**, con la respuesta indicando por qué, para que la interfaz pueda explicarlo y ofrecer la verificación ahí mismo (`05`, sección 5).
4. Publicar **abre las inscripciones**. No existe estado intermedio (`06`, D-58).

**`avanzarEstado` — transiciones permitidas**

```
draft → registration_open → registration_closed → in_progress → finished
              ↕                      ↕                  ↕
          suspended             suspended          suspended
              ↓                      ↓                  ↓
                          cancelled (terminal)
```

**[Definido] Cuatro reglas de transición:**
- No se puede pasar a `in_progress` **sin fixture generado**.
- No se puede generar fixture **con inscripciones abiertas**.
- `registration_open → registration_closed` ocurre **automáticamente al alcanzar el cupo**, y el organizador puede reabrirlas o cerrarlas antes (`02`, UC-20).
- `finished` es **manual**, con sugerencia del sistema cuando no quedan partidos pendientes (`06`, D-23b). Al finalizar se acredita la posición final al score (sección 7.3).

**`actualizarTorneo` — qué notifica**

**[Definido]** Solo cinco campos disparan notificación: **fecha de inicio, sede, formato, cupo y reglamento** (`06`, D-22b). El resto se guarda en silencio. Notificar todo entrena a la gente a ignorar las notificaciones.

**[Definido] `definirFormato` falla con `TORNEO_YA_EMPEZADO`** si hay partidos jugados: cambiar el formato invalidaría la tabla y el fixture disputados.

**`publicarReglamento` — versionado (`06`, D-28)**

Cada publicación crea una versión nueva con `numero_version` incremental, pasa la anterior a `superseded`, y **si el torneo tiene equipos inscriptos, los notifica**. Las versiones anteriores **nunca se borran**: son lo que permite responder qué texto regía cuando ocurrió un hecho.

### 4.5 D5 — Descubrimiento

| Servicio | UC | Quién | Entrada | Salida |
|---|---|---|---|---|
| `buscarTorneos` | UC-22 | Público | **`ciudad_id`**, modalidad, categoría, estado, fecha, cursor | página de torneos + total |

**[Definido] Solo devuelve torneos `public`.** Los `unlisted` son accesibles por identificador directo, nunca por búsqueda (`06`, D-21b). Es la única defensa del descubrimiento contra el contenido de baja calidad, junto con la verificación.

**[Definido — `06`, D-90] `ciudad_id` no es opcional: es el contexto de la consulta.** El llamador la resuelve desde el perfil de la persona, o la pide (`08`, 11.3). **Nunca se infiere por IP ni por el último uso.**

**[Definido] Sin torneos en esa ciudad no es un error**: devuelve la lista vacía más **la provincia de esa ciudad y cuántos torneos hay en ella**. Es la pantalla donde más se pierden usuarios con intención real (`08`, 11.3), y con catálogo nacional va a ocurrir seguido — la mayoría de las ciudades va a estar vacía por mucho tiempo.

### 4.6 D6 — Inscripciones y participación

| Servicio | UC | Quién | Entrada | Salida |
|---|---|---|---|---|
| `solicitarInscripcion` | UC-24 | Capitán, Delegado | `torneo_id`, `equipo_id`, aceptación del reglamento | inscripción `pending` o `waitlisted` |
| `resolverInscripcion` | UC-25 | Titular, Admin | decisión + motivo | inscripción resuelta + notificación |
| `inscribirEquipoManual` | UC-26 | Titular, Admin | equipo existente **o** datos mínimos | inscripción `approved` |
| `confirmarPlantel` | UC-27 | Capitán, Delegado | lista de perfiles con su rol y camiseta | lista de buena fe |
| `darDeBajaDelTorneo` | UC-28 | Capitán (retiro); Titular, Admin (exclusión) | motivo | inscripción + partidos resueltos |

**`solicitarInscripcion` — reglas (`02`, UC-24)**

1. El torneo tiene que estar en `registration_open`.
2. Si ya existe inscripción vigente de ese equipo → idempotente, devuelve la existente.
3. Si el torneo tiene reglamento, **registra qué versión se aceptó** en `reglamento_version_aceptada` (`06`, D-54). Sin aceptación → `REGLAMENTO_NO_ACEPTADO`.
4. Si se alcanzó el cupo → `waitlisted` (`06`, D-27b).
5. **El equipo pasa a seguir el torneo automáticamente** (`02`, UC-42), con `origen = automatico`.
6. **Compatibilidad de categoría (`06`, D-82).** Si `torneo.categoria_genero != 'mixed'` y `equipo.categoria_genero != torneo.categoria_genero`, la inscripción se crea igual y se marca `advertencia_categoria = true`. **No es un código de error: es una bandera que viaja con el registro** hasta la ficha que ve el organizador (UC-25). El caller la recibe para poder pedir confirmación antes de enviar; el servicio no la exige. Con `torneo.categoria_genero = 'mixed'` la bandera nunca se levanta.

**[Definido] La bandera se calcula al crear la inscripción y se guarda, no se recalcula al leer.** Mismo criterio que el resto de lo derivado: si el equipo cambia su categoría después, la advertencia que vio el organizador al aprobar tiene que seguir siendo la que había en ese momento.

**[Definido — `06`, D-93] `solicitarInscripcion` siempre deja la inscripción en `pending` (o `waitlisted`).** **No existe parámetro de aprobación automática** ni rama que lleve a `approved` sin pasar por `resolverInscripcion`. El costo de inscripción se paga fuera de la aplicación (D-31), así que esa resolución es la única confirmación de que el equipo entró — y **el fixture se genera desde las inscripciones aprobadas** (4.7), con lo que un `approved` equivocado se propaga al calendario, a la tabla y al score.

**[Definido] `inscribirEquipoManual` es innegociable en el MVP.** El primer organizador llega con equipos que no tienen cuenta. Si el equipo no existe, lo crea con datos mínimos y **sin capitán asignado**: queda `unclaimed` a nivel equipo, reclamable después con el mismo mecanismo que el perfil de jugador (`06`, D-29b). **Nace `approved` en un solo paso y eso no contradice a D-93**: acá el organizador es quien inscribe, así que la decisión ya la tomó quien corresponde.

**`confirmarPlantel` — validaciones (`06`, D-59, D-17b)**

| Validación | Comportamiento |
|---|---|
| Máximo de jugadores configurado | **Bloquea** → `EXCEDE_MAXIMO_PLANTEL` |
| Mínimo de jugadores configurado | **Avisa, no bloquea** — devuelve una advertencia en la respuesta |
| Jugador ya habilitado en otro equipo del mismo torneo | **Bloquea al confirmar la lista** → `JUGADOR_YA_HABILITADO_EN_EL_TORNEO`, salvo que el torneo lo permita |
| Cuerpo técnico | **No cuenta para el cupo de jugadores** (`06`, D-24) |

**`darDeBajaDelTorneo` — el caso difícil (`06`, D-08b)**

Antes de empezar el torneo: libera el cupo, promueve al primero de la lista de espera si hay, y listo.

**Con el torneo en curso**, según el parámetro configurado del torneo, con este default:

- Los partidos **ya jugados se mantienen**.
- Los **pendientes se dan por ganados a sus rivales** (`walkover`), lo que **recalcula la posición de todos ellos**, no solo la del equipo que se va.
- El resultado del walkover usa el configurado del torneo (default 3-0); **cuenta para diferencia de gol, no para estadísticas individuales ni como partido jugado a efectos del score** (`06`, D-33b).

### 4.7 D7 — Competencia

| Servicio | UC | Quién | Entrada | Salida |
|---|---|---|---|---|
| `generarFixture` | UC-29 | Titular, Admin | `fase_id` | partidos propuestos |
| `confirmarFixture` | UC-29 | Titular, Admin | partidos ajustados | partidos creados |
| `programarPartido` | UC-30 | Titular, Admin, Colaborador | fecha, hora, sede | partido + notificaciones |
| `cargarResultado` | UC-31 | Capitán de cualquiera de los dos; Titular, Admin, Colaborador | goles + eventos opcionales + `version` | partido + tabla + estadísticas |
| `confirmarResultado` | UC-32 | Capitán del otro equipo; Titular, Admin | `partido_id` | partido `confirmed` |
| `disputarResultado` | UC-32 | Capitán de cualquiera de los dos | motivo | disputa `open` |
| `resolverDisputa` | UC-32 | Titular, Admin | corregir o ratificar | partido + disputa cerrada |
| `registrarNoDisputado` | UC-33 | Titular, Admin, Colaborador | motivo + resolución | partido + tabla |
| `cargarEventos` | UC-34 | Titular, Admin, Colaborador | goles con autor, tarjetas | eventos + estadísticas |

**`generarFixture` — genera propuesta, no verdad (`06`, D-31b)**

Devuelve los enfrentamientos **sin persistir**; `confirmarFixture` los crea. **El organizador puede editar todo antes de confirmar**: ningún generador conoce sus restricciones reales —canchas, disponibilidad, clásicos que conviene separar—, y un fixture que no se puede tocar se abandona en la primera excepción.

Por formato: **liga** (todos contra todos, ida o ida y vuelta, con fecha libre si la cantidad es impar); **eliminación** (llaves según cantidad de clasificados); **grupos + eliminatoria** (liga dentro de cada zona; las llaves se generan al cerrar la fase anterior, con los clasificados ya definidos).

Falla con `INSCRIPCIONES_ABIERTAS` si el torneo todavía las tiene abiertas, y con `FIXTURE_CON_PARTIDOS_JUGADOS` al regenerar sobre partidos ya disputados — es una acción destructiva y requiere confirmación explícita.

**`cargarResultado` — el servicio más importante del sistema**

Es el más invocado y del que dependen tabla, estadísticas y score. Dentro de **una transacción**:

1. Verifica permiso: capitán de alguno de los dos equipos, u organizador/colaborador asignado.
2. Verifica `version` del partido → `CONFLICTO_DE_VERSION` si cambió (2.5).
3. Verifica que el torneo esté `in_progress` y que el partido no esté `cancelled`.
4. Escribe goles, `estado = played`, `cargado_por_usuario_id`, `fecha_carga_resultado`.
5. Fija `estado_resultado`: **`loaded`** si cargó un capitán; **`confirmed`** si cargó el organizador o un colaborador (`06`, D-07b).
6. **Recalcula la `posicion` de los dos equipos** (sección 7.1).
7. Si vienen eventos, los registra y actualiza `estadistica_jugador` (sección 7.2).
8. Invalida la caché del torneo y de los dos equipos (2.8).
9. Notifica a ambos equipos y a los seguidores.

**[Definido — `06`, D-95] Que nazca `confirmed` no cierra la objeción.** Un resultado cargado por el organizador o por un colaborador **computa desde el primer momento**, pero el capitán de cualquiera de los dos equipos puede objetarlo con `disputarResultado` (UC-32) **durante las mismas 72 horas desde `fecha_carga_resultado`**. Objetarlo lo lleva a `disputed`, que deja de alimentar el score y marca la tabla como provisoria. **Es el mismo plazo de D-60, con otro significado:** ahí es hasta cuándo se puede confirmar, acá hasta cuándo se puede objetar. **No se implementa como dos relojes distintos** — es el mismo campo y el mismo cálculo.

**[Definido] Corregir un resultado ya cargado está permitido y queda registrado.** Se revierte el efecto anterior sobre la tabla y se aplica el nuevo, en la misma transacción. **Nunca se corrige en silencio**: en este dominio, lo que se corrige sin dejar rastro termina siendo una discusión (`05`, principio 6).

**`cargarEventos` — quién puede recibir qué (`06`, D-26)**

Solo se acreditan eventos a **integrantes habilitados en ese torneo por ese equipo**. Los **goles**, únicamente a rol `player`; las **tarjetas**, también al cuerpo técnico. Si la suma de goles individuales no coincide con el marcador, **avisa sin bloquear**: puede haber goles en contra o carga incompleta.

**`confirmarResultado` y `disputarResultado` (`06`, D-60)**

- Un resultado `loaded` pasa a `confirmed` por confirmación del otro equipo, por decisión del organizador, o **automáticamente a las 72 horas de la carga** (sección 8.1).
- Una disputa lo pasa a `disputed` y **congela el plazo** hasta que el organizador resuelva.
- **Un resultado `disputed` sigue computando en la tabla, marcado como provisorio** (`02`, UC-32): congelar la tabla ante cada disputa la vuelve inútil justo cuando más se la consulta. **Pero no alimenta el score** hasta resolverse (`06`, 5.3).

### 4.8 D8 — Posiciones y estadísticas

| Servicio | UC | Quién | Entrada | Salida |
|---|---|---|---|---|
| `obtenerTabla` | UC-35 | Público | `fase_id` o `grupo_id` | posiciones ordenadas + marca de provisorio |
| `obtenerEstadisticasTorneo` | UC-36 | Público | `torneo_id` | goleadores, tarjetas |
| `obtenerHistorialEquipo` | UC-37 | Público | `equipo_id` | torneos, desempeño por torneo y acumulado |
| `ajustarPuntos` | UC-35 | Titular, Admin | `equipo_id`, ajuste, motivo | posición actualizada |

**[Definido] `ajustarPuntos` escribe en `ajuste_puntos`, nunca en `puntos`** (`06`, D-35b). La tabla suma ambas columnas al mostrar, pero **se ve cuánto ganó en la cancha y cuánto le sacaron**. Es lo que la mantiene explicable.

### 4.9 D10 y D11 — Social y notificaciones

| Servicio | UC | Quién | Entrada | Salida |
|---|---|---|---|---|
| `seguir` / `dejarDeSeguir` | UC-42, UC-43 | Sesión | tipo + identificador | seguimiento |
| `listarNotificaciones` | UC-46 | Sesión | cursor | notificaciones accionables |
| `marcarLeida` | UC-46 | Sesión | `notificacion_id` | notificación |

**[Definido] `notificar(tipo, destinatarios, origen)` es interno y compartido.** Ningún servicio arma notificaciones por su cuenta. Resuelve destinatarios —partes involucradas y seguidores—, aplica la regla de canal (accionables por **push y email**; informativas **solo push**, `06`, D-53 y D-67) y **registra un `notificacion` por canal**, para poder responder "¿le llegó el mail o solo lo vio en la app?".

**[Definido] Seguimiento automático**: el equipo inscripto sigue el torneo; los integrantes del plantel siguen su equipo. Se marcan con `origen = automatico` para no contarlos como popularidad (`03`, 3.18).

---

## 5. Superficies públicas y renderizado

**[Definido]** Estas rutas se renderizan en el servidor, se indexan y tienen **previsualización propia al compartirse**. Es la razón por la que el stack es este (`09`, sección 2) y por lo tanto no es un detalle de implementación.

| Ruta | Contenido | Previsualización al compartir |
|---|---|---|
| `/torneo/[id]` | Ficha del torneo (UC-23) | **La más importante del producto**: nombre, modalidad, ciudad, estado y escudo/imagen. Es lo que se ve pegado en un grupo de mensajería |
| `/torneo/[id]/fixture` | Fixture y resultados | Nombre del torneo + fecha vigente |
| `/torneo/[id]/tabla` | Tabla de posiciones (UC-35) | Nombre del torneo + líder |
| `/torneo/[id]/reglamento` | Reglamento vigente (UC-51) | Nombre del torneo |
| `/equipo/[id]` | Perfil del equipo (UC-14) | Escudo, nombre, ciudad |
| `/jugador/[id]` | Perfil público (UC-03) | Nombre visible y foto, **según visibilidad** |
| `/organizador/[id]` | Perfil del organizador (UC-08) | Nombre, logo, distintivo |
| `/torneos` | Descubrimiento (UC-22) | Genérica |

**[Definido] Publicidad únicamente en `/torneos`, `/torneo/[id]` y `/torneo/[id]/fixture`** (`06`, D-63). Ninguna otra ruta la lleva, y **ninguna ruta con sesión** la lleva nunca.

---

## 6. Los tres procesos automáticos

**[Definido]** Invocan los mismos servicios que un usuario, con contexto de sistema (2.10). Salen de decisiones de negocio, no de conveniencia técnica. **Dos son del MVP** (6.1 y 6.3, este último registrando insumos); **la despublicación es de la segunda etapa** (6.2).

### 6.1 Confirmación de resultados vencidos

- **Cada hora.** Busca partidos en `loaded` con `fecha_carga_resultado` anterior a **72 horas** y **sin disputa abierta**, y los pasa a `confirmed` (`06`, D-60).
- Al confirmarse, el resultado **pasa a alimentar el score**.
- **Marca cómo quedó firme**: por vencimiento, no por confirmación de alguien. Es información distinta ante un reclamo (`05`, sección 5).

### 6.2 Despublicación por inactividad — **segunda etapa** (`06`, D-80)

- **Diaria.** Torneos `public` de organizaciones `unverified`, publicados hace más de **30 días**, **sin inscripciones aprobadas ni fixture** → vuelven a `unlisted`, con aviso al organizador (`06`, D-51).
- **No se construye en el MVP.** Con pocos torneos el problema todavía no existe, el límite de un torneo publicado a la vez ya acota el daño, y **un falso positivo despublicaría el torneo del primer organizador** — el peor error posible en esa etapa. Se especifica igual porque la infraestructura de tareas programadas del MVP (6.1) la deja lista.
- Los **30 días** son un valor de arranque a calibrar, no una regla de negocio.

### 6.3 Recálculo del score

- **Diario**, y además ante cada resultado que pasa a `confirmed` o torneo que pasa a `finished`.
- Solo computa **resultados confirmados** (`06`, 5.3).
- Guarda `valor`, `desglose_componentes` y **`version_formula`** (sección 7.3).

---

## 7. Los tres cálculos del sistema

### 7.1 Tabla de posiciones

**[Definido] Es un valor calculado y guardado en `posicion`, no una suma que se rehace en cada consulta.** Se actualiza dentro de la transacción de cada resultado. Mismo criterio que el sistema de referencia aplicó a su stock, y por el mismo fundamento: la consulta es constantísima, el recálculo es caro, y el historial completo ya existe aparte —los partidos— para poder auditar.

Por cada resultado, sobre los dos equipos: `partidos_jugados`, `ganados`/`empatados`/`perdidos`, `goles_favor`, `goles_contra`, `diferencia_gol`, y `puntos` con **los puntajes configurados del torneo** (default 3/1/0, `06`, D-20b).

**Orden:** `puntos + ajuste_puntos` → luego los criterios de desempate configurados, en su orden (default: diferencia de gol → goles a favor → enfrentamiento directo).

**[Definido] Corregir un resultado revierte y reaplica** dentro de la misma transacción. Nunca se recalcula la tabla entera: es la diferencia entre una operación instantánea y una que traba la pantalla más usada del producto.

### 7.2 Estadísticas de jugador

Se acumulan **por torneo**, no globalmente (`03`, 3.15): el acumulado plano borra la diferencia entre torneos de distinto nivel. El total histórico de una persona se obtiene **sumando sus torneos**.

Solo cuentan eventos de integrantes habilitados con rol `player`; las tarjetas del cuerpo técnico se registran pero no entran en estadística de jugador.

### 7.3 Score de equipo

**[Definido] La dirección del modelo está definida; las ponderaciones no, y no se fijan sobre el papel** (`06`, sección 5).

| Aspecto | Definido |
|---|---|
| Modelo | **Absoluto**: puntos por resultado acumulados, no relativo al rival (S-01) |
| Comparación entre torneos | **No se comparan**: los rankings son acotados por ciudad, modalidad y categoría (S-02). Las tres dimensiones se leen **del `equipo`** —`ciudad_id`, `modalidad_habitual`, `categoria_genero`— y no de los torneos jugados (`06`, D-81) |
| Antigüedad | **Decae**, ventana de arranque de **24 meses**, lineal (S-03, D-61) |
| Umbral para mostrarlo | **10 partidos confirmados y 2 torneos**; por debajo, estado `insufficient_activity` (S-04, D-61) |
| Comportamiento | **Indicador separado** de confiabilidad, no mezclado con el deportivo (S-05) |
| Qué computa | Solo `confirmed`. **No** computan walkovers como partido jugado, ni seguidores (D-33b, D-40b) |
| Torneo cancelado | Cuentan los partidos jugados; **no** se acredita posición final (D-24b) |

**[Definido] Cada cálculo guarda `version_formula`.** La fórmula va a cambiar: sin este campo, el primer ajuste reescribe silenciosamente la historia de todos los equipos y nadie puede explicar por qué su score bajó de un día para otro.

**[Definido] El score se guarda con su `desglose_componentes`**, para poder mostrar de dónde sale sin recalcularlo, y para poder explicar un valor histórico aunque la fórmula haya cambiado (UC-40).

---

## 8. Códigos de error

Módulo central de constantes; ningún servicio inventa códigos sueltos.

### 8.1 Transversales

| Código | HTTP | Cuándo |
|---|---|---|
| `NO_AUTENTICADO` | 401 | Falta sesión válida |
| `SIN_PERMISO` | 403 | El vínculo no habilita la operación |
| `NO_ENCONTRADO` | 404 | El recurso no existe o el actor no debería saber que existe |
| `DATOS_INVALIDOS` | 400 | Falla la validación de entrada |
| `CONFLICTO_DE_VERSION` | 409 | El recurso cambió desde que se leyó (2.5) |
| `ERROR_INTERNO` | 500 | No controlado, sin exponer detalle |

### 8.2 De negocio

| Código | HTTP | Regla que protege |
|---|---|---|
| `DATOS_MINIMOS_INCOMPLETOS` | 400 | Publicar un torneo sin lo que un capitán necesita para decidir (UC-18) |
| `ORGANIZACION_NO_VERIFICADA` | 409 | Intento de pasar un torneo a `public` sin verificación básica (D-51) |
| `LIMITE_TORNEOS_PUBLICADOS` | 409 | Una organización `unverified` con un torneo ya publicado (D-51) |
| `INSCRIPCIONES_CERRADAS` | 409 | Inscribirse fuera de `registration_open` |
| `CUPO_COMPLETO` | 409 | Solo si el torneo no admite lista de espera |
| `REGLAMENTO_NO_ACEPTADO` | 400 | Inscribirse sin aceptar el reglamento vigente (D-54) |
| `EXCEDE_MAXIMO_PLANTEL` | 409 | Lista de buena fe por encima del máximo (D-59) |
| `JUGADOR_YA_HABILITADO_EN_EL_TORNEO` | 409 | Mismo jugador en dos equipos del mismo torneo (D-17b) |
| `INSCRIPCIONES_ABIERTAS` | 409 | Generar fixture antes de cerrarlas (UC-29) |
| `FIXTURE_CON_PARTIDOS_JUGADOS` | 409 | Regenerar sobre partidos disputados |
| `TORNEO_NO_EN_CURSO` | 409 | Cargar resultado con el torneo fuera de `in_progress` |
| `TORNEO_YA_EMPEZADO` | 409 | Cambiar el formato con partidos jugados (UC-17) |
| `TRANSICION_NO_PERMITIDA` | 409 | Salto de estado inválido (UC-20) |
| `EQUIPO_EN_TORNEO_EN_CURSO` | 409 | Archivar un equipo que está compitiendo (D-68) |
| `CAPITAN_SIN_REEMPLAZO` | 409 | El capitán intenta dejar el equipo sin designar otro (UC-13) |
| `ROL_TITULAR_NO_GESTIONABLE` | 403 | Asignar o quitar el rol de titular por la vía general (UC-06) |
| `ADMIN_NO_PUEDE_GESTIONAR_ADMINS` | 403 | Un administrador creando o quitando administradores (D-64) |
| `PERFIL_YA_RECLAMADO` | 409 | Reclamo sobre un perfil con cuenta asociada (UC-05) |

---

## 9. Seguridad

- **La autorización vive en los servicios** (2.3). Las reglas de la base son la **última línea de defensa**: impiden cualquier acceso directo que no venga de los servicios (`09`, 6.2). Mismo criterio que el sistema de referencia aplicó a sus reglas de seguridad.
- **Nada de identificadores de usuario recibidos del cliente**: siempre se resuelven desde la sesión.
- **Validación de entrada en el borde del servicio**, con esquemas tipados. Un servicio nunca confía en su entrada.
- **Límite de frecuencia** en registro, envío de correos de verificación e inscripción, para que crear cuentas y organizaciones descartables no sea gratis ni cómodo (D-51).
- **Los errores nunca revelan existencia** de recursos que el actor no debería conocer.
- **Las rutas de archivos están ligadas a su dueño**, y las reglas del almacenamiento impiden escribir fuera de ellas.

---

## 10. Decisiones técnicas registradas

| # | Pregunta | Decisión | Fundamento |
|---|---|---|---|
| **T-01** | ¿Dónde vive la lógica de negocio? | En **servicios**, uno por caso de uso, con dependencia unidireccional hacia la interfaz (2.1) | Es lo que permite que las tareas programadas ejecuten el mismo código, y lo que hace barata la app nativa después |
| **T-02** | ¿Cómo se resuelven los permisos? | Una **única función** que combina los tres vínculos (2.3) | Reimplementar permisos por servicio garantiza que en algún lado quede mal |
| **T-03** | ¿Concurrencia en la carga de resultados? | **Control optimista con `version`** en partido y torneo (2.5) | Dos colaboradores cargando la misma fecha desde dos teléfonos es el escenario real, no el borde |
| **T-04** | ¿La tabla se calcula o se guarda? | **Se guarda y se actualiza por resultado**; corregir revierte y reaplica (7.1) | La consulta es constantísima y el recálculo completo trabaría la pantalla más usada |
| **T-05** | ¿Cómo se invalida la caché? | **Por evento, no por tiempo** (2.8) | Si el organizador carga un resultado y no ve la tabla cambiar, la percepción es que el producto no funciona |
| **T-06** | ¿Qué pasa si dos personas invitan a la vez? | **Idempotencia por clave determinística** (2.6) | Con clave determinística la condición de carrera deja de ser posible, no solo inofensiva |
| **T-07** | ¿El esquema se administra a mano? | **No: migraciones versionadas en el repositorio** (3.4) | Con un agente construyendo, un esquema que solo existe en el proveedor es un estado que nadie puede reproducir ni revisar |
| **T-08** | ¿Se guarda por qué canal salió cada aviso? | **Sí, un registro por canal** (4.9) | Es la única forma de responder "¿le llegó el mail o solo lo vio en la app?" cuando alguien dice que no se enteró |

---

## 11. Fuera de alcance de esta especificación

Casos de uso documentados en `02` pero de etapas posteriores (`07`, secciones 4 y 5): **UC-05** (reclamar perfil), **UC-09** (transferir titularidad), **UC-32** en su variante completa de disputa —el MVP arranca con carga solo del organizador (`07`, 3.1)—, **UC-34** (eventos), **UC-36** y **UC-38** (estadísticas completas), **UC-39** a **UC-41** (score y rankings), **UC-44** (feed), **UC-45** (seguir jugadores), **UC-47** (preferencias) y **UC-48** a **UC-50** (administración de plataforma).

También queda fuera: pasarela de pagos, WhatsApp, app nativa y búsqueda geográfica (`09`, sección 4).

**[Definido] Los servicios de score (7.3) se especifican igual aunque no sean MVP**, porque **los insumos se registran desde el día uno** (`06`, 5.4). Lo que no se construye ahora es el cálculo; lo que sí, es no perder el dato.
