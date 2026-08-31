# INVICTOS — Cambio en el manejo de ubicación · resumen para diseño

> **Para quien diseñe.** Reemplaza lo que digan sobre zonas el `05` (flujos) y el `08` (brief) hasta que se actualicen. Todo lo demás de esos documentos sigue vigente.

---

## 1. Qué cambia, en una línea

La ubicación deja de ser un **filtro de búsqueda por zonas** y pasa a ser el **contexto por defecto de todo el producto**: la aplicación abre mostrando los torneos de la ciudad de la persona.

---

## 2. El modelo nuevo

| | Cómo era | Cómo queda |
|---|---|---|
| **Estructura** | Zonas jerárquicas: provincia → ciudad → **barrio** | **Dos niveles: provincia → ciudad.** No hay barrios |
| **Catálogo** | Arrancaba con las zonas del primer mercado y crecía | **Lista nacional completa** de ciudades argentinas, agrupadas por provincia, desde el día uno |
| **Jugador** | Zona opcional en el perfil | **Indica su ciudad**, y es la que ordena su experiencia |
| **Torneo** | Zona | **Ciudad + dirección** |
| **Descubrimiento** | Buscador con cinco filtros | **Vista por defecto de la ciudad propia**, con cambio de ciudad explícito |

**Una consecuencia buena:** como el catálogo es nacional, **nadie se queda nunca sin su ciudad**. Desaparece todo el estado de "no encuentro mi zona" que había que diseñar.

---

## 3. El cambio grande: el descubrimiento deja de ser un buscador

Es lo más importante de esta nota y cambia el carácter de la pantalla.

**Antes:** la persona entra a "Buscar torneos", elige filtros, ejecuta, ve resultados.
**Ahora:** la persona entra y **ya está viendo los torneos de su ciudad**. No pidió nada.

**Qué implica para el diseño:**

- **El selector de ciudad sube de categoría.** Deja de ser uno de cinco filtros y pasa a ser un **elemento persistente del encabezado**, del tipo que usan las aplicaciones de delivery para mostrar la dirección de entrega. Es contexto, no filtro.
- **Los otros cuatro filtros —modalidad, categoría, estado de inscripción, fecha— siguen siendo filtros**, y ahora operan *dentro* de la ciudad. Pueden quedar plegados: la mayoría de la gente no los va a tocar.
- **Cambiar de ciudad es una acción explícita y visible**, con vuelta fácil a la propia. Se llama "explorar", no "filtrar": la intención es mirar otro lado, no acotar lo que ya veo.
- **La pantalla tiene que poder abrirse sin ninguna elección previa.** Nada de un muro de configuración antes de ver contenido — sigue vigente el principio de *contenido primero, cuenta después* (`08`, 4.1).

---

## 4. Pantallas afectadas

| Pantalla | Qué cambia |
|---|---|
| **Descubrimiento** (`08`, 11.3) | Abre con la ciudad propia resuelta. Encabezado con la ciudad actual + acción de cambiarla. Los cuatro filtros restantes, secundarios |
| **Selector de ciudad** *(componente nuevo, compartido)* | Ver 5. Se usa en descubrimiento, alta de torneo, alta de equipo y perfil |
| **Crear torneo** (`08`, 11.5) | Pide **ciudad** (del catálogo) **y dirección** (texto libre). Son dos campos con dos usos: la ciudad para encontrarlo, la dirección para llegar |
| **Crear equipo** (`08`, 11.6) | La zona pasa a ser ciudad, del mismo catálogo |
| **Mi perfil** (`08`, 11.8) | La ciudad de la persona: es la que define su vista por defecto, así que conviene que se pueda cambiar de forma evidente |
| **Sin resultados** | Ver 6 |
| **Tarjeta de torneo** | Muestra **ciudad**. La dirección aparece en la ficha, no en la tarjeta |

---

## 5. El selector de ciudad — el componente a resolver bien

Es el elemento nuevo con más peso de diseño, porque el catálogo es grande: **Argentina tiene miles de localidades**. Un desplegable plano no sirve.

**Requisitos:**

1. **Se escribe para buscar.** Tipear es el camino principal, no navegar la lista.
2. **Las ciudades con torneos van primero**, y se distinguen de las que no tienen. Es lo que evita que alguien elija una ciudad vacía y crea que el producto está vacío.
3. **Agrupado por provincia**, que es lo que le da orden a la lista y desambigua los nombres repetidos — hay más de una Concepción, más de un San Martín. **La provincia siempre visible junto al nombre.**
4. **Es el mismo componente en las cuatro pantallas** donde se elige una ciudad. Una sola forma de elegir un lugar en todo el producto.
5. **Mobile primero**, como todo (`06`, D-67): se resuelve con una mano, con el teclado abierto.

---

## 6. Estados vacíos — ahora son más probables

Con una lista nacional, **la mayoría de las ciudades no va a tener torneos** durante mucho tiempo. Es un estado normal, no un error, y hay que diseñarlo con cuidado: es la pantalla donde más se pierde gente con intención real.

**Qué debería ofrecer, en este orden:**

1. **Ver los torneos de la provincia** — el paso natural hacia arriba, diciendo cuántos hay.
2. **Avisarme cuando se publique uno acá.**
3. **Publicar uno**, si la persona podría ser organizadora.

**Lo que no debe hacer:** parecer un error, ni dejar a la persona sin salida, ni sugerir que el producto entero está vacío porque su ciudad lo está.

---

## 7. Lo que NO hay que diseñar

- **Barrios o comunas.** El nivel más fino es la ciudad.
- **Mapa, radio en kilómetros, "torneos a menos de X".** No hay coordenadas en el producto.
- **Campo de ubicación libre.** La ciudad sale siempre del catálogo; lo único en texto libre es la dirección.
- **Un onboarding de ubicación que bloquee.** Ver 8.

---

## 8. Dos cosas que recomiendo resolver así

**a) Cuándo se pide la ciudad.** El registro pide hoy lo mínimo —identificador y nombre— y todo lo demás es opcional (`06`, D-52), porque la fricción de alta es lo que decide si alguien se queda. **Recomiendo pedir la ciudad en el primer uso del descubrimiento, no en el formulario de registro**, y recordarla. Se obtiene igual, sin cargarle un campo más al alta.

**b) El visitante sin cuenta.** Las superficies públicas se sirven sin sesión (`06`, D-04b), así que hay gente que llega por un link sin ciudad ni perfil. Para esa persona la pantalla **pregunta la ciudad como primer elemento de la lista**, no como un paso previo: puede ver contenido antes de contestar.

---

## 9. Preguntas abiertas — para resolver con el cliente

1. **El Gran Buenos Aires es el caso que más incomoda.** Alguien de Vicente López juega tanto en San Isidro o en CABA como en su partido, y con "una ciudad" queda mirando una porción chica de lo que le sirve. **Opciones:** permitir elegir **más de una ciudad**; o tratar al AMBA como una unidad; o dejar que el escalón a provincia lo resuelva. Afecta directamente al selector, así que conviene decidirlo antes de diseñarlo.
2. **La dirección del torneo contra la de la sede.** Hoy la dirección vive en la **Sede** de cada partido, y un torneo puede usar varias. ¿La dirección del torneo es la de su sede principal, o es un dato aparte de referencia? Cambia qué se muestra en la ficha.
3. **Ciudad del equipo contra ciudad del jugador.** Pueden no coincidir, y es habitual. ¿La vista por defecto sigue a la persona o a su equipo?

---

## 10. Qué mirar en el resto del set

- **`08`, 11.3** — descubrimiento y tarjeta de torneo
- **`08`, 4.1** — contenido primero, cuenta después
- **`05`, 5** — casos especiales, donde viven los estados vacíos
- **`04`** — etiquetas y colores de todo lo demás; sigue siendo la fuente de verdad
