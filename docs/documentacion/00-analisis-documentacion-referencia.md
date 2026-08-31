# Análisis de la documentación de referencia y criterios adoptados — INVICTOS

> **Alcance de este documento:** no describe el nuevo producto. Explica **qué metodología documental se identificó** en los 8 archivos del sistema de administración de almacenes, qué se decide conservar para la plataforma de torneos de fútbol, y qué pertenece exclusivamente al dominio de almacenes y por lo tanto no se traslada.

---

## 1. La estructura encontrada: ocho documentos, un solo embudo

Los 8 archivos no son ocho vistas paralelas del mismo sistema — son **ocho eslabones de una cadena**, donde cada uno responde una única pregunta y le pasa el resultado al siguiente. Ese es el patrón central a reutilizar.

| # | Documento | Pregunta que responde | Nivel |
|---|---|---|---|
| 1 | Casos de Uso | ¿Por qué existe cada funcionalidad, desde el negocio? | Funcional puro |
| 2 | Flujos de UX / User Journeys | ¿Cómo se navega y experimenta cada caso de uso? | Funcional / UX |
| 3 | Diagrama Entidad-Relación | ¿Qué información maneja el sistema? | Estructural, agnóstico a tecnología |
| 4 | Brief de Diseño | ¿Cómo se ve y con qué datos exactos se construye cada pantalla? | Diseño |
| 5 | Diagrama de Arquitectura | ¿Con qué tecnología se sostiene el sistema? | Técnico, alto nivel |
| 6 | Especificación Técnica de Backend | ¿Cómo se expone técnicamente cada caso de uso? | Técnico, detallado |
| 7 | Catálogo de Enumeraciones | ¿Cuáles son los valores exactos y fijos de cada campo cerrado? | Técnico, de consulta permanente |
| 8 | Backlog Detallado | ¿Cómo se ejecuta el desarrollo, ticket por ticket? | Técnico, unidad de trabajo ejecutable |

La secuencia es: **por qué → cómo lo vive el usuario → qué datos existen → cómo se diseña → con qué tecnología → cómo se expone → qué valores exactos usa → cómo se construye**.

El Catálogo de Enumeraciones es el único que no se lee de punta a punta en un momento del proceso: es **de consulta permanente**, como un diccionario. El resto de los documentos lo referencian en vez de repetir listas de valores.

---

## 2. Patrones transversales identificados

### 2.1 Cada documento declara su propio objetivo y sus dependencias

Todos abren con una sección "Objetivo del documento" que dice explícitamente **qué responde, qué no responde, y en qué otros documentos se apoya**. No hay documentos huérfanos: cada uno lista sus vecinos.

### 2.2 Nada se afirma sin fundamento

El patrón más distintivo de todo el set: **cada entidad, atributo, regla y conector tiene declarado su "para qué"**, no solo su nombre.

- En el ER, cada atributo tiene una columna *"Objetivo / Fundamento"*.
- En el Diagrama de Arquitectura, cada componente tiene su *"Responsabilidad"* y cada conector su *"Motivo de la conexión"*.
- En el Backlog, cada ticket tiene *"Contexto y objetivo"* antes del alcance técnico.

Cuando un dato no tiene una razón de existir escrita, no está en el modelo. Esto es lo que hace la documentación auditable por alguien que no participó de las conversaciones.

### 2.3 Marcas explícitas de decisión: `[Definición]` y `[Pendiente]`

Las decisiones tomadas se marcan en línea con **`[Definición]`**, muchas veces con la variante **`[Definición — redefinido]`** o **`[Definición — formalizado en este documento]`** cuando corrigen algo anterior. Las decisiones que faltan llevan una **marca de pendiente**, o bien **`[Asunción — a confirmar con el cliente]`**.

El efecto es que se puede leer un documento y saber, párrafo a párrafo, **qué está cerrado, qué es supuesto y qué está abierto**. Es exactamente el criterio que este proyecto pidió para la etapa inicial.

### 2.4 Registro histórico de decisiones, con su fundamento y su traza

La Especificación mantiene una tabla de *"Decisiones registradas"* (28 entradas) con: la pregunta, la resolución, y **dónde quedó documentada** — más una lista separada de *"Pendientes reales (todavía sin resolver)"*. Varias entradas están marcadas como *"Actualizado, ver decisión #N"*: no se borra la decisión vieja, se la marca como superada.

El Backlog aplica el mismo criterio a nivel ticket: los tickets superados conservan su texto original con un banner *"⚠️ Superado parcialmente por el Ticket N"*, "para que quede registro de qué se construyó primero".

### 2.5 Trazabilidad cruzada por identificador

Todo se referencia por ID: los flujos de UX citan `UC-14`, el Brief de Diseño cita la sección `8.1` de la Especificación, el Backlog cita casos de uso y secciones. Existe además una **matriz de trazabilidad caso de uso ↔ rol** con tres estados (acceso completo / solo consulta / sin acceso).

### 2.6 Alcance declarado visualmente, no solo en prosa

Lo que está fuera del MVP no se omite: se documenta y se marca — subgrafos con borde punteado en los diagramas, columna *"Estado: MVP / Fuera del MVP"* en las tablas, secciones *"Fuera de alcance de esta fase"* al final de cada documento. Así se distingue *"todavía no lo pensamos"* de *"lo pensamos y decidimos que va después"*.

### 2.7 Un principio de producto declarado y aplicado de forma consistente

*"Menos es más"* aparece en el Brief de Diseño, se repite en los Flujos de UX, y se usa como criterio real para descartar funcionalidades (por ejemplo, no permitir unidades de medida propias por comercio "hasta que aparezca un caso real que lo necesite"). El principio no es decorativo: cada vez que se descarta algo, se cita.

### 2.8 Patrón de diseño de datos: la unicidad se garantiza estructuralmente

Hay una familia de decisiones repetida a lo largo del ER y del Backlog: cuando un dato debe ser único, **no se confía en una regla de aplicación ni en un flag repetido** — se lo modela como un campo único (`usuario_dueño_id`, `tenant_principal_id`, `caja_abierta_id`) o como un identificador determinístico compuesto (Membresía, Stock). El fundamento se escribe siempre en términos de qué error de datos vuelve imposible.

Este patrón es de dominio-independiente y se traslada tal cual al nuevo producto (por ejemplo: un solo capitán por equipo, una sola inscripción vigente por equipo-torneo).

### 2.9 Granularidad y formato de los requerimientos

- **Casos de uso** (25 en total, agrupados en 9 dominios): la unidad funcional. Estructura fija de 8 campos — Actores, Descripción, Precondiciones, Flujo principal, Flujos alternativos / excepciones, Entidades y atributos involucrados, Reglas de negocio, Resultado esperado.
- **Tickets** (31 en total, agrupados en 5 partes por naturaleza, no por orden cronológico): la unidad de trabajo. Estructura fija — Contexto y objetivo, Alcance técnico, **Fuera de alcance de este ticket**, Criterios de aceptación en formato *Dado / cuando / entonces* precedidos por una historia de usuario, y **"Cómo demostrarlo"** a alguien no técnico.
- **Casos especiales**: los flujos de UX mantienen una tabla dedicada de *excepciones* (situación → dónde ocurre → qué necesita comunicar el diseño), separada de los recorridos felices.

La sección *"Fuera de alcance de este ticket"* y la sección *"Cómo demostrarlo"* son las dos piezas menos habituales y más valiosas del formato: la primera evita el crecimiento silencioso del alcance, la segunda obliga a que cada ticket tenga un resultado visible para el negocio.

### 2.10 Lenguaje separado del vocabulario técnico

El Brief de Diseño declara que ciertos términos del backend **nunca** se muestran en la interfaz ("jamás mostrar la palabra *tenant*"). El Catálogo de Enumeraciones formaliza esa separación con dos columnas por valor: *valor técnico* y *etiqueta visible*.

---

## 3. Qué se conserva para la plataforma de torneos

| Elemento | Por qué se conserva |
|---|---|
| El embudo de 8 documentos | Es lo que hace que ninguna capa invente lo que le corresponde a otra. Se conserva la cadena, adaptando qué documentos existen hoy (ver 3.1). |
| Sección "Objetivo del documento" + dependencias declaradas | Permite entrar al set por cualquier documento sin perderse. |
| Fundamento obligatorio por entidad, atributo y regla | Es el rasgo más valioso del set y el que más aplica a una etapa inicial: obliga a justificar cada dato antes de comprometerse con él. |
| Marcas en línea de estado de la decisión | Adaptadas a tres niveles (ver 3.2), dado que este proyecto arrancó con mucho más abierto que cerrado. |
| Registro histórico de decisiones con traza | Se inaugura desde el documento 06 con las decisiones que ya se tomaron en esta primera vuelta. |
| Trazabilidad por ID + matriz caso de uso ↔ actor | Se conserva tal cual, con los actores del nuevo dominio. |
| Alcance declarado visualmente (MVP / futuro) | Se conserva, y alimenta directamente el roadmap. |
| Estructura de 8 campos del caso de uso | Se conserva sin cambios — es dominio-independiente. |
| Estructura del ticket (con "Fuera de alcance" y "Cómo demostrarlo") | Se conserva para cuando exista backlog; todavía no aplica (ver 3.1). |
| Catálogo de enumeraciones como fuente única de verdad | Se conserva, incluida la regla de mantenimiento: primero se agrega el valor acá, después se lo usa. |
| Patrón "la unicidad se garantiza estructuralmente" | Se conserva como criterio de modelado. |
| Separación valor técnico / etiqueta visible | Se conserva. |
| Tabla de casos especiales en los flujos de UX | Se conserva — en este dominio hay muchos (resultados en disputa, equipos que abandonan, torneos cancelados). |

### 3.1 Qué documentos existen en esta primera entrega y cuáles todavía no

| Documento de referencia | Equivalente en este proyecto | Estado |
|---|---|---|
| Casos de Uso | `02-casos-de-uso.md` | ✅ En esta entrega |
| Flujos de UX / User Journeys | `05-flujos-ux-user-journeys.md` | ✅ En esta entrega |
| Diagrama Entidad-Relación | `03-diagrama-entidad-relacion.md` | ✅ En esta entrega |
| Catálogo de Enumeraciones | `04-catalogo-enumeraciones.md` | ✅ En esta entrega |
| — (no existe equivalente en el set original) | `01-arquitectura-funcional-y-actores.md` | ✅ En esta entrega — se agrega porque este producto tiene más dominios y más actores que el de referencia, y hacía falta una vista de conjunto antes de entrar a los casos de uso |
| — (existía disperso en la Especificación, sección 14) | `06-reglas-negocio-y-decisiones-pendientes.md` | ✅ En esta entrega — se le da documento propio por la cantidad de decisiones de esta etapa. Registra las decisiones tomadas con su fundamento, los supuestos a confirmar y el **estado de las decisiones** (sección 2), que es el único lugar donde hay que mirar para saber qué queda por resolver y de qué tipo es cada cosa |
| — (existía disperso en el Backlog) | `07-roadmap-funcional.md` | ✅ En esta entrega |
| Brief de Diseño | `08-brief-diseno.md` | ✅ Escrito en la revisión 6 — el noveno documento del set |
| Diagrama de Arquitectura | `09-diagrama-arquitectura-ecosistema.md` | ✅ Escrito en la revisión 7 — el décimo documento del set |
| Especificación Técnica de Backend | `10-especificacion-tecnica.md` | ✅ Escrita en la revisión 8 |
| Backlog Detallado | `11-backlog-detallado.md` | ✅ Escrito en la revisión 8 — **el embudo quedó completo: 12 documentos** |

**[Definido]** El embudo se recorrió completo, en ese orden: Casos de Uso y ER → Brief de Diseño → Arquitectura → Especificación → Backlog. **El set quedó en 12 documentos**, cuatro más que el de referencia — los tres que aquel no tenía (arquitectura funcional, registro de decisiones y roadmap) más el propio análisis metodológico.

### 3.2 Las tres marcas de estado de decisión que se usan en este set

Se amplía el esquema original —que solo distinguía lo definido de lo pendiente— porque en esta etapa hay una situación intermedia que el original no contemplaba: lo que la documentación necesitó dar por cierto sin que el cliente lo haya dicho.

| Marca | Significado | Qué hacer con ella |
|---|---|---|
| **[Definido]** | Decisión tomada. Puede venir de un requerimiento del cliente o de una propuesta ya adoptada. | Se puede construir sobre esto. |
| **[Supuesto]** | Interpretación razonable de algo que el cliente no dijo, pero que la documentación necesita para ser coherente. | Confirmar antes de construir. **Desde la revisión 5 no queda ninguno sin confirmar**: los cuatro que hubo están cerrados en `06`, sección 7, con su fundamento y con lo que habría que revisar si alguna vez se cambian. |

**Sobre la tercera marca, la de pendiente.** El esquema contempla una tercera marca para las **decisiones de negocio que nadie tomó todavía**: mientras una decisión lleva esa marca, no se construye sobre ella. **Desde la revisión 4 no queda ninguna en todo el set** — las 39 que abrió la revisión 1 están cerradas. La marca se conserva definida en `06`, sección 1, para lo que aparezca de acá en adelante; el estado actual, y la diferencia entre una decisión abierta y lo que sí queda por confirmar o calibrar, están en `06`, sección 2.

**Sobre la marca `[Propuesta]`, que ya no se usa.** La revisión 1 tenía un cuarto nivel, **`[Propuesta]`**, para las recomendaciones propias que se presentaban con alternativas y sus implicancias. **Todas fueron adoptadas como definitivas en la revisión 2** y pasaron a `[Definido]`; la marca desapareció del set. Cada una quedó registrada en `06`, sección 4, con la alternativa elegida y su fundamento — ver `06`, D-21. Se conserva la distinción donde importa: en ese registro se ve cuáles vinieron del cliente y cuáles se adoptaron por conveniencia documental, que es lo que permite revisar cualquiera de ellas sin reconstruir por qué se había decidido así.

---

## 4. Qué pertenece al dominio de almacenes y NO se traslada

| Elemento del set original | Por qué no se traslada |
|---|---|
| **Toda la lógica de negocio**: ventas, compras, caja, stock, precios, márgenes, proveedores, clientes, conciliación de efectivo | Es el negocio de otro producto. Ninguna entidad, regla ni caso de uso se adapta. |
| **El modelo multi-tenant con aislamiento total** (`Tenant`, `tenant_id` en cada entidad, "los comercios nunca ven datos de otro") | **Es el punto de mayor divergencia entre los dos productos.** En almacenes, el aislamiento es un requisito de negocio. Acá el valor está justamente en lo contrario: los torneos deben ser descubiertos por gente ajena al organizador, y el score de un equipo debe poder compararse contra equipos de otros torneos. Se conserva la idea de *"un organizador administra lo suyo"*, pero **no** la de *"lo suyo es invisible para el resto"* — ver decisión registrada en `06`, D-02. |
| **El patrón `scope: global / tenant`** | Existía para compartir catálogo entre comercios aislados. Sin aislamiento, no tiene equivalente. |
| **Los cuatro roles operativos** (Dueño, Encargado, Cajero, Depósito) y su criterio de validación por "área de negocio" | Los roles son del negocio de un comercio. **Sí se traslada el criterio de diseño**: definir cada rol como responsable de un área completa, y usar eso para chequear que no falten permisos. |
| **El perfil de usuario del Brief** (adulto 30-45, uso de pie en el mostrador, atención a valores monetarios) | Es una persona distinta. El nuevo producto tiene al menos tres perfiles diferentes entre sí y ninguno coincide con ese. |
| **La paleta de color y la personalidad de marca "fintech"** | Decisión de identidad del otro producto. |
| **El stack técnico** (Flutter, Firebase, Firestore, Cloud Functions, Cloud Workflows) | No hay decisión de stack tomada para este producto. Se conserva el *formato* del diagrama de arquitectura, no su contenido. |
| **El canal conversacional (WhatsApp + LLM)** | Solución a un problema puntual de aquel dominio (operar sin abrir la app, en el mostrador). Podría tener sentido acá para cargar resultados desde la cancha, pero es una hipótesis nueva, no un traslado — queda anotada en el roadmap como idea a evaluar, no como funcionalidad heredada. |
| **El "proceso de suscripción externo" como iniciador del alta** | En almacenes, el comercio nace fuera del sistema y el Dueño recibe credenciales. Acá **[Definido]** el organizador se auto-registra desde la propia plataforma y el alta no tiene costo: el modelo de monetización arranca gratis, con publicidad, y la suscripción llega recién en una etapa posterior (ver `06`, D-31). |
| **Los tickets del Backlog** | El contenido es específico; se conserva únicamente el formato. |

---

## 5. Riesgos detectados al trasladar la metodología

Tres advertencias que surgen de comparar los dos dominios:

1. **El set original documenta un sistema ya construido y en producción**; buena parte de su contenido son correcciones sobre lo existente (Tickets 13 a 21, decisiones marcadas como "corrige un vacío detectado post-lanzamiento"). El nuevo set documenta un producto que todavía no existe y que, a esta altura, **no tiene ninguna decisión de negocio abierta**. Por eso el riesgo ya no es escribir con más certeza de la que hay, sino **confundir tres cosas distintas**: una decisión tomada, un supuesto que nadie confirmó todavía y un valor de arranque fijado para poder construir. Importa porque una decisión abierta **bloquea** —no se construye hasta resolverla—, mientras que un valor de arranque **no bloquea nada**: se construye con él y se corrige con datos de uso. Tratarlos igual es lo que hace que un proyecto quede esperando definiciones que en realidad ya están tomadas. `06`, sección 2, dice cuál es cuál; y `06`, sección 4, registra además qué decisiones vinieron del cliente y cuáles se adoptaron por conveniencia documental, que es lo que permite volver a discutir cualquiera de ellas.

2. **El producto de referencia tiene un solo tipo de usuario operando** (el equipo de un comercio). Este tiene, como mínimo, cuatro roles con intereses distintos y a veces en tensión (el organizador quiere inscripciones completas, el capitán quiere reglas claras, el jugador quiere visibilidad, el espectador quiere resultados al día). **La matriz de trazabilidad por rol pasa de ser un chequeo de permisos a ser una herramienta de diseño de producto.**

3. **El dominio de almacenes tiene datos duros** (una venta ocurrió o no ocurrió). Este dominio tiene **datos declarados por las partes interesadas** — un resultado lo carga alguien que compite en el torneo. Eso agrega una capa que el modelo original no necesitaba: **estados de confirmación y disputa**, y una decisión de negocio sobre quién tiene la última palabra — ya tomada: los capitanes cargan y el organizador confirma (`06`, D-07b). Si el score y los rankings se construyen sobre datos no confirmados, el producto pierde credibilidad, que es su activo principal.
