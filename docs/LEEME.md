# INVICTOS — Documentación completa

**Plataforma de gestión y descubrimiento de torneos de fútbol amateur.**

Este paquete contiene la documentación funcional y técnica completa del producto, lista para diseñar y para construir. **Queda una sola decisión de negocio abierta** —el tratamiento del AMBA— y no bloquea el desarrollo (ver `06`, sección 2).

> **Revisión 13.** Tras revisar el paquete de diseño contra el set, **seis casos de uso pasaron de la segunda etapa al MVP** (`06`, D-94): confirmar o disputar resultados, eventos del partido, estadísticas del torneo, historial del jugador, feed de actividad y preferencias de notificación. **El score y los rankings siguen siendo de etapa futura.** Y el resultado que carga el organizador **queda confirmado al instante, pero el rival conserva la objeción por 72 horas** (D-95). El backlog pasa a **33 tickets**.
>
> **Revisión 12.** **La inscripción a un torneo nunca es automática: siempre la valida el organizador** (D-93). La regla base ya era ésa, pero existía una excepción configurable —la aprobación automática— que queda **eliminada del MVP**: mientras el costo de inscripción se cobra fuera de la aplicación, la aprobación **es** la confirmación de que el equipo entró.
>
> **Revisión 11.** Se rehace la ubicación. **La ciudad es la única unidad** —dos niveles, provincia → ciudad, sin barrios— tomada de un **catálogo nacional argentino completo desde el día uno** (`06`, D-88), y **la aplicación abre mostrando los torneos de la ciudad de la persona** (D-90). Con eso **el descubrimiento deja de ser un buscador**: la ciudad es contexto, no filtro. Sin coordenadas ni distancias (D-89); el torneo lleva **ciudad y dirección** (D-91); el ranking se calcula **por ciudad** (D-92).
>
> **Queda una decisión abierta**, la primera en muchas revisiones: **cómo se trata el Gran Buenos Aires** en un modelo de una ciudad por persona. No bloquea el MVP, pero **sí bloquea el diseño del selector de ciudad** (`06`, 2 y 4.11).
>
> **Revisión 10.** Se cierra la simetría del plantel: además de que el equipo invite (UC-11), **una persona puede pedir sumarse** (UC-53) y queda pendiente hasta que el Capitán o un Delegado la resuelva (`06`, D-85, D-86). **Darse de baja, en cambio, es inmediato y no lo confirma nadie** (D-87). La regla que dejan las tres: **entrar requiere el consentimiento de las dos partes; salir, el de una sola.**
>
> **Revisión 9.** El nombre del producto es **INVICTOS** (`06`, D-84) y el **equipo tiene categoría de género propia** (D-81), con la compatibilidad con el torneo resuelta como aviso y no como bloqueo (D-82). El **club** —agrupador de equipos de una misma institución— es de la segunda etapa y **no se modela como organización** (D-83).

---

## 0. Cómo está armado este paquete

```
LEEME.md              ← estás acá
documentacion/        Los 12 documentos del embudo (00 a 11). La fuente de verdad
diseno/               El paquete de diseño: Design System, 11 dominios, 5 flujos
                      ⚠ LEER PRIMERO diseno/LEEME-ANTES-DE-USAR.md
contexto/             Notas fuera del embudo: monetización, revisión del handoff,
                      resumen del cambio de ubicación. No habilitan a construir nada
```

> **Regla de precedencia, por si hay dudas:** **manda `documentacion/`.** El diseño es referencia visual de alta fidelidad —hay que recrearlo fielmente— pero no es la fuente de verdad de las reglas de negocio. Las cuatro diferencias que hoy existen entre el diseño y la documentación están listadas, con qué hacer en cada caso, en **`diseno/LEEME-ANTES-DE-USAR.md`**. Leerlo antes de escribir la primera pantalla.

---

## 1. Qué hay acá

Doce documentos que forman **un embudo**: cada uno responde una única pregunta y le pasa el resultado al siguiente. Ninguno repite lo que dice otro; se referencian entre sí por identificador.

| # | Documento | Pregunta que responde |
|---|---|---|
| `00` | Análisis de la documentación de referencia | ¿De dónde sale esta metodología y qué significan sus marcas? |
| `01` | Arquitectura funcional y actores | ¿De qué partes está hecho el producto y quiénes lo usan? |
| `02` | Casos de uso | ¿Por qué existe cada funcionalidad, desde el negocio? |
| `03` | Diagrama entidad-relación | ¿Qué información maneja el sistema? |
| `04` | Catálogo de enumeraciones | ¿Cuáles son los valores exactos de cada campo cerrado? |
| `05` | Flujos de UX y recorridos | ¿Cómo se navega, pantalla a pantalla? |
| `06` | Reglas de negocio y decisiones | ¿Por qué cada regla es como es, y qué queda abierto? |
| `07` | Roadmap funcional | ¿Qué se construye primero y por qué? |
| `08` | Brief de diseño | ¿Cómo se ve y con qué datos exactos se construye cada pantalla? |
| `09` | Diagrama de arquitectura | ¿Con qué tecnología se sostiene, y por qué esa y no otra? |
| `10` | Especificación técnica | ¿Cómo se implementa cada caso de uso? |
| `11` | Backlog detallado | ¿Cómo se ejecuta el desarrollo, ticket por ticket? |

**Dos documentos son de consulta permanente, no de lectura lineal:** el **`04`** (catálogo de valores) funciona como diccionario, y el **`06`** (registro de decisiones) es donde se busca el fundamento de cualquier regla. El resto se lee en orden la primera vez.

---

## 2. Si vas a **diseñar** (Claude Design)

**Cargá estos cuatro, en este orden:**

1. **`08-brief-diseno.md`** — es el documento pensado para esto. Personalidad, sistema de color, tipografía, tono, densidades y el **inventario completo de pantallas del MVP** con el dato exacto que alimenta cada una.
2. **`05-flujos-ux-user-journeys.md`** — el orden de navegación, los recorridos por actor y, sobre todo, la **tabla de casos especiales** (sección 5): los momentos donde el diseño tiene que comunicar algo delicado sin generar confusión.
3. **`04-catalogo-enumeraciones.md`** — la **fuente de verdad** de qué etiqueta visible y qué color semántico le corresponde a cada estado. No hay que reinterpretarla ni adivinar de qué color va un badge.
4. **`03-diagrama-entidad-relacion.md`** — de dónde sale cada dato que se muestra en pantalla.

**Cuatro cosas que conviene tener presentes antes de empezar:**

- **INVICTOS es el nombre**, ya aplicado a los títulos del set. La marca gráfica —logo, isotipo, aplicaciones— **no está definida**: el brief define personalidad y sistema, no identidad visual (`08`, 12).
- **Empezá por "cargar resultados"** (`08`, 11.5). Es el recorrido más repetido de todo el producto y el que decide si el organizador se queda. Todo lo demás puede esperar; eso no.
- **La energía de la marca vive en la tipografía, el contraste y los momentos** — no en el color de fondo ni en la decoración (`08`, 5.1). Las dos pantallas más consultadas son cuadrículas de números que la gente mira apurada, en la calle.
- **La identidad es oscura; el lienzo de trabajo es claro** (`08`, 6.1). Superficies de identidad en oscuro, cuerpo de la aplicación en claro, todo tokenizado para que el tema oscuro completo llegue después sin rediseño.
- **El acento de marca no puede ser ni verde ni rojo** (`08`, 6.2). Ya están tomados por la semántica y aparecen en casi todas las pantallas.

---

## 3. Si vas a **construir** (Claude Code)

**Cargá estos cinco, en este orden:**

1. **`11-backlog-detallado.md`** — 33 tickets con criterios de aceptación verificables. **Es el punto de entrada**: cada ticket dice qué construir, qué **no** construir y cómo demostrar que está terminado.
2. **`10-especificacion-tecnica.md`** — la fuente de verdad de cada contrato: convenciones, esquema, servicios por dominio, los tres cálculos del sistema y el catálogo de códigos de error.
3. **`03`** y **`04`** — el modelo de datos y los valores exactos de cada enumeración.
4. **`06-reglas-negocio-y-decisiones-pendientes.md`** — cuando algo del código no cierre, el fundamento está acá. Cada regla tiene su `D-nn`.

**Cinco convenciones que atraviesan todo el código y conviene fijar antes del primer commit:**

- **Un servicio por caso de uso**, en carpetas por dominio. **`services/` nunca importa de `app/`** (`10`, 2.1). Es lo que permite que las tareas programadas ejecuten el mismo código que un usuario.
- **Los permisos se resuelven en una única función compartida** sobre los tres vínculos —equipo, organización, torneo— y ningún servicio consulta esas tablas por su cuenta (`10`, 2.3).
- **Toda operación que escriba en más de una tabla va en una transacción** (`10`, 2.5). Son cuatro, y la más importante es cargar un resultado.
- **Control optimista de versión** en partido y torneo: dos colaboradores cargando la misma fecha desde dos teléfonos es el escenario real, no el borde.
- **El esquema vive en el repositorio como migraciones versionadas**, nunca como cambios a mano en un panel (`10`, 3.4).

**El orden de ejecución está en `11`, al final**: cimientos (T1-T6) → un torneo que se termina de punta a punta (T7-T20) → que se pueda ver sin cuenta (T21-T24) → automatismos y salida (T25-T28) → lo que sumó la revisión 13 (T29-T33). **T15 es el nudo del grafo**: conviene llegar temprano, y **T29 y T30 van pegados detrás** porque operan sobre lo que T15 escribe.

**Tres cosas que NO hay que construir, y es fácil equivocarse:**

- **El score y los rankings** (UC-39 a UC-41). Son de etapa futura y sus ponderaciones **se calibran con datos reales de uso**, no se fijan sobre el papel (`06`, 5.4). T2 crea la tabla `score_equipo` vacía; nadie la llena todavía.
- **La aprobación automática de inscripciones.** Fue eliminada (`06`, D-93). No hay parámetro ni rama de código: toda inscripción de un equipo queda `pending` hasta que el organizador la resuelva.
- **Coordenadas, mapas o búsqueda por radio.** La ubicación son dos tablas y una clave foránea (`06`, D-88, D-89). Nada de PostGIS ni `ltree`.

---

## 4. Cómo leer las marcas y los identificadores

**Marcas de estado** — aparecen en línea, y permiten saber párrafo a párrafo qué está cerrado:

| Marca | Significa |
|---|---|
| **[Definido]** | Decisión tomada. Se puede construir sobre esto |
| **[Supuesto]** | Interpretación que la documentación necesitó. **No queda ninguno sin confirmar** |
| **[Pendiente de definición]** | Decisión que nadie tomó. **Queda una**: el tratamiento del AMBA (`06`, 4.11) |

**Identificadores** — todo se referencia cruzado, nunca se repite:

- **`UC-nn`** — caso de uso (`02`). Hay 53.
- **`D-nn`** — decisión registrada (`06`), con su fundamento y dónde impacta. Hay 100.
- **`T-nn`** — decisión técnica (`10`, sección 10).
- **`Tn`** — ticket del backlog (`11`). Hay 33.
- Las referencias entre documentos se escriben con el número entre acentos graves: `` `06`, D-51 `` significa "documento 06, decisión 51".

---

## 5. Estado del proyecto

**Queda una decisión abierta y ningún supuesto sin confirmar.** Lo que queda son tres cosas que **no bloquean el desarrollo**, y conviene no confundirlas con decisiones pendientes:

| Qué | Cuántos | Dónde |
|---|---|---|
| **Valores de arranque a calibrar** con datos de uso | 3 | Umbrales del score y los dos controles de verificación (`06`, D-51 y D-61) |
| **Catálogos a completar** | 3 | La **carga nacional de provincias y ciudades** —trabajo de datos por única vez—, motivos de baja y cancelación, posición del jugador (`04`, sección 8) |
| **Identidad gráfica** | 1 | Logo e isotipo de INVICTOS. El nombre está definido (`06`, D-84); la marca gráfica no es alcance del brief (`08`, 12) |

La diferencia importa: una decisión abierta bloquea —no se construye hasta resolverla—; un valor de arranque no bloquea nada, se construye con él y se corrige mirando datos.

---

## 6. Las cinco decisiones que explican el producto

Si vas a leer una sola cosa antes de empezar, que sea esto:

1. **Es una plataforma pública única, no un multi-tenant** (`06`, D-02). Los torneos publicados son descubribles por cualquiera. **El descubrimiento es el activo del producto**, y casi todas las decisiones técnicas salen de protegerlo.
2. **El equipo es una entidad permanente y transversal a los torneos** (D-10). Es lo que permite que existan historial y score; si fuera una fila dentro de un torneo, no habría nada que acumular.
3. **El caso base es el fútbol amateur** (D-03). Por eso se prioriza la baja fricción de alta —perfiles sin cuenta, equipos incompletos, eventos opcionales— por sobre el rigor reglamentario.
4. **Los permisos viven en el vínculo, no en la cuenta** (D-23, D-32). Una misma persona es jugador de un equipo, DT de otro y organizador de su torneo, al mismo tiempo.
5. **El producto arranca gratis, con publicidad** (D-31), y la publicidad **nunca entra en los flujos de tarea del organizador** (D-63): degradar el flujo más repetido para monetizar pondría en riesgo el dato del que vive todo lo demás.

**Dos aclaraciones que ahorran malentendidos frecuentes.** La primera: el **equipo** lleva su propia categoría de género y el **club no existe en el MVP** (D-81, D-83). Una institución con plantel masculino y femenino son **dos equipos independientes** que comparten nombre y escudo — dos tarjetas, dos planteles, dos scores. Lo que las distingue a simple vista es la etiqueta de categoría, así que tiene que estar presente donde aparezcan juntas.

Y la segunda: **el vínculo con un plantel se propone desde los dos lados pero se corta desde uno solo** (D-85, D-87). El equipo invita o la persona solicita, y en ambos casos hace falta que la otra parte acepte; salir, en cambio, es inmediato y no lo confirma nadie. Por eso hay **dos estados pendientes distintos** —`invited` y `requested`— y no uno: el capitán tiene que poder ver qué depende de él.
