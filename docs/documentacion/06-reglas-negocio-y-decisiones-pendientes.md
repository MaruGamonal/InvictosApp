# Reglas de negocio y decisiones — INVICTOS

> **Revisión 13.** Surge de revisar el paquete de diseño contra el set. **Seis casos de uso de la segunda etapa pasan al MVP** —confirmar o disputar resultados, eventos del partido, estadísticas del torneo, historial del jugador, feed de actividad y preferencias de notificación (D-94)—, mientras **el score y los rankings se confirman como etapa futura**. Y se resuelve un hueco que el diseño puso a la vista: **el resultado que carga el organizador queda confirmado al instante, pero el rival conserva la objeción** (D-95).
>
> **Revisión 12.** **La inscripción a un torneo nunca es automática: siempre la valida el organizador** (D-93). La regla base ya era ésa (UC-25), pero existía una excepción configurable —la aprobación automática de D-28b— que queda **eliminada del MVP**. El motivo lo da el estado de la monetización: mientras el costo de inscripción se cobra fuera de la aplicación, la aprobación del organizador **es** la confirmación de que el equipo entró.
>
> **Revisión 11.** Se rehace el manejo de la ubicación. La forma decidida en D-25b —zonas con niveles— nunca había llegado al modelo, y al revisarla el cliente la simplificó: **la ciudad pasa a ser la única unidad de ubicación**, tomada de un catálogo **nacional** agrupado por provincia (D-88), y **la vista por defecto de cada persona son los torneos de su ciudad** (D-90). Con eso el descubrimiento deja de ser un buscador. Se completa con: **sin coordenadas ni distancias** (D-89), **el torneo lleva ciudad y dirección** (D-91) y **el ranking se calcula por ciudad** (D-92).
>
> **Revisión 10.** Se cierra la simetría del plantel: hasta ahora **solo el equipo podía proponer** (UC-11). Se suma el camino inverso —**solicitar sumarse a un equipo**, UC-53 (D-85)—, se define quién lo resuelve (D-86) y se registra explícitamente que **la baja es inmediata y sin confirmación** (D-87). El set pasa a tener **53 casos de uso**.
>
> **Revisión 9.** Surge del primer ejercicio de identidad visual, que puso a la vista un hueco del modelo: el **torneo** tenía categoría de género desde la revisión 1, pero el **equipo** no. Se cierra con cuatro decisiones: el equipo lleva su propia categoría de género (D-81), la compatibilidad con el torneo **avisa y no bloquea** (D-82), el **club** —agrupador de equipos de una misma institución— queda para la segunda etapa y **no se confunde con la organización** (D-83), y el producto pasa a llamarse **INVICTOS** (D-84).
>
> **Revisión 8.** Se suman la **Especificación Técnica** (`10`) y el **Backlog Detallado** (`11`): el embudo documental queda completo, con los 52 casos de uso traducidos a servicios y a 33 tickets ejecutables. Se resuelve además una contradicción que la escritura del backlog dejó a la vista: la despublicación automática por inactividad es de la **segunda etapa**, no del MVP (D-80).
>
> **Revisión 7.** Se suma el **Diagrama de Arquitectura** (`09`): stack decidido (D-77), con el contexto de que el producto lo construye un agente (D-78). Cambia además el segundo factor de la verificación básica: **email en vez de SMS** (D-76), y queda registrado por qué WhatsApp no es un canal gratuito (D-79). El siguiente eslabón del embudo es la Especificación Técnica.
>
> **Revisión 6.** Se suma el **Brief de Diseño** (`08`) al set: el cliente definió personalidad de marca, dirección de color y tema de arranque (D-69 a D-71), y con eso el brief quedó escrito. El siguiente eslabón del embudo es la decisión de stack y el Diagrama de Arquitectura.
>
> **Revisión 5.** La revisión 4 cerró las 16 decisiones que quedaban abiertas (D-51 a D-66). Esta revisión confirma **los 4 supuestos** que sostenían el set: el uso principal es **móvil** (D-67) y los otros tres quedan aceptados, revisables sobre la marcha (D-68). Con eso, **no queda ninguna decisión de negocio pendiente ni ningún supuesto sin confirmar**: solo 3 valores de arranque a calibrar con datos de uso y 3 catálogos a completar con los del primer mercado (sección 2). **El Brief de Diseño ya no está bloqueado.**

## 1. Objetivo del documento

Este documento separa, de forma explícita, **lo que está decidido de lo que no**. Es el equivalente de la sección 14 de la Especificación del set de referencia ("Decisiones registradas y pendientes de definición"), con documento propio por la cantidad de decisiones que este proyecto tenía abiertas.

**Los niveles de certeza que usa el set:**

| Marca | Significado | Qué hacer |
|---|---|---|
| **[Definido]** | Decisión tomada. Puede venir de un requerimiento del cliente o de una propuesta ya adoptada | Se puede construir sobre esto |
| **[Supuesto]** | Interpretación razonable de algo que el cliente no dijo, pero que la documentación necesita para ser coherente | Confirmar antes de construir. **Desde la revisión 5 no queda ninguno sin confirmar** — los cuatro que hubo están en la sección 7, ya cerrados |
| **[Pendiente de definición]** | Decisión de negocio necesaria que nadie tomó todavía | No se construye hasta resolverla. **Desde la revisión 4 no queda ninguna** — la marca se conserva para lo que aparezca de acá en adelante |

**[Definido — D-21] Sobre la marca `[Propuesta]`:** la revisión anterior usaba un cuarto nivel para las recomendaciones propias con alternativas. **Todas fueron adoptadas y pasaron a `[Definido]`**; la marca ya no se usa en el set. Cada una quedó registrada en la sección 4 con la alternativa elegida y su fundamento, de modo que se pueda revisar cualquiera de ellas sin tener que reconstruir por qué se había decidido así.

**Cómo se numeran:** `D-nn` para las decisiones tomadas; `P-nn` para las pendientes. Los identificadores **no se reutilizan ni se reordenan**: cuando una `P` se resuelve, se registra en la sección 4 conservando su número.

---

## 2. Estado de las decisiones

> **[Pendiente de definición] Desde la revisión 11 queda una, y es la primera en muchas revisiones:** cómo se trata el **Gran Buenos Aires** en un modelo de una sola ciudad por persona (sección 4.11). **No bloquea el desarrollo del MVP** —el modelo de ciudad funciona igual—, pero **sí bloquea el diseño del selector de ciudad**, así que conviene resolverla antes de esa pantalla.

**Fuera de esa, no quedan decisiones de negocio abiertas.** Las 39 pendientes que abrió la revisión 1 están todas cerradas: 27 en la revisión 2, 2 en la revisión 3 (monetización y permisos) y las 16 restantes en la revisión 4, al adoptarse todas las recomendaciones (D-51 a D-66, sección 4.4). En la revisión 5 se confirmaron además los 4 supuestos (D-67, D-68, sección 4.5).

Lo que queda no son decisiones sin tomar, sino tres cosas distintas que conviene no confundir:

| Qué es | Cuántos | Dónde | Qué hacer |
|---|---|---|---|
| **Decisiones abiertas** | **1** | 4.11 | El tratamiento del AMBA. No bloquea el MVP; bloquea el diseño del selector de ciudad |
| **Supuestos a confirmar** | **0** | Sección 7 | Los cuatro quedaron confirmados en la revisión 5 (D-67, D-68). Tres de ellos son **revisables sobre la marcha**: no cambian nada del modelo, y si aparece un caso real que los contradiga se ajusta la regla puntual |
| **Valores de arranque a calibrar** | 3 | D-51, D-61 | Umbrales que se fijaron para poder construir, no porque haya evidencia detrás: el límite de torneos y el plazo de despublicación para organizaciones sin verificar, y los umbrales del score. **Se ajustan con datos de uso, no con más discusión** |
| **Catálogos a completar** | 3 | `04`, sección 8 | Las zonas (D-65), los motivos de baja y cancelación (D-66) y la posición del jugador (D-52) tienen su criterio y su forma definidos; falta cargarles los valores concretos del primer mercado |

**[Definido] La diferencia importa.** Una decisión abierta bloquea: no se construye hasta resolverla. Un valor de arranque no bloquea nada — se construye con él y se corrige después. Confundirlos es lo que hace que un proyecto quede esperando definiciones que en realidad ya están tomadas.

### 2.1 Lo que se cerró en la revisión 4

| # | Decisión | Resolución en una línea |
|---|---|---|
| **P-02** → D-51 | Verificación de organizadores | Tres niveles, atados a aparecer en el descubrimiento y no a crear el torneo |
| **P-05b** → D-64 | ¿El Administrador asigna colaboradores? | Sí, en los torneos que administra; no puede crear ni quitar Administradores |
| **P-13** → D-52 | Datos obligatorios y posición del jugador | Registro mínimo; perfil todo opcional; `posicion` con cinco valores |
| **P-25b** → D-65 | Catálogo de zonas | Arranca por el primer mercado, no por un catálogo nacional |
| **P-37** → D-53 | Canales de notificación | Dentro del producto + email; WhatsApp en la segunda etapa, solo reprogramaciones |
| **P-39b** → D-66 | Motivos de baja y cancelación | Set mínimo cerrado + "Otro" con texto libre, que crece con los casos reales |
| **P-40** → D-54 | Aceptación del reglamento | Explícita, de un clic, guardando qué versión se aceptó; sin re-aceptación ante cambios |
| **P-41** → D-55 | Perfil del cuerpo técnico | Historial sí, en la segunda etapa; score de DT no |
| **P-42** → D-56 | Titular anterior tras una transferencia | Conserva rol de Administrador |
| **P-43** → D-57 | Vencimiento de invitaciones al plantel | No vencen; se ve la antigüedad y se pueden cancelar |
| **P-44** → D-58 | Estado "publicado con inscripciones cerradas" | No se agrega |
| **P-45** → D-59 | Mínimo y máximo de la lista de buena fe | Máximo configurable; mínimo que avisa sin bloquear |
| **P-46** → D-60 | Plazo de confirmación automática de resultados | 72 horas desde la carga; se congela con disputa abierta |
| **P-48** → D-61 | Parámetros del score | Umbrales de arranque definidos; las ponderaciones se calibran con datos reales |
| **P-49** → D-62 | Qué define a un "gran organizador" | Se define con datos de uso; el criterio de cuándo definirlo está fijado |
| **P-50** → D-63 | Superficies publicitarias | Ficha, fixture y descubrimiento sí; flujos de tarea del organizador no |

## 3. Requerimientos definidos por el cliente

| # | Requerimiento | Dónde impacta |
|---|---|---|
| **D-01** | La plataforma combina **gestión de torneos** con **descubrimiento y comunidad**. No es solo un administrador de torneos | Todo el set |
| **D-02** | Modelo de **plataforma pública única**: los torneos publicados son descubribles por cualquiera. Es la diferencia estructural con el multi-tenant del sistema de referencia | `01` 2, `02` UC-18, UC-22 |
| **D-03** | Caso base **fútbol amateur** (F5 a F11), con el modelo preparado para ligas formales | `01` 2, `03`, `04` |
| **D-04** | Dos grandes tipos de usuario desde el inicio: **organizadores** y **jugadores/equipos** | `01` 4 |
| **D-05** | El organizador puede crear y configurar torneos, publicarlos, gestionar equipos y jugadores, administrar inscripciones, organizar partidos/fechas/resultados, gestionar el estado del torneo y consultar estadísticas | `02` D2, D4, D6, D7 |
| **D-06** | Los jugadores y equipos pueden gestionar perfil, crear o integrar un equipo, descubrir torneos, inscribirse, gestionar su participación y consultar resultados, posiciones y desempeño | `02` D1, D3, D5, D6, D8 |
| **D-07** | Existen **funcionalidades sociales**: seguir torneos, seguir equipos, perfiles públicos, actividad y rankings | `02` D9, D10 |
| **D-08** | **Seguir jugadores** es explícitamente de una iteración posterior | `02` UC-45, `07` |
| **D-09** | Existe un **score o reputación para equipos**, basado inicialmente en desempeño deportivo. **La fórmula no está definida** | Sección 5 |
| **D-10** | El equipo es una **entidad permanente y transversal a los torneos** | `03` 3.5, `02` UC-10 |
| **D-11** | El producto está en **etapa inicial**: no deben inventarse reglas como si estuvieran definidas | Todo el set |
| **D-18** | **Los equipos pueden tener cuerpo técnico (DT).** Es **un rol más dentro del equipo, no obligatorio**. Una misma persona puede ser **DT en un equipo y jugador en otro** | `02` UC-11, UC-13, UC-27 · `03` 3.2, 3.6, 3.10 · `04` 3.5 |
| **D-19** | **Cada torneo puede tener su reglamento cargado por el titular o los organizadores.** Es **opcional** | `02` UC-51 · `03` 3.20 · `04` 4.13 |
| **D-20** | **Durante el torneo se pueden ajustar las fechas de los partidos** | `02` UC-30 · `03` 3.11 |
| **D-21** | **Todas las propuestas de la revisión anterior se adoptan como definitivas** | Todo el set |
| **D-69** | **Personalidad de marca: deportiva y enérgica**, en todo el producto | `08` 5 |
| **D-70** | **Dirección de color: oscura con un acento vibrante** | `08` 6 |
| **D-71** | **Tema de arranque: claro**, con el sistema tokenizado para que el oscuro llegue sin rediseño | `08` 6.1 |
| **D-76** | **La verificación básica de una organización se hace por email, no por SMS** | `02` UC-06, UC-18 · `04` 3.9 · `08` 11.1 · `09` 4 |
| **D-77** | **Stack: Next.js (React) con renderizado en servidor + PostgreSQL, monolito con capa de servicios, PWA primero y app nativa después** | `09` completo |
| **D-78** | **El producto lo construye un agente de IA, no un equipo humano** | `09` 7.3 |
| **D-31** | **Monetización en cuatro etapas.** El producto arranca **gratis para todos**. Los ingresos llegan en este orden: **(1)** publicidad servida por una red externa (Google) desde el inicio; **(2)** publicidad de **sponsors** vendida directamente, más adelante; **(3)** **suscripción** para grandes organizadores; **(4)** **comisión (fee)** sobre las transacciones de pago que ocurran dentro de la plataforma. Nada de esto se cobra hoy | `01` 2 y 5 · `02` UC-06, UC-24 · `03` 5 · `05` 2 · `07` 4, 5, 6 |
| **D-32** | **El Colaborador tiene permisos fijos y se asigna por torneo, no por organización.** Una misma persona puede ser colaboradora de varios torneos a la vez, incluso de organizaciones distintas. Los roles de **Titular** y **Administrador** siguen siendo de la organización | `02` UC-07, UC-52 · `03` 3.21 · `04` 3.2, 3.8 |

---

## 4. Decisiones adoptadas en esta revisión

### 4.1 Decisiones de modelado derivadas de los requerimientos nuevos

| # | Pregunta que abrió el requerimiento | Decisión | Fundamento | Dónde queda |
|---|---|---|---|---|
| **D-22** | Si un DT no juega, ¿sigue siendo un "Jugador" en el modelo? | La entidad `JUGADOR` pasa a llamarse **`PERFIL_DEPORTIVO`**. Representa la identidad deportiva de una persona; **el rol que tiene en cada equipo** define si actúa como jugador, DT, delegado o capitán | El modelo ya decía que esa entidad era "la identidad deportiva de una persona" (`03`, 3.2). Llamarla `Jugador` obligaba a modelar a un DT como "un jugador que no juega", que es exactamente el tipo de contradicción que este set evita. El cambio es de nombre y de alcance conceptual, no de estructura | `03` 3.2 y todo el ER |
| **D-23** | ¿Cómo se soporta que alguien sea DT en un equipo y jugador en otro? | **Sin ningún cambio estructural: el rol vive en el vínculo, no en la persona.** `INTEGRANTE_EQUIPO` pasa a tener **un registro por cada combinación `equipo + perfil + rol`**, con identidad determinística — mismo patrón que `MIEMBRO_ORGANIZACION` y que la Membresía del set de referencia | Es la misma decisión de diseño que el set de referencia tomó para Membresía, y por el mismo fundamento: con un rol por registro, un duplicado como mucho coincide consigo mismo, nunca se contradice. Como efecto lateral, permite también que alguien sea **jugador y DT del mismo equipo** (dos vínculos), que es habitual en el amateur | `03` 3.6, `04` 3.5 |
| **D-24** | ¿El DT entra en la lista de buena fe del torneo? | Sí. `JUGADOR_HABILITADO` pasa a llamarse **`INTEGRANTE_HABILITADO`** y suma el atributo **`rol_en_torneo`** (jugador / DT / delegado). **El cuerpo técnico no ocupa cupo de jugadores** | En la planilla real del partido figuran ambos, y en un torneo con sanciones el DT también puede ser sancionado. Contarlo dentro del cupo de jugadores rompería cualquier validación de mínimo/máximo de plantel | `03` 3.10, `04` 4.5 |
| **D-25** | ¿Sumar un DT le da control sobre el equipo? | **No.** El rol de DT es **deportivo, no administrativo**: por sí solo no habilita gestionar el plantel ni inscribir al equipo. Si además tiene que gestionar, se le asigna **también** el rol de Delegado (o es el Capitán) | Evita que sumar a un DT le entregue el control del equipo sin que el capitán lo haya decidido. Es posible justamente porque los roles son vínculos independientes (D-23) | `02` UC-13, `04` 3.5 |
| **D-26** | ¿Quién puede acreditar eventos de partido, ahora que hay no-jugadores en la lista? | Los **goles** solo se acreditan a integrantes habilitados con rol de **jugador**. Las **tarjetas** pueden acreditarse también al **cuerpo técnico** | Un DT no hace goles, pero sí puede ser amonestado o expulsado. Sin esta distinción, o se pierde el registro disciplinario del DT, o aparecería un DT en la tabla de goleadores | `02` UC-34, `03` 3.12 |
| **D-27** | ¿Un equipo puede tener más de un DT? | **Sí.** A diferencia del Capitán (uno, obligatorio), el rol de DT **no tiene restricción de unicidad y es opcional**: un equipo puede tener cero, uno o varios (DT, ayudante, preparador físico) | El requerimiento habla de "DTs" en plural y el cuerpo técnico real suele ser más de una persona. No hay ninguna regla del sistema que dependa de que haya un solo DT, así que imponer unicidad sería una restricción sin fundamento | `03` 3.6 |
| **D-28** | ¿El reglamento es un texto, un archivo, o los dos? ¿Qué pasa si cambia con el torneo empezado? | **Los dos**: texto cargado en la plataforma y/o archivo adjunto. Se modela como entidad **`REGLAMENTO` con versiones**: cada publicación crea una versión nueva, la vigente es la última, y **las anteriores se conservan**. Modificarlo con el torneo en curso **está permitido** y **notifica a los equipos inscriptos** | Es el mismo criterio de trazabilidad que el set de referencia aplicó a las correcciones de resultado: en un dominio donde las decisiones se justifican contra un texto, tiene que poder responderse "qué reglamento regía cuando pasó esto". Un reglamento que cambia en silencio a mitad de torneo es la peor versión posible de esta funcionalidad | `02` UC-51, `03` 3.20 |
| **D-29** | ¿El reglamento es obligatorio para publicar un torneo? | **No.** Es opcional y no forma parte de los datos mínimos de publicación (UC-18) | Coherente con D-03 (caso base amateur): la mayoría de los torneos de barrio no tienen reglamento escrito, y exigirlo sería una barrera de entrada sin contrapartida | `02` UC-18, UC-51 |
| **D-33** | Si hoy todo es gratis, ¿hace falta modelar algo de pagos? | **Sí, lo mínimo para no rehacerlo después.** La Inscripción se modela desde el día uno contemplando que **puede tener un costo asociado**, aunque hoy siempre sea cero, y se dejan **previstas y sin modelar en detalle** dos entidades futuras: **Suscripción/Plan** (organización) y **Pago/Transacción** (inscripción). Ninguna se construye ahora | El fee de D-31 se cobra sobre una transacción que todavía no existe. Lo caro no es agregar la entidad de pago cuando llegue: es descubrir que la Inscripción se modeló como un vínculo sin importe y tener que tocar todo D6. Mismo criterio con que el sistema de referencia mantuvo su entidad Plan "deliberadamente mínima, con crecimiento previsto" | `03` 5, `02` UC-24 |
| **D-34** | ¿Dónde vive el vínculo del Colaborador, ahora que es por torneo? | El rol `staff` **sale de `MIEMBRO_ORGANIZACION`** y pasa a una entidad propia, **`COLABORADOR_TORNEO`**, con identidad determinística `torneo + usuario`. `MIEMBRO_ORGANIZACION` queda solo para `owner` y `admin` | Son dos vínculos con alcance distinto: uno es con la organización y otro con un torneo puntual. Mezclarlos en la misma entidad obligaría a un campo "torneo" vacío para los roles de organización — exactamente el tipo de campo condicional que este set evita. Como efecto directo, asignar a alguien a cinco torneos son cinco vínculos, y sacarlo de uno no lo saca de los demás | `03` 3.21 |
| **D-35** | ¿Dónde puede aparecer la publicidad? | La publicidad **no entra en los flujos de tarea del organizador** (carga de resultados, fixture, inscripciones). Las superficies candidatas son las de consulta: ficha pública del torneo, fixture y descubrimiento — el detalle exacto queda en **P-50** | El flujo de carga de resultados es el más repetido del producto y el que decide si el organizador se queda (`05`, principio 3). Degradarlo para monetizar pondría en riesgo justamente el dato del que vive todo lo demás | `05` 2, P-50 |
| **D-30** | ¿Hasta cuándo se puede reprogramar un partido? | **Mientras el torneo esté en curso y el partido no se haya jugado.** Se **conserva la fecha originalmente programada** junto a la nueva, y cada reprogramación notifica a ambos equipos y a los seguidores del torneo | Reprogramar es lo normal en el fútbol amateur, no una excepción. Conservar la fecha original es lo que permite que un equipo entienda qué se movió, y es el insumo de cualquier discusión sobre por qué no se presentó | `02` UC-30, `03` 3.11 |

### 4.2 Propuestas adoptadas como definitivas

Cada fila registra la pregunta original, la alternativa elegida y por qué. **Esta tabla es la fuente de verdad de la revisión 2**: cualquier documento del set que contradiga una de estas filas está desactualizado.

| # | Pregunta | Decisión adoptada | Fundamento resumido |
|---|---|---|---|
| **D-03b** *(era P-03)* | ¿Existe reputación del organizador? | **Solo trayectoria factual** en el MVP (torneos organizados y finalizados). Los torneos cancelados se hacen visibles recién cuando haya volumen | Una cancelación aislada, sin contexto, funciona como condena pública |
| **D-04b** *(era P-04)* | ¿Qué puede hacer un visitante sin cuenta? | **Consultar todo el contenido público** (fichas, fixtures, tablas, estadísticas, perfiles). El registro se pide solo para **acciones** (seguir, inscribirse, gestionar) y **completa la acción al terminar** | La ficha compartida por mensajería es la principal puerta de entrada; exigir registro para verla cierra esa puerta |
| **D-06b** *(era P-06)* | ¿Existe el rol de árbitro o planillero? | **No.** Se resuelve con el rol Colaborador | Un rol más, con sus permisos y su ciclo de invitación, sin un caso que lo distinga del Colaborador |
| **D-07b** *(era P-07)* | ¿Quién puede cargar el resultado de un partido? | **Los capitanes cargan, el organizador confirma** y tiene la última palabra (UC-31, UC-32). El organizador puede además configurar el torneo para cargar él mismo todos los resultados | Reduce la carga del organizador —que es quien abandona el producto si le resulta trabajoso— sin renunciar a que alguien decida. **Abre P-46** (plazo de confirmación automática) |
| **D-08b** *(era P-08)* | ¿Qué pasa con los partidos de un equipo que abandona? | **Configurable por torneo**, con default: **los jugados se mantienen, los pendientes se dan por ganados a sus rivales** | Es lo más habitual en reglamentos reales. Mismo criterio con que el set de referencia hizo configurable `permite_stock_negativo` en vez de imponer una regla única |
| **D-10b** *(era P-10)* | ¿Existe score de jugador? | **No**, hasta que el de equipos esté validado | Un indicador individual en un deporte colectivo es mucho más discutible y más sensible socialmente |
| **D-11b** *(era P-11)* | ¿Qué alcance tiene "lo social"? | **Seguir y consultar actividad derivada de hechos del sistema.** Sin publicaciones, comentarios ni mensajería | El contenido generado por usuarios trae moderación, y sin masa crítica un feed social vacío hace parecer abandonado al producto |
| **D-12b** *(era P-12)* | ¿Cómo se modelan las canchas? | **Dato mínimo**: nombre, dirección y zona | La gestión de disponibilidad y reservas es un producto entero aparte |
| **D-13b** *(era P-13, parcial)* | ¿Qué datos son obligatorios? | **Solo lo indispensable en el registro**; todo lo demás opcional y pedido cuando hace falta. Un perfil incompleto nunca bloquea nada | Exigir datos completos al inicio es una barrera sin contrapartida. **Queda abierto P-13**: la lista concreta y la enumeración de `posicion` |
| **D-14b** *(era P-14)* | ¿Qué niveles de visibilidad tiene el perfil? | **Binario**: público o restringido | Cada nivel adicional se multiplica por cada pantalla donde el perfil aparece, y es una fuente clásica de fugas de información |
| **D-15b** *(era P-15)* | ¿Quién confirma el reclamo de un perfil? | **El capitán u organizador que lo creó**, con escalamiento a soporte como excepción | Es quien puede saber si esa persona es realmente quien dice ser |
| **D-16b** *(era P-16)* | ¿El nombre del equipo debe ser único? | **No único globalmente.** El sistema avisa —sin bloquear— si ya existe uno igual en la misma zona | Hay miles de equipos con el mismo nombre; bloquear sería falso rigor |
| **D-17b** *(era P-17)* | ¿Un jugador puede estar habilitado en dos equipos del mismo torneo? | **Prohibido por default, configurable por torneo.** El sistema lo detecta **al confirmar la lista** (UC-27), no cuando el partido ya se jugó | Prohibirlo es lo habitual en los reglamentos. Detectarlo tarde convierte un aviso en un conflicto |
| **D-18b** *(era P-18)* | ¿Qué pasa si se quita del plantel a alguien habilitado en un torneo en curso? | **Sale del plantel permanente pero sigue habilitado en ese torneo** hasta que termine, salvo baja explícita de la lista | Evita que un cambio administrativo del equipo altere en silencio quién podía jugar |
| **D-19b** *(era P-19)* | ¿Existen competencias recurrentes con ediciones? | **No en esta versión**: cada torneo es independiente. El modelo deja **previsto un vínculo opcional** hacia una competencia agrupadora | Permite agregarlo después sin migrar todos los dominios derivados |
| **D-20b** *(era P-20)* | ¿Los puntos por resultado son fijos o configurables? | **Configurables por torneo**, con default 3 / 1 / 0 | Cuesta poco y evita el primer reclamo de un reglamento distinto |
| **D-21b** *(era P-21)* | ¿Existen torneos no listados? | **Sí**, mediante el atributo de visibilidad: accesibles por link, no por búsqueda. **Sí alimentan el score** | El torneo cerrado entre equipos conocidos es un caso real y frecuente; se jugó igual, así que cuenta |
| **D-22b** *(era P-22)* | ¿Qué cambios de un torneo publicado disparan notificación? | **Fecha de inicio, sede, formato, cupo y reglamento.** El resto no notifica | Notificar todo entrena a la gente a ignorar las notificaciones |
| **D-23b** *(era P-23)* | ¿Finalizar el torneo es manual o automático? | **Manual**, con sugerencia del sistema cuando no quedan partidos pendientes | El organizador suele tener algo más que hacer (definir premios, resolver una disputa) antes de dar por cerrado el torneo |
| **D-24b** *(era P-24)* | ¿Los resultados de un torneo cancelado cuentan para el score? | **Cuentan los partidos jugados; no se acredita posición final** | Premia haber jugado sin castigar a equipos que no tuvieron ninguna responsabilidad en la cancelación |
| **D-25b** *(era P-25)* · **superada en parte por D-88 (rev. 11)** | ¿Cómo se modela la ubicación? | **Ubicación de catálogo** para filtrar, más **dirección en texto libre**. ~~Zonas con niveles provincia / ciudad / barrio~~ → **la unidad es la ciudad, sin barrios** (D-88) | **Lo que sigue vigente y es lo importante de esta decisión:** el texto libre hace imposible filtrar, y filtrar por ubicación es el primer criterio de un capitán. Lo que cambió es la granularidad, no el criterio |
| **D-26b** *(era P-26)* | ¿Cómo se ordena el descubrimiento por defecto? | **Proximidad + inscripciones abiertas + fecha de inicio cercana** | Es el orden en que un capitán se hace las preguntas: dónde, ¿puedo entrar?, ¿llego a tiempo? |
| **D-27b** *(era P-27)* | ¿Existe lista de espera? | **Sí** | Cubrir una baja sin salir a buscar equipos es exactamente el trabajo manual que el producto promete evitar |
| **D-28b** *(era P-28)* · **superada por D-93 (rev. 12)** | ¿Hay aprobación automática de inscripciones? | ~~Sí, como opción por torneo~~ → **No existe en el MVP** (D-93) | El fundamento original —evitarle trabajo administrativo al organizador en torneos abiertos— pasó por alto que **mientras el dinero se mueve fuera de la aplicación, la aprobación es la única confirmación de que el equipo está realmente adentro** |
| **D-29b** *(era P-29)* | ¿Cómo se reconcilia un equipo creado por un organizador con uno que ya existía? | **Mismo mecanismo de reclamo que el perfil de jugador** (UC-05) | Es el mismo problema; resolverlo dos veces distinto sería una inconsistencia |
| **D-30b** *(era P-30)* | ¿Se puede modificar la lista de buena fe con el torneo empezado? | **Configurable por torneo** (fecha de cierre de incorporaciones), con **"siempre abierta"** como default amateur | En el amateur los planteles se completan sobre la marcha; en las ligas formales hay cierre de pases |
| **D-31b** *(era P-31)* | ¿El sorteo del fixture admite criterios? | **No.** El fixture generado es **editable a mano**, y eso resuelve todos los casos | Ningún generador conoce las restricciones reales del organizador; la edición manual las cubre todas con menos complejidad |
| **D-32b** *(era P-32)* | ¿Los equipos pueden proponer reprogramaciones? | **Sí, en la segunda etapa.** En el MVP la reprogramación es del organizador (D-20) | Coordinar reprogramaciones es de las tareas más pesadas del amateur, pero primero tiene que existir el fixture |
| **D-33b** *(era P-33)* | ¿Con qué resultado se computa un walkover? | **Configurable, default 3-0.** Cuenta para la diferencia de gol; **no** cuenta para las estadísticas individuales ni como partido jugado a efectos del score | Los goles no los hizo nadie; inflar el historial con partidos que nadie jugó desvirtúa el indicador |
| **D-34b** *(era P-34)* | ¿Hay sanciones automáticas por acumulación de tarjetas? | **No en esta versión.** Queda como extensión hacia ligas formales | Muy valorado por ligas formales, poco relevante en amateur |
| **D-35b** *(era P-35)* | ¿El organizador puede aplicar quitas o bonificaciones de puntos? | **Sí**, como **campo separado** en la tabla | Mantiene la tabla explicable: se ve cuántos puntos ganó en la cancha y cuántos le sacaron |
| **D-36b** *(era P-36)* | ¿Qué rankings existen? | **Acotados por zona + modalidad + categoría. No hay ranking global** | Comparar un equipo de F5 de una ciudad con uno de F11 de otra no significa nada |
| **D-38b** *(era P-38)* | ¿Cómo se modela la categoría de edad? | **Lista fija**, con `open` (Libre) por defecto | La enorme mayoría de los torneos amateur son categoría libre; para ellos la pregunta ni debería aparecer |
| **D-39b** *(era P-39)* | ¿Los motivos de baja y cancelación son texto libre o lista cerrada? | **Lista cerrada + texto libre opcional** | La lista permite entender por qué se abandonan torneos; el texto permite explicar el caso puntual. **Abre P-39b**: armar la lista |
| **D-40b** | ¿La cantidad de seguidores de un equipo entra en el score? | **No.** Es una métrica de popularidad, no de desempeño deportivo | Mezclarlas cambiaría la naturaleza del indicador y lo volvería manipulable |

---

### 4.3 Recomendación desarrollada — verificación de organizadores (P-02)

> **[Definido — D-51]** Adoptada en la revisión 4. Se desarrolla acá y no en una fila de tabla porque tiene varias piezas y porque su fundamento es el que ordena el resto.

**El principio:** la verificación **no debería gatear crear ni gestionar un torneo — debería gatear aparecer en el descubrimiento.** Un organizador sin verificar puede armar su torneo completo, cargar equipos, generar el fixture y publicarlo por link. Lo que no puede es aparecer en la búsqueda pública hasta verificarse. Fundamento: el activo que hay que proteger de la basura es el descubrimiento (D5), que es el motor del producto; el resto del sistema no se ensucia con un torneo de prueba que nadie ve. Poner la fricción en el alta, en cambio, castiga al organizador legítimo justo en el momento en que todavía no invirtió nada y es más fácil que abandone.

**Los tres niveles propuestos:**

| Nivel | Cómo se obtiene | Qué habilita |
|---|---|---|
| **Sin verificar** | Automático al crear la organización (UC-06) | Todo el producto de gestión: crear, configurar y publicar torneos, cargar equipos, fixture y resultados. Sus torneos nacen **no listados** (accesibles por link, no por búsqueda — reutiliza el mecanismo ya definido en D-21b) |
| **Verificado básico** | **Automático**: confirmación de la dirección de correo de acceso (**por email, no por SMS** — ver D-76) | Publicar en el **descubrimiento** (UC-22). Es el nivel operativo normal |
| **Verificado** | **Manual o por trayectoria**: documentación del complejo o de la entidad, o bien haber finalizado al menos un torneo con resultados cargados | **Distintivo visible** en la ficha y en el perfil del organizador (UC-08), y mejor posición en el orden por defecto del descubrimiento (D-26b) |

**Tres controles automáticos que acompañan, y que hacen la mayor parte del trabajo:**

1. **Límite de torneos publicados simultáneos para organizaciones sin verificar** (por ejemplo, uno). Es lo que hace que crear cuentas descartables deje de ser rentable para quien quiera ensuciar el descubrimiento.
2. **Despublicación automática por inactividad** *(segunda etapa, ver D-80)*: un torneo publicado que pasa X tiempo sin inscripciones ni fixture vuelve a no listado, con aviso al organizador. La basura del descubrimiento no suele ser malintencionada — es mayormente torneos de prueba que nadie limpió.
3. **Reporte de usuarios** (UC-49), que hoy es fase futura y probablemente haya que adelantar si el descubrimiento crece rápido.

**Por qué no recomiendo verificación previa obligatoria:** en el arranque el problema no es que sobren organizadores, es que faltan. Una revisión manual antes de poder publicar convierte el alta en una cola con un humano del otro lado, y en el mismo momento en que el producto necesita oferta para tener sentido. La verificación por trayectoria, en cambio, se paga sola: un organizador que terminó un torneo con resultados cargados **ya demostró** lo que una revisión manual intentaría adivinar.

**Qué cambia en el set:** el atributo `nivel_verificacion` entra en `ORGANIZACION` (`03`, 3.3) con su enumeración propia (`04`, 3.9), y `Torneo.visibilidad` pasa a depender del nivel de verificación de su organización y no solo de la elección del organizador (`04`, 4.1). Ambas cosas están aplicadas.

**[Definido] Los dos parámetros de los controles automáticos son valores de arranque, no reglas de negocio:** una organización sin verificar puede tener **un torneo publicado a la vez**, y un torneo publicado que pasa **30 días sin inscripciones ni fixture** vuelve a no listado, con aviso. Se fijaron para poder construir; se ajustan mirando cuántos torneos legítimos quedan atrapados y cuánta basura pasa igual (ver sección 2).

---

### 4.4 Decisiones de la revisión 4 — las 16 recomendaciones adoptadas

Todas las recomendaciones de la revisión 3 fueron aceptadas. Cada fila cierra la pendiente que indica.

| # | Cierra | Decisión | Fundamento |
|---|---|---|---|
| **D-51** | P-02 | **Verificación de organizadores en tres niveles**, atada a aparecer en el descubrimiento y no a crear el torneo — desarrollo completo en 4.3 | El activo a proteger de la basura es el descubrimiento; el resto del sistema no se ensucia con un torneo que nadie ve. Poner la fricción en el alta castiga al organizador legítimo justo cuando todavía no invirtió nada |
| **D-52** | P-13 | **Registro mínimo** (identificador de acceso + nombre visible) y **perfil enteramente opcional**. `posicion` **existe, es opcional** y tiene cinco valores: arquero, defensor, mediocampista, delantero, sin especificar | Cinco valores es lo que un capitán necesita para buscar ("me falta un arquero"). Más granularidad —lateral derecho, volante central— no cambia ninguna decisión en el amateur y multiplica el catálogo |
| **D-53** *(actualizada en la revisión 5, ver D-67)* | P-37 | **Dos canales: dentro del producto y email.** Con el uso móvil ya confirmado, el canal "dentro del producto" es la **notificación push de la aplicación**. Las accionables van por ambos; las informativas, solo push. **WhatsApp queda para la segunda etapa y solo para reprogramaciones** | El push llega al bolsillo, que es donde está el usuario de este producto; el email es el respaldo que sobrevive a que alguien desinstale la app o tenga las notificaciones apagadas — sin él, un capitán puede no enterarse nunca de que le aprobaron la inscripción. WhatsApp es donde hoy vive la conversación de reprogramar, pero tiene costo por mensaje y aprobación de plantillas: es una integración, no una configuración |
| **D-54** | P-40 | **Aceptación explícita del reglamento al inscribirse, de un clic**, guardando **qué versión** se aceptó. Si el reglamento cambia después, **no se pide re-aceptar**: se notifica, y en la disputa se ve que la versión vigente es posterior a la aceptada | Cuesta un clic y es lo único que le da respaldo al organizador en una disputa. Re-aceptar en cada cambio agregaría fricción a cambio de nada: lo que importa no es el clic nuevo, sino poder mostrar que el texto se movió después |
| **D-55** | P-41 | **El cuerpo técnico tiene historial público** (torneos dirigidos, equipos, resultados), en la **segunda etapa**. **No tiene score de DT** | El historial no requiere ninguna decisión nueva: el dato ya se registra. Un score de DT heredaría todos los problemas del score de equipo más el de atribuirle a una persona el resultado de un colectivo |
| **D-56** | P-42 | Tras una transferencia de titularidad, el **titular anterior conserva rol de Administrador** y puede desvincularse él mismo después | Es la opción menos destructiva: sacarle todo el acceso de golpe puede dejar a la organización sin la única persona que conoce la operación, justo el día del cambio |
| **D-57** | P-43 | **Las invitaciones a un plantel no vencen.** El capitán ve hace cuánto están pendientes y **puede cancelarlas** | Una invitación a un plantel no es una credencial —no da acceso a nada—, así que vencerla no protege nada. Lo que molesta al capitán no es que siga viva, es no saber si la persona la vio |
| **D-58** | P-44 | **No se agrega el estado "publicado con inscripciones cerradas".** Publicar abre inscripciones; el organizador que quiere anunciar antes publica y las cierra con UC-20 | `registration_closed` ya significa "visible, no recibe equipos", y da igual si se llegó ahí antes o después de haberlas abierto. Un estado más multiplica condiciones en todo el ciclo de vida a cambio de un matiz que nadie ve |
| **D-59** | P-45 | En la lista de buena fe: **máximo de jugadores configurable y opcional**; **mínimo que avisa pero no bloquea** el inicio del torneo | El máximo es una regla de reglamento real y trivial de validar. El mínimo bloqueante castiga al organizador por algo que depende del equipo, y choca con que la lista está abierta por default hasta el final (D-30b) |
| **D-60** | P-46 | Un resultado sin confirmar **se da por confirmado a las 72 horas de haberse cargado** (no desde el partido). Con una **disputa abierta, el plazo se congela** hasta que el organizador resuelva | Cubre el fin de semana largo típico del amateur —partido el sábado, vence el martes— y es más corto que la semana entre fechas, así que la tabla queda firme antes de que se juegue la fecha siguiente |
| **D-61** | P-48 | **Umbrales de arranque del score:** se muestra con **10 partidos confirmados y 2 torneos** como mínimo, y la ventana es de **24 meses con decaimiento lineal**. Las **ponderaciones no se fijan**: se calibran con datos reales (5.4) | Los umbrales son de sentido común y se pueden anticipar; las ponderaciones no. Son **valores de arranque**, no fórmula: se ajustan mirando si el score ordena a los equipos de una forma que la gente reconoce como justa |
| **D-62** | P-49 | **Qué define a un "gran organizador" y qué incluye su suscripción se define con datos de uso reales** (torneos activos, equipos, colaboradores), no antes | Es la misma pregunta que el sistema de referencia dejó abierta en su entidad Plan: los límites por plan se fijan cuando se sabe cuánto usa cada quién. Decidirlo ahora sería inventar un límite y después descubrir que no separa a nadie |
| **D-63** | P-50 | **Superficies con publicidad:** ficha pública del torneo, fixture y descubrimiento. **Sin publicidad:** todos los flujos de tarea del organizador —cargar resultados, armar el fixture, resolver inscripciones— y los del capitán al inscribirse | Las tres primeras son de consulta: se miran, no se opera en ellas. Meter publicidad en la carga de resultados le agregaría fricción a la tarea más repetida del producto, que es la que decide si el organizador se queda (D-35) |
| **D-64** | P-05b | **El Administrador puede asignar y quitar colaboradores en los torneos que administra.** No puede crear ni quitar Administradores — eso queda reservado al Titular | Mismo criterio con que el rol de Titular es reservado: se delega la operación, no la capacidad de repartir poder. Un Administrador que puede nombrar Administradores vuelve inútil la distinción entre los dos roles |
| **D-65** | P-25b | **El catálogo de zonas arranca por la ciudad o las ciudades del primer mercado**, no por un catálogo nacional completo | Un catálogo nacional es mayormente zonas sin un solo torneo, y ensucia el filtro que más se usa. Crece a medida que el producto entra en un mercado nuevo |
| **D-66** | P-39b | Los **motivos de baja y de cancelación** son una **lista cerrada mínima más "Otro" con texto libre**, que crece con los casos reales | La lista permite entender por qué se abandonan torneos; el texto libre evita forzar un motivo equivocado. Inventar veinte motivos de entrada garantiza que se use "Otro" para todo |

---

### 4.5 Decisiones de la revisión 5 — los supuestos confirmados

| # | Confirma | Decisión | Consecuencias |
|---|---|---|---|
| **D-67** | A-01 | **El uso principal del producto es móvil.** El producto es **mobile-first para todos los actores**, incluido el organizador: su configuración puede aprovechar una pantalla grande, pero **ninguna tarea puede requerir escritorio** — ni armar el torneo, ni generar el fixture, ni resolver inscripciones | Tres, concretas: **(1)** desbloquea el **Brief de Diseño**, que era lo único que este supuesto frenaba; **(2)** el canal "dentro del producto" de D-53 pasa a ser **push**, con el email como respaldo; **(3)** el criterio de prioridad de `05` (principio 3) deja de ser una recomendación y pasa a ser una restricción de diseño: la carga de resultados tiene que resolverse de pie, con una mano, en pocos toques |
| **D-68** | A-02, A-03, A-04 | **Los otros tres supuestos quedan aceptados tal como están documentados**, y son **revisables sobre la marcha**: un equipo no se archiva mientras participa de un torneo en curso; el resultado de un partido se carga después de su fecha programada; el cupo de un torneo no puede bajarse por debajo de los equipos ya aprobados | Ninguno toca el modelo de datos: los tres son reglas de validación puntuales. Si aparece un caso real que los contradiga —un partido adelantado, por ejemplo— se ajusta esa regla sin arrastrar nada más. Por eso se aceptan sin más análisis: el costo de equivocarse es local y barato |

---

### 4.6 Decisiones de la revisión 6 — las derivadas del Brief de Diseño

D-69 y D-70 entran en tensión con D-71 y con el propio contenido del producto. Se resolvieron dentro del brief; se registran acá porque son decisiones de producto, no de oficio.

| # | Tensión | Resolución | Fundamento |
|---|---|---|---|
| **D-72** | Personalidad enérgica (D-69) vs. las dos pantallas más consultadas, que son cuadrículas de números | **La energía vive en la tipografía, el contraste y los momentos, no en el color de fondo ni en la decoración** (`08`, 5.1) | La tabla y el fixture se miran apurado, en la calle, en un teléfono. Regla práctica: si una decisión visual hace más difícil leer un número, es decorativa, no enérgica |
| **D-73** | Dirección oscura (D-70) vs. tema de arranque claro (D-71) | **La identidad es oscura; el lienzo de trabajo es claro.** Superficies de identidad —hero del torneo, cabeceras de perfil, compartibles— en oscuro; cuerpo de la app en claro; todo tokenizado (`08`, 6.1) | Tres razones concretas: la publicidad de red viene pensada para fondo claro y vive en las tres pantallas de más tráfico (D-63); los escudos reales de los equipos se ven peor sobre oscuro; y las tablas densas se leen mejor en claro a plena luz |
| **D-74** | El acento de marca vs. los cinco colores semánticos ya definidos en `04` | **Un solo color de marca, y no puede ser ni verde ni rojo** (`08`, 6.2) | El verde y el rojo ya significan algo —confirmado, aprobado, cancelado, en disputa— y aparecen en casi todas las pantallas. Un acento verde volvería ilegible la diferencia entre "esto es un botón" y "esto salió bien" |
| **D-75** | La publicidad (D-31, D-63) vs. la confianza en el descubrimiento | La publicidad necesita **un contenedor propio que la separe visualmente** del contenido del producto (`08`, 6.4) | Es contenido ajeno de color impredecible en medio de las pantallas más consultadas. Sin contenedor, cada anuncio parece una tarjeta de torneo más |

---

### 4.7 Decisiones de la revisión 7 — verificación, canal y stack

| # | Pregunta | Decisión | Fundamento |
|---|---|---|---|
| **D-76** | El segundo factor de la verificación básica (D-51), ¿por SMS o por email? | **Por email.** Confirmar la dirección de acceso es lo que habilita publicar en el descubrimiento | El SMS **cuesta por usuario nuevo**, justo en el punto donde el producto necesita crecer. Y la defensa que importa no es probar que un teléfono existe: es que **crear organizaciones descartables deje de ser gratis y cómodo**, cosa que la confirmación de correo más el límite de un torneo publicado a la vez ya consiguen. Si más adelante aparece abuso real, se sube el escalón |
| **D-79** | ¿WhatsApp no es un canal sin costo? | **No.** Los mensajes que **inicia el negocio** —un código, un aviso de reprogramación— son plantillas y **se pagan por mensaje**. Solo son gratuitas las conversaciones que **inicia el usuario**, dentro de su ventana de atención | Existe un camino gratuito real: pedirle a la persona que **escriba ella** desde un enlace, de modo que su mensaje entrante pruebe que el número es suyo. Pero el costo verdadero no es el precio por mensaje: es que **usar WhatsApp exige cuenta de WhatsApp Business Platform, número dedicado y verificación de negocio con Meta**, que demora y hay que sostener. Poner esa dependencia antes de tener usuarios es caro en tiempo. Por eso WhatsApp se mantiene donde ya estaba (D-53): **segunda etapa y solo para reprogramaciones**, cuando la cuenta ya exista y su costo por mensaje se justifique |
| **D-77** | ¿Qué stack? | **Next.js (React) con renderizado en servidor, PostgreSQL, monolito TypeScript con capa de servicios, PWA en la etapa 1 y app nativa en la 2** | El stack **se derivó de cinco decisiones de producto ya tomadas** (`09`, 2), no de una preferencia: SEO para el descubrimiento, previsualización del link compartido, publicidad en la web, mobile-first, y consultas relacionales con transacciones. Alternativas evaluadas y descartadas —incluidos Flutter y el stack del sistema de referencia— en `09`, 7 |
| **D-78** | ¿Quién construye el producto? | **Un agente de IA.** Es un dato de contexto con consecuencias técnicas: elegir lo más documentado que exista, tipado de punta a punta, tests como red obligatoria, arquitectura explícita antes que ingeniosa, y migraciones versionadas | Un agente escribe mucho mejor donde hay más código público y patrones estables, y **rompe cosas en silencio** — por eso los tests dejan de ser opcionales. Consecuencia de método: **conviene terminar el embudo documental antes de escribir código**, porque los criterios de aceptación son lo que hace verificable lo que produce (`09`, 7.3) |

---

### 4.8 Corrección de la revisión 8

| # | Qué se corrige | Decisión | Fundamento |
|---|---|---|---|
| **D-80** | La **despublicación automática por inactividad** figuraba como proceso del MVP en `09` y `10`, y como funcionalidad de segunda etapa en `07`. Contradicción real, detectada al escribir el backlog | **Es de la segunda etapa.** El MVP construye la infraestructura de tareas programadas —la necesita igual para la confirmación de resultados a las 72 horas—, pero **no activa la despublicación** | Con pocos torneos el problema que resuelve todavía no existe, y el límite de un torneo publicado a la vez para organizaciones sin verificar ya acota el daño. En cambio **un falso positivo despublicaría el torneo del primer organizador**, que es el peor error posible justo en la etapa donde el producto necesita que ese organizador se quede. Se especifica igual (`10`, 6.2) para que llegue sin rediseño |

---

### 4.9 Decisiones de la revisión 9 — categoría de género del equipo, club y nombre

**De dónde sale:** del primer ejercicio de identidad visual, donde aparecieron dos equipos de una misma institución —uno masculino y uno femenino— conviviendo en la pantalla de inicio. El set tenía `Torneo.categoria_genero` desde la revisión 1, pero **el equipo no tenía género propio**. Eso dejaba dos cosas sin resolver: de dónde sale el recorte del ranking (D-36b lo define como zona + modalidad + categoría) y qué pasa cuando un equipo se inscribe a un torneo de otra categoría.

| # | Pregunta | Decisión | Fundamento |
|---|---|---|---|
| **D-81** | ¿El equipo lleva categoría de género propia, o se infiere de los torneos que jugó? | **Propia.** `EQUIPO.categoria_genero` entra al modelo (`03`, 3.5) con **la misma enumeración que el torneo** —`male` / `female` / `mixed`— y es **obligatoria al crear el equipo** (UC-10) | Inferirla de los torneos jugados no funciona en ninguno de los dos extremos: un equipo recién creado no jugó nada y no tendría categoría, y un equipo que jugó un torneo masculino y uno mixto aparecería en dos rankings a la vez. **El ranking acotado (D-36b, UC-41) exige que la categoría sea un dato del equipo, no una derivación** — de lo contrario el recorte que sostiene todo el modelo de score no se puede calcular. Es un campo, es la misma lista que ya existe, y se pide una vez en la vida del equipo |
| **D-82** | Si el género del equipo no coincide con el del torneo, ¿se bloquea la inscripción? | **Avisa, no bloquea.** El sistema muestra la advertencia a quien inscribe y **al organizador en la ficha de la inscripción** (UC-25); el organizador aprueba o rechaza. Un torneo `mixed` acepta cualquier equipo sin aviso | Mismo criterio que el nombre duplicado (D-16b): en el amateur el reglamento del torneo manda y el organizador ya está aprobando cada inscripción. Bloquear inventa una excepción que alguien va a necesitar —un equipo mixto en un torneo masculino es habitual— y la convierte en un pedido de soporte. Avisar cubre el error real, que es equivocarse de torneo, sin cerrarle la puerta al caso legítimo |
| **D-83** | El ejercicio de identidad muestra "un solo club, dos equipos". ¿Existe el club en el modelo? | **No en el MVP: segunda etapa.** En el MVP son **dos equipos independientes** que comparten nombre y escudo, y una persona los ve juntos en "Mis equipos" porque es integrante de ambos. **El club no es `ORGANIZACION`** | `ORGANIZACION` es quien **organiza torneos** — tiene titular, administradores y nivel de verificación (D-51). Un club es quien **compite**. Meterlos en la misma entidad haría que verificar a un club lo habilite a publicar torneos, que es exactamente lo que la verificación existe para evitar. Y agregarlo como entidad nueva ahora costaría permisos, pantallas y un nivel más de jerarquía para resolver algo que en el MVP se resuelve mostrando dos tarjetas. **Lo que sí se hace desde el día uno es no impedirlo**: el equipo es transversal (D-10) y nada del modelo asume que un equipo esté solo |
| **D-84** | Nombre del producto | **INVICTOS** | Cierra el último ítem abierto del set. En los documentos, "la plataforma" se conserva donde funciona como sustantivo común; el nombre propio aparece en los títulos y donde se habla del producto como marca |

**Qué cambia en el set (ya aplicado):** `EQUIPO.categoria_genero` en `03`, 3.5; la enumeración pasa a ser compartida en `04`, 5.2; el aviso de compatibilidad entra en UC-10 y UC-25 (`02`), en la validación de `03`, y en el servicio de inscripción de `10`. El recorte de ranking de UC-41 pasa a leer la categoría **del equipo**. El club queda registrado en el roadmap (`07`) como funcionalidad de segunda etapa.

---

### 4.10 Decisiones de la revisión 10 — entrar y salir de un equipo

**De dónde sale:** de una observación del cliente sobre cómo se mueve la gente en el amateur. El set modelaba **una sola dirección**: el capitán invita (UC-11) y la persona acepta (UC-12). Pero el que busca equipo se mueve tanto como el que busca jugadores, y no tenía ninguna forma de pedir entrar. Además, ni la entrada ni la salida tenían escrita su regla de consentimiento.

| # | Pregunta | Decisión | Fundamento |
|---|---|---|---|
| **D-85** | ¿Una persona puede pedir sumarse a un equipo, o solo puede esperar que la inviten? | **Puede pedirlo (UC-53), y queda pendiente hasta que el equipo lo resuelva.** Entra un estado nuevo al vínculo, `requested` (`04`, 3.6). **La solicitud siempre pide el rol de Jugador**; capitán, delegado y DT son designaciones del capitán (UC-13), no cosas que se pidan | El camino inverso ya existía para todo lo demás del producto —el equipo se postula al torneo (UC-24) y el organizador resuelve—, y el plantel era la única relación donde solo una parte podía proponer. **Hace falta un estado propio y no reutilizar `invited`**: los dos describen un vínculo a medio hacer, pero en direcciones opuestas, y unificarlos dejaría al capitán sin poder distinguir *"lo invitamos y no contesta"* de *"nos pidió entrar y no le contestamos"*. Los estados **terminales sí se comparten**, porque su significado ya era direccional: `declined` es "quien recibió dijo que no" y `cancelled` es "quien propuso se echó atrás" |
| **D-86** | ¿Quién resuelve la solicitud? | **El Capitán o un Delegado** — exactamente los mismos que pueden invitar (UC-11) | Que invitar y aceptar tuvieran permisos distintos obligaría al capitán a estar presente para terminar algo que un delegado ya podía empezar, sin ninguna razón de negocio detrás. El Delegado existe precisamente porque quien gestiona y quien juega no siempre son la misma persona (D-18) |
| **D-87** | ¿Darse de baja de un equipo necesita confirmación? | **No. Es inmediato y unilateral**, sin solicitud, sin aprobación y sin plazo (UC-13). **Deliberadamente asimétrico** respecto de la entrada, que sí necesita a las dos partes | Estar en un plantel es **público y tiene consecuencias**: la persona figura en el equipo y puede ser anotada en una lista de buena fe de un torneo (UC-27). Por eso nadie puede ser puesto ahí sin aceptar **ni mantenido ahí sin querer** — un capitán capaz de retener a alguien convertiría un dato deportivo en una atadura. Las dos excepciones que existen **no son confirmaciones sino consecuencias ya decididas**: el capitán no puede irse sin designar reemplazo (D-13), y quien está habilitado en un torneo en curso sigue habilitado hasta que ese torneo termine (D-18b) |

**La regla general que dejan las tres, y que conviene tener a mano ante cualquier caso nuevo:** **entrar a un plantel requiere el consentimiento de las dos partes; salir requiere el de una sola.** Da igual quién haya propuesto primero — si las dos propuestas se cruzan, el vínculo queda activo sin pedir nada más.

**[Definido — D-87] Un equipo no puede cerrarse a las solicitudes en el MVP.** No hay interruptor de "acepto solicitudes": cualquiera puede pedir, y el capitán rechaza si no corresponde. **Fundamento:** es una configuración más que mantener para un problema que todavía no existe —con el volumen del MVP, rechazar cuesta un toque—, y el producto ya decidió no agregar configuraciones que nadie va a mantener (D-32). Si el ruido se vuelve real, el interruptor se agrega sin tocar nada del modelo: es un campo en `equipo`, no un cambio de flujo.

**Qué cambia en el set (ya aplicado):** UC-53 en `02` (dominio D3, continuación) más las reglas de baja en UC-13 y los cruces en UC-11 y UC-14; el estado `requested` y los dos tipos de notificación en `04` (3.6 y 4.12); la nota de dirección del vínculo en `03`, 3.6; el caso especial "seguir vs. sumarse" en `05`; las dos acciones del perfil de equipo en `08`; los tres servicios en `10`, 4.3; y el alcance de T19 en `11`.

---

### 4.11 Decisiones de la revisión 11 — la ciudad como unidad de ubicación

**De dónde sale:** de revisar cómo se manejan las zonas antes de cargar el catálogo. Aparecieron dos cosas. La primera, un hueco: **D-25b había decidido zonas con niveles —provincia / ciudad / barrio— pero esa jerarquía nunca llegó al modelo**, donde la zona era un texto plano; con eso, un torneo etiquetado en un barrio era invisible para quien buscaba por la ciudad, y dos comportamientos ya documentados —el orden por proximidad y las sugerencias de zonas cercanas— no tenían mecanismo detrás. La segunda, la decisión del cliente al verlo: **simplificar a un solo nivel y hacer que la ubicación deje de ser un filtro para pasar a ser el contexto por defecto del producto.**

| # | Pregunta | Decisión | Fundamento |
|---|---|---|---|
| **D-88** | ¿Qué estructura tiene la ubicación? | **Dos niveles: provincia → ciudad**, y la **ciudad es la única unidad**. Sin barrios. El catálogo es **nacional y completo desde el día uno** —las ciudades de Argentina agrupadas por provincia— y son **entidades, no una enumeración** (`03`, 3.22) | La ciudad es la unidad con la que la gente piensa dónde juega; cada nivel adicional obliga a decidir en cuál se etiqueta cada torneo y multiplica las combinaciones del filtro. Y el catálogo completo **elimina de raíz el problema del arranque**: nadie se queda nunca sin su ciudad, así que no hay que decidir si se lo bloquea o se lo deja publicar en otro lado |
| **D-89** | ¿Cómo se calcula la cercanía? | **No se calcula. No hay coordenadas ni distancias.** Cuando la ciudad no alcanza, el paso siguiente es **su provincia** | Con la ciudad propia como vista por defecto (D-90), ordenar un listado nacional por cercanía deja de tener sentido: ya no se está mirando el país, se está mirando una ciudad. Evita además arrastrar un stack geográfico —coordenadas, índice espacial— para un cálculo que dejó de existir. **Cuándo se revisa:** ver la nota sobre el AMBA, abajo |
| **D-90** | ¿La ubicación es un filtro o un contexto? | **Un contexto.** Cada persona indica su ciudad y **la aplicación abre mostrando los torneos de esa ciudad**, sin que pida nada. Cambiar de ciudad para explorar otra es una acción explícita. **La ciudad se pide en el primer uso del descubrimiento, no en el registro** | Es el cambio de fondo de esta revisión: el descubrimiento **deja de ser un buscador**. Nadie tiene que aprender a filtrar para ver algo útil. Y pedir la ciudad en el registro contradiría D-52 —el alta pide lo mínimo y todo lo demás es opcional— sin ninguna ganancia: se obtiene igual en el momento en que hace falta, que es el mismo criterio con que el producto pide la cuenta recién al actuar |
| **D-91** | ¿Qué lleva el torneo además de la ciudad? | **Ciudad y dirección**, en texto libre la segunda. **No reemplaza a la dirección de la Sede** (`03`, 3.17): la del torneo es la referencia general, la de cada partido manda sobre ella | La ciudad sirve para **encontrar** el torneo y la dirección para **llegar** (D-25b): son dos usos distintos y ninguno cubre al otro. Cuando el torneo tiene una sola sede coinciden; cuando tiene varias, tener una referencia general evita que la ficha no diga dónde se juega |
| **D-92** | ¿A qué nivel se calcula el ranking? | **Por ciudad** — el recorte de UC-41 es ciudad + modalidad + categoría | Con un solo nivel no hay nada que elegir, y el nivel es el correcto: con el umbral de score vigente —10 partidos confirmados y 2 torneos (D-61)— un recorte más fino estaría casi siempre vacío, y uno por provincia mezclaría equipos que no se cruzan nunca |

**[Definido — D-88] Esta revisión reemplaza el criterio de D-65**, que hacía arrancar el catálogo por el primer mercado para que el filtro no se llenara de lugares sin un solo torneo. **La preocupación era correcta y sigue vigente; lo que cambia es dónde se resuelve**: en la interfaz —el selector ofrece primero las ciudades con torneos y distingue las que no tienen (`08`, 11.3)— y no mutilando el dato. Se gana a cambio algo que el catálogo parcial no podía dar.

**[Definido — D-90] Con la ciudad propia como vista por defecto, la mayoría de las ciudades va a estar vacía mucho tiempo.** Es un estado normal, no un error, y es la pantalla donde más se pierde gente con intención real. Ofrece, en orden: **ver los torneos de la provincia** con su cantidad, **avisar cuando se publique uno acá**, y **publicar uno**. Nunca puede sugerir que el producto entero está vacío porque lo esté una ciudad (`05`, 5).

**[Pendiente de definición] El Gran Buenos Aires no encaja del todo en "una ciudad".** Alguien de Vicente López juega habitualmente en San Isidro y en CABA, que son entradas distintas del catálogo, y con una sola seleccionada ve una porción chica de lo que le sirve. Es el mercado más denso del país y **afecta directamente al diseño del selector**, así que conviene resolverlo antes de fijarlo. **Tres salidas posibles:** permitir seleccionar **más de una ciudad**; tratar al **AMBA como una entrada propia** del catálogo; o dejar que el escalón a provincia lo cubra — que funciona mal, porque la provincia de Buenos Aires incluye Bahía Blanca. **Es la única decisión que esta revisión deja abierta.**

**Qué cambia en el set (ya aplicado):** entidades `PROVINCIA` y `CIUDAD` en `03`, 3.22, `zona` pasa a `ciudad_id` en las cinco entidades que la usaban y el Torneo suma `direccion`; la sección 7 de `04` explica por qué no es una enumeración; la vista por defecto y el escalón a provincia en UC-22, el recorte en UC-41 y los dos campos en UC-16 (`02`); los casos especiales en `05`; el selector y el cambio de carácter del descubrimiento en `08`; el índice y los servicios en `10`; y el alcance de T2, T9 y T22 en `11`.

---

### 4.12 Decisiones de la revisión 12 — la inscripción siempre la valida el organizador

**De dónde sale:** de mirar la inscripción contra el estado real de la monetización. **La regla base del set ya decía lo correcto** —el organizador siempre decide quién entra a su torneo, aunque haya cupo (UC-25)—, pero la revisión 2 le había agregado una excepción: la **aprobación automática configurable por torneo** (D-28b). Esa excepción se tomó pensando en ahorrarle trabajo administrativo al organizador, sin conectarla con el hecho de que **el producto no cobra las inscripciones** (D-31, y el análisis de etapas en `14`).

| # | Pregunta | Decisión | Fundamento |
|---|---|---|---|
| **D-93** | ¿Puede un torneo aceptar inscripciones sin que el organizador las apruebe? | **No. La aprobación automática no existe en el MVP.** Toda inscripción solicitada por un equipo (UC-24) queda `pending` hasta que el organizador o un administrador la resuelva (UC-25). **Se elimina el parámetro configurable de D-28b** | **Mientras el costo de inscripción se paga fuera de la aplicación, la aprobación del organizador es la única señal de que el equipo está realmente adentro** — en el fútbol amateur, casi siempre significa "confirmo que pagaron". Con aprobación automática, un equipo queda aprobado sin que nadie lo haya confirmado, entra al fixture (UC-29) y el organizador se entera el domingo, cuando no se presenta. Y el daño no se queda en la inscripción: **el fixture se genera desde las inscripciones aprobadas**, así que una aprobación equivocada se propaga al calendario, a la tabla y al score |

**[Definido — D-93] Esto no agrega un paso: quita una excepción.** El flujo documentado siempre fue solicitar → resolver. Lo que desaparece es la posibilidad de saltear la resolución, con dos beneficios laterales: **queda un solo camino de entrada** para una inscripción hecha por el propio equipo, y las dos cosas que el organizador tiene que ver al resolver —el score del equipo (UC-40) y la advertencia de categoría cruzada (D-82)— **dejan de tener un modo en el que nadie las mira**.

**[Definido — D-93] `inscribirEquipoManual` (UC-26) no se toca y no es una contradicción.** Ahí el organizador inscribe al equipo él mismo, así que la decisión ya está tomada por quien corresponde y la inscripción nace `approved` en un solo paso. Lo que D-93 elimina es que **un tercero** entre sin que el organizador intervenga.

**[Definido — D-93] Cuándo se revisa, con un disparador concreto.** Cuando la plataforma procese el pago de la inscripción —**etapa 4 de la monetización** (D-31, `14`, 8)—, la aprobación automática vuelve a tener sentido, porque recién ahí el sistema sabe algo que hoy no sabe: **si el equipo pagó**. La forma natural en ese momento no es "aprobar sin mirar" sino **aprobar al confirmarse el pago**. Registrarlo así deja la decisión con un disparador de revisión en vez de dejarla para que alguien la reabra sin el contexto.

---

### 4.13 Decisiones de la revisión 13 — alcance del MVP y confirmación de resultados

**De dónde sale:** de contrastar el paquete de diseño contra `07`. El diseño construyó pantallas de la segunda etapa sin marcarlas, y al revisarlas el cliente decidió **incorporarlas al MVP** en vez de sacarlas. Además, el diseño resolvió por su cuenta un caso que el set no tenía escrito —qué pasa con el plazo de 72 horas cuando el resultado lo carga el propio organizador— y esa inferencia se adopta con una corrección.

| # | Pregunta | Decisión | Fundamento |
|---|---|---|---|
| **D-94** | ¿Qué entra al MVP de lo que estaba en la segunda etapa? | **Seis casos de uso pasan al MVP:** UC-32 confirmar o disputar, **UC-34 eventos del partido**, UC-36 estadísticas del torneo, UC-38 historial del jugador, UC-44 feed de actividad y UC-47 preferencias de notificación. **El score y los rankings (UC-39, UC-40, UC-41) se confirman como etapa futura**, donde ya estaban | **UC-32 es el que más cambia el producto:** `00`, 5.3 identificó como el riesgo más serio que el dato lo declare una parte interesada, y confirmar o disputar es exactamente lo que lo convierte en dato validado — tenerlo desde el día uno elimina el riesgo en vez de administrarlo. **UC-34 no estaba en la lista del cliente pero entra por necesidad:** `07` ya decía que UC-36 y UC-38 dependen de él, así que sin eventos cargados la tabla de goleadores es una pantalla vacía. **UC-44 tenía un motivo para esperar** —un feed sin torneos activos parece un producto abandonado— y el diseño ya lo respondió con un estado vacío que invita a descubrir |
| **D-95** | Si el resultado lo carga el organizador, ¿corre igual el plazo de 72 horas? | **No: queda `confirmed` al instante** y computa en la tabla y en el score desde el primer momento. **Pero el equipo rival conserva la objeción** durante las mismas 72 horas: si objeta, el partido pasa a `disputed` con las reglas de siempre. Cuando el resultado lo carga un **capitán**, no cambia nada — sigue `loaded` con el plazo de D-60 | El diseño infirió bien la primera mitad: si quien confirma es quien carga (D-07b), esperar 72 horas no agrega nada y demora la tabla, que es la recompensa inmediata de cargar resultados. **Lo que la inferencia se llevaba puesto era la segunda mitad:** en el amateur el organizador **no siempre es neutral** —suele ser el dueño del complejo o alguien del ambiente—, y dejar sin objeción un resultado que él cargó reabre exactamente el riesgo que UC-32 existe para cerrar. Separar *cuándo cuenta* de *hasta cuándo se puede objetar* conserva las dos cosas |

**[Definido — D-95] No hace falta ningún estado nuevo.** Los cuatro valores de `Partido.estado_resultado` (`04`, 4.7) alcanzan: el resultado nace `confirmed` en vez de `loaded`, y una objeción lo lleva a `disputed` como en cualquier otro caso. Lo que se agrega es un **cuarto camino hacia `confirmed`** —la carga por el organizador o por un colaborador asignado— y la aclaración de que **`confirmed` no es irreversible mientras la ventana esté abierta**.

**[Definido — D-95] La ventana de objeción es la misma de 72 horas, contada desde la carga.** Reusar el número evita explicar dos plazos distintos, y el fundamento de D-60 se traslada tal cual: cubre el fin de semana largo del amateur y es más corto que la semana entre fechas, así que la tabla queda firme antes de la fecha siguiente.

**[Definido — D-94] Consecuencia sobre la resolución de inscripciones.** UC-25 dice que el score del equipo es información para decidir a quién se acepta, pero **el score sigue siendo de etapa futura**: en el MVP el organizador resuelve con el equipo, su ciudad, su plantel y la advertencia de categoría cruzada (D-82), **sin score**. La pantalla de diseño lo muestra; hay que sacarlo de la versión del MVP o dejarlo como espacio previsto.

**Qué cambia en el set (ya aplicado):** `07` mueve los seis casos de uso de la sección 4 a la 3 y deja el score en la tercera; `02` actualiza las notas de alcance de UC-32, UC-34, UC-36, UC-38, UC-44 y UC-47, y las reglas de confirmación de UC-31 y UC-32; `04`, 4.7 suma el cuarto camino hacia `confirmed`; `10` lo refleja en el servicio de carga; y `11` suma cinco tickets (T29 a T33).

---

## 5. El modelo de score

> **[Definido]** Existe un score de reputación deportiva para equipos (D-09). La **dirección del modelo** quedó definida en esta revisión.
> **[Definido — D-61]** Los **valores de arranque**: se muestra score con **10 partidos confirmados y 2 torneos** como mínimo, y la ventana es de **24 meses con decaimiento lineal**. Son valores para poder construir, no una fórmula: las **ponderaciones de cada componente se calibran con datos reales** (5.4), no se fijan sobre el papel.

### 5.1 Componentes del modelo

| Componente | Cómo participa |
|---|---|
| Partidos ganados / empatados / perdidos | Insumo principal del desempeño |
| Diferencia de gol | Participa **acotada**: un 12-0 no vale cuatro veces un 3-0 |
| Torneos disputados | Aporta por los partidos jugados en ellos, no por el torneo en sí |
| Posición final en cada torneo | Se acredita al finalizar el torneo (D-23b). No se acredita en torneos cancelados (D-24b) |
| Antigüedad de los resultados | Participa mediante decaimiento (S-03) |
| Partidos ganados por presentación | **No computan** como partido jugado (D-33b) |
| Resultados en disputa | **No computan** hasta resolverse |
| Seguidores | **No participan** (D-40b) |

### 5.2 Las cinco decisiones de dirección, ya tomadas

| # | Pregunta | Decisión | Fundamento |
|---|---|---|---|
| **S-01** | ¿Desempeño absoluto o relativo al rival? | **Absoluto** (puntos por resultado, acumulados). Se registran desde el día uno los datos que harían falta para pasar a un modelo tipo Elo más adelante | UC-40 exige que el score se entienda. Un modelo relativo es más justo pero opaco ("¿por qué bajé si gané?"), y necesita historia previa para estabilizarse |
| **S-02** | ¿Cómo se comparan torneos de distinto nivel? | **No se comparan**: los rankings son acotados por zona, modalidad y categoría (D-36b). Inferir el nivel del torneo a partir del score de sus participantes queda para cuando haya volumen | Dejar que el organizador declare el nivel de su torneo garantiza que todos declaren "alto" |
| **S-03** | ¿El score decae con el tiempo? | **Sí.** Un equipo que dejó de jugar pierde posición frente a equipos activos | Sin decaimiento, un equipo inactivo conserva su lugar para siempre. Contrapartida a comunicar: el score puede bajar sin haber perdido, y el desglose (UC-40) tiene que explicarlo |
| **S-04** | ¿Qué pasa con equipos con poca actividad? | **No se muestra score** hasta un mínimo de partidos confirmados: el equipo aparece como "sin score todavía" | Un equipo con dos partidos ganados encabezaría cualquier ranking, y eso invalida el indicador completo. Un cero se lee como "es malísimo"; la ausencia se lee como "todavía no jugó lo suficiente" |
| **S-05** | ¿El score incluye comportamiento? | **Dos indicadores separados**: score deportivo y confiabilidad (torneos terminados vs. abandonados). El de confiabilidad se muestra solo cuando hay algo que mostrar | El organizador que revisa una inscripción quiere saber dos cosas distintas: qué tan bien juegan y si se van a bajar a mitad de torneo. Un solo número las confunde y vuelve el score discutible |

### 5.3 Reglas de construcción

1. **El score debe ser explicable.** Cualquiera puede abrir el desglose y ver de dónde sale (UC-40).
2. **Solo alimenta el score lo confirmado.** La tabla de un torneo puede ser provisoria; la reputación permanente y comparable, no.
3. **Se guarda calculado, junto con el desglose que lo produjo** — no se recalcula en cada consulta. Mismo criterio que la tabla de posiciones.
4. **El modelo está versionado desde el día uno.** Cada score guardado registra con qué versión de la fórmula se calculó. Sin esto, el primer ajuste reescribe silenciosamente la historia de todos los equipos.

### 5.4 Cómo se fijan los parámetros (P-48)

**[Definido]** No se fijan sobre el papel. El camino es:

1. **Registrar los insumos desde el MVP** aunque no se calcule nada — ya están todos en el modelo (`03`).
2. **Publicar primero el historial** (UC-37), que no requiere ninguna decisión y ya es útil.
3. **Calcular el score cuando haya datos reales** con los que evaluar si ordena a los equipos de una forma que la gente reconozca como justa.
4. **Versionarlo y ajustarlo** con esos datos.

Fundamento: un score que ordena mal es peor que no tener score — se discute públicamente, desgasta al organizador y le hace perder credibilidad a todo lo demás que la plataforma muestra.

---

## 6. Decisiones de modelado registradas en la revisión 1

Se conservan sin cambios. Tabla viva: cuando una decisión se revisa, **no se borra** — se marca como superada indicando cuál la reemplaza.

| # | Pregunta | Resolución | Dónde |
|---|---|---|---|
| **D-12** | ¿El jugador es lo mismo que el usuario? | **No.** Un perfil deportivo puede existir sin cuenta y ser reclamado después. Sin esto, cargar un plantel exigiría que quince personas se registren el mismo día. *(Actualizada por D-22: la entidad pasó a llamarse `PERFIL_DEPORTIVO`)* | `03` 3.2, `02` UC-05 |
| **D-13** | ¿El equipo es una fila dentro de un torneo o una entidad propia? | **Entidad propia y permanente.** Condición necesaria para que existan historial y score | `03` 3.5, `02` UC-10 |
| **D-14** | ¿El plantel del equipo y el del torneo son lo mismo? | **No.** El permanente y el habilitado por torneo son entidades distintas. *(Ampliada por D-24: el habilitado ahora incluye cuerpo técnico)* | `03` 3.10, `02` UC-27 |
| **D-15** | ¿Cómo se documenta el score en esta etapa? | Sin fórmula: componentes, decisiones abiertas y reglas de construcción. *(Actualizada: la dirección quedó definida, ver sección 5)* | Sección 5 |
| **D-16** | ¿Cuántos módulos tiene el producto? | **12 dominios**, con el fundamento de cada fusión y cada separación | `01` 3.3 |
| **D-17** | ¿La documentación técnica se genera en esta vuelta? | **No.** Brief de Diseño, Arquitectura, Especificación y Backlog requieren decisiones previas | `00` 3.1, `07` |

---

## 7. Supuestos — todos confirmados en la revisión 5

Interpretaciones que la documentación necesitó para ser coherente y que en su momento **no** eran decisiones tomadas. Los cuatro quedaron confirmados (D-67, D-68). Se conservan con su número y su columna original —qué pasaría si fueran falsos— porque es justamente lo que hay que releer si alguna vez hay que revisarlos.

| # | Supuesto *(confirmado)* | Dónde | Qué habría que revisar si se decidiera cambiarlo |
|---|---|---|---|
| **A-01** | El uso principal es **móvil** para jugadores y capitanes, y **mixto** para organizadores | `05` 2.1 | Cambia la priorización del diseño y la respuesta a P-37 (canales de notificación) |
| **A-02** | Un equipo **no puede archivarse** mientras participa de un torneo en curso | `02` UC-15 | Habría que definir qué pasa con su fixture, igual que en D-08b |
| **A-03** | El resultado de un partido se carga **después** de su fecha programada | `02` UC-31 | Habría que permitir cargar resultados de partidos adelantados |
| **A-04** | El cupo de un torneo **no puede bajarse** por debajo de la cantidad de equipos ya aprobados | `02` UC-19 | Habría que definir a qué equipo se da de baja |

---

## 8. Cómo mantener este documento

- Cuando una `P-nn` se resuelva, se agrega a la sección 4 con su fundamento y dónde quedó documentada, y se saca de la sección 2 — **conservando su número**.
- Cuando una decisión de las secciones 4 o 6 se revise, no se borra: se marca "**Actualizada, ver D-nn**".
- Antes de escribir cualquier regla nueva en otro documento, verificar que tenga su marca de estado. **Una regla sin marca es una regla inventada.**
- La sección 4.2 es la fuente de verdad de la revisión 2: cualquier documento del set que la contradiga está desactualizado.
