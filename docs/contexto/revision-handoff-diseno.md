# Revisión del handoff de diseño contra el set — INVICTOS

> **Nota de contexto, fuera del embudo.** Contrasta el paquete `design_handoff_invictos` (24 archivos: Design System, 11 dominios, 5 flujos) contra el set documental en **revisión 12**. No modifica ninguna decisión de `06`.

---

## 1. Cómo se revisó

Se comparó cada pantalla y cada regla escrita en el paquete contra `02` (casos de uso), `03` (modelo), `04` (catálogo), `06` (decisiones), `07` (etapas) y `08` (brief).

**Primer dato, y es bueno:** la copia de `02-casos-de-uso.md` que viene en el paquete es **byte a byte idéntica** a la vigente. El diseño no trabajó sobre una versión vieja — las diferencias que siguen son de interpretación, no de desfasaje.

**Veredicto general: el paquete se ajusta bien al sistema.** Hay **cuatro contradicciones reales**, **tres decisiones que el diseño tomó y el set todavía no tiene**, y **un problema de alcance** que es el de mayor costo si no se corrige.

---

## 2. Lo que está bien, y conviene no tocar

No es cortesía: son las partes donde era fácil equivocarse y no se equivocaron.

- **El sistema visual resuelve las dos tensiones del brief.** Identidad oscura sobre lienzo claro (`08`, 6.1); acento **cian `#00A8CC`**, que respeta la restricción de que no puede ser ni verde ni rojo porque ya están tomados por la semántica (`08`, 6.2); y la energía puesta en **tipografía, contraste y "momentos"** —el marcador de 64px, el punto en vivo como única animación— en vez de en color de fondo (`08`, 5.1). Es exactamente la resolución que el brief pedía.
- **La ciudad como contexto y no como filtro** (D-90), con estado vacío que ofrece la provincia y el selector compartido entre las cuatro pantallas. Es el cambio de la revisión 11 bien entendido.
- **Seguir y Pedir sumarme como dos botones distintos**, con pendiente que resuelve otra persona (D-85), y el capitán que no puede irse sin reemplazo mientras el resto se da de baja al instante (D-87).
- **Categoría de género obligatoria al crear equipo** y **aviso no bloqueante** de categoría cruzada al inscribirse (D-81, D-82).
- **Publicidad solo en las tres superficies de consulta**, nunca en pantallas de tarea (D-63).
- **Publicar sin verificación deja el torneo no listado**, accesible por link (D-51) — con el matiz bien dicho: se publica igual, no se bloquea.
- **El fixture generado es una propuesta editable**, nunca definitivo sin revisión humana (D-31b).

---

## 3. Contradicciones que hay que corregir

### 3.1 Aprobación automática de inscripciones — contradice D-93

**Dónde:** pantalla de resolver solicitudes en `D6 Inscripciones` ("Aprobación automática · Para torneos abiertos, sin revisar equipo por equipo"), y declarado también en el README ("con opción de auto-aprobación configurable").

**El problema:** eso es **D-28b, que quedó superada por D-93** en la revisión 12. La aprobación automática **no existe en el MVP**. El fundamento no es formal: mientras el costo de inscripción se paga fuera de la aplicación, la aprobación del organizador es la única señal de que el equipo está realmente adentro — y el fixture se genera desde las inscripciones aprobadas, así que un `approved` equivocado se propaga al calendario, a la tabla y al score.

**Qué hacer:** quitar el bloque de la pantalla. No se reemplaza por nada — el flujo queda solicitar → resolver, sin excepción.

### 3.2 Validar el correo para sumarse a un plantel — no existe en el modelo

**Dónde:** `Entrada` y `Flujo Registro y primer torneo` — *"La validación de tu correo solo te la pedimos si más adelante querés sumarte a un equipo o publicar un torneo"*.

**Está bien la mitad.** Para **publicar un torneo** es correcto: es la verificación básica de la organización, por email y no por SMS (D-76, D-51).

**Para sumarse a un plantel está mal, y no es un detalle.** Esa verificación es de la **organización**, no de la persona, y el modelo va explícitamente en la dirección contraria: **se puede integrar un plantel sin tener cuenta siquiera** —perfiles `unclaimed` creados por el capitán o el organizador (D-29b, UC-11)—, que es el mecanismo que hace posible el primer torneo de cualquier organizador. Pedir correo validado para entrar a un equipo le agrega fricción al camino de alta más frecuente del producto y contradice D-03.

**Qué hacer:** dejar la frase solo para publicar un torneo.

### 3.3 El ranking dice "Zona Norte" — el recorte es por ciudad

**Dónde:** `D9 Reputación y Score` — *"Rankings Zona Norte F5 Masculino · Acotado a esta zona, modalidad y categoría"*.

**El problema:** doble. El recorte es **ciudad + modalidad + categoría** desde D-92, y **"Zona Norte" es granularidad de barrio, que dejó de existir** en la revisión 11 — el árbol de zonas se reemplazó por dos niveles, provincia → ciudad. La etiqueta de ejemplo describe un modelo que ya no está.

**Qué hacer:** cambiar el ejemplo a una ciudad y el texto a *"acotado a esta ciudad, modalidad y categoría"*. La segunda frase de esa pantalla —*"comparar un F5 de esta ciudad con un F11 de otra"*— ya está bien.

### 3.4 El checklist de publicación pide "Zona" — son ciudad y dirección

**Dónde:** `D4 Torneos`, resumen previo a publicar: *"Nombre, modalidad y formato · Zona, fecha estimada y cupo"*.

**El problema:** desde D-91 el torneo lleva **ciudad y dirección**, dos campos separados con dos usos distintos —la ciudad para encontrarlo, la dirección para llegar—. La pantalla de **crear** torneo sí los tiene bien; es el checklist de publicación el que quedó con la palabra vieja.

---

## 4. Decisiones que tomó el diseño y el set todavía no tiene

No son errores. Son definiciones razonables a las que llegó el diseño al chocar con un hueco — pero hoy **viven solo en las pantallas**, y eso significa que la documentación ya no es la fuente de verdad de esas tres cosas.

### 4.1 Hasta 3 ciudades simultáneas — resuelve la única decisión abierta del set

**El diseño eligió:** *"Hasta 3 ciudades a la vez — pensado para AMBA, donde se juega en más de un municipio"*, con chips removibles y resultados agrupados por ciudad.

Es **una de las tres salidas** que `06`, 4.11 dejó planteadas para el AMBA, y es una buena elección: no toca el modelo, no obliga a inventar una entrada "AMBA" en el catálogo y no rompe el escalón a provincia.

**Lo que falta resolver antes de construir**, y el diseño no lo toca:

- **¿Cuál es "mi ciudad" para el ranking?** El recorte es por ciudad (D-92) y una persona con tres seleccionadas no define ninguna. Lo más probable: el ranking sigue a la **ciudad del equipo**, que es una sola — pero hay que escribirlo.
- **¿El equipo y el torneo también llevan varias?** Deberían seguir llevando **una sola**: el multi-ciudad es una preferencia de quien mira, no un atributo de lo que se mira.
- **¿Con tres ciudades la pantalla sigue siendo "una vista"?** Con una es la vista de una ciudad; con tres empieza a parecerse a un listado. Los resultados agrupados por ciudad que propone el diseño lo resuelven, pero conviene decir que el agrupado es obligatorio y no opcional.

### 4.2 Costo de inscripción y de planilla en el torneo

**El diseño agregó:** dos campos opcionales al crear el torneo —*"Costos (opcional) · Inscripción · Planilla / fecha · Se muestran en la ficha pública · Sin cargar, el torneo aparece como sin costo"*— y su exhibición en la ficha.

**Es una buena adición y encaja exactamente con el fundamento de D-93:** si el dinero se mueve fuera de la aplicación, lo mínimo es que la ficha diga cuánto cuesta. Hoy un capitán tiene que preguntar por WhatsApp.

**No está en el modelo, y hay que agregarlo con cuidado de no confundirlo con lo que ya existe:** `Inscripcion.costo` (`03`, 3.9) es el **importe de una transacción**, hoy siempre cero, que existe para no rehacer el dominio cuando llegue la etapa 4 (D-33). Lo que el diseño agrega es distinto: son **precios declarados del torneo**, informativos, que no cobran nada. Van en `TORNEO`, no en `INSCRIPCION`.

**Y aparece algo que el análisis de monetización ya había anticipado:** la **planilla por fecha** es el cobro recurrente, y es el que mueve entre cinco y diez veces más transacciones que la inscripción (`14`, 8). Que el diseño la haya puesto como campo de primera clase, sin proponérselo, refuerza esa lectura.

### 4.3 El resultado cargado por el organizador queda confirmado al instante

**El diseño escribió:** *"Vos, como organizador, ya lo confirmaste al cargarlo"* — sin ventana de 72 horas.

**Es una inferencia razonable** de D-07b, que dice que *los capitanes cargan y el organizador confirma, y tiene la última palabra*. Si el que confirma es el que carga, no hay nada que esperar.

**Pero no está escrita, y tiene una consecuencia que nadie pesó:** le quita al equipo rival la posibilidad de objetar (UC-32). En el fútbol amateur el organizador **no siempre es neutral** —suele ser el dueño del complejo, o alguien del ambiente—, y `00`, 5.3 identificó como el riesgo más serio del producto justamente que el score se construya sobre datos declarados por una parte interesada. D-60 dice *"un resultado sin confirmar se da por confirmado a las 72 horas"*, sin distinguir quién lo cargó.

**Hay que decidirlo, no dejarlo implícito.** Las dos opciones son defendibles: confirmar al instante reduce fricción y es coherente con "el organizador tiene la última palabra"; mantener la ventana protege al equipo perjudicado. **Mi recomendación es una tercera:** confirmado al instante **pero con la objeción todavía disponible** —el resultado cuenta desde el minuto cero y, si alguien objeta, se abre la disputa como en cualquier otro caso—. Se queda con la baja fricción sin cerrarle la puerta al equipo que tiene razón.

---

## 5. El problema de alcance — el de mayor costo

El paquete diseña pantallas de **etapas posteriores** sin marcarlas, mezcladas con las del MVP.

**Marcadas correctamente:** UC-05 reclamar perfil ("post-MVP"), UC-09 transferir titularidad ("fase futura"), UC-34 eventos del partido ("Fase 2 · opcional"), seguir jugadores ("fase futura").

**Sin marcar, y no son MVP:**

| Pantalla | Etapa real (`07`) |
|---|---|
| Confirmar o disputar resultado (UC-32), en `D7` | **Segunda** |
| Estadísticas del torneo (UC-36) e Historial del jugador (UC-38), en `D8` | **Segunda** |
| Actividad / feed (UC-44), en `D10` | **Segunda** |
| Preferencias de notificación (UC-47), en `D11` | **Segunda** |
| **Todo `D9` — score, desglose y rankings (UC-39, UC-40, UC-41)** | **Tercera** |

**Por qué importa más de lo que parece:** el paquete está pensado para que alguien lo reimplemente, y quien lo reciba va a leer todo lo que no esté marcado como parte de la primera entrega. Son **cinco pantallas y un dominio entero** de trabajo que no corresponde hacer ahora — y el score, además, **no se puede construir todavía por decisión explícita**: sus ponderaciones se calibran con datos reales de uso, no se fijan sobre el papel (`06`, 5.4).

**Diseñar adelantado está bien** —tener las pantallas listas cuando llegue la etapa no cuesta nada—. Lo que no está bien es que no se distinga. **Alcanza con la misma etiqueta que ya usaron** en las cuatro que sí marcaron.

---

## 6. Detalles menores

- **El README dice "UC-01 a UC-52"**; son 53 desde la revisión 10 (UC-53, solicitar sumarse). El propio `02` que viene adjunto ya lo tiene.
- **El README declara la auto-aprobación** además de la pantalla (3.1); hay que corregir los dos.
- **Canales de notificación:** el paquete dice "Accionables (push + email) / Informativas (solo push)". El set dice **dentro del producto + email** para las accionables y **solo dentro del producto** para las informativas (D-53). Es la misma regla con otro nombre, pero conviene unificar el vocabulario antes de que "push" y "dentro del producto" se traten como dos cosas distintas en el código.
- **El paquete incluye solo `docs/02-casos-de-uso.md`.** Para quien lo reciba suelto faltan los tres que el `LEEME` nombra como imprescindibles para diseñar: `04` (la etiqueta visible y el color semántico exactos de cada estado), `06` (el porqué de cada regla) y `08` (el brief). Vale la pena incluirlos en la próxima versión del zip.

---

## 7. Qué haría ahora

**En el diseño, cuatro correcciones puntuales** (sección 3): quitar la auto-aprobación, acotar la validación de correo a publicar un torneo, cambiar el ranking a ciudad y arreglar el checklist de publicación. Ninguna toca el sistema visual.

**Marcar las pantallas de etapas posteriores** (sección 5) con la etiqueta que ya usan.

**En el set, incorporar las tres decisiones de la sección 4** — las tres ciudades, los costos declarados del torneo y la confirmación instantánea— para que la documentación vuelva a ser la fuente de verdad. Las dos primeras son adiciones limpias; la tercera necesita que se elija entre las tres opciones planteadas.
