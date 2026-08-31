# Modelo de monetización — análisis

> **Nota de contexto, fuera del embudo.** Los documentos `00` a `11` responden cada uno una pregunta y le pasan el resultado al siguiente. Éste no: acompaña al `12` (quiénes están) y al `13` (qué hacen), y responde **cómo se cobra**.
>
> **No decide nada.** Ninguna afirmación de acá modifica `06`. La etapa 3 sigue abierta por decisión explícita (D-62): el contenido de la suscripción se define con datos de uso. Lo que este documento hace es **preparar esa decisión** y separar lo que puede esperar de lo único que no.

---

## 1. Punto de partida — lo que ya estaba decidido

| # | Decisión vigente |
|---|---|
| **D-31** | Monetización en **cuatro etapas**: publicidad de red → sponsors directos → suscripción de grandes organizadores → comisión sobre pagos. Nada se cobra hoy |
| **D-63** | La publicidad va en las **tres superficies de consulta** —ficha del torneo, fixture, descubrimiento— y **nunca** en los flujos de tarea del organizador ni en la inscripción del capitán |
| **D-33** | La Inscripción se modela **con importe desde el día uno**, hoy siempre cero. `Suscripción/Plan` y `Pago/Transacción` quedan previstas, sin construir |
| **D-62** | **Qué define a un "gran organizador" y qué incluye su suscripción se define con datos de uso**, no sobre el papel |
| **D-02** | La plataforma es **pública y única**, y **el descubrimiento es el activo del producto** |

**D-02 es la que manda en todo este documento.** Las cuatro etapas de ingresos se apoyan, sin excepción, sobre la misma base: que haya muchos torneos publicados y vivos. La publicidad necesita tráfico; los sponsors necesitan tráfico *por zona*; la suscripción necesita organizadores grandes que hayan llegado y se hayan quedado; la comisión necesita inscripciones que ocurran acá. **Cualquier decisión de precio que reduzca la cantidad de torneos publicados se cobra a sí misma cuatro veces.**

---

## 2. Lo que agrega esta ronda

El cliente precisa la etapa 3, que hasta ahora decía solo "suscripción para grandes organizadores":

1. **Planes con niveles**, donde cada nivel habilita **torneos más grandes** — el medidor es el **máximo de equipos participantes**.
2. Una **versión gratuita acotada a torneos de hasta 4 equipos**.
3. La etapa 4 se amplía: no solo inscripciones, también **planillas y otros cobros**, con un fee sobre todo eso.

Los puntos 1 y 3 encajan sin fricción con lo ya decidido. **El punto 2 es el que hay que mirar de cerca**, y es el resto de este documento.

---

## 3. El problema del tope de 4 equipos

### 3.1 Cuatro equipos está por debajo del piso de un torneo real

Un cuadrangular existe y es un formato legítimo, pero **no es la forma habitual de un torneo amateur**. El set entero está dimensionado para otra cosa: los formatos de UC-17 —liga, grupos + eliminatoria—, el cupo de equipos, la lista de espera (D-27b), la generación de fixture de UC-29. Un torneo de cuatro equipos no necesita casi nada de eso.

Y esto es lo que hace que el tope no funcione como "plan gratuito" sino como **muro**: si el torneo típico no entra en el plan gratuito, entonces **prácticamente ningún torneo real se publica gratis**. No es un plan de entrada — es un demo.

### 3.2 Y un demo no puede ser la fuente de suministro de una plataforma de descubrimiento

Acá está el nudo. En un producto de gestión pura —Clupik, Competize— el plan gratuito es un embudo comercial: si es chico, se convierte mejor. **Acá no**, porque el plan gratuito no es solo la puerta de entrada del organizador: **es de dónde sale el catálogo**.

La cadena, en orden:

> Tope bajo → se publican pocos torneos reales → el descubrimiento está vacío → no hay tráfico → **la etapa 1 no genera** (publicidad de red) y **la etapa 2 no se puede vender** (sponsors por zona) → no llegan organizadores, porque el producto no muestra nada → **la etapa 3 no tiene a quién cobrarle** → no hay inscripciones → **la etapa 4 no existe**.

El tope no limita el plan gratuito: **limita el activo**. Y lo hace justo en el año en que el producto necesita suministro más que ingresos.

### 3.3 El medidor "equipos por torneo" cobra más por lo que más valor aporta

Cada equipo que entra a un torneo trae entre doce y dieciocho personas: perfiles, seguidores, tráfico, dato. **Un torneo de 16 equipos vale para la plataforma cerca del cuádruple que uno de 4** — en audiencia, en contenido y en descubrimiento.

Cobrar por cantidad de equipos significa **poner el peaje exactamente donde el organizador está entregando más valor**. Es un medidor cuyo incentivo apunta al revés del interés del producto.

### 3.4 Y se esquiva en dos minutos, rompiendo el dato

Un tope de 4 equipos con un torneo de 16 se resuelve publicando **cuatro torneos de 4**. El organizador lo va a hacer, porque le sale gratis y le lleva un rato.

**Lo grave no es que lo esquive: es en qué queda el producto cuando lo hace.** Cuatro torneos separados no tienen una tabla común, ni un fixture común, ni cruces entre grupos, ni una posición final. El score de equipo (UC-39) recibe cuatro competencias inconexas en vez de una. El historial (UC-37) queda ilegible.

**El medidor le paga al usuario por corromper el modelo de datos.** Es la peor propiedad que puede tener un límite comercial, y es razón suficiente para no usar equipos-por-torneo como muro.

---

## 4. Qué hace el mercado — dos filosofías, no una

Precios verificados en agosto de 2026. Complementan la tabla de `13`, sección 7, con dos correcciones importantes.

| Producto | Plan gratuito | Cómo escalona el pago |
|---|---|---|
| **LeagueRepublic** (UK/US) | **Todo el núcleo, sin tope de equipos**, con publicidad. Incluye inscripciones y pagos online | Se paga **por sacar la publicidad** y por dominio propio: USD 17,90 (≤25 equipos) · 30,40 (≤100) · 60,90 (≤300) · 89,60 (300+) por mes. **1% por transacción**, sin costo de setup |
| **Clupik** (LATAM) | **Hasta 5 equipos**, 50 deportistas, **1 torneo activo** | USD 29/mes: 20 equipos, 200 deportistas, 2 torneos activos · USD 79/mes: 70 equipos, 700, 10 torneos · Premium: sin límite. App propia +USD 49/mes |
| **Competize** (ES) | 1 competición | €19/mes; €39–200/mes. Modo TV y duplicar competición son de pago |
| **Deporstar** | Hasta **40 equipos** / 200 jugadores | — |
| **TorneoClick** (AR) | — | ARS 40.000 / 70.000 / 100.000 por mes; app propia +ARS 90.000 de setup |

**Tres lecturas:**

**a) Los topes gratuitos observados van de 5 a 40 equipos, o no existen.** Cuatro quedaría **por debajo del más bajo del mercado**, y el más bajo —Clupik— es un producto de gestión de clubes, no una plataforma de descubrimiento: no depende de que sus usuarios gratuitos publiquen nada.

**b) La cantidad de equipos se usa de dos maneras opuestas, y la diferencia lo es todo:**

| | **Muro** (Clupik) | **Escalón** (LeagueRepublic) |
|---|---|---|
| Qué hace el tope | **Impide** publicar por encima de N equipos | **Fija el precio** de la versión sin publicidad |
| Torneo de 16 equipos en el plan gratuito | No se puede | Se puede, con publicidad |
| Qué se vende | Capacidad | **Presentación y marca** |
| Efecto sobre el catálogo | Lo recorta | No lo toca |
| Incentivo a fragmentar torneos | Fuerte | Ninguno |

**c) Clupik mide con tres varas a la vez** —equipos, deportistas y **torneos activos simultáneos**—, no con una. El tercero es el que mejor separa a un aficionado de un negocio.

---

## 5. Elegir el medidor

| Medidor | A favor | En contra |
|---|---|---|
| **Equipos por torneo** | Legible, se explica en una línea, correlaciona con el tamaño del organizador | Cobra por el valor que el organizador aporta (3.3); **se esquiva fragmentando el torneo y eso rompe el dato** (3.4); recorta el catálogo si es muro |
| **Torneos activos simultáneos** | **Separa de verdad**: un aficionado corre un torneo por año, un negocio corre varios a la vez. No castiga el tamaño. **El set ya lo usa** —una organización sin verificar tiene un torneo publicado a la vez (D-51)—, así que el mecanismo existe. No se esquiva sin dejar de operar | Menos intuitivo de comunicar en una grilla de precios |
| **Jugadores registrados** | Se acerca al costo real de infraestructura | Invisible para el organizador; nadie sabe cuántos jugadores tiene |
| **Funcionalidades** | No limita volumen: el catálogo queda intacto | Hay que tener funcionalidades que valgan un pago recurrente, y hoy no están construidas |

**Ninguno alcanza solo.** El medidor de volumen ordena la grilla; las funcionalidades justifican el precio.

---

## 6. Propuesta

**No es una decisión: es la recomendación que se pone a consideración**, y no habilita a construir nada (D-62 sigue vigente).

### 6.1 La forma

**Escalón, no muro.** Todo organizador puede publicar el torneo que necesite, del tamaño que sea. Lo que se paga es **cómo se ve y cuánto se puede operar en paralelo**, no cuántos equipos entran.

### 6.2 Qué se vende, en orden de fuerza

1. **Sacar la publicidad de las páginas públicas del torneo.** Encaja con D-63 sin tocarla —los avisos ya viven solo en superficies de consulta— y **no obliga a degradar ningún flujo de tarea para después venderlo limpio**. Y responde la objeción de marca que `12`, 5.1 y `13`, 6.2 anticipan: la ficha del torneo es lo que el organizador pega en el grupo de WhatsApp, y una ficha sin avisos ajenos **es su marca**. Se le vende prestigio, no capacidad.
2. **Torneos activos simultáneos**, como medidor principal de la grilla.
3. **Las funcionalidades de prestigio que `13` ya identificó**, que existen y no están construidas: **Modo TV** en el complejo (`13`, 4.7 — ya nominada como primera candidata concreta de la etapa 3), **duplicar un torneo terminado** (4.2) e **imágenes de la fecha listas para compartir** (4.4).
4. **Cantidad de equipos, como escalón de precio** — igual que LeagueRepublic. Conserva lo que el cliente quiere de este medidor (que el que corre torneos grandes pague más) sin ninguno de sus efectos destructivos.

### 6.3 Qué no conviene poner detrás del pago, nunca

**Nada que degrade el dato ni el descubrimiento.** En concreto: cargar resultados, generar fixture, la tabla de posiciones, la ficha pública, el descubrimiento y las notificaciones de reprogramación. Son el producto, y son de dónde sale el activo. Es la traducción a precio del mismo criterio de D-63.

---

## 7. Lo único que hay que decidir ahora — la regla de transición

Todo lo demás puede esperar a tener datos. Esto no, y es el riesgo más concreto del plan.

**El problema:** el producto arranca gratis y sin límites para ganar masividad. Cuando la etapa 3 llegue, los organizadores que se sumaron ya van a tener torneos en curso, historial acumulado y equipos que dependen de ellos. **Si el límite aparece de golpe, el día que se activa se rompen los torneos de la gente que llegó primero** — que son, exactamente, los que hicieron posible el producto.

**Tres reglas que conviene fijar hoy, porque son baratas ahora y carísimas después:**

1. **Ningún límite nuevo interrumpe un torneo en curso.** Se aplica a torneos creados después de la fecha de vigencia. Un torneo empezado se termina bajo las reglas con las que empezó.
2. **Los organizadores anteriores a la etapa 3 conservan su nivel de uso.** No es generosidad: es lo que evita que el anuncio de precios se convierta en el día en que se vació el catálogo. El costo de mantenerlos es marginal; el de perderlos es el activo.
3. **Los límites se validan al publicar, nunca al inscribirse.** Un tope que se evalúa cuando un equipo se anota puede bloquear a un equipo por una razón que no tiene nada que ver con él, en el peor momento posible. Si hay tope, se resuelve antes de que el torneo exista.

**Nada de esto se construye ahora.** Se escribe ahora para que quien construya la etapa 3 no tenga que improvisarlo.

---

## 8. La etapa 4 — dónde está el dinero de verdad

El cliente amplía la etapa 4 de "inscripciones" a "inscripciones, planillas y otros cobros". **La ampliación es más importante que la etapa original**, por una razón de aritmética.

Un torneo de 12 equipos y 11 fechas:

| Flujo | Transacciones por torneo |
|---|---|
| **Inscripción** | 12 — una por equipo, una vez |
| **Planilla / arbitraje por fecha** | ~66 a 132 — todas las semanas, todo el torneo |

**El cobro semanal mueve entre cinco y diez veces más transacciones que la inscripción**, sobre el mismo torneo y la misma pasarela. Y resuelve un dolor real que el set todavía no toca: perseguir efectivo todos los domingos.

**Dos advertencias honestas:**

- **A 1% —la referencia de LeagueRepublic— el fee no es el negocio.** Sobre un torneo amateur, la comisión es plata chica. **El valor real de la etapa 4 es la inercia**: un organizador cuya plata pasa por la plataforma no se va. `12`, 5.3 ya lo dice con otras palabras — *el costo de cambio no es la ignorancia, es la inercia*. La etapa 4 es lo que la construye.
- **La precondición de la etapa 4 no es técnica, es operativa y regulatoria.** Manejar plata de terceros, resolver los pagos divididos, la facturación y el tratamiento impositivo es de otra naturaleza que todo lo demás del set. El incumbente ya lo hizo —Todo Torneos cobra por Mercado Pago (`13`, 4.8)—, así que se puede; pero conviene no tratarlo como "una funcionalidad más de la etapa 4".

---

## 9. Qué habría que verificar antes de fijar precios

En orden de valor, y ninguno es análisis: son preguntas que se contestan mirando o preguntando.

1. **Cuántos equipos tiene un torneo típico en el primer mercado.** Es el dato que decide cualquier tope, y hoy no se tiene. Se responde mirando diez torneos reales.
2. **El precio de Todo Torneos** —el incumbente argentino— que sigue sin ser público (`12`, 6.3). Es el ancla contra la que se va a comparar cualquier precio.
3. **Si el organizador pagaría por sacar la publicidad de su ficha.** Es la hipótesis central de la sección 6 y se responde preguntándole a tres organizadores, no analizando más.
4. **Cuántos torneos simultáneos corre un organizador grande de verdad**, que es lo que calibra la grilla si el medidor es ése.
5. **Costo real de la pasarela en Argentina** para pagos divididos entre organizador y plataforma.

---

## 10. Preguntas abiertas

No son decisiones pendientes en el sentido de `06`, y ninguna bloquea el MVP.

1. **¿Muro o escalón?** Es la única bifurcación de fondo. Este documento recomienda escalón; la alternativa es viable pero pide bajar mucho el tope de equipos, mirar cuánto se pierde de catálogo y aceptar el incentivo a fragmentar.
2. **¿La etapa 2 —sponsors vendidos directamente— sigue teniendo lugar** si la etapa 3 se vuelve "pagar para no tener publicidad"? Las dos conviven, pero hay que decidir qué ve el visitante de un torneo pago: nada, o el sponsor del propio organizador. **La segunda opción es una funcionalidad vendible en sí misma** y no está anotada en ningún lado.
3. **¿El plan se ata a la organización o al torneo?** El set tiene `ORGANIZACION` como entidad que publica (D-51), así que lo natural es la organización — pero un organizador que corre un torneo grande al año preferiría pagar por torneo. Afecta a la entidad `Suscripción/Plan` prevista en D-33.
4. **¿Qué pasa con el equipo y el jugador?** Todo el relevamiento coincide sin una sola excepción: **cobra siempre el organizador, el jugador nunca paga** (`13`, 3). Conviene dejarlo escrito como principio antes de que alguien proponga un plan de equipo.

---

## 11. Documentos relacionados

- `12-panorama-competitivo.md` — quiénes están; 5.1 la objeción de marca del organizador
- `13-funcionalidades-de-la-competencia.md` — 4.2, 4.4 y 4.7 las candidatas de plan pago; 7 los precios observados
- `06-reglas-negocio-y-decisiones-pendientes.md` — D-02, D-31, D-33, D-51, D-62, D-63
- `07-roadmap-funcional.md` — sección 6, las cuatro etapas cruzadas con el producto
- `03-diagrama-entidad-relacion.md` — 3.9, el importe de la Inscripción
