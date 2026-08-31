# Roadmap funcional — INVICTOS

## 1. Objetivo del documento

Este documento clasifica las funcionalidades documentadas en `02-casos-de-uso.md` en etapas, con el fundamento de por qué cada una está donde está. **[Definido]** en su totalidad, en el sentido de `06`, D-21: las propuestas de la revisión anterior se adoptaron como definitivas. Sigue siendo una **recomendación de orden**, no un compromiso de alcance: lo que está definido es la etapa en la que conviene construir cada cosa y por qué, no una fecha ni un contrato.

El criterio rector viene de `01`, 2.1: **los tres motores del producto no arrancan a la vez**. El primero genera el dato (gestión operativa), el segundo lo consume (participación), el tercero lo acumula (comunidad). Un score sin partidos cargados no vale nada, y un feed sin torneos activos hace que el producto parezca abandonado.

---

## 2. La pregunta que ordena el roadmap

**¿Quién tiene que llegar primero?**

En una plataforma de dos lados, el orden importa. Acá la respuesta es clara y condiciona todo lo demás:

> **Sin organizadores no hay torneos; sin torneos no hay nada que descubrir, seguir, ni sobre lo que construir reputación.**

De ahí se desprenden dos consecuencias para el MVP:

1. **El MVP tiene que ser completo para el organizador y mínimo para todos los demás.** Un organizador que no puede terminar su torneo en la plataforma vuelve a su planilla y no regresa. Un jugador al que le falta una funcionalidad social espera.
2. **El MVP tiene que servir aunque nadie más use la plataforma.** Por eso la inscripción manual de equipos (UC-26) es MVP: el primer organizador llega con equipos que no tienen cuenta. Si el producto exige que doce capitanes se registren para poder armar un fixture, no sirve para el primer torneo de nadie — y sin un primer torneo no hay segundo.

---

## 3. MVP — Primera versión

**Objetivo:** que un organizador pueda llevar un torneo completo de principio a fin, y que cualquiera pueda verlo sin tener cuenta.

**Criterio de inclusión:** está en el MVP si, sin eso, **un torneo no puede terminarse** o **no puede ser visto**.

| Dominio | Casos de uso | Por qué es MVP |
|---|---|---|
| **D1 Identidad** | UC-01 Registrarse · UC-02 Perfil de jugador *(mínimo)* · UC-03 Ver perfil público | Sin cuenta no hay organizador ni capitán. El perfil puede ser mínimo. |
| **D2 Organizadores** | UC-06 Crear organización · UC-07 Miembros de la organización · **UC-52 Asignar colaboradores a un torneo** · UC-08 Perfil del organizador · **Verificación básica de la organización** | Sin organización no hay torneo. Los colaboradores entran al MVP porque cargar resultados es la tarea más frecuente y la primera que se delega, y **UC-52 es la forma concreta en que esa delegación ocurre**: el vínculo es con el torneo, no con la organización (`06`, D-32, D-34), así que sin UC-52 no hay manera de que alguien que no sea el organizador cargue un resultado. **UC-07 queda acotado a los roles de organización** —titular y administradores—, que son los que sí valen para toda la organización; el Administrador sí puede asignar colaboradores en los torneos que administra (`06`, D-64). La **verificación básica** entra al MVP porque es la única defensa del descubrimiento desde el día uno: es automática —confirmar la dirección de correo de acceso, sin SMS (`06`, D-76)— y no gatea crear ni gestionar el torneo, solo aparecer en la búsqueda (`06`, D-51). Sin ella, el descubrimiento, que es **el activo del producto**, nace sin defensa, y limpiarlo después cuesta mucho más que nacer limpio. La **verificación con distintivo** (nivel `trusted`) y la **despublicación automática por inactividad** quedan para la segunda etapa. |
| **D3 Equipos** | UC-10 Crear equipo · UC-11 Invitar al plantel *(incluye cuerpo técnico)* · UC-12 Responder invitación · UC-13 Roles y bajas · UC-14 Perfil del equipo | El equipo permanente es la base del historial y del score. Sin él, el producto no puede crecer hacia la comunidad. El **cuerpo técnico** entra al MVP porque no abre un flujo nuevo: es **un rol más** dentro de la invitación al plantel que ya existe (`06`, D-18, D-23), y dejarlo afuera obligaría a que el DT se cargue como jugador, que es exactamente el dato falso que después ensucia estadísticas y cupos. |
| **D4 Torneos** | UC-16 Crear · UC-17 Formato · UC-18 Publicar · UC-19 Modificar · UC-20 Estado y avance · UC-21 Cancelar/suspender · **UC-51 Reglamento del torneo** | Es el núcleo. UC-21 entra al MVP porque un torneo que no puede cancelarse deja a los equipos sin información. **UC-51** entra porque es **opcional y de bajo costo** —texto y/o archivo versionado, sin reglas derivadas (`06`, D-28, D-29)— y es lo único que le da respaldo al organizador cuando aparece una disputa: sin un texto al que remitirse, cada decisión suya queda como arbitraria. |
| **D5 Descubrimiento** | UC-22 Buscar torneos · UC-23 Ficha pública | Es lo que diferencia a la plataforma de una planilla compartida. La ficha pública es además la principal puerta de entrada de usuarios nuevos. |
| **D6 Inscripciones** | UC-24 Solicitar *(incluye la aceptación del reglamento)* · UC-25 Resolver · **UC-26 Inscribir manualmente** · UC-27 Confirmar plantel · UC-28 Baja del torneo | UC-26 es innegociable (ver sección 2). UC-28 entra porque los equipos se bajan y el fixture tiene que poder seguir. La **aceptación del reglamento** entra al MVP porque es **de un clic** y guarda qué versión se aceptó (`06`, D-54): es lo único que le da respaldo al organizador cuando aparece una disputa, y sumarla después obligaría a decidir qué hacer con todas las inscripciones que ya existen. Solo aparece si el torneo tiene reglamento cargado, que es opcional (`06`, D-29). |
| **D7 Competencia** | UC-29 Generar fixture · **UC-30 Programar y reprogramar** · UC-31 Cargar resultado · **UC-32 Confirmar o disputar** · UC-33 Partido no disputado · **UC-34 Eventos del partido** | Es el corazón del dato. UC-33 entra al MVP porque los partidos que no se juegan son parte normal del fútbol amateur, no una excepción. **UC-30 incluye el ajuste de fechas con el torneo ya en curso** (`06`, D-30), conservando la fecha original y notificando: por la misma razón que UC-33, mover partidos es la regla y no la excepción, y si no se puede hacer en la plataforma se hace por mensajería y el fixture publicado queda mintiendo. |
| **D8 Posiciones** | UC-35 Tabla de posiciones · **UC-36 Estadísticas del torneo** · UC-37 Historial del equipo · **UC-38 Historial del jugador** | La tabla es la recompensa inmediata de cargar resultados y la pantalla más consultada del producto. |
| **D10 Social** | UC-42 Seguir torneo · UC-43 Seguir equipo · **UC-44 Feed de actividad** | Es la acción de conversión de menor compromiso que justifica crear una cuenta. Cuesta poco y es lo que empieza a construir la base de usuarios. |
| **D11 Notificaciones** | UC-46 Recibir *(subconjunto accionable)* · **UC-47 Preferencias de notificación** | Solo las accionables: invitación a equipo, inscripción recibida/resuelta, partido programado o reprogramado. Sin ellas, los flujos que dependen de que alguien responda se rompen. |

**[Definido — D-94] Seis casos de uso entraron al MVP en la revisión 13**, después de que el diseño los construyera: **UC-32** confirmar o disputar, **UC-34** eventos del partido, **UC-36** estadísticas del torneo, **UC-38** historial del jugador, **UC-44** feed de actividad y **UC-47** preferencias de notificación.

**El que más cambia el producto es UC-32.** `00`, 5.3 identificó como el riesgo más serio de todo el proyecto que el dato lo declare una parte interesada; confirmar o disputar es lo que lo convierte en dato validado. Tenerlo desde el día uno **elimina el riesgo en vez de administrarlo**, y hace que el score futuro se construya sobre datos confirmados desde el primer torneo en vez de sobre el historial acumulado antes de que existiera.

**UC-34 entra por dependencia, no por pedido:** esta misma sección decía que UC-36 y UC-38 dependen de él. Sin eventos cargados, la tabla de goleadores es una pantalla vacía.

**Lo que sigue fuera y no se movió: el score y los rankings** (UC-39, UC-40, UC-41), que continúan en la tercera etapa. Sus ponderaciones **no se fijan sobre el papel**: se calibran con datos reales de uso (`06`, 5.4). Lo que sí ocurre desde el MVP es que **los insumos se registran**, y ahora además **confirmados** — que era la condición que faltaba.

**Decisiones que hay que resolver antes de construir el MVP: ninguna.** Con esta revisión se cerraron las 16 que quedaban abiertas, y el set **no tiene ninguna decisión de negocio pendiente** (`06`, sección 2). La última bloqueante era la verificación de organizadores, resuelta en `06`, D-51: gatea *aparecer en el descubrimiento*, no *crear ni gestionar* un torneo.

Lo que queda no bloquea el desarrollo, y conviene no confundirlo con una decisión pendiente. Son dos cosas distintas (`06`, sección 2) — los 4 supuestos que había quedaron confirmados en la revisión 5 (`06`, D-67, D-68):

- **3 valores de arranque a calibrar**: el límite de torneos publicados y el plazo de despublicación de las organizaciones sin verificar (`06`, D-51) y los umbrales del score (`06`, D-61). Se fijaron con un número puesto justamente para poder construir, y se corrigen mirando datos de uso, no discutiendo más.
- **3 catálogos a completar** con los valores del primer mercado: zonas (`06`, D-65), motivos de baja y cancelación (`06`, D-66) y posición del jugador (`06`, D-52). Tienen criterio y forma definidos; cargarlos es trabajo de datos, no una decisión de negocio.

**El Brief de Diseño ya no está bloqueado.** A-01 quedó confirmado: **el uso principal es móvil**, y el producto es mobile-first para todos los actores — la configuración del organizador puede aprovechar una pantalla grande, pero ninguna tarea puede requerir escritorio (`06`, D-67). Eso tiene dos consecuencias inmediatas sobre este roadmap: el canal "dentro del producto" de las notificaciones pasa a ser **push** (`06`, D-53), y la carga de resultados —el flujo más repetido del MVP— tiene que resolverse de pie y con una mano, sin una versión de escritorio a la que caerse.

### 3.1 Lo que deliberadamente **no** está en el MVP, y por qué

| Funcionalidad | Por qué no |
|---|---|
| **Score y rankings (D9)** | No hay datos con qué calcularlo ni con qué validarlo. Publicar un score con tres torneos cargados lo instala mal y después es muy difícil corregirlo. Ver `06`, 5.4. |
| **Eventos del partido / goleadores (UC-34)** | El resultado es obligatorio, el detalle no. Sumar carga de eventos antes de que el flujo de resultados esté aceitado pone en riesgo que se cargue el resultado también. |
| **Confirmación y disputa de resultados (UC-32)** | El modelo de carga ya está decidido —los capitanes cargan y el organizador confirma (`06`, D-07b)—, pero el mismo D-07b permite configurar el torneo para que cargue solo el organizador. El MVP arranca por ahí: con una sola parte cargando, la disputa es menos urgente y puede esperar a la segunda etapa. |
| **Feed de actividad (UC-44)** | Con pocos torneos activos, un feed se ve vacío y hace parecer abandonado al producto. El seguimiento (UC-42, UC-43) se registra igual desde el MVP. |
| **Reclamo de perfil (UC-05)** | Los perfiles sin cuenta se crean desde el MVP (UC-11), así que el historial se acumula igual. El reclamo puede llegar después sin perder nada — y funciona mejor cuando ya hay historial atractivo que reclamar. |
| **Preferencias de notificación (UC-47)** | Con un conjunto chico de notificaciones accionables, alcanza con un default sensato. |
| **Administración de plataforma (UC-48 a UC-50)** | Con pocos organizadores, la moderación se resuelve manualmente. |

---

## 4. Evolución posterior — Segunda etapa

**Objetivo:** que el dato sea confiable y rico, y que el trabajo del organizador baje todavía más.

**Criterio:** funcionalidades que **hacen mejor lo que el MVP ya hace**, sin abrir dominios nuevos.

> **[Definido — D-94]** Esta etapa se vació bastante en la revisión 13: **UC-32, UC-34, UC-36, UC-38, UC-44 y UC-47 pasaron al MVP**. Lo que queda son cosas que dependen de tener volumen —lista de espera, distintivo de verificación, despublicación por inactividad— o que abren una integración —WhatsApp— o una jerarquía nueva —el club—.

| Prioridad | Funcionalidad | Fundamento |
|---|:--:|---|
| **Media** | **UC-05 Reclamar perfil de jugador** | Con historial acumulado, es el mecanismo de crecimiento más eficiente del producto: la persona se registra para quedarse con algo que ya existe. |
| **Media** | **Lista de espera de inscripciones** | **Decidido que existe** (`06`, D-27b). Cubre bajas sin que el organizador salga a buscar equipos — exactamente el trabajo manual que el producto promete evitar. Llega después del MVP porque primero tiene que haber torneos con el cupo lleno. |
| **Media** | **Reprogramación propuesta por los equipos** | **Decidido: va en esta etapa** (`06`, D-32b). Coordinar reprogramaciones es una de las tareas más pesadas del fútbol amateur, pero primero tiene que existir el fixture y el ajuste de fechas del organizador (UC-30), que ya es MVP. |
| **Media** | **Verificación con distintivo y despublicación automática por inactividad** | **Decidido: van en esta etapa** (`06`, D-51 y D-80). El nivel con distintivo —documentación de la entidad o trayectoria demostrada— y la despublicación de los torneos que pasan demasiado tiempo sin inscripciones ni fixture son refinamientos de la defensa del descubrimiento: recién valen cuando hay volumen suficiente para que la basura se note y para que un distintivo distinga algo. El MVP arranca con la verificación básica, que es automática. El límite de torneos y el plazo de despublicación son **valores de arranque a calibrar** con datos de uso, no reglas de negocio. |
| **Media** | **Historial público del cuerpo técnico** | **Decidido: va en esta etapa** (`06`, D-55). No abre ninguna decisión nueva ni pide un dato nuevo: el DT ya figura en la lista de buena fe de cada torneo desde el MVP (`06`, D-24), así que el historial —torneos dirigidos, equipos, resultados— es una vista sobre datos que ya se registran. **Score de DT no hay** (`06`, D-55): heredaría todos los problemas del score de equipo y sumaría el de atribuirle a una persona el resultado de un colectivo. |
| **Media** | **Club — agrupador de equipos de una misma institución** | **Decidido: va en esta etapa** (`06`, D-83). Una institución con equipo masculino y femenino hoy tiene dos equipos independientes que comparten nombre y escudo, y eso alcanza para jugar: cada uno con su plantel, su historial y su score. El agrupador aporta identidad compartida, una ficha pública única y permisos que se heredan — valor real, pero de presentación, no de operación. Llega después del MVP porque abre un nivel de jerarquía y un vínculo de permisos nuevo, y porque recién se justifica cuando hay instituciones con varios equipos activos. **No se resuelve con `ORGANIZACION`**: esa entidad es la que publica torneos y su verificación habilita a hacerlo (D-51); un club es quien compite. |
| **Baja** | **WhatsApp como canal de notificación, solo para reprogramaciones** | **Decidido: va en esta etapa y acotado** (`06`, D-53). WhatsApp es donde hoy vive la conversación de reprogramar un partido, que es el aviso más urgente del producto. Llega después del MVP porque tiene costo por mensaje y aprobación de plantillas: es una integración, no una configuración. El MVP notifica dentro del producto y por email, que funciona sin importar cómo se resuelva A-01. |
| **Baja** | **UC-09 Transferir titularidad de la organización** | Caso real pero infrecuente; hasta que exista, se resuelve manualmente. |
| **Baja** | **Sanciones automáticas por acumulación de tarjetas** | **Decidido que no van en esta versión** (`06`, D-34b): muy valoradas por ligas formales (D-03), poco relevantes en amateur. Quedan como candidato principal de la extensión hacia ligas formales. El reglamento del torneo (UC-51) puede establecerlas por escrito; lo que no hace la plataforma es aplicarlas sola. |

---

## 5. Comunidad y reputación — Tercera etapa

**Objetivo:** que la actividad acumulada genere reputación, conexiones y motivos para volver.

**Criterio:** requiere **masa crítica de datos reales**. Construirlo antes no lo hace estar antes: lo hace estar mal.

| Funcionalidad | Precondición real para empezar |
|---|---|
| **UC-39 Calcular score · UC-40 Consultar score** | Suficientes torneos finalizados y resultados confirmados como para evaluar si el score ordena a los equipos de una forma que la gente reconozca como justa. La **dirección del modelo ya está definida** —absoluto, explicable, con decaimiento, rankings acotados y dos indicadores separados (`06`, sección 5)— y los **umbrales de arranque también**: score visible con **10 partidos confirmados y 2 torneos**, ventana de **24 meses** con decaimiento lineal (`06`, D-61). La precondición que queda es **calibrar las ponderaciones con datos reales**: cuánto pesa cada componente es lo único que no se puede fijar sobre el papel, porque se ajusta mirando el resultado, no razonándolo. |
| **Score del cuerpo técnico (DT)** | **No se construye** (`06`, D-55). Queda explícitamente fuera de esta etapa y de las siguientes: el historial público del DT sí llega, en la segunda etapa, pero un score individual heredaría todos los problemas del score de equipo y le sumaría el de atribuirle a una persona el resultado de un colectivo. |
| **UC-41 Rankings** | Score validado y suficientes equipos por recorte (zona + modalidad + categoría) para que un ranking signifique algo. |
| **UC-45 Seguir jugadores** | Masa de perfiles reclamados (UC-05). La política de visibilidad ya está definida —pública o restringida, sin niveles intermedios (`06`, D-14b)—, pero introduce dinámicas sociales que el seguimiento de equipos no tiene y conviene mirarlas con volumen real. |
| **Reputación del organizador** | **Decidido** (`06`, D-03b): en el MVP se muestra **solo trayectoria factual** (torneos organizados y finalizados). Los torneos cancelados se hacen visibles recién en esta etapa, cuando haya volumen suficiente para que una cancelación se lea en contexto y no como una condena pública. |
| **UC-48 a UC-50 Administración de plataforma** | El volumen de contenido cargado por usuarios vuelve inviable la moderación manual. Suele llegar antes de lo que se espera. |

---

## 6. El roadmap de monetización, cruzado con el de producto

**[Definido]** El modelo de ingresos tiene sus propias cuatro etapas (`06`, D-31) y **no coinciden con las tres etapas de producto**: conviene mirarlas juntas, porque cada etapa de monetización necesita que el producto haya llegado a cierto punto antes de poder existir.

| Etapa de monetización | Qué es | Qué necesita del producto antes |
|---|---|---|
| **1 · Gratis + publicidad de red** | Todo gratis para todos, con publicidad servida por una red externa (Google) desde el inicio | Nada nuevo: solo tráfico. Es la única etapa que puede arrancar con el MVP. **[Definido]** Las superficies ya están definidas: ficha pública del torneo, fixture y descubrimiento la llevan; los flujos de tarea del organizador y el flujo de inscripción del capitán, no (`06`, D-35, D-63) |
| **2 · Sponsors vendidos directamente** | Publicidad vendida por el equipo del producto, no servida por una red | Volumen de tráfico demostrable por zona y por torneo, que es lo que se le vende a un sponsor local. Llega naturalmente después de la segunda etapa de producto, cuando el dato ya es confiable |
| **3 · Suscripción de grandes organizadores** | Un plan pago con funcionalidades o límites propios | Que existan organizadores grandes. **[Definido]** Qué define a un "gran organizador" y qué incluye su suscripción **se resuelve con datos de uso reales** —torneos activos, equipos, colaboradores—, no sobre el papel (`06`, D-62). No bloquea nada: no hay nada que construir hasta que esos organizadores existan |
| **4 · Comisión sobre pagos** | Un fee sobre las transacciones de pago que ocurran dentro de la plataforma | Que exista el pago dentro de la plataforma — hoy no existe. Es la funcionalidad de "Pagos de inscripción dentro de la plataforma" de la sección 7 |

**[Definido] Dos observaciones que conviene dejar escritas, porque son las que ordenan las expectativas:**

- **La comisión sobre pagos depende de una funcionalidad que hoy no existe.** No se cobra un fee sobre una transacción que no ocurre en la plataforma: antes de poder cobrarla hay que construir el pago de inscripción entero, que es el mayor salto de complejidad anotado en todo el set. Por eso la Inscripción se modela desde el día uno contemplando un costo asociado, aunque hoy siempre sea cero (`06`, D-33) — lo caro no es agregar la entidad de pago cuando llegue, es descubrir tarde que la Inscripción se modeló como un vínculo sin importe.
- **La suscripción depende de que existan organizadores grandes,** que es exactamente lo que el producto todavía tiene que demostrar que puede atraer. Es la etapa de monetización con la precondición menos controlable: no se acelera construyéndola antes, se acelera consiguiendo esos organizadores. Y **la definición de "gran organizador" se toma con datos de uso** (`06`, D-62), no ahora: decidirla sobre el papel sería inventar un límite y descubrir después que no separa a nadie. No bloquea ninguna etapa del roadmap.

---

## 7. Ideas anotadas, sin etapa asignada

No forman parte del roadmap. Se anotan para que no se pierdan y para dejar constancia de que se consideraron.

| Idea | De dónde sale | Estado |
|---|---|---|
| **Canal conversacional para cargar resultados** (mensaje o audio desde la cancha) | El set de referencia tenía un canal conversacional para operar sin abrir la app. Acá el caso equivalente sería el organizador cargando resultados en el complejo. | **[Definido]** Idea nueva, no un traslado. Evaluar recién con el flujo de carga aceitado y volumen real. Ver `00`, 4. |
| **Competencias recurrentes con ediciones** | `06`, D-19b | **Decidido: no en esta versión** — cada torneo es independiente. El modelo deja **previsto un vínculo opcional** hacia una competencia agrupadora, que es lo que permite sumarlo después sin migrar todos los dominios derivados. |
| **Gestión de canchas y disponibilidad** | `06`, D-12b | **Decidido:** de la cancha se guarda el dato mínimo (nombre, dirección y zona). La disponibilidad y las reservas son un producto entero aparte; solo si el usuario principal pasa a ser el complejo deportivo. |
| **Pagos de inscripción dentro de la plataforma** | `06`, D-31, D-33 | **[Definido]** Deja de ser una idea suelta: es **parte del roadmap de monetización** (sección 6, etapas 3 y 4) — la comisión sobre pagos no puede cobrarse hasta que el pago ocurra dentro de la plataforma. Sigue siendo el mayor valor operativo posible para el organizador y el mayor salto de complejidad del set. De su lado comercial no queda nada por decidir: qué define a un "gran organizador" y qué incluye su suscripción se resuelve con datos de uso (`06`, D-62). |
| **Búsqueda de jugadores para completar un equipo** ("busco arquero para el domingo") | No pedido, pero es una necesidad constante del fútbol amateur y encaja con la visión de ecosistema | **[Definido]** Anotada como oportunidad de producto. Requiere UC-05 con volumen y una política de visibilidad madura. |
| **Amistosos entre equipos de la plataforma** | Íd. | **[Definido]** Extiende el producto más allá del torneo, usando el score como criterio de emparejamiento por nivel. |

---

## 8. Documentación pendiente por etapa

Retoma `00`, 3.1: qué documentos del embudo faltan y cuándo corresponde escribirlos.

| Documento | Requiere antes | Cuándo |
|---|---|---|
| **Brief de Diseño** | — | ✅ **Hecho**: `08-brief-diseno.md`. Personalidad, sistema de color, tipografía, tono, plataforma e inventario de pantallas del MVP con el dato exacto que alimenta cada una |
| **Diagrama de Arquitectura del Ecosistema** | — | ✅ **Hecho**: `09-diagrama-arquitectura-ecosistema.md`. Stack derivado de cinco decisiones de producto, con alternativas descartadas y riesgos declarados (`06`, D-77) |
| **Especificación Técnica de Backend** | — | ✅ **Hecha**: `10-especificacion-tecnica.md`. Convenciones, esquema, servicios por dominio, los tres cálculos y el catálogo de errores |
| **Backlog Detallado** | — | ✅ **Hecho**: `11-backlog-detallado.md`. 33 tickets en seis partes, con criterios de aceptación verificables y cómo demostrar cada uno |

**[Definido]** El orden es el mismo embudo del set de referencia y conviene respetarlo: cada documento se apoya en el anterior, y saltearse uno obliga a que el siguiente invente lo que le faltaba.
