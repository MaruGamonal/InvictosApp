# Catálogo de Enumeraciones y Valores Fijos — INVICTOS

## 1. Objetivo del documento

Varios campos del sistema solo pueden tomar un conjunto cerrado y conocido de valores (el estado de un torneo, el rol de un integrante de equipo, el tipo de un evento de partido). Este documento es la **fuente única de verdad** para todos esos valores — el resto de los documentos debe referenciarlo en vez de repetir o redefinir los valores por su cuenta.

**Regla de mantenimiento** *(heredada del set de referencia)*: cualquier campo nuevo de valores cerrados que se incorpore al sistema debe agregarse **primero acá**, y luego referenciarse desde donde corresponda. No al revés.

**Estado de este documento:** desde la revisión 4 **todos los valores de este catálogo están `[Definido]`**. Las propuestas de la revisión 2 se adoptaron como definitivas (`06`, D-21) y las últimas enumeraciones abiertas quedaron cerradas al adoptarse las 16 recomendaciones restantes (`06`, secciones 4.3 y 4.4). Las marcas se conservan igual, porque el valor de este catálogo no es solo fijar lo decidido sino dejar visible **de dónde sale cada valor**. Lo que sigue abierto no son decisiones sino **tres catálogos a completar** — la carga nacional de ciudades y los dos de motivos —, resumidos en la sección 8: no bloquean nada, se construye con ellos y se cargan sobre la marcha.

---

## 2. Cómo leer las tablas

| Columna | Significado |
|---|---|
| Valor técnico | El identificador exacto que usa el sistema. Es el que un desarrollador usa en el código. |
| Etiqueta visible | El texto que el usuario final ve en la interfaz. Nunca se le muestra el valor técnico crudo. |
| Significado | Qué representa ese valor para el negocio. |
| Color semántico | Cuando aplica, a qué categoría de la paleta semántica corresponde (éxito / información / advertencia / error / neutro). El detalle de la paleta vivirá en el futuro Brief de Diseño; acá se declara solo la categoría. |
| ¿Dónde se usa? | Referencia cruzada al caso de uso o a la entidad. |

---

## 3. Roles y vínculos entre personas y entidades

### 3.1 `Usuario.estado`

| Valor técnico | Etiqueta visible | Significado | Color | ¿Dónde se usa? |
|---|---|---|---|---|
| `invited` | Invitado | Cuenta creada por una invitación (a una organización), sin acceso definido todavía | Advertencia | UC-07 |
| `active` | Activo | Cuenta con acceso normal | Éxito | UC-01 |
| `inactive` | Inactivo | Cuenta sin acceso, sin borrar el historial | Neutro | ER 3.1 |

### 3.2 `MiembroOrganizacion.rol`

*Lista fija, no una colección editable — mismo criterio que el catálogo de roles del set de referencia.*

| Valor técnico | Etiqueta visible | Alcance | Puede | No puede |
|---|---|---|---|---|
| `owner` | Titular | Máxima jerarquía de la organización. **Reservado:** no se asigna ni se quita por la gestión general de miembros (UC-07); solo cambia por transferencia (UC-09) | Todo lo de Administrador, más gestionar miembros y roles, y transferir la titularidad | — |
| `admin` | Administrador | Gestión completa de los torneos de la organización | Crear, configurar, publicar y gestionar torneos; resolver inscripciones; generar fixture; cargar y resolver resultados; **asignar y quitar colaboradores en los torneos que administra** (D-64) | **Crear ni quitar Administradores** (D-64); gestionar la titularidad de la organización |

**[Definido] El Colaborador dejó de ser un rol de organización (`06`, D-32).** El valor `staff` **salió de esta enumeración**: el Colaborador pasó a ser un **vínculo por torneo**, con entidad propia (`COLABORADOR_TORNEO`, ER 3.21) y con **permisos fijos**, que se enumeran en 3.8. Fundamento: su alcance nunca fue la organización entera sino un torneo puntual, y una misma persona puede colaborar en torneos de organizaciones distintas. Esta enumeración queda entonces con los dos únicos roles cuyo alcance *sí* es la organización: Titular y Administrador.

**[Definido — D-64] El Administrador puede asignar y quitar colaboradores en los torneos que administra** (UC-52). Lo que **no** puede es crear ni quitar Administradores: eso queda reservado al Titular. Fundamento: es el mismo criterio con que el rol de Titular es reservado — **se delega la operación, no la capacidad de repartir poder**. Un Administrador que puede nombrar Administradores vuelve inútil la distinción entre los dos roles.

### 3.3 `PerfilDeportivo.estado_reclamo`

| Valor técnico | Etiqueta visible | Significado | Color | ¿Dónde se usa? |
|---|---|---|---|---|
| `unclaimed` | Sin reclamar | Perfil creado por un capitán u organizador, sin cuenta asociada | Neutro | UC-05, UC-11 |
| `pending` | Reclamo pendiente | Alguien pidió apropiarse del perfil y falta la confirmación | Advertencia | UC-05 |
| `claimed` | Reclamado | El perfil está asociado a una cuenta | Éxito | UC-05 |

### 3.4 `PerfilDeportivo.visibilidad`

*La visibilidad es **binaria** (`06`, D-14b). Fundamento: cada nivel adicional se multiplica por cada pantalla donde el perfil aparece, y es una fuente clásica de fugas de información.*

| Valor técnico | Etiqueta visible | Significado | Color | ¿Dónde se usa? |
|---|---|---|---|---|
| `public` | Público | El perfil y su historial son consultables por cualquiera, incluso sin cuenta | Éxito | UC-04, UC-38 |
| `restricted` | Restringido | Solo se muestran los datos mínimos con que la persona aparece en planteles y planillas; el resto del perfil queda oculto | Neutro | UC-04 |

### 3.5 `IntegranteEquipo.rol_equipo`

*El rol vive en el **vínculo** persona-equipo, no en la persona: hay un registro por cada combinación `equipo + perfil + rol` (ER 3.6, `06`, D-23). Por eso alguien puede ser DT en un equipo y jugador en otro, o jugador y DT del mismo equipo con dos vínculos.*

| Valor técnico | Etiqueta visible | Significado | ¿Dónde se usa? |
|---|---|---|---|
| `captain` | Capitán | Responsable del equipo. **Exactamente uno por equipo, siempre** (ER 3.5). Gestiona plantel, inscripciones y participación | UC-10, UC-13 |
| `delegate` | Delegado | Puede gestionar plantel e inscripciones sin ser el responsable único. Existe porque quien gestiona y quien juega no siempre son la misma persona | UC-11, UC-24 |
| `player` | Jugador | Integra el plantel, sin funciones de gestión | UC-12 |
| `coach` | DT / Cuerpo técnico | Dirige al equipo sin integrar el plantel de jugadores. **Opcional** y **sin restricción de unicidad**: un equipo puede tener cero, uno o varios (DT, ayudante, preparador físico) — `06`, D-27 | UC-13, UC-27 |

**[Definido] El rol `coach` es deportivo, no administrativo (`06`, D-25).** Por sí solo **no habilita** gestionar el plantel ni inscribir al equipo. Si además tiene que gestionar, se le asigna **también** `delegate` (o es el capitán). Fundamento: sumar a un DT no debería entregarle el control del equipo sin que el capitán lo haya decidido.

### 3.6 `IntegranteEquipo.estado_vinculo`

| Valor técnico | Etiqueta visible | Significado | Color | ¿Dónde se usa? |
|---|---|---|---|---|
| `invited` | Invitación pendiente | **El equipo propuso**: se lo invitó y todavía no respondió | Advertencia | UC-11, UC-12 |
| `requested` **[Definido — D-85]** | Solicitud pendiente | **La persona propuso**: pidió sumarse y el equipo todavía no resolvió. **No figura en el plantel** mientras esté así | Advertencia | UC-53 |
| `active` | En el plantel | Integrante activo | Éxito | UC-12, UC-53 |
| `left` | Dejó el equipo | Se retiró o fue dado de baja; su historial se conserva | Neutro | UC-13 |
| `declined` | Rechazó | **Quien recibió la propuesta dijo que no**: la persona rechazó la invitación, o el equipo rechazó la solicitud. **[Definido]** No se muestra públicamente en ninguno de los dos casos | Neutro | UC-12, UC-53 |
| `cancelled` | Cancelada | **Quien hizo la propuesta la retiró**: el capitán dio de baja la invitación (`06`, D-57), o la persona retiró su solicitud | Neutro | UC-11, UC-53 |

**[Definido — D-85] Los dos estados pendientes son distintos porque la pelota la tiene otro.** `invited` y `requested` describen el mismo vínculo a medio hacer, pero **en direcciones opuestas**: en uno espera la persona, en el otro espera el capitán. Unificarlos en un único "pendiente" haría imposible que la pantalla del plantel distinga *"lo invitamos y no contesta"* de *"nos pidió entrar y no le contestamos"* — que es justamente lo que el capitán necesita saber para actuar. Los estados **terminales, en cambio, sí se comparten**: `declined` es siempre "quien recibió dijo que no" y `cancelled` es siempre "quien propuso se echó atrás", valga para una invitación o para una solicitud.

**[Definido — D-85] Si las dos propuestas se cruzan, el vínculo queda `active` sin pedir nada más.** Invitar a alguien que ya solicitó, o solicitar a un equipo que ya invitó, es el consentimiento de las dos partes en distinto orden (UC-11, UC-53). La identidad determinística del vínculo —`equipo + perfil + rol`— hace que sea siempre **la misma fila** la que cambia de estado, así que el cruce no puede generar dos registros.

**[Definido — D-57] Las invitaciones a un plantel no vencen.** No hay caducidad automática: una invitación queda pendiente hasta que la persona la responde o hasta que el capitán la cancela. Lo que sí muestra el sistema es **hace cuánto está pendiente**, y el capitán puede cancelarla en cualquier momento — de ahí el valor `cancelled`, que se distingue de `declined` porque la baja la decidió el capitán, no la persona invitada. **Fundamento:** una invitación a un plantel **no es una credencial** —no da acceso a nada, ni a datos ni a gestión—, así que vencerla no protege nada. Lo que le molesta al capitán no es que la invitación siga viva, es no saber si la persona la vio; eso lo resuelve la antigüedad visible, no un vencimiento.

### 3.7 `IntegranteHabilitado.rol_en_torneo`

*Con qué rol figura una persona en la **lista de buena fe** de un torneo puntual (ER 3.10). Es un rol por torneo y no se hereda del plantel permanente: alguien puede ser jugador en el plantel y figurar como cuerpo técnico en un torneo donde no juega.*

| Valor técnico | Etiqueta visible | Significado | ¿Dónde se usa? |
|---|---|---|---|
| `player` | Jugador | Habilitado a jugar. **Es el único rol al que se le acreditan goles** y el único que acumula estadística individual (`06`, D-26) | UC-27, UC-34, UC-36 |
| `coach` | Cuerpo técnico | Figura en la planilla y **puede recibir tarjetas**, pero no juega. **No ocupa cupo de jugadores** (`06`, D-24) | UC-27, UC-34 |
| `delegate` | Delegado | Figura como responsable del equipo ante el organizador durante el torneo, sin jugar | UC-27 |

**[Definido] Por qué el cuerpo técnico entra en la lista de buena fe (`06`, D-24).** En la planilla real del partido figuran ambos, y en un torneo con sanciones el DT también puede ser sancionado. **Contarlo dentro del cupo de jugadores rompería cualquier validación de mínimo o máximo de plantel**, por eso el rol es un atributo propio y no un detalle de presentación.

### 3.8 `ColaboradorTorneo.estado`

*El Colaborador se asigna **por torneo**, no por organización (`06`, D-32; ER 3.21). Este atributo es el único que varía entre un colaborador y otro: el vínculo no tiene rol ni permisos, porque son siempre los mismos (ver más abajo).*

| Valor técnico | Etiqueta visible | Significado | Color | ¿Dónde se usa? |
|---|---|---|---|---|
| `invited` | Invitado | Se lo asignó al torneo y todavía no definió su acceso | Advertencia | UC-52 |
| `active` | Activo | Opera el torneo con normalidad | Éxito | UC-52 |
| `removed` | Sin acceso | Se lo sacó del torneo. **Su historial de cargas se conserva** | Neutro | UC-52 |

**[Definido] Sacar a un colaborador es un cambio de estado, nunca un borrado.** Los resultados, los eventos y las reprogramaciones que cargó siguen atribuidos a él (ER 3.11, 3.12). Fundamento: si el registro desapareciera, cada dato que esa persona cargó quedaría sin responsable, y la trazabilidad es justamente lo que permite resolver un resultado discutido.

**[Definido] Los permisos del Colaborador son fijos y no configurables (`06`, D-32).** Son los mismos en todos los torneos y para todas las personas:

| Puede | No puede |
|---|---|
| Cargar resultados y eventos de partido | Crear, publicar, cancelar o reconfigurar el torneo |
| Programar y reprogramar partidos | Resolver inscripciones |
| Registrar partidos no disputados | Gestionar miembros de la organización ni asignar otros colaboradores |

**Fundamento:** una matriz de permisos por persona y por torneo no la mantiene nadie — se configura mal una vez y nadie vuelve a revisarla. El **alcance por torneo** ya resuelve el caso real que motivaba la configurabilidad: el planillero contratado para *un* torneo opera ese torneo y ninguno más. Por eso la entidad no tiene atributo de rol ni de permisos (ER 3.21): no es un olvido, es la consecuencia de la decisión.

### 3.9 `Organizacion.nivel_verificacion`

*La verificación **no gatea crear ni gestionar un torneo: gatea aparecer en el descubrimiento** (`06`, D-51; ER 3.3). El activo que hay que proteger de la basura es el descubrimiento, que es el motor del producto; el resto del sistema no se ensucia con un torneo de prueba que nadie ve.*

| Valor técnico | Etiqueta visible | Significado | Color | ¿Dónde se usa? |
|---|---|---|---|---|
| `unverified` | Sin verificar | Automático al crear la organización. **Crea y gestiona todo** —configura, publica, carga equipos, fixture y resultados—, pero **sus torneos quedan no listados**: accesibles por link, no por búsqueda | Neutro | UC-06, UC-18 |
| `basic` | Verificado | **Habilita publicar en el descubrimiento.** Se obtiene **automáticamente**, confirmando la dirección de correo de acceso — **por email, no por SMS** (`06`, D-76). Es el nivel operativo normal | Éxito | UC-18, UC-22 |
| `trusted` | Verificado con distintivo | Se otorga **de forma manual** (documentación del complejo o de la entidad) **o por trayectoria** (haber finalizado al menos un torneo con resultados cargados). Da **distintivo visible** en la ficha y en el perfil, y mejor posición en el orden por defecto del descubrimiento | Éxito | UC-08, UC-22 |

**[Definido — D-51] Por qué la fricción está en publicar y no en el alta.** Una revisión manual previa a poder publicar convierte el alta en una cola con un humano del otro lado, justo en el arranque, cuando el problema no es que sobren organizadores sino que faltan. La verificación por trayectoria, en cambio, se paga sola: quien terminó un torneo con resultados cargados **ya demostró** lo que una revisión manual intentaría adivinar.

**[Definido — D-51] Dos controles automáticos acompañan a la enumeración, y son valores de arranque, no reglas de negocio.** Una organización `unverified` puede tener **un solo torneo publicado a la vez** —lo que vuelve poco rentable crear cuentas descartables para ensuciar el descubrimiento—, y un torneo publicado que pasa **30 días sin inscripciones ni fixture** vuelve a no listado, con aviso al organizador. Los dos números se fijaron para poder construir y se calibran con datos de uso (`06`, sección 2): se ajustan mirando cuántos torneos legítimos quedan atrapados y cuánta basura pasa igual.

### 3.10 `PerfilDeportivo.posicion`

*Atributo **opcional** del perfil deportivo (ER 3.2, `06`, D-52). Como todo lo que no es indispensable, no bloquea nada: un perfil sin posición funciona igual.*

| Valor técnico | Etiqueta visible | Significado | ¿Dónde se usa? |
|---|---|---|---|
| `goalkeeper` | Arquero | Juega al arco | UC-02, UC-11 |
| `defender` | Defensor | Juega en el fondo | UC-02, UC-11 |
| `midfielder` | Mediocampista | Juega en el medio | UC-02, UC-11 |
| `forward` | Delantero | Juega arriba | UC-02, UC-11 |
| `unspecified` | Sin especificar | La persona no declaró posición, o juega en varias | UC-02 |

**[Definido — D-52] Cinco valores y ni uno más.** Es el nivel de granularidad que sirve para **buscar un jugador** — "me falta un arquero" es la consulta real de un capitán. Más detalle —lateral derecho, volante central, doble cinco— no cambia ninguna decisión en el fútbol amateur y solo multiplica el catálogo y el trabajo de completar el perfil. `unspecified` existe para que la lista sea completa sin obligar a elegir: en el amateur mucha gente juega donde falta.

---

## 4. Estados y tipos por entidad

### 4.1 `Torneo.estado`

Es el atributo más importante del catálogo: **habilita o bloquea al resto del sistema**.

| Valor técnico | Etiqueta visible | Significado | Qué habilita | Color |
|---|---|---|---|---|
| `draft` | Borrador | Creado, visible solo para la organización | Configuración (UC-16, UC-17) | Neutro |
| `registration_open` | Inscripciones abiertas | Publicado y recibiendo inscripciones | Descubrimiento (UC-22), inscripción (UC-24), seguimiento (UC-42) | Éxito |
| `registration_closed` | Inscripciones cerradas | Publicado, sin recibir más equipos, todavía sin empezar | Generación de fixture (UC-29) | Información |
| `in_progress` | En curso | El torneo se está jugando | Carga de resultados (UC-31), tabla (UC-35) | Éxito |
| `finished` | Finalizado | Se jugó el último partido y el torneo se cerró | Consulta histórica, acreditación de posición final al score (UC-39) | Neutro |
| `suspended` | Suspendido | Interrumpido temporalmente, puede retomarse | Nada nuevo; conserva lo cargado | Advertencia |
| `cancelled` | Cancelado | Interrumpido definitivamente | Solo consulta | Error |

**[Definido — D-58] No se agrega el estado intermedio `published`** ("publicado, con inscripciones todavía cerradas"). El organizador que quiere anunciar antes de abrir la convocatoria **publica y cierra las inscripciones a mano** con UC-20. **Fundamento:** `registration_closed` ya significa exactamente "visible, no recibe equipos", y da igual cómo se llegó ahí — si nunca se abrieron o si se cerraron después. Un estado más multiplica condiciones en todo el ciclo de vida a cambio de un matiz que nadie ve en pantalla.

**[Definido — D-51] `Torneo.visibilidad` no depende solo de la elección del organizador.** El valor **no listado** —accesible por link, no por búsqueda— tiene dos orígenes: es la opción que un organizador elige deliberadamente para un torneo cerrado entre equipos conocidos (`06`, D-21b), **y** es el estado en el que quedan los torneos de una organización con `nivel_verificacion` = `unverified` (ver 3.9), aunque el organizador quiera publicarlos. En ambos casos el torneo se juega igual y **sí alimenta el score**. Cuando la organización se verifica, sus torneos pueden pasar a públicos.

### 4.2 `Torneo.formato`

| Valor técnico | Etiqueta visible | Significado | ¿Dónde se usa? |
|---|---|---|---|
| `league` | Liga (todos contra todos) | Una sola fase de liga, con tabla | UC-17, UC-29, UC-35 |
| `knockout` | Eliminación directa | Llaves, sin tabla | UC-17, UC-29 |
| `groups_knockout` | Grupos + eliminatoria | Fase de grupos con tabla, seguida de llaves | UC-17, UC-29 |

**[Definido] Solo tres formatos en la primera versión.** Cubren la enorme mayoría de los torneos amateur. Cualquier formato adicional (doble eliminación, sistema suizo, triangulares, liga con playoffs personalizados) agrega complejidad de generación de fixture sin cubrir un caso frecuente. Se agrega cuando aparezca la necesidad real, mismo criterio con que el set de referencia descartó las unidades de medida por comercio.

### 4.3 `Fase.tipo_fase`

| Valor técnico | Etiqueta visible | Significado |
|---|---|---|
| `league` | Fase de liga | Todos contra todos dentro del grupo, con tabla de posiciones |
| `knockout` | Fase eliminatoria | Enfrentamientos a eliminación, con cuadro de llaves |

### 4.4 `Inscripcion.estado`

| Valor técnico | Etiqueta visible | Significado | Color | ¿Dónde se usa? |
|---|---|---|---|---|
| `pending` | Pendiente | Solicitada por el equipo, sin resolver | Advertencia | UC-24 |
| `approved` | Aprobada | El equipo participa del torneo | Éxito | UC-25, UC-26 |
| `rejected` | Rechazada | El organizador no la aceptó | Error | UC-25 |
| `withdrawn` | Retirada | El equipo se dio de baja | Neutro | UC-28 |
| `excluded` | Excluida | El organizador dio de baja al equipo | Error | UC-28 |
| `waitlisted` | En lista de espera | El cupo está lleno y el equipo queda anotado para cubrir una baja (`06`, D-27b) | Información | UC-24 |

**[Definido] La lista de espera existe desde la primera versión (`06`, D-27b).** Cubrir una baja sin salir a buscar equipos es exactamente el trabajo manual que el producto promete evitar.

### 4.5 `IntegranteHabilitado.estado`

*El **rol** con que la persona figura en la lista se documenta aparte, en 3.7.*

| Valor técnico | Etiqueta visible | Significado | Color |
|---|---|---|---|
| `eligible` | Habilitado | Puede participar del torneo | Éxito |
| `unavailable` | Dado de baja | Ya no puede participar (se fue del equipo, baja durante el torneo) | Neutro |
| `suspended` | Suspendido | Cumpliendo una sanción que le impide participar | Advertencia |

**[Definido] `suspended` queda previsto, no implementado.** No hay **sanciones automáticas por acumulación de tarjetas en esta versión** (`06`, D-34b): son muy valoradas por las ligas formales y poco relevantes en el amateur. El valor se documenta ahora porque es el punto de extensión hacia ligas formales que el modelo debe soportar sin rehacerse (`06`, D-03) — hasta entonces, ningún flujo lo produce.

### 4.6 `Partido.estado`

| Valor técnico | Etiqueta visible | Significado | Color | ¿Dónde se usa? |
|---|---|---|---|---|
| `unscheduled` | Sin programar | Existe en el fixture, todavía sin fecha ni hora | Neutro | UC-29 |
| `scheduled` | Programado | Con fecha, hora y (opcionalmente) lugar asignados | Información | UC-30 |
| `played` | Jugado | Se disputó y tiene resultado | Éxito | UC-31 |
| `walkover` | Ganado por presentación | No se jugó; se le adjudica a un equipo porque el otro no se presentó | Advertencia | UC-33 |
| `postponed` | Suspendido | No se jugó y se va a reprogramar | Advertencia | UC-33 |
| `cancelled` | Anulado | No se jugó y no se va a jugar; no computa | Error | UC-33 |

**[Definido] `walkover` es un estado propio y no "un resultado más".** Ganar por presentación no es lo mismo que ganar en la cancha, ni para la lectura de un rival, ni para las estadísticas de jugadores, ni para el score.

### 4.7 `Partido.estado_resultado`

Distingue "un dato que alguien escribió" de "un dato que las partes validaron". Es la distinción central del dominio de competencia.

| Valor técnico | Etiqueta visible | Significado | Color | ¿Alimenta el score? |
|---|---|---|---|---|
| `pending` | Sin cargar | El partido pasó y nadie cargó el resultado | Advertencia | No |
| `loaded` | Cargado | Hay un resultado, sin validación de las partes | Información | **[Definido]** No |
| `confirmed` | Confirmado | Validado por las partes o resuelto por el organizador | Éxito | Sí |
| `disputed` | En disputa | Un equipo lo objetó y está sin resolver | Error | **[Definido]** No |

**[Definido] Solo alimenta el score lo `confirmed`** (`06`, 5.3, regla 2). Un resultado apenas cargado ya sirve para mostrar la tabla del torneo, que puede ser provisoria; la reputación es permanente y comparable entre equipos, así que no puede sostenerse en un dato que una sola de las partes escribió.

**[Definido — D-60, D-95] Hay cuatro caminos a `confirmed`**, y los dos últimos son los que hacen que el sistema no dependa de que alguien persiga a nadie:

1. **Confirmación de las partes** — el otro equipo valida el resultado cargado (UC-32).
2. **Decisión del organizador** — tiene la última palabra, con o sin disputa de por medio (`06`, D-07b).
3. **Automáticamente, a las 72 horas de la carga** — el plazo corre desde `fecha_carga_resultado`, **no desde la fecha del partido**, y el momento en que queda firme se registra en `fecha_confirmacion_resultado` (ER 3.11).
4. **[Definido — D-95] Al cargarlo, si lo carga el organizador o un colaborador asignado** — nace `confirmed` sin pasar por `loaded`. Quien confirma es quien cargó (D-07b), así que esperar no agrega nada y demora la tabla, que es la recompensa inmediata de cargar resultados.

**[Definido — D-95] `confirmed` no es irreversible mientras la ventana esté abierta.** Un resultado que nace confirmado por el camino 4 **puede ser objetado por el equipo rival durante las mismas 72 horas** (UC-32), y entonces pasa a `disputed` con las reglas de siempre — deja de alimentar el score y la tabla lo muestra como provisorio. **Fundamento:** en el fútbol amateur el organizador **no siempre es neutral**, y dejar sin objeción un resultado que él cargó reabre justamente el riesgo que UC-32 existe para cerrar. Lo que el camino 4 cambia es **cuándo cuenta el resultado**, no **hasta cuándo se puede objetar**.

**Con el resultado en `disputed`, el plazo se congela** hasta que el organizador resuelva: un resultado objetado no puede darse por bueno por el mero paso del tiempo. **Fundamento del plazo:** 72 horas cubren el fin de semana largo típico del amateur —partido el sábado, vence el martes— y son menos que la semana que suele haber entre fechas, así que la tabla queda firme antes de que se juegue la siguiente.

### 4.8 `EventoPartido.tipo_evento`

| Valor técnico | Etiqueta visible | Significado | ¿Dónde se usa? |
|---|---|---|---|
| `goal` | Gol | Gol convertido. **Solo se acredita a integrantes con `rol_en_torneo` = `player`** (`06`, D-26) | UC-34, UC-36 |
| `own_goal` | Gol en contra | Cuenta para el resultado, **no** para la estadística de goleador. Solo se acredita a integrantes con rol de jugador | UC-34 |
| `yellow_card` | Tarjeta amarilla | Amonestación. **También puede acreditarse al cuerpo técnico** (`06`, D-26) | UC-34 |
| `red_card` | Tarjeta roja | Expulsión. **También puede acreditarse al cuerpo técnico** (`06`, D-26) | UC-34 |

**[Definido] Los goles y las tarjetas no admiten los mismos destinatarios.** Un DT no hace goles, pero sí puede ser amonestado o expulsado. Sin esta distinción, o se pierde el registro disciplinario del cuerpo técnico, o aparecería un DT en la tabla de goleadores (`06`, D-26).

**[Definido] No se registran otros eventos** (asistencias, cambios, penales) en esta versión: en el fútbol amateur casi nadie los carga, y cada tipo adicional agrega fricción a una carga que ya es opcional.

### 4.9 `DisputaResultado.estado`

| Valor técnico | Etiqueta visible | Significado | Color |
|---|---|---|---|
| `open` | Abierta | Presentada, sin resolver | Advertencia |
| `upheld` | Resuelta a favor | El organizador corrigió el resultado | Éxito |
| `rejected` | Desestimada | El organizador ratificó el resultado original | Neutro |
| `withdrawn` | Retirada | Quien la presentó la dio de baja | Neutro |

### 4.10 `ScoreEquipo.estado`

| Valor técnico | Etiqueta visible | Significado | Color |
|---|---|---|---|
| `insufficient_activity` | Sin score todavía | El equipo no tiene actividad suficiente para un valor comparable | Neutro |
| `active` | Vigente | Score calculado y publicable | Éxito |
| `stale` | Desactualizado | Hay resultados nuevos sin computar (estado transitorio) | Información |

**[Definido]** La ausencia de score se muestra como "sin score todavía", nunca como cero (`06`, S-04): un cero se lee como "es malísimo", la ausencia se lee como "todavía no jugó lo suficiente".

**[Definido — D-61] El umbral de `insufficient_activity` son 10 partidos confirmados y 2 torneos.** Por debajo de cualquiera de los dos, el equipo queda en `insufficient_activity` y se muestra como "sin score todavía". La ventana considerada es de **24 meses con decaimiento lineal** (`06`, S-03). **Son valores de arranque, no una fórmula:** se fijaron para poder construir porque son de sentido común y se pueden anticipar. Las **ponderaciones de cada componente no se fijan sobre el papel** — se calibran con datos reales de uso, mirando si el score ordena a los equipos de una forma que la gente reconoce como justa (`06`, 5.4). Fundamento del umbral: un equipo con dos partidos ganados encabezaría cualquier ranking, y eso invalida el indicador completo.

### 4.11 `Seguimiento.tipo_seguido`

| Valor técnico | Etiqueta visible | Significado | ¿Dónde se usa? |
|---|---|---|---|
| `tournament` | Torneo | Sigue un torneo | UC-42 |
| `team` | Equipo | Sigue un equipo | UC-43 |
| `player` | Jugador | **Fase futura** — ver UC-45 | UC-45 |

### 4.12 `Notificacion.tipo`

Se agrupan en dos categorías con umbrales distintos (ver UC-46): las **accionables** requieren algo de la persona; las **informativas** solo la mantienen al día.

| Valor técnico | Etiqueta visible | Categoría | Origen |
|---|---|---|---|
| `team_invitation` | Te invitaron a un equipo | Accionable | UC-11 |
| `team_join_requested` **[Definido — D-85]** | Alguien quiere sumarse a tu equipo | Accionable | UC-53 |
| `team_join_resolved` **[Definido — D-85]** | Resolvieron tu solicitud | Accionable | UC-53 |
| `registration_received` | Nueva inscripción en tu torneo | Accionable | UC-24 |
| `registration_resolved` | Resolvieron tu inscripción | Accionable | UC-25 |
| `roster_required` | Falta confirmar tu plantel | Accionable | UC-27 |
| `match_scheduled` | Se programó tu partido | Accionable | UC-30 |
| `match_rescheduled` | Cambió el horario de tu partido | Accionable | UC-30 |
| `result_pending_confirmation` | Confirmá el resultado de tu partido | Accionable | UC-32 |
| `result_disputed` | Objetaron un resultado de tu torneo | Accionable | UC-32 |
| `tournament_published` | Se publicó un torneo que puede interesarte | Informativa | UC-18 |
| `tournament_started` | Empezó un torneo que seguís | Informativa | UC-20 |
| `tournament_finished` | Terminó un torneo que seguís | Informativa | UC-20 |
| `tournament_cancelled` | Se canceló un torneo que seguís | Accionable | UC-21 |
| `tournament_rules_updated` | Cambió el reglamento de tu torneo | Accionable | UC-51 |
| `result_published` | Nuevo resultado en un torneo que seguís | Informativa | UC-31 |

**[Definido] Solo cinco cambios de un torneo publicado notifican:** fecha de inicio, sede, formato, cupo y **reglamento** (`06`, D-22b). El resto no notifica. Fundamento: notificar todo entrena a la gente a ignorar las notificaciones.

**[Definido]** Las notificaciones accionables sobre las que la persona tiene una responsabilidad directa no deberían poder desactivarse por completo — como máximo, cambiar de canal (UC-47). Si se desactivan, el flujo del que forman parte se rompe para otras personas.

**[Definido — D-53] Por qué canal va cada categoría:** las **accionables** se envían por **ambos canales** (dentro del producto y email); las **informativas**, **solo dentro del producto**. Los canales se enumeran en 4.14. Fundamento: la categoría de la notificación ya distingue lo que requiere algo de la persona de lo que solo la mantiene al día — mandar las informativas por email es la forma más rápida de que alguien filtre el remitente entero y deje de ver también las accionables.

### 4.13 `Reglamento.estado`

*Cada publicación del reglamento de un torneo crea una **versión nueva**, y las anteriores se conservan (`06`, D-28). Este atributo es el que distingue cuál rige hoy de cuáles son historia consultable.*

| Valor técnico | Etiqueta visible | Significado | Color | ¿Dónde se usa? |
|---|---|---|---|---|
| `current` | Vigente | Es la versión que rige el torneo en este momento. Hay **exactamente una** por torneo con reglamento cargado | Éxito | UC-51 |
| `superseded` | Reemplazada | Quedó atrás cuando se publicó una versión posterior. Se conserva para poder responder qué reglamento regía en una fecha dada | Neutro | UC-51 |

**[Definido] Las versiones anteriores no se borran ni se pisan.** Fundamento: en un dominio donde las decisiones (disputas, sanciones) se justifican contra un texto, tiene que poder responderse "qué reglamento regía cuando pasó esto" — el mismo criterio de trazabilidad de las correcciones de resultado (`06`, D-28).

### 4.14 `Notificacion.canal`

*Por dónde se entrega un aviso. Se combina con la **categoría** del tipo de notificación (4.12): accionable o informativa.*

| Valor técnico | Etiqueta visible | Significado | ¿Dónde se usa? |
|---|---|---|---|
| `in_app` | Dentro del producto | Centro de notificaciones de la plataforma. **Lo reciben todas las notificaciones**, accionables e informativas | UC-46, UC-47 |
| `email` | Email | Correo al identificador de acceso. **Solo para las accionables** | UC-46, UC-47 |

**[Definido — D-53] La regla de canal por categoría.** Las notificaciones **accionables** —las que requieren algo de la persona— van por **ambos canales**. Las **informativas** van **solo dentro del producto**. Fundamento: mandar las informativas por email es lo que hace que alguien filtre el remitente completo, y con eso deje de ver también las accionables, que son las que sostienen los flujos del producto.

**[Definido — D-53, actualizado por D-67] Por qué push dentro del producto y email como segundo canal.** Con el uso móvil ya confirmado (`06`, D-67), el canal "dentro del producto" es la **notificación push de la aplicación**: llega al bolsillo, que es donde está el usuario de este producto. El **email** queda como el segundo canal de las notificaciones accionables porque es el único que **sobrevive a que alguien desinstale la app o tenga las notificaciones apagadas** — sin él, un capitán puede no enterarse nunca de que le aprobaron la inscripción. **WhatsApp** no entra todavía: tiene costo por mensaje y aprobación de plantillas, así que es una integración y no una configuración.

**[Definido — D-53] WhatsApp queda previsto para la segunda etapa, y solo para reprogramaciones.** No se documenta como valor de esta enumeración porque hoy no existe: se agrega acá cuando se construya. Fundamento: WhatsApp es donde vive hoy la conversación real de reprogramar un partido en el fútbol amateur, así que es el único tipo de aviso que justifica el canal. Pero tiene costo por mensaje y aprobación de plantillas — **es una integración, no una configuración**, y por eso no entra en la primera versión.

### 4.15 `Inscripcion.motivo_estado` — motivos de baja de un equipo

*Por qué un equipo dejó de participar de un torneo (ER 3.9; estados `withdrawn` y `excluded` de 4.4). **Lista cerrada mínima más `other` con texto libre** (`06`, D-66).*

| Valor técnico | Etiqueta visible | Significado | ¿Dónde se usa? |
|---|---|---|---|
| `withdrew` | El equipo se retiró | Baja decidida por el propio equipo | UC-28 |
| `no_show` | No se presentó | Dejó de presentarse a los partidos | UC-28, UC-33 |
| `roster_incomplete` | No completó el plantel | No llegó a la lista de buena fe que el torneo requiere | UC-27, UC-28 |
| `disciplinary` | Sanción | El organizador lo excluyó por una cuestión disciplinaria | UC-28 |
| `other` | Otro | Cualquier otro motivo. **Habilita texto libre** para explicar el caso puntual | UC-28 |

### 4.16 `Torneo.motivo_cancelacion` — motivos de cancelación de un torneo

*Por qué un torneo se canceló o se suspendió (ER 3.7; estados `cancelled` y `suspended` de 4.1). Es **información pública**, no un dato interno: es lo que le permite a un equipo entender qué pasó (UC-21).*

| Valor técnico | Etiqueta visible | Significado | ¿Dónde se usa? |
|---|---|---|---|
| `insufficient_teams` | No se llegó a los equipos necesarios | La convocatoria no alcanzó el mínimo para jugarse | UC-21 |
| `venue_unavailable` | Sin cancha disponible | Se cayó la sede y no hubo reemplazo | UC-21 |
| `weather` | Suspendido por clima | Condiciones que impidieron jugar | UC-21 |
| `organizer_decision` | Decisión del organizador | Se dio de baja sin una causa de las anteriores | UC-21 |
| `other` | Otro | Cualquier otro motivo. **Habilita texto libre** | UC-21 |

**[Definido — D-66] Las dos listas son un set mínimo que crece con los casos reales, y por eso existe `other`.** La lista cerrada es lo que permite **entender por qué se abandonan torneos** —agregar veinte bajas de texto libre no responde nada—, y el texto libre de `other` es lo que evita forzar un motivo equivocado cuando ninguno encaja. **Fundamento de arrancar corto:** inventar veinte motivos de entrada garantiza que la gente use "Otro" para todo, porque nadie lee una lista larga en un formulario de baja. Los motivos que aparezcan repetidamente en el texto libre de `other` son los candidatos a convertirse en valor propio — ese es el mecanismo de crecimiento, y vive en la sección 7.

---

## 5. Modalidad y categoría de la competencia

### 5.1 `Torneo.modalidad` / `Equipo.modalidad_habitual`

| Valor técnico | Etiqueta visible | Jugadores por equipo |
|---|---|---|
| `f5` | Fútbol 5 | 5 |
| `f7` | Fútbol 7 | 7 |
| `f8` | Fútbol 8 | 8 |
| `f9` | Fútbol 9 | 9 |
| `f11` | Fútbol 11 | 11 |

**[Definido] Lista fija.** Cubre las modalidades habituales del fútbol amateur en la región. Si aparece una necesidad real (futsal como modalidad diferenciada, fútbol playa), se agrega acá primero.

### 5.2 `Torneo.categoria_genero` / `Equipo.categoria_genero`

*Una sola enumeración para las dos entidades. **[Definido — D-81]** El equipo tiene categoría propia y obligatoria (UC-10): es el dato que hace calculable el recorte del ranking (UC-41), que es por zona + modalidad + categoría.*

| Valor técnico | Etiqueta visible | Significado en el torneo | Significado en el equipo |
|---|---|---|---|
| `male` | Masculino | Compiten equipos masculinos | Plantel masculino |
| `female` | Femenino | Compiten equipos femeninos | Plantel femenino |
| `mixed` | Mixto | Admite equipos de cualquier categoría, sin aviso | Plantel de cualquier género |

**[Definido — D-82] La compatibilidad avisa, no bloquea.** Si la categoría del equipo no coincide con la del torneo, el sistema muestra la advertencia a quien inscribe y al organizador en la ficha de la inscripción (UC-25), y el organizador decide. Un torneo `mixed` no genera aviso con ningún equipo. **Fundamento:** mismo criterio que el nombre duplicado (`06`, D-16b) — el reglamento del torneo manda y el organizador ya aprueba cada inscripción; bloquear convierte el caso legítimo (un equipo mixto en un torneo masculino) en un pedido de soporte.

**[Definido — D-83] No es lo mismo que un club.** Dos equipos de una misma institución —uno `male` y uno `female`— son **dos equipos independientes** que comparten nombre y escudo. El agrupador "club" es de la segunda etapa (`07`) y no se modela con `ORGANIZACION` (`03`, 3.5).

### 5.3 `Torneo.categoria_edad`

*Es una **lista fija**, con `open` como valor por defecto (`06`, D-38b). La decisión no es cosmética: define parte del filtro de descubrimiento (UC-22) y del recorte de los rankings (UC-41), y solo una lista cerrada permite filtrar y comparar.*

| Valor técnico | Etiqueta visible | Significado |
|---|---|---|
| `open` | Libre | Sin restricción de edad. **Valor por defecto** |
| `u13` | Sub 13 | Hasta 13 años |
| `u15` | Sub 15 | Hasta 15 años |
| `u17` | Sub 17 | Hasta 17 años |
| `u20` | Sub 20 | Hasta 20 años |
| `veterans_35` | Veteranos +35 | Desde 35 años |
| `veterans_45` | Veteranos +45 | Desde 45 años |

**[Definido] `open` es el default y no una opción más.** La enorme mayoría de los torneos amateur son categoría libre, y para ellos la pregunta ni siquiera debería aparecer al crear el torneo. El corte exacto de edad de cada categoría lo define el reglamento del torneo (ER 3.20), no este catálogo.

---

## 6. Colores semánticos — referencia rápida

*Esta tabla declara qué categoría le corresponde a cada tipo de estado, para no tener que decidirlo pantalla por pantalla. **Es la fuente de verdad**: el Brief de Diseño (`08`, 6.3) la referencia y no la reinterpreta. Los valores cromáticos exactos se fijan en el brief, dentro de sus lineamientos — incluida la verificación de que el acento de marca no se confunda con el verde de éxito ni con el rojo de error (`06`, D-74).*

| Categoría | Cuándo se usa en este catálogo |
|---|---|
| **Éxito** | Estados en condición normal o completados correctamente (`active`, `approved`, `confirmed`, `played`, `in_progress`, `basic`, `trusted`) |
| **Información** | Estados neutros de contexto o transición (`registration_closed`, `scheduled`, `loaded`, `stale`) |
| **Advertencia** | Estados que requieren atención sin ser graves (`invited`, `pending`, `suspended`, `walkover`, `postponed`) |
| **Error / crítico** | Estados que revierten, rechazan o cancelan (`rejected`, `cancelled`, `disputed`, `excluded`) |
| **Neutro** | Estados finales sin carga positiva ni negativa (`draft`, `inactive`, `finished`, `left`, `unclaimed`, `unverified`) |

**[Definido] Un caso que merece atención de diseño:** `finished` (torneo finalizado) es **neutro**, no éxito. Un torneo que terminó no es un logro ni un problema — es historia consultable. Marcarlo en verde lo confundiría con "en curso y todo bien", que es una lectura distinta.

**[Definido — D-51] Otro:** `unverified` es **neutro, no advertencia**. Una organización sin verificar no hizo nada mal — es el estado en que nace toda organización, y desde ahí usa el producto de gestión completo. Marcarla en amarillo la señalaría como sospechosa ante su propio equipo de trabajo, cuando lo único que le falta es un paso para aparecer en el descubrimiento.

---

## 7. Ubicación

**No hay enumeración que declarar acá, y conviene decir por qué.** Provincia y Ciudad **no son valores cerrados de un campo**: son entidades con datos propios (`03`, 3.22), cargadas con el catálogo nacional argentino. Una enumeración se escribe en el código; un catálogo de miles de ciudades vive en la base y se consulta.

**[Definido — D-88] Dos niveles y solo dos: provincia → ciudad.** No hay barrios, comunas ni zonas intermedias. **Fundamento:** cada nivel adicional obliga a decidir en cuál se etiqueta cada torneo y multiplica las combinaciones del filtro. La ciudad es la unidad con la que la gente efectivamente piensa dónde juega.

**[Definido — D-88] El catálogo es nacional y completo desde el día uno**, no crece con el producto. **Reemplaza el criterio de D-65**, que hacía arrancar el catálogo por el primer mercado para que el filtro no se llenara de lugares vacíos: esa preocupación sigue siendo válida y **se resuelve en la interfaz** —el selector muestra primero las ciudades con torneos y distingue las que no tienen (`08`, 11.3)— en vez de resolverse mutilando el dato. A cambio se gana algo que el catálogo parcial no podía dar: **nadie se queda nunca sin su ciudad**.

**[Definido] La ciudad no reemplaza la dirección.** El Torneo lleva `ciudad_id` **y** `direccion` en texto libre; la Sede conserva la suya. La ciudad sirve para **encontrar**, la dirección para **llegar** (`06`, D-25b).

---

## 8. Catálogos a completar con los valores del primer mercado

**No queda ninguna enumeración pendiente de decidir.** Desde la revisión 4 todas las decisiones de valores cerrados están tomadas (`06`, secciones 4.3 y 4.4). Lo que sigue abierto es de otra naturaleza y conviene no confundirlo: son **catálogos cuyo criterio y cuya forma ya están definidos**, y a los que falta cargarles los valores concretos del mercado donde el producto arranque. **No bloquean nada:** se construye con ellos y se completan sobre la marcha.

| Catálogo | Qué está definido | Qué falta cargar | Referencia |
|---|---|---|---|
| **Provincias y ciudades** (`Torneo.ciudad_id`, `Equipo.ciudad_id`, `Sede.ciudad_id`, `Organizacion.ciudad_id`, `PerfilDeportivo.ciudad_id`) | **Todo: la forma en `03`, 3.22 y el criterio en la sección 7.** Dos niveles, catálogo nacional completo | **La carga inicial de datos**: las 24 provincias y las ciudades de Argentina. Es trabajo de datos por única vez, no un catálogo que crezca con el uso — **a diferencia de los dos de abajo** | `06`, D-88 |
| **Motivos de baja de equipo** (4.15) | El set mínimo ya está: `withdrew`, `no_show`, `roster_incomplete`, `disciplinary` y `other` con texto libre | Los motivos que aparezcan repetidamente en el texto libre de `other` y merezcan valor propio | `06`, D-66 |
| **Motivos de cancelación de torneo** (4.16) | El set mínimo ya está: `insufficient_teams`, `venue_unavailable`, `weather`, `organizer_decision` y `other` con texto libre | Lo mismo: lo que el uso real muestre que se repite | `06`, D-66 |

**[Definido — D-65] Por qué las zonas arrancan por el primer mercado y no por un catálogo nacional.** Un catálogo nacional es mayormente zonas sin un solo torneo, y eso ensucia justamente el filtro que más se usa: un capitán que busca por cercanía tiene que atravesar una lista de lugares vacíos para llegar al suyo. Cargar solo donde hay producto mantiene el filtro útil desde el primer día.

**[Definido — D-66] Por qué los motivos crecen en vez de nacer completos.** Inventar veinte motivos de entrada garantiza que se use "Otro" para todo — nadie lee una lista larga en un formulario de baja. El set mínimo cubre los casos frecuentes, `other` con texto libre cubre el resto, y el texto libre es el insumo que dice qué motivo merece convertirse en valor propio.

**Qué no está en esta lista, y por qué.** Las **ponderaciones del score** no son un catálogo a completar: son parámetros que **no se fijan sobre el papel** y se calibran con datos reales de uso (`06`, 5.4 y D-61). Los umbrales de arranque —10 partidos confirmados, 2 torneos, ventana de 24 meses— ya están documentados en 4.10, y son valores para poder construir, no una decisión abierta.

---

## 9. Mantenimiento de este documento

- Antes de usar un valor de estado, tipo o rol nuevo en cualquier otro documento, primero se agrega acá.
- Desde la revisión 4 **todos los valores de este catálogo están definidos**. Si aparece una decisión nueva de valores cerrados, se marca como pendiente hasta resolverse; cuando se resuelva, se cambia la marca a **[Definido]**, se elimina el listado de alternativas —que vive en `06`— y se registra la decisión en `06-reglas-negocio-y-decisiones-pendientes.md`, sección 4, conservando el número de la pendiente.
- **Completar un catálogo de la sección 8 no es lo mismo que resolver una pendiente:** los valores de zonas y de motivos se agregan sin que haya ninguna decisión que tomar, y no requieren registrarse en `06`.
- Los campos booleanos simples (`Fase.ida_y_vuelta`, `Inscripcion.plantel_confirmado`) no se incluyen: no tienen ambigüedad de valores posibles.
