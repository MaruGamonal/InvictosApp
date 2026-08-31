# Brief de Diseño — INVICTOS

> **Nombre del producto: INVICTOS** (`06`, D-84). En los documentos "la plataforma" se conserva donde funciona como sustantivo común; el nombre propio se usa en los títulos y donde se habla del producto como marca.

## 1. Cómo usar este documento

Este es el documento pensado para pasarle directamente a quien diseñe. Reúne todo el contexto necesario para construir primero el **Design System** (la base visual reutilizable) y después las **pantallas**, sin que haya que inferir nada del negocio por cuenta propia.

Se apoya en, y debe usarse junto con:

- **`05-flujos-ux-user-journeys.md`**: el orden de navegación y las decisiones de cada recorrido (secciones 3 y 4), y los casos especiales que el diseño tiene que comunicar (sección 5).
- **`02-casos-de-uso.md`**: el fundamento de negocio de cada pantalla.
- **`03-diagrama-entidad-relacion.md`**: el detalle de cada entidad y atributo — de dónde sale cada dato que se muestra.
- **`04-catalogo-enumeraciones.md`**: los valores exactos de cada estado, con su **etiqueta visible** y su **color semántico**. Es la fuente de verdad para no tener que adivinar de qué color va un badge.
- **`06-reglas-negocio-y-decisiones-pendientes.md`**: por qué cada regla es como es.
- **`07-roadmap-funcional.md`**: qué entra en el MVP y qué no — el inventario de pantallas de la sección 11 cubre **el MVP**.

**Marcas de decisión** *(mismo esquema que el resto del set, ver `00`, 3.2)*: **[Definido]** para lo decidido; **[A resolver en diseño]** para lo que este brief deja deliberadamente abierto porque es una decisión de oficio, no de negocio.

---

## 2. Resumen del producto

Plataforma de **gestión y descubrimiento de torneos de fútbol amateur** (F5 a F11). Combina dos productos que hoy viven separados:

- Una **herramienta de gestión** para que un organizador administre su torneo de principio a fin: equipos, inscripciones, fixture, resultados, tabla.
- Un **espacio público** donde equipos y jugadores descubren torneos, se inscriben, siguen competencias y acumulan historial deportivo.

Es una **plataforma pública única**: los torneos publicados son descubribles por cualquiera, no viven encerrados en el espacio privado de cada organizador (`06`, D-02). Esa decisión es la que hace que el diseño tenga que resolver bien dos cosas a la vez: **pantallas de trabajo densas** y **pantallas públicas que se comparten por mensajería**.

El producto es **gratuito** y se sostiene con publicidad en su primera etapa (`06`, D-31). Eso tiene consecuencias directas de diseño, en la sección 6.4.

---

## 3. Público objetivo

**[Definido — `06`, D-67]** El producto es **mobile-first para todos los actores**. La configuración del organizador puede aprovechar una pantalla grande, pero **ninguna tarea puede requerir escritorio**.

| Perfil | Quién es | Contexto de uso real | Implicancia directa de diseño |
|---|---|---|---|
| **Organizador** | Dueño de complejo, coordinador de liga barrial, o alguien que arma un torneo al año. Hoy trabaja con planilla de cálculo y grupos de mensajería | Dos contextos opuestos: **sentado**, armando el torneo y el fixture; y **parado en el complejo**, cargando los resultados de varias canchas seguidas, con gente esperándole | La configuración puede ser densa y guiada. La **carga de resultados tiene que resolverse de pie, con una mano y en pocos toques** — es el flujo más repetido del producto |
| **Capitán / Delegado** | Quien banca al equipo: arma el plantel, consigue jugadores, inscribe, cobra la cuota | En movimiento, coordinando por mensajería en paralelo a usar la app | Todo lo suyo se resuelve desde el teléfono y **se comparte hacia afuera con un toque** |
| **Jugador** | Juega el fin de semana. Puede no tener cuenta y estar igual en un plantel | Consulta rápida: ¿cuándo juego?, ¿cómo salimos?, ¿quién va de goleador? | Respuestas de un vistazo, sin navegación profunda |
| **Visitante** | Llegó por un link que le pasaron. No sabe qué es la plataforma | Un toque desde un grupo de mensajería, sin contexto previo | **La primera pantalla tiene que explicarse sola** y verse bien pegada en un chat |

**[Definido] Rango de edad amplio y alfabetización digital dispar.** A diferencia del sistema de referencia, acá no hay un único perfil: conviven un pibe de 18 que vive en el teléfono y un coordinador de liga de 55 que hasta ayer usaba papel. **El diseño no puede depender de patrones que haya que aprender**: nada de gestos ocultos, nada de acciones que solo existan en un menú contextual.

---

## 4. Principios de diseño

Los cuatro primeros son la traducción visual de los principios de UX de `05`, sección 2. Los dos últimos son propios de este brief.

1. **El contenido va primero, la cuenta después.** Ficha, fixture y tabla se ven sin sesión iniciada. El registro se pide **en el momento de la acción** (seguir, inscribirse) y la completa al terminar.
2. **Prioridad a lo frecuente.** Cargar el resultado de una fecha es el recorrido más repetido de todo el sistema: merece la menor fricción y el mayor pulido de todo el producto.
3. **Lo que cambió se muestra como cambio.** Un resultado sin confirmar y uno confirmado no se ven igual; un partido que se movió de fecha tampoco; un reglamento modificado a mitad de torneo dice qué cambió y desde cuándo rige. **En este dominio, todo lo que se corrige en silencio termina siendo una discusión.**
4. **Ninguna pantalla vacía sin salida.** Cada estado vacío ofrece el paso siguiente concreto.
5. **El contenido del usuario es el que tiene color.** Escudos, camisetas y fotos ya traen muchísimo color propio. **La interfaz es el marco, no el cuadro**: si la marca compite cromáticamente con los escudos, gana el ruido.
6. **Densidad calculada, no densidad por defecto.** Una tabla de posiciones es densa porque tiene que serlo. Un formulario de alta de torneo, no. La densidad se decide por pantalla según su tarea, y se declara — ver 6.5.

---

## 5. Personalidad de marca

**[Definido] Deportiva y enérgica.** Una plataforma que se siente **competitiva**: contraste alto, tipografía con carácter, números grandes y protagonistas, sensación de que lo que pasa acá importa. La referencia mental no es una herramienta administrativa: es una app de resultados deportivos.

### 5.1 Cómo se sostiene la energía sin arruinar la legibilidad

**[Definido] Esta es la tensión central de este brief y hay que resolverla explícitamente.** Las dos pantallas más consultadas del producto —la tabla de posiciones y el fixture— son **cuadrículas de números**. Una personalidad enérgica aplicada sin criterio las vuelve ilegibles, y son justamente las que la gente mira apurada, en la calle, en un teléfono.

La resolución: **la energía vive en la tipografía, el contraste y los momentos, no en el color de fondo ni en la decoración**.

| La energía **sí** vive en… | La energía **no** vive en… |
|---|---|
| **Números grandes** — el marcador de un partido es el elemento más grande de su tarjeta, sin competencia | Fondos de color en filas de tabla o de fixture |
| **Tipografía de display con carácter** en marcadores, posiciones y nombres de torneo | Tipografía de display en texto corrido o en etiquetas de formulario |
| **Cabeceras y superficies de identidad** (hero del torneo, perfil del equipo) — ahí sí manda la marca | El cuerpo de las pantallas de trabajo del organizador |
| **Momentos**: confirmar una inscripción, cerrar una fecha, coronar un campeón | Transiciones en cada navegación, que solo hacen la app más lenta |
| **Jerarquía agresiva**: lo importante mucho más grande que lo secundario | Bordes, sombras y adornos que suman ruido sin sumar información |

**[Definido] Regla práctica para quien diseñe:** si una decisión visual hace más difícil leer un número, no es enérgica — es decorativa. La energía de este producto **viene del contenido deportivo**, no de la interfaz que lo enmarca.

---

## 6. Sistema de color

### 6.1 La dirección elegida, y cómo convive con el tema de arranque

**[Definido] Dirección de identidad: oscura con un acento vibrante.** La marca se expresa en **superficies oscuras profundas** con **un color de acento saturado** que aparece poco y siempre significa algo.

**[Definido] Tema de arranque: claro.** El sistema se construye con tokens desde el primer día para que el tema oscuro sea **un cambio de valores, no un rediseño**.

**Estas dos decisiones parecen contradictorias y no lo son, pero hay que aplicarlas con criterio.** Se resuelven así:

> **La identidad es oscura; el lienzo de trabajo es claro.** Las **superficies de identidad** —hero de la ficha del torneo, cabecera del perfil de equipo y de jugador, pantalla de entrada, tarjeta compartible— usan el neutro más oscuro de la escala como fondo, con el acento encima. El **cuerpo de la aplicación** —listados, tablas, formularios, panel del organizador— es claro. El resultado es una app clara con **bloques oscuros de marca**, que es exactamente lo que sostiene una personalidad deportiva sin sacrificar la lectura prolongada de datos.

**Tres fundamentos concretos de por qué el tema de arranque es claro y no oscuro:**

1. **La publicidad de red viene pensada para fondo claro** (`06`, D-31). Un producto enteramente oscuro convierte cada bloque publicitario en un parche blanco — y la publicidad está justo en las tres superficies de mayor tráfico (`06`, D-63).
2. **Los escudos y las fotos de los equipos vienen con fondo mayoritariamente claro o transparente mal recortado.** Sobre superficie oscura, el contenido real de los usuarios se ve peor, no mejor.
3. **La lectura de tablas densas a plena luz** —un complejo de fútbol, un sábado a las tres de la tarde— es más confiable en claro.

**[Definido] El tema oscuro completo es de la segunda etapa**, y el sistema tiene que estar tokenizado para que llegue sin rediseño. Ningún color se escribe directo en un componente.

### 6.2 Paleta de marca

**[A resolver en diseño]** Los valores exactos, dentro de estos lineamientos:

| Rol | Criterio |
|---|---|
| **Neutro oscuro de marca** | El fondo de las superficies de identidad. No negro puro: un oscuro con temperatura propia, que se sostenga como color de marca y no como "ausencia de color" |
| **Acento vibrante** | Un solo color, saturado, de alta energía. Es el color de la acción primaria y de la marca. **Aparece poco**: si está en todos lados, deja de significar algo |
| **Escala de neutros** | Amplia y con buenos pasos intermedios — es lo que hace el 90% del trabajo en listados, tablas y formularios |

**[Definido] Un solo color de marca, no dos.** Fundamento: el producto ya muestra permanentemente los colores de decenas de equipos, y encima tiene cinco colores semánticos con significado propio (6.3). Un segundo color de marca no agrega expresividad; agrega una pregunta más ("¿este azul significa algo?") en un producto que ya tiene demasiados colores con significado.

**[Definido] El acento no puede ser verde ni rojo.** Es la restricción más importante de esta paleta. El verde y el rojo ya están tomados por la semántica —resultado confirmado, inscripción aprobada, torneo cancelado, resultado en disputa— y aparecen en casi todas las pantallas. Un acento de marca verde volvería ilegible la diferencia entre "esto es un botón" y "esto salió bien".

### 6.3 Paleta semántica

Es **independiente** de la marca y cumple otra función: comunicar el estado de algo. `04-catalogo-enumeraciones.md`, sección 6, ya asigna cada valor de cada enumeración a una de estas cinco categorías — **es la fuente de verdad y no hay que reinterpretarla**.

| Nivel | Cuándo se usa | Ejemplos en este producto |
|---|---|---|
| **Éxito** | Estado normal o completado correctamente | Resultado confirmado, inscripción aprobada, torneo en curso, organización verificada |
| **Información** | Estado neutro de contexto o transición | Partido programado, resultado cargado sin confirmar, inscripciones cerradas |
| **Advertencia** | Requiere atención sin ser grave | Invitación pendiente, partido suspendido, ganado por presentación, organización sin verificar |
| **Error / crítico** | Revierte, rechaza o cancela | Inscripción rechazada, torneo cancelado, **resultado en disputa** |
| **Neutro** | Estado final sin carga positiva ni negativa | Borrador, torneo finalizado, equipo archivado, jugador que dejó el equipo |

**[Definido] Dos pares que hay que verificar explícitamente al fijar los valores:**

- **Acento de marca vs. Éxito y vs. Error.** Si el acento se acerca a cualquiera de los dos, un botón primario se lee como un estado. Hay que separarlos deliberadamente.
- **Advertencia vs. Éxito en un badge chico.** En una fila de fixture, un badge de 10 píxeles de alto es todo lo que distingue "se jugó" de "ganó por presentación". Tienen que diferenciarse **a primera vista y sin leer el texto**.

**[Definido] Ningún estado se comunica solo con color.** Todo badge lleva su etiqueta visible del catálogo. Es accesibilidad, y además es lo único que funciona cuando alguien mira la pantalla al sol.

### 6.4 El color de la publicidad

**[Definido]** Los bloques publicitarios aparecen en **ficha pública del torneo, fixture y descubrimiento**, y **nunca** en los flujos de tarea del organizador ni en el de inscripción del capitán (`06`, D-63).

**[Definido] Consecuencia de diseño que hay que resolver desde el sistema, no después:** un bloque de publicidad de red es contenido ajeno, de color impredecible, que va a aparecer en medio de las tres pantallas más consultadas. Necesita **un contenedor propio, visualmente separado**, que diga sin texto "esto no es parte del producto". Si no se resuelve en el sistema, cada anuncio va a parecer una tarjeta de torneo más — y eso destruye la confianza en el descubrimiento, que es el activo del producto.

### 6.5 Densidad por pantalla

**[Definido]** Se declaran tres densidades y cada pantalla del inventario (sección 11) indica cuál usa:

| Densidad | Dónde | Criterio |
|---|---|---|
| **Compacta** | Tabla de posiciones, fixture, listado de plantel, carga de resultados | Máxima información por pantalla, sin scroll innecesario. Áreas táctiles nunca menores al mínimo accesible, aunque la fila sea baja |
| **Estándar** | Listados de torneos, de equipos, notificaciones, formularios | El default del producto |
| **Amplia** | Hero de la ficha del torneo, cabecera de perfil, momentos de confirmación, estados vacíos | Poca información, mucho aire, protagonismo de la identidad |

---

## 7. Tipografía

**[Definido] Dos familias, con roles separados.**

| Rol | Criterio | Dónde se usa |
|---|---|---|
| **Display** | Sans-serif con **carácter deportivo**: condensada o extendida, peso alto disponible, buena presencia en tamaños grandes. Es donde vive la energía de la marca | Marcadores, posiciones, nombre del torneo en el hero, números de estadística, títulos de sección |
| **Texto** | Sans-serif **neutra y muy legible en tamaños chicos**, con una escala de pesos amplia | Todo el resto: cuerpo, etiquetas, formularios, tablas, navegación |

**[Definido] Números tabulares, obligatorio, en las dos familias.** Este producto muestra permanentemente columnas de números que tienen que alinearse: puntos, partidos jugados, goles a favor y en contra, diferencia de gol, marcadores. Una tipografía sin cifras tabulares hace que la tabla de posiciones —la pantalla más consultada del producto— se vea desalineada en cada fila. **Es un criterio de descarte, no una preferencia.**

**[Definido] La familia de display no se usa nunca en texto corrido ni en etiquetas de formulario.** Es la regla que evita que "deportivo y enérgico" se convierta en "difícil de leer".

**[A resolver en diseño]** Las familias concretas y la escala tipográfica, dentro de esos criterios.

---

## 8. Tono de contenido

- **Todo en español rioplatense neutro**, claro y directo, sin jerga técnica.
- **Nunca exponer vocabulario del modelo de datos.** El usuario ve "perfil", "plantel", "lista de buena fe" — nunca "perfil deportivo", "integrante habilitado" ni ningún nombre de entidad. `04` ya separa **valor técnico** de **etiqueta visible** para exactamente esto.
- **Lenguaje de cancha, no de sistema.** "Cargá el resultado", no "registre el marcador del encuentro". "Se movió el partido", no "reprogramación efectuada".
- **Los mensajes de bloqueo explican y ofrecen salida.** El caso crítico está en `05`, sección 5: un torneo que queda no listado por falta de verificación no puede decir algo que se lea como "tu torneo no existe". Tiene que decir qué pasa, por qué, y cómo resolverlo ahí mismo.
- **Las confirmaciones de acciones destructivas describen la consecuencia real**, sin alarmismo: qué se pierde y qué no. Dar de baja a un jugador del plantel no borra sus goles, y eso hay que decirlo.

---

## 9. Plataforma

**[Definido — `06`, D-67]** Mobile-first para todos los actores. **Ninguna tarea puede requerir escritorio.**

**[Definido] Qué gana pantalla grande y qué no.** La adaptación no es "la misma pantalla más ancha":

| Pantalla | En pantalla grande |
|---|---|
| **Armado del fixture** (UC-29) y **configuración del torneo** (UC-16, UC-17) | Es donde más rinde: ver muchos partidos a la vez, arrastrar, comparar. Puede tener un layout propio |
| **Tabla y fixture públicos** | Más columnas visibles sin scroll horizontal |
| **Carga de resultados** (UC-31) | **No cambia**. Está diseñada para el pulgar y así funciona en cualquier tamaño |
| **Ficha del torneo** | Más aire, sin reorganizarse: es la pantalla que se comparte, y tiene que ser reconocible igual en los dos formatos |

**[Definido] Prioridad de construcción:** el flujo de carga de resultados es el primero que hay que diseñar en detalle (`05`, 4.3), antes que cualquier pantalla de configuración. Es el que decide si el organizador se queda.

**[A resolver en diseño]** Los breakpoints concretos y el patrón de navegación principal (barra inferior, cajón lateral, u otro), dentro del criterio de que **nada esencial puede vivir detrás de un gesto oculto** (ver sección 3).

---

## 10. Roles y qué caracteriza el uso de cada uno

| Rol | Qué caracteriza su uso del sistema |
|---|---|
| **Visitante** | Llega por link, sin cuenta. Solo consulta. **Es el actor cuyo primer segundo de pantalla más importa** |
| **Usuario registrado** | Sigue torneos y equipos. Su pantalla clave es la de actividad |
| **Jugador** | Consulta su próximo partido, su perfil y sus estadísticas. Puede ser también DT de otro equipo — la interfaz no le pide elegir un modo |
| **Capitán / Delegado** | Gestiona plantel, inscribe, confirma la lista, confirma o disputa resultados. Todo desde el teléfono y compartible hacia afuera |
| **DT / Cuerpo técnico** | Rol deportivo, **sin permisos de gestión** (`06`, D-25). El diseño **no debe ofrecerle acciones de gestión que después le niega** |
| **Organizador** (Titular / Administrador) | El usuario más intensivo. Alterna entre configurar sentado y operar parado |
| **Colaborador del torneo** | Permisos fijos y acotados a **los torneos a los que está asignado** (`06`, D-32). Solo ve lo que puede hacer |

**[Definido] Nadie elige "qué tipo de usuario es".** Una misma persona es jugador de un equipo, DT de otro, capitán de un tercero y organizador de su propio torneo — todo al mismo tiempo (`06`, D-23). **El contexto lo da la cosa que está mirando, no un selector global de modo.**

**[Definido] Consecuencia de diseño, importante:** cuando alguien colabora en varios torneos, **la interfaz tiene que dejar clarísimo en qué torneo está operando** (`05`, sección 5). Cargar un resultado en el torneo equivocado es un error silencioso: nadie lo detecta hasta que alguien mira la tabla.

---

## 11. Inventario de pantallas — datos exactos por pantalla

> **Alcance:** cubre el **MVP** (`07`, sección 3). Cada fila indica de qué entidad sale cada dato (ver `03`) y qué caso de uso lo origina (ver `02`). Los estados se muestran siempre con su **etiqueta visible** del catálogo (`04`), nunca con el valor técnico.

### 11.1 Entrada y cuenta

*Densidad: amplia.*

| Pantalla | Objetivo | Datos que muestra o pide | Fuente |
|---|---|---|---|
| **Bienvenida / Entrada** | Explicar en un segundo qué es la plataforma a quien nunca la vio | Propuesta de valor, acceso a descubrir torneos sin cuenta, ingreso | UC-01, UC-22 |
| **Registro** | Crear la cuenta con la menor fricción posible | **Solo** identificador de acceso + nombre visible. Nada más (`06`, D-52) | UC-01 · Usuario |
| **Ingreso** | Autenticar | Identificador y credencial | UC-01 |
| **Confirmar el correo** | Habilita publicar en el descubrimiento | Aviso de correo enviado, con reenvío · **sin SMS ni código tipeado** (`06`, D-76) | UC-06 · Organización (`nivel_verificacion`) |

**[Definido] El registro que interrumpe una acción, la completa al terminar.** Quien tocó "seguir" y se registró vuelve al torneo **ya siguiéndolo**, no a una pantalla de inicio genérica (`05`, 4.1). Es la regla que sostiene todo el recorrido de adquisición.

**[Definido] El registro no pregunta "qué tipo de usuario sos".** Ver sección 10.

### 11.2 Inicio

*Densidad: estándar.*

| Pantalla | Objetivo | Datos que muestra | Fuente |
|---|---|---|---|
| **Inicio** | Responder de un vistazo la pregunta que trae a la app | **Próximo partido propio** (rival, día, hora, cancha) · accesos a Mis equipos, Mis torneos y Mi perfil · notificaciones accionables pendientes | UC-30, UC-46 · Partido, Inscripción |

**[Definido] Lo primero de la pantalla es el próximo partido propio.** Para un jugador o un capitán, esa es la pregunta que lo trae (`05`, principio 4). Si no tiene partido próximo, el espacio lo ocupa el paso siguiente que le corresponda: descubrir torneos, completar el plantel, resolver una invitación.

**[Definido] El feed de actividad (UC-44) no es MVP** (`07`, 3.1): con pocos torneos activos se ve vacío y hace parecer abandonado al producto. El seguimiento se registra igual desde el día uno.

### 11.3 Descubrimiento

*Densidad: estándar. **Lleva publicidad** (6.4).*

| Pantalla | Objetivo | Datos que muestra o pide | Fuente |
|---|---|---|---|
| **Torneos de mi ciudad** | Ver qué hay donde vivo, sin pedir nada | **Encabezado con la ciudad actual** y acción de cambiarla · los torneos de esa ciudad como tarjetas · filtros secundarios plegables: modalidad, categoría, estado de inscripción, fecha | UC-22 · Torneo, Organización |
| **Sin torneos en esta ciudad** | No perder a alguien con intención real | **Ver los de la provincia** diciendo cuántos hay · avisarme cuando se publique uno acá · publicar uno | UC-22 |
| **Selector de ciudad** | Elegir dónde mirar | Búsqueda por nombre · **ciudades con torneos primero**, distinguidas de las que no tienen · agrupadas por provincia, con la provincia siempre visible · **componente compartido** con el alta de torneo, de equipo y el perfil | UC-22, UC-16 · Ciudad |

**Tarjeta de torneo (componente clave):** nombre · modalidad y categoría · zona · fecha de inicio estimada · **estado de inscripción con su badge** · cupo (inscriptos / total) · organización con su **distintivo de verificación** si lo tiene.

**[Definido — D-90] Esta pantalla cambió de carácter y es lo más importante de esta sección: dejó de ser un buscador.** Antes se entraba, se elegían filtros y se ejecutaba. Ahora **se entra y ya se están viendo los torneos de la ciudad propia**. Nadie tiene que aprender a filtrar para ver algo útil.

**[Definido — D-90] La ciudad sube de categoría: es contexto, no filtro.** Deja de ser uno de cinco filtros y pasa a ser un **elemento persistente del encabezado**, del tipo que usan las aplicaciones de delivery para la dirección de entrega. Los otros cuatro siguen siendo filtros, **operan dentro de la ciudad** y pueden quedar plegados: la mayoría de la gente no los va a tocar. Cambiar de ciudad se llama **explorar, no filtrar** — la intención es mirar otro lado, no acotar lo que ya se ve—, y **volver a la propia tiene que ser trivial**.

**[Definido — D-88] El selector de ciudad es el componente nuevo con más peso, porque el catálogo es nacional**: miles de localidades, así que un desplegable plano no sirve. Cuatro requisitos: **se escribe para buscar** (tipear es el camino principal, no navegar); **las ciudades con torneos van primero** y se distinguen de las que no tienen, para que nadie elija una vacía y crea que el producto lo está; **agrupado por provincia y con la provincia siempre visible**, que es lo que desambigua los nombres repetidos —hay más de una San Martín—; y **es el mismo componente en las cuatro pantallas** donde se elige una ciudad.

**[Definido — D-90] Cuando la persona no tiene ciudad, se pregunta acá.** No se pide en el registro (`06`, D-52), y un visitante que llegó por un link no tiene ninguna. **Se resuelve como primer elemento de esta pantalla, nunca como un paso previo que bloquee** — el principio de contenido primero (4.1) no admite un muro de configuración antes de ver nada.

**[Definido] Los estados vacíos pasan a ser frecuentes, no excepcionales.** Con catálogo nacional, la mayoría de las ciudades no va a tener torneos por mucho tiempo. Es un estado normal y hay que diseñarlo con cuidado: **nunca puede parecer un error ni sugerir que el producto entero está vacío** porque lo esté una ciudad.

**[Pendiente de definición] El Gran Buenos Aires no encaja en "una ciudad", y esta pantalla es la que lo sufre.** Alguien de Vicente López juega en San Isidro y en CABA, que son entradas distintas del catálogo. **Afecta directamente al selector**, así que conviene resolverlo antes de fijarlo (`06`, 4.11).

**[Definido] El orden por defecto es proximidad + inscripciones abiertas + fecha cercana**, y los organizadores verificados tienen mejor posición (`06`, D-26b, D-51). El orden de un marketplace es una decisión de producto: no puede quedar como un detalle de implementación.

### 11.4 Torneo — vistas públicas

*Densidad: hero amplio, contenido compacto. **Llevan publicidad** la ficha y el fixture.*

| Pantalla | Objetivo | Datos que muestra | Fuente |
|---|---|---|---|
| **Ficha del torneo** | Que cualquiera entienda de qué se trata y qué puede hacer | **Hero** (superficie oscura de marca): nombre, modalidad, categoría, zona, estado del torneo · Organización (UC-08) con distintivo · según el estado: inscripción, próxima fecha, o campeón · accesos a fixture, tabla, equipos, estadísticas y reglamento | UC-23 · Torneo, Organización, Inscripción |
| **Fixture y resultados** | Ver qué se jugó y qué viene | Agrupado por fecha/jornada: local, visitante, marcador, día, hora, sede · **badge de estado del partido** · **marca de reprogramado** si se movió | UC-30, UC-31, UC-33 · Partido |
| **Detalle del partido** | Ver el respaldo de un resultado | Marcador grande, equipos, fecha y sede · **fecha original si se reprogramó** · estado del resultado · goleadores y tarjetas si se cargaron · quién lo cargó y cuándo | UC-31, UC-32, UC-34 · Partido, Evento de Partido |
| **Tabla de posiciones** | Ver cómo va el torneo | Por fase y zona: posición, equipo, PJ, G, E, P, GF, GC, DIF, **Pts** · marca de provisorio si hay resultados en disputa · quita o bonificación de puntos **como columna separada** si la hubo | UC-35 · Posición |
| **Equipos participantes** | Ver quién juega | Escudo, nombre, zona, score si tiene | UC-23 · Inscripción, Equipo |
| **Estadísticas** | Goleadores y tarjetas | Tabla de goleadores; tarjetas si se cargaron | UC-36 · Estadística de Jugador |
| **Reglamento** | Consultar la norma vigente | Texto y/o archivo adjunto · **número de versión y fecha** · aviso si cambió después de que el equipo lo aceptó | UC-51 · Reglamento |

**[Definido] La ficha del torneo es la pantalla que se comparte, y de eso depende la adquisición del producto.** Tiene que verse bien **pegada en un grupo de mensajería**: eso significa una previsualización propia y bien resuelta (imagen, nombre del torneo, estado). Es la superficie de identidad más importante del producto.

**[Definido] Un resultado sin confirmar y uno confirmado no se ven igual, y uno en disputa menos** (`05`, principio 6). En la tabla, si hay resultados en disputa, la tabla **se muestra igual** pero marcada como provisoria: congelarla ante cada disputa la vuelve inútil justo cuando más se la consulta (`02`, UC-32).

**[Definido] Ganar por presentación se distingue visualmente de ganar en la cancha**, en el fixture y en la tabla (`06`, D-33b).

**[Definido] La quita de puntos va en columna separada, nunca sumada a `Pts`.** Es lo que mantiene la tabla explicable: se ve cuánto ganó en la cancha y cuánto le sacaron (`06`, D-35b).

### 11.5 Panel del organizador

*Densidad: compacta en operación, estándar en configuración. **No lleva publicidad** (6.4).*

| Pantalla | Objetivo | Datos que muestra o pide | Fuente |
|---|---|---|---|
| **Mis torneos** | Ver el estado de todo lo que administra | Por torneo: nombre, estado, inscripciones pendientes, **resultados sin cargar** | UC-20 |
| **Crear / configurar torneo** | Definir la competencia | Nombre, descripción, modalidad, categoría (género y edad), zona, cupo, fechas estimadas, visibilidad · puntos por victoria/empate/derrota (default 3/1/0) · criterios de desempate · mínimo y máximo de jugadores de la lista | UC-16, UC-17 · Torneo |
| **Formato de competencia** | Definir cómo se compite | Liga / eliminación directa / grupos + eliminatoria · cantidad de zonas, ida y vuelta, cuántos clasifican | UC-17 · Fase, Grupo |
| **Publicar** | Hacerlo descubrible | Validación de datos mínimos · **aviso de verificación** si la organización no está verificada | UC-18 · Torneo, Organización |
| **Inscripciones** | Resolver quién entra | Solicitudes pendientes con: equipo, escudo, zona, **score**, plantel · **advertencia de categoría cruzada**, si la hay · aprobar / rechazar con motivo · agregar equipo a mano | UC-25, UC-26 · Inscripción, Equipo, Score |
| **Fixture** | Armar y ajustar el calendario | Propuesta generada, **editable a mano** · asignar día, hora y sede por partido · reprogramar | UC-29, UC-30 · Partido, Sede |
| **Cargar resultados** ⭐ | Cerrar la fecha | **Lista de partidos pendientes de la fecha**, con carga en la propia fila · marcar no disputado con motivo · goleadores como paso opcional | UC-31, UC-33, UC-34 · Partido, Evento |
| **Estado del torneo** | Hacerlo avanzar | Cerrar inscripciones, iniciar, avanzar de fase, finalizar, suspender, cancelar con motivo | UC-20, UC-21 · Torneo |
| **Reglamento** | Cargar y versionar | Texto y/o archivo · aviso de que publicar una versión nueva notifica a los inscriptos | UC-51 · Reglamento |
| **Colaboradores del torneo** | Delegar la carga | Personas asignadas **a este torneo** · permisos fijos, visibles y no editables | UC-52 · Colaborador de Torneo |
| **Miembros de la organización** | Administrar el equipo de trabajo | Titular y administradores · invitar, cambiar rol, desvincular | UC-07 · Miembro de Organización |

**⭐ [Definido] "Cargar resultados" es la pantalla más importante del producto y merece el mayor pulido.** Tres reglas que salen directamente del recorrido real (`05`, 4.3):

1. **La carga ocurre en la propia lista**, no entrando y saliendo de un detalle por cada partido. Un organizador con seis partidos hace ese recorrido seis veces por fecha.
2. **Los goleadores son un paso claramente omitible**, no un formulario que haya que atravesar. Si estorba, se deja de cargar el resultado también.
3. **La tabla se actualiza sola y hay que verla actualizarse.** Es la recompensa inmediata del trabajo de carga, y el mejor argumento para no volver a la planilla.

**[Definido] El fixture generado es siempre una propuesta editable.** Ningún generador conoce las restricciones reales del organizador —canchas, disponibilidad, clásicos que conviene separar—: un fixture que no se puede tocar se abandona en la primera excepción (`06`, D-31b).

**[Definido] Los permisos del colaborador se muestran pero no se editan.** Son fijos (`06`, D-32). Mostrar controles deshabilitados es peor que no mostrarlos: sugiere que existe una configuración que no existe.

### 11.6 Equipo

*Densidad: cabecera amplia, plantel compacto.*

| Pantalla | Objetivo | Datos que muestra o pide | Fuente |
|---|---|---|---|
| **Perfil del equipo** | La pantalla que concentra todo lo que el producto acumula | **Cabecera** (superficie oscura): escudo, nombre, zona, **categoría de género**, **score con su desglose** · plantel y cuerpo técnico · torneos actuales y pasados con posición final · últimos resultados · **seguir** y **solicitar sumarme** | UC-14, UC-37, UC-40, UC-43, UC-53 · Equipo, Score |
| **Crear equipo** | Dar de alta el equipo | Nombre, escudo, colores, zona, modalidad habitual · **categoría de género (obligatoria)** · aviso —sin bloquear— si ya existe uno igual en la zona | UC-10 · Equipo |
| **Plantel** | Mantenerlo al día | Por integrante: foto, nombre, **rol** (capitán / delegado / jugador / DT), estado del vínculo · invitar, cambiar rol, dar de baja · **dejar el equipo**, para el propio integrante | UC-11, UC-12, UC-13 · Integrante de Equipo |
| **Solicitudes de ingreso** | Resolver a quién se suma al equipo | Solicitudes pendientes con foto, nombre y perfil de quien pide · aceptar o rechazar · **separadas de las invitaciones sin responder** | UC-53 · Integrante de Equipo |
| **Invitar integrante** | Sumar a alguien | Buscar en la plataforma o cargar con datos mínimos · **elegir el rol** | UC-11 · Perfil Deportivo |

**[Definido] El perfil del equipo es la pantalla más importante del componente social**: es donde converge todo lo que el resto del sistema genera. **Cualquier dato que el producto acumule y no aparezca acá, probablemente no le sirve a nadie.**

**[Definido] Un equipo sin actividad muestra su identidad y su plantel, no un vacío.** Y **sin score suficiente muestra "sin score todavía", nunca un cero**: un cero se lee como "es malísimo" (`06`, D-61).

**[Definido] El cuerpo técnico se lista aparte del plantel de jugadores** y no ocupa cupo (`06`, D-24).

**[Definido] Al DT no se le ofrecen acciones de gestión.** Su rol es deportivo (`06`, D-25); mostrarle botones que después le niega la aplicación es el peor resultado posible de esa decisión.

**[Definido — D-81] La categoría de género se pide al crear el equipo y se muestra en su cabecera**, junto a la zona y la modalidad. No es un dato administrativo: es una de las tres dimensiones del ranking (UC-41) y lo que identifica al equipo frente a otro del mismo nombre. **Diseñarla como una elección de tres, visible y sin default** — un valor preseleccionado hace que la mitad de los equipos femeninos queden cargados como masculinos.

**[Definido — D-85] "Seguir" y "sumarme al plantel" son dos botones distintos, con peso distinto.** Seguir es inmediato y no compromete a nadie; sumarse abre una solicitud que el capitán resuelve y que, si se acepta, mete a la persona en un plantel público. **La acción de menor consecuencia no puede ser la más prominente por ser la más simple**: sumarse es la acción principal de esa pantalla para quien busca equipo. Con la solicitud pendiente, el botón cambia de estado y ofrece retirarla.

**[Definido — D-85] En el plantel, los dos pendientes van separados y etiquetados.** *"Invitación enviada"* y *"Solicitud recibida"* se parecen y exigen cosas opuestas: en la primera el capitán espera, en la segunda tiene que actuar. Mezclarlas en una lista de "pendientes" hace que las solicitudes queden sin responder — y una solicitud sin responder es alguien que se queda afuera de un equipo sin enterarse de por qué.

**[Definido — D-87] Dejar el equipo es una acción directa, sin trámite.** No hay solicitud de baja ni aprobación (`06`, D-87). Lo que sí necesita es **confirmación de intención** —es irreversible desde el lado de la persona, que después tendría que pedir volver a entrar— y, si está habilitada en un torneo en curso, el aviso de que **sigue habilitada ahí hasta que el torneo termine** (`05`, 5).

**[Definido — D-83] Dos equipos de una misma institución son dos tarjetas, no una con pestañas.** En "Mis equipos" y en el buscador aparecen por separado, cada uno con su escudo, su plantel y su score; lo que los emparenta es el nombre y el escudo compartidos, no una jerarquía. **No se diseña un encabezado de club ni una vista unificada**: el agrupador es de la segunda etapa (`07`), y anticiparlo en el diseño promete una navegación que el MVP no tiene. La distinción entre las dos tarjetas la tiene que hacer **la etiqueta de categoría**, que en ese contexto es el único dato que las separa.

### 11.7 Inscripción y participación

*Densidad: estándar. **No lleva publicidad** (6.4).*

| Pantalla | Objetivo | Datos que muestra o pide | Fuente |
|---|---|---|---|
| **Inscribir mi equipo** | Postular al equipo | Elegir equipo · **aviso si la categoría del equipo no coincide con la del torneo**, sin bloquear · **aceptación del reglamento de un clic**, si el torneo tiene · confirmar | UC-24 · Inscripción, Reglamento |
| **Crear equipo desde la inscripción** | No perder al capitán que todavía no tiene equipo | Alta mínima, **sin salir del contexto del torneo** | UC-10, UC-24 |
| **Estado de mi inscripción** | Saber en qué quedó | Estado con su badge · motivo si fue rechazada · siguiente paso si fue aprobada | UC-25 · Inscripción |
| **Lista de buena fe** | Definir quién está habilitado | Selección desde el plantel · rol de cada uno · número de camiseta opcional · **aviso de mínimo, bloqueo de máximo** | UC-27 · Integrante Habilitado |
| **Confirmar o disputar resultado** | Validar lo que dice la tabla | Marcador cargado · confirmar o disputar con motivo · **tiempo restante del plazo de 72 horas** | UC-32 · Partido, Disputa |

**[Definido] Crear el equipo ocurre dentro del flujo de inscripción, con el torneo esperando del otro lado.** Es el paso que más se rompe en productos de este tipo: un capitán que encontró el torneo que buscaba y tiene que salir a crear un equipo se pierde en el camino (`05`, 4.4).

**[Definido] La aceptación del reglamento es un clic, no una pantalla.** Y solo aparece si el torneo tiene reglamento cargado (`06`, D-54, D-29).

**[Definido] El plazo de confirmación se muestra.** Un resultado que va a quedar firme solo en 72 horas tiene que decirlo: es la diferencia entre "todavía puedo reclamar" y enterarse tarde (`06`, D-60).

### 11.8 Perfil de persona

*Densidad: cabecera amplia, historial estándar.*

| Pantalla | Objetivo | Datos que muestra o pide | Fuente |
|---|---|---|---|
| **Mi perfil** | Construir la identidad deportiva | Nombre visible, foto, **posición** (opcional, 5 valores), zona · visibilidad pública o restringida | UC-02, UC-04 · Perfil Deportivo |
| **Perfil público** | Que otros vean quién es | Cabecera con nombre y foto · equipos actuales y pasados · torneos jugados · estadísticas si se cargaron · versión reducida si está restringido | UC-03, UC-38 · Perfil Deportivo |
| **Reclamar perfil** *(post-MVP)* | Apropiarse del historial que otro cargó | Perfil existente · confirmación de quien lo creó | UC-05 |

**[Definido] Un perfil restringido muestra menos, no un error.** La persona existe, eligió mostrar menos.

**[Definido] Restringir el perfil no saca a la persona de las estadísticas del torneo que jugó**, y eso hay que decirlo en la propia pantalla de visibilidad. Sin esa aclaración se genera una expectativa incumplida (`02`, UC-04).

### 11.9 Notificaciones

*Densidad: estándar.*

| Pantalla | Objetivo | Datos que muestra | Fuente |
|---|---|---|---|
| **Notificaciones** | Ver lo que requiere acción | Solo el subconjunto accionable en el MVP: invitación a equipo, inscripción recibida o resuelta, partido programado o reprogramado | UC-46 · Notificación |

**[Definido] Los canales son push y email** (`06`, D-53, D-67). Las accionables van por ambos; las informativas, solo push.

**[Definido] El aviso de reprogramación es la notificación de mayor valor del producto.** Es exactamente el mensaje que hoy se pierde en un grupo de mensajería, y probablemente la mejor demostración concreta de para qué sirve la plataforma. Merece el mejor tratamiento de todos.

### 11.10 Componentes clave del sistema

Los que aparecen en más de una pantalla y por lo tanto **son sistema, no diseño de pantalla**:

| Componente | Dónde vive | Qué tiene que resolver |
|---|---|---|
| **Tarjeta de torneo** | Descubrimiento, mis torneos, perfil del organizador | Que se entienda si sirve o no **sin abrirla** |
| **Fila de partido** | Fixture, cargar resultados, inicio, perfil del equipo | Cuatro variantes: por jugarse, jugado, no disputado, reprogramado |
| **Fila de tabla** | Tabla de posiciones | Números tabulares, alta densidad, área táctil accesible |
| **Badge de estado** | Todas | Color semántico + **etiqueta siempre visible** (6.3) |
| **Escudo / avatar** | Todas | Con **placeholder digno** — la mayoría de los equipos amateur no tiene escudo |
| **Marcador** | Detalle del partido, fixture, compartible | Es el elemento con más energía visual del producto (5.1) |
| **Contenedor de publicidad** | Ficha, fixture, descubrimiento | Que se lea como contenido ajeno, sin texto que lo explique (6.4) |
| **Estado vacío** | Todas | Nunca "no hay nada": siempre el paso siguiente (principio 4) |

---

## 12. Decisiones de diseño registradas

| # | Pregunta | Decisión | Fundamento |
|---|---|---|---|
| **DIS-01** | ¿Cómo conviven "personalidad enérgica" y "tablas densas"? | La energía vive en **tipografía, contraste y momentos**, no en color de fondo ni decoración (5.1) | Las dos pantallas más consultadas son cuadrículas de números. Si una decisión visual hace más difícil leer un número, es decorativa, no enérgica |
| **DIS-02** | ¿Cómo conviven "dirección oscura" y "tema claro primero"? | **La identidad es oscura, el lienzo de trabajo es claro**: superficies de identidad en oscuro, cuerpo de la app en claro, todo tokenizado (6.1) | Tres razones concretas: la publicidad de red viene pensada para fondo claro y está en las tres pantallas de más tráfico; los escudos de los equipos se ven peor sobre oscuro; y las tablas densas se leen mejor en claro a plena luz |
| **DIS-03** | ¿Uno o dos colores de marca? | **Uno solo** (6.2) | El producto ya muestra los colores de decenas de equipos más cinco colores semánticos con significado. Un segundo color de marca agrega una pregunta, no expresividad |
| **DIS-04** | ¿El acento puede ser verde? | **No**, ni verde ni rojo (6.2) | Ya están tomados por la semántica y aparecen en casi todas las pantallas. Un acento verde vuelve ilegible la diferencia entre "esto es un botón" y "esto salió bien" |
| **DIS-05** | ¿Números tabulares: preferencia o requisito? | **Requisito de descarte** (7) | Sin cifras tabulares, la tabla de posiciones se desalinea fila por fila |
| **DIS-06** | ¿Dónde va la publicidad y cómo se contiene? | Solo en las tres superficies de consulta, con **contenedor propio que la separe visualmente** (6.4) | Es contenido ajeno de color impredecible en medio de las pantallas más consultadas. Sin contenedor, cada anuncio parece una tarjeta de torneo más y eso destruye la confianza en el descubrimiento |
| **DIS-07** | ¿Qué pantalla se diseña primero? | **Cargar resultados** (9, 11.5) | Es el recorrido más repetido y el que decide si el organizador se queda; todo lo demás depende del dato que sale de ahí |
| **DIS-08** | ¿Cómo se muestra un equipo sin score? | **"Sin score todavía", nunca un cero** (11.6) | Un cero se lee como "es malísimo"; la ausencia se lee como "todavía no jugó lo suficiente" |

---

## 13. Fuera de alcance de esta fase de diseño

- **Pantallas post-MVP**: feed de actividad (UC-44), rankings (UC-41), reclamo de perfil (UC-05), preferencias de notificación (UC-47), administración de plataforma (UC-48 a UC-50).
- **Tema oscuro completo**: se prepara con tokens, se entrega en la segunda etapa (6.1).
- **Identidad de marca completa**: logo, isotipo, aplicaciones — este brief define la personalidad y el sistema, no la marca gráfica.
- **Identidad gráfica de INVICTOS**: el nombre está definido (`06`, D-84); el logo, el isotipo y sus aplicaciones no son alcance de este brief.
- **Piezas de la tienda de aplicaciones** (capturas, ficha, íconos).

---

## 14. Documentos de referencia

1. `00-analisis-documentacion-referencia.md` — metodología del set y qué significan las marcas
2. `01-arquitectura-funcional-y-actores.md` — dominios y actores
3. `02-casos-de-uso.md` — el fundamento de negocio de cada pantalla
4. `03-diagrama-entidad-relacion.md` — de dónde sale cada dato
5. `04-catalogo-enumeraciones.md` — **etiquetas visibles y colores semánticos: fuente de verdad**
6. `05-flujos-ux-user-journeys.md` — recorridos y casos especiales
7. `06-reglas-negocio-y-decisiones-pendientes.md` — el registro de decisiones
8. `07-roadmap-funcional.md` — qué entra en el MVP
