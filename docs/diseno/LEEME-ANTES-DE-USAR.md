# Antes de usar estas pantallas — leer esto primero

Este paquete de diseño es **referencia visual**: muestra cómo se ve y cómo se comporta el producto. Es de alta fidelidad en estructura, jerarquía, copy y sistema visual, y hay que recrearlo fielmente.

**Pero no es la fuente de verdad de las reglas de negocio.**

---

## La regla de precedencia

> **Ante cualquier diferencia entre una pantalla y la documentación, manda la documentación** — en particular `06-reglas-negocio-y-decisiones-pendientes.md`, donde cada regla tiene su identificador `D-nn` y su fundamento.

El paquete se construyó a partir de `02-casos-de-uso.md` en su versión vigente, así que la mayoría de las pantallas coincide. Las diferencias que quedan están todas listadas abajo — **son cuatro y ya fueron reportadas a diseño**. Mientras no llegue una versión corregida, hay que construir según esta lista, no según la pantalla.

---

## Las cuatro diferencias conocidas

### 1. Aprobación automática de inscripciones — **no existe**

**La pantalla `D6 Inscripciones` la muestra** ("Aprobación automática · Para torneos abiertos, sin revisar equipo por equipo"), y el `README-diseno.md` también la menciona.

**No se construye.** Fue eliminada del MVP (`06`, **D-93**). Toda inscripción solicitada por un equipo queda `pending` hasta que el organizador o un administrador la resuelva — **no hay parámetro configurable ni rama de código**.

**Por qué:** mientras el costo de inscripción se paga fuera de la aplicación, la aprobación del organizador es la única señal de que el equipo está realmente adentro. Y el fixture se genera desde las inscripciones aprobadas, así que un `approved` equivocado se propaga al calendario, a la tabla y al score.

### 2. Validar el correo para sumarse a un plantel — **no**

**Las pantallas `Entrada` y `Flujo Registro y primer torneo` dicen:** *"La validación de tu correo solo te la pedimos si más adelante querés sumarte a un equipo o publicar un torneo"*.

**La mitad está bien.** Para **publicar un torneo** es correcto: es la verificación básica de la organización, por email (`06`, **D-76**, **D-51**).

**Para sumarse a un plantel no.** Esa verificación es de la **organización**, no de la persona, y el modelo va en la dirección contraria: **se puede integrar un plantel sin tener cuenta siquiera** — perfiles `unclaimed` creados por el capitán o el organizador (`06`, **D-29b**; `02`, UC-11). Es el mecanismo que hace posible el primer torneo de cualquier organizador.

**Qué construir:** la validación de correo se pide **solo al publicar un torneo**.

### 3. El ranking es por **ciudad**, no por zona

**La pantalla `D9 Reputación y Score` dice:** *"Rankings Zona Norte F5 Masculino · Acotado a esta zona, modalidad y categoría"*.

El recorte es **ciudad + modalidad + categoría** (`06`, **D-92**), y **"Zona Norte" es granularidad de barrio, que ya no existe**: la ubicación son dos niveles, provincia → ciudad (`06`, **D-88**).

**Nota de alcance:** esta pantalla es de **etapa futura** — ver abajo.

### 4. El checklist de publicación pide "Zona" — son **ciudad y dirección**

**La pantalla `D4 Torneos`,** en el resumen previo a publicar, dice *"Zona, fecha estimada y cupo"*.

El torneo lleva **ciudad y dirección**, dos campos con dos usos: la ciudad para encontrarlo, la dirección para llegar (`06`, **D-91**). La pantalla de **crear** torneo ya los tiene bien; es solo el checklist.

---

## Alcance: qué de este paquete NO se construye ahora

El paquete diseña pantallas de etapas posteriores. Algunas están marcadas y otras no.

**Fuera del MVP — no construir:**

| Pantalla del paquete | Estado real |
|---|---|
| **Todo `D9 Reputación y Score`** (UC-39, UC-40, UC-41) | **Etapa futura.** Las ponderaciones del score **se calibran con datos reales de uso**, no se fijan sobre el papel (`06`, 5.4). T2 crea la tabla `score_equipo` vacía; nadie la llena |
| Reclamar perfil (UC-05), en `D1` | Etapa posterior — el paquete ya lo marca |
| Transferir titularidad (UC-09), en `D2` | Etapa posterior — el paquete ya lo marca |

**Sí entran al MVP, aunque el paquete no las marque** (`06`, **D-94**, revisión 13): confirmar o disputar resultados (UC-32, ticket **T29**), eventos del partido (UC-34, **T30**), estadísticas del torneo e historial del jugador (UC-36, UC-38, **T31**), feed de actividad (UC-44, **T32**) y preferencias de notificación (UC-47, **T33**).

**Una consecuencia concreta:** la pantalla de **resolver inscripciones** muestra el score del equipo como información para decidir. **En el MVP el score no existe todavía**, así que esa pantalla se construye con equipo, ciudad, plantel y la advertencia de categoría cruzada — sin score. Dejar el espacio previsto está bien; mostrar un número inventado, no.

---

## Dos cosas del paquete que sí conviene seguir al pie de la letra

- **El Design System (`Invictos Design System.dc.html`) es la fuente de verdad de estilo.** Resuelve bien las dos tensiones del brief: identidad oscura sobre lienzo claro, y la energía puesta en tipografía, contraste y "momentos" en vez de en color de fondo. El acento cian respeta que no podía ser ni verde ni rojo, porque esos ya están tomados por la semántica de estado (`08`, 6.2). **Cualquier ambigüedad visual se resuelve consultándolo.**
- **El selector de ciudad admite hasta 3 ciudades simultáneas**, pensado para el AMBA. Es la respuesta del diseño a la única decisión de negocio que el set tiene abierta (`06`, 4.11) y **es la que hay que construir**. Falta registrarla formalmente en `06`; la dirección no está en discusión.

---

## Qué mirar en la documentación

- **`06`** — el porqué de cada regla, con su `D-nn`. Es donde se resuelve cualquier duda.
- **`04`** — la etiqueta visible y el color semántico exactos de cada estado. **No reinterpretar los badges**: están todos ahí.
- **`08`** — el brief de diseño completo, con el inventario de pantallas del MVP y el dato exacto que alimenta cada una.
- **`11`** — el backlog, ticket por ticket, con lo que cada uno **no** debe construir.
