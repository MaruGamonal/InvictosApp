# Revisión profunda de UX y microcopy

Auditoría de todos los textos largos de la interfaz, con el criterio de
que **la app se tiene que entender sola**. Un párrafo que explica cómo
funciona una acción simple no es un problema de redacción: es una
interfaz que no alcanza.

## Cómo se hizo

Se extrajeron los textos de `src/app/**` y `src/components/**` —incluidos
los que ocupan varias líneas de JSX, que la auditoría de wording anterior
no veía— y se filtraron los fragmentos de código. Quedaron **95 textos de
interfaz**. Cada uno se leyó en su pantalla, mirando qué hace la UI
alrededor: si el botón ya está oculto, si el estado ya está en un badge,
si el bloqueo ya existe en el momento del intento.

## Clasificación

| | Qué significa | Cuántos |
|---|---|---|
| 🔴 ELIMINAR | La UI ya lo comunica, o el usuario no necesita saberlo | 14 |
| 🟠 REEMPLAZAR POR UI | El texto existe porque falta una etiqueta, un estado o un bloqueo | 9 |
| 🟡 REDUCIR | Dice algo que hace falta, pero de más | 6 |
| 🟢 MANTENER | Confirmación destructiva, estado vacío, error o ayuda de campo | 66 |

## El patrón de fondo

Trece de los veintitrés textos a eliminar o reemplazar son **la misma
falla**: la interfaz ya se comporta bien —esconde el botón, deshabilita
la acción, muestra el badge— y arriba se le apoya un párrafo que explica
ese comportamiento. El párrafo no agrega nada: le cuenta al usuario una
regla del sistema en un momento en el que no está intentando romperla.

La regla que los reemplaza a todos: **la explicación de un permiso
aparece cuando alguien intenta la acción, no mientras no la intenta.**

---

## 🔴 ELIMINAR

### UX #001 — El permiso de Titular, explicado tres veces

**PANTALLA:** Equipo de trabajo (`organizador/gestionar/equipo`) y
Administradores del torneo (`torneo/[id]/gestionar`).

**TEXTO ACTUAL:**
- `ListaEquipoDeTrabajo.tsx:76` — «Solo el Titular de la organización puede sumar Administradores. Pedíselo a quien la creó.»
- `ListaEquipoDeTrabajo.tsx:111` — «Solo el Titular puede sumar o sacar administradores de la organización.»
- `PanelAdministradores.tsx:161` — «Solo el Titular puede sumar o sacar administradores de la organización.»

**PROBLEMA:** Las tres dicen lo mismo. Dos están en la misma pantalla, a
cincuenta líneas de distancia. Y las tres explican algo que la interfaz
**ya hace bien**: `esTitular` esconde el enlace «+ Invitar administrador»
y el botón «Quitar» de cada fila. A quien no es Titular no se le está
negando nada en ese momento: simplemente está mirando una lista.

**¿SE PUEDE ELIMINAR?** Sí, las tres.

**¿REQUIERE CAMBIO DE UX?** No. La UX ya es correcta; sobra el comentario.

**SOLUCIÓN PROPUESTA:** Borrar los tres párrafos. El Administrador ve la
lista del equipo de trabajo, con los roles en sus badges, y nada más.

> Hay un comentario en el código que registra por qué se agregaron:
> alguien reportó en vivo «no tengo cómo invitar colaboradores al equipo
> de trabajo». Vale la pena leerlo bien: quien lo reportó **era el
> Titular**, y el problema era que el botón era un enlace de 13px en un
> rincón. Eso ya se arregló —hoy es un botón visible— y ese arreglo
> sigue en pie. Lo que se saca es la nota al pie que se le agregó a la
> gente que no tiene el permiso.

### UX #002 — El pedido de verificación, para quien no lo puede pedir

**PANTALLA:** Todas las que ofrecen verificar (`BotonVerificarOrganizacion.tsx:46`).

**TEXTO ACTUAL:** «La verificación la pide quien creó la organización, desde su cuenta.»

**PROBLEMA:** El componente, cuando `!soyTitular`, en vez de no renderizar
nada renderiza un párrafo. Aparece en cuatro pantallas distintas, siempre
al lado de un bloque que ya explica el estado de la organización. El
Administrador termina leyendo dos textos seguidos sobre una gestión que
no le toca hacer.

**¿SE PUEDE ELIMINAR?** Sí.

**¿REQUIERE CAMBIO DE UX?** No: devolver `null`.

**SOLUCIÓN PROPUESTA:** Sin permiso, no hay botón. El estado de la
organización sigue visible —eso sí le sirve—, la gestión no.

### UX #003 — Publicar sin formato, avisado antes de tiempo

**PANTALLA:** Gestionar torneo → Estado (`AccionesEstadoTorneo.tsx:95`).

**TEXTO ACTUAL:** «Podés publicar sin definir el formato todavía — solo hace falta antes de generar el fixture.»

**PROBLEMA:** Le avisa a alguien que está por publicar sobre una
restricción de otra acción, que va a intentar después. Y el aviso **ya
existe donde corresponde**: `fixture/page.tsx:25` muestra «Todavía no
definiste el formato del torneo — hace falta antes de generar el
fixture» con un botón «Ir a Configuración». Ese es el momento del
intento; este no.

**¿SE PUEDE ELIMINAR?** Sí.

**¿REQUIERE CAMBIO DE UX?** No. El bloqueo en el punto de intento ya está
construido y funciona.

**SOLUCIÓN PROPUESTA:** Borrar el párrafo. Publicar sin formato se
permite: se permite en silencio.

### UX #004 — «Esta ficha es visible sin cuenta»

**PANTALLA:** Ficha pública del torneo (`torneo/[id]/(publico)/page.tsx:283`).

**TEXTO ACTUAL:** «Toda esta ficha es visible sin cuenta. El registro se pide recién al tocar "Seguir" o "Inscribir a mi equipo".»

**PROBLEMA:** Información nuestra, no del usuario. Quien la está leyendo
sin cuenta ya la está viendo sin cuenta; quien la lee con cuenta no tiene
nada que hacer con el dato. Y el registro que se pide al tocar «Seguir»
se pide al tocar «Seguir»: no hace falta anticiparlo al pie de la página.

**¿SE PUEDE ELIMINAR?** Sí.

**¿REQUIERE CAMBIO DE UX?** No.

**SOLUCIÓN PROPUESTA:** Borrar.

### UX #005 — El ranking explica sus propios chips

**PANTALLA:** Ranking del equipo (`equipo/[id]/ranking/page.tsx:51`).

**TEXTO ACTUAL:** «Acotado a esta zona, modalidad y categoría — leídas del equipo, no de los torneos que jugó.»

**PROBLEMA:** Justo arriba hay tres chips que dicen la ciudad, la
modalidad y la categoría. El párrafo los repite en prosa y agrega de
dónde salen esos tres valores, que es implementación.

**¿SE PUEDE ELIMINAR?** Sí.

**¿REQUIERE CAMBIO DE UX?** No: los chips ya son la UI que reemplaza al
párrafo.

**SOLUCIÓN PROPUESTA:** Borrar el párrafo, dejar los chips.

### UX #006 — «Este cambio no notifica»

**PANTALLA:** Editar torneo (`FormularioEditarTorneo.tsx:202, 236, 268, 297`).

**TEXTO ACTUAL:** Cuatro variantes de lo mismo, una debajo de cada campo
que no dispara aviso — entre ellas «Este cambio no notifica: no es de los
cinco relevantes (fecha, sede, formato, cupo, reglamento)», que además
nombra una regla interna.

**PROBLEMA:** No notificar es lo que pasa por defecto con cualquier
cambio en cualquier formulario. Anunciarlo cuatro veces convierte la
ausencia de un efecto en un tema. Y «los cinco relevantes» es
vocabulario nuestro.

**¿SE PUEDE ELIMINAR?** Sí, los cuatro.

**¿REQUIERE CAMBIO DE UX?** Ver UX #012: lo que sí hace falta marcar es
el caso contrario.

**SOLUCIÓN PROPUESTA:** Borrar los cuatro. Silencio = no pasa nada.

> La segunda mitad de `:236` («un torneo de hasta 3 días se trata como
> relámpago…») es información real y útil: se conserva, movida al campo
> que la genera. Ver UX #012.

### UX #007 — Las reglas de baja del plantel, siempre a la vista

**PANTALLA:** Gestionar equipo (`equipo/[id]/gestionar/page.tsx:111`).

**TEXTO ACTUAL:** «El Capitán no puede irse sin designar reemplazo. Cualquier otro se da de baja al instante — nadie tiene que confirmarlo.»

**PROBLEMA:** Está fijo debajo del plantel, para todo el mundo, todo el
tiempo. Y `FilaIntegranteGestion` ya resuelve las dos mitades: al Capitán
no le muestra el botón de irse, y al resto se lo muestra con su
`window.confirm`. Nadie necesita leer la regla para descubrir que la
interfaz ya se la aplicó.

**¿SE PUEDE ELIMINAR?** Sí.

**¿REQUIERE CAMBIO DE UX?** No.

**SOLUCIÓN PROPUESTA:** Borrar.

### UX #008 — Solicitudes de ingreso: título y párrafo dicen lo mismo

**PANTALLA:** Solicitudes de ingreso (`equipo/[id]/gestionar/solicitudes/page.tsx:43` y `:54`).

**TEXTO ACTUAL:**
- «Piden sumarse ellos. Distinto de las invitaciones que mandaste vos, y no aparecen en el plantel hasta que las resolvés.»
- «Tras un rechazo, la persona puede volver a solicitar: la fila vuelve a aparecer acá como pendiente.»

**PROBLEMA:** El título de la pantalla es «Solicitudes de ingreso» y las
filas tienen botones «Aceptar» / «Rechazar». La primera frase explica el
título. La segunda describe qué va a pasar en la base de datos después de
rechazar — y si pasa, el usuario lo va a ver pasar.

**¿SE PUEDE ELIMINAR?** Las dos.

**¿REQUIERE CAMBIO DE UX?** No.

**SOLUCIÓN PROPUESTA:** Borrar las dos. El estado vacío («No hay
solicitudes de ingreso pendientes») ya cubre el caso en que no hay nada.

### UX #009 — Invitar dos veces

**PANTALLA:** Invitar integrante (`FormularioInvitarIntegrante.tsx:117`).

**TEXTO ACTUAL:** «Invitar dos veces a la misma persona no duplica: reenvía el acceso. Las invitaciones no vencen.»

**PROBLEMA:** Responde una duda que aparece *después* de invitar, no
antes, y está debajo del botón «Enviar invitación». Quien está por
invitar por primera vez —la enorme mayoría— lee una aclaración sobre un
caso que todavía no tiene.

**¿SE PUEDE ELIMINAR?** Sí.

**¿REQUIERE CAMBIO DE UX?** No: si alguien invita de nuevo, el resultado
—el acceso reenviado— es el que corresponde, sin explicación previa.

**SOLUCIÓN PROPUESTA:** Borrar.

### UX #010 — El colaborador, descripto en un párrafo

**PANTALLA:** Gestionar torneo → Colaboradores (`PanelColaboradores.tsx:135`).

**TEXTO ACTUAL:** «Va a poder cargar resultados, programar partidos y marcar partidos no disputados en este torneo — nada más. Es una asignación por torneo: quitarlo de acá no lo saca de otros torneos donde también colabore.»

**PROBLEMA:** 205 caracteres al pie de una lista de nombres. La mitad del
contenido —el alcance por torneo— **ya está en el título del acordeón**,
que dice «Colaboradores de este torneo». La otra mitad es la definición
del rol, que debería ser una etiqueta, no un párrafo.

**¿SE PUEDE ELIMINAR?** El párrafo sí.

**¿REQUIERE CAMBIO DE UX?** Sí: las filas hoy muestran solo el nombre y
un botón «Quitar». Falta decir qué es esa persona.

**SOLUCIÓN PROPUESTA:** Ver UX #011 (es el mismo cambio, desde el lado de
la UI).

---

## 🟠 REEMPLAZAR POR UI

### UX #011 — Colaboradores: la fila tiene que decir el rol

**PANTALLA:** Gestionar torneo → Colaboradores.

**PROBLEMA:** La fila es `nombre + [Quitar]`. No dice qué puede hacer esa
persona. Por eso hay un párrafo abajo diciéndolo.

**SOLUCIÓN PROPUESTA:** Poner el rol en la fila, como badge, igual que en
Equipo de trabajo:

```
Lucía Fernández
[Colaboradora]                    [Quitar]
```

Y borrar el párrafo. El acordeón ya dice «de este torneo»; el badge dice
qué es; el botón dice qué se puede hacer con ella.

### UX #012 — Editar torneo: lo que avisa, marcado en el campo

**PANTALLA:** Editar torneo (`FormularioEditarTorneo.tsx:224, 256, 309`).

**TEXTO ACTUAL:** «Esto les avisa a los equipos inscriptos y a quienes siguen el torneo.» — tres veces, una debajo de fecha de inicio, otra de dirección, otra de cupo.

**PROBLEMA:** Es información que sí importa —cambiar la sede le llega a
todo el mundo—, pero repetida en prosa en tres lugares. Y mezclada con
las cuatro negativas de UX #006, el formulario tiene siete párrafos de
sistema entre nueve campos.

**¿REQUIERE CAMBIO DE UX?** Sí.

**SOLUCIÓN PROPUESTA:** Marcar el campo, no explicarlo. Una etiqueta
breve al lado del nombre del campo:

```
Fecha de inicio   · avisa a inscriptos
[_______________]

Descripción
[_______________]
```

Tres marcas cortas en vez de tres párrafos, y los campos que no avisan no
dicen nada. El dato de torneo relámpago, que hoy viaja escondido en una
de las negativas, pasa a ser la ayuda del campo «Fecha de fin»: «Con
fecha de fin, un torneo de hasta 3 días se maneja como relámpago: los
plazos se cierran cuando termina.»

### UX #013 — El bloque de visibilidad, tres veces distinto

**PANTALLA:** Gestionar torneo → Configuración (`configuracion/page.tsx:129-147`).

**TEXTO ACTUAL:** Título «Visibilidad en el descubrimiento», más uno o
dos párrafos: «Tu organización no está verificada: este torneo se
comparte por enlace y funciona completo, pero no aparece en las
búsquedas.» y, cuando corresponde, «Además, sin verificar podés tener un
solo torneo publicado a la vez — y ya tenés uno, así que este no va a
poder publicarse hasta que la verifiques.»

**PROBLEMA:** «Visibilidad en el descubrimiento» es nombre de
funcionalidad interna. Y hay dos cosas distintas mezcladas: **un estado**
(la organización no está verificada) y **un bloqueo** (este torneo no se
va a poder publicar). El estado se está explicando siempre; el bloqueo,
cuando ocurre, queda dentro del mismo párrafo largo.

**¿REQUIERE CAMBIO DE UX?** Sí: separar estado de bloqueo.

**SOLUCIÓN PROPUESTA:**

```
⚠ Organización pendiente de verificación
Este torneo no aparece en las búsquedas.
[Verificar organización]
```

y, sólo cuando el límite bloquea de verdad:

```
Verificá tu organización para publicar este torneo.
```

Mismo patrón exacto que ya usa `ResumenOrganizacion`, que es el que está
bien. Tres pantallas empiezan a decir lo mismo de la misma forma.

### UX #014 — Perfil de la organización: dos párrafos de doctrina

**PANTALLA:** Organización → Perfil (`organizador/gestionar/perfil/page.tsx:63` y `:67`).

**TEXTO ACTUAL:** «Verificar es confirmar la dirección de correo con la
que entrás: no pedimos documentación ni validamos nada legal. Te mandamos
un enlace y con tocarlo alcanza.» + «Mientras no lo hagas, tus torneos
funcionan completos y se comparten por link, pero no aparecen en las
búsquedas, y podés tener uno solo publicado a la vez.»

**PROBLEMA:** 315 caracteres para un botón que manda un mail. El primer
párrafo tranquiliza sobre un miedo (¿me van a pedir papeles?) que se
resuelve solo apenas tocás el botón. El segundo es la lista completa de
consecuencias, incluida la que hoy no aplica.

**¿REQUIERE CAMBIO DE UX?** Reducción, sobre el mismo bloque de UX #013.

**SOLUCIÓN PROPUESTA:**

```
⚠ Organización pendiente de verificación
Tus torneos no aparecen en las búsquedas. Te mandamos un enlace por correo.
[Verificar organización]
```

«Te mandamos un enlace por correo» es lo único del primer párrafo que el
usuario necesita antes de tocar: le dice qué va a pasar cuando toque.

### UX #015 — Recién publicado: la noticia y el trámite

**PANTALLA:** Publicar torneo, resultado (`PanelPublicarInicial.tsx:82`).

**TEXTO ACTUAL:** «**Tu torneo está publicado.** Se puede compartir por
link y funciona completo: los equipos se inscriben, el fixture y la tabla
andan igual. Lo único que falta es que aparezca en las búsquedas, y para
eso hace falta verificar tu organización.»

**PROBLEMA:** El momento es bueno —acá sí corresponde ofrecer la
verificación— pero el texto se defiende antes de que nadie acuse. Enumera
todo lo que sí funciona para amortiguar lo que no.

**¿REQUIERE CAMBIO DE UX?** No, sólo recorte.

**SOLUCIÓN PROPUESTA:** «**Tu torneo está publicado.** Todavía no aparece
en las búsquedas: para eso, verificá tu organización.» Los dos botones
que ya están debajo hacen el resto.

### UX #016 — Iniciar torneo: el motivo, pegado al botón

**PANTALLA:** Gestionar torneo → Estado (`AccionesEstadoTorneo.tsx:131`).

**TEXTO ACTUAL:** «Para iniciar el torneo primero hace falta confirmar el fixture, más abajo.»

**PROBLEMA:** El botón «Iniciar torneo» ya está `disabled`, así que el
párrafo es lo único que explica por qué. Eso está bien; el problema es
que es una oración con referencia espacial («más abajo») flotando arriba
de una fila de tres botones, sin quedar claro a cuál se refiere.

**¿REQUIERE CAMBIO DE UX?** Sí, mínimo: atar el motivo al botón.

**SOLUCIÓN PROPUESTA:** Acortar a «Falta confirmar el fixture.» y dejarlo
como la única línea sobre la fila. El botón deshabilitado y la línea
quedan juntos.

### UX #017 — Preferencias: el encabezado explica la política de correo

**PANTALLA:** Notificaciones → Preferencias (`preferencias/page.tsx:40`).

**TEXTO ACTUAL:** «Los avisos llegan dentro de la aplicación. Por correo
sólo mandamos lo de tu cuenta: confirmarla, recuperar la contraseña y
verificar una organización.»

**PROBLEMA:** Es correcto y es información real, pero está como bajada de
una pantalla cuya única función es una lista de interruptores. El usuario
que entra a apagar avisos lee primero un párrafo sobre correo.

**¿REQUIERE CAMBIO DE UX?** Reducción.

**SOLUCIÓN PROPUESTA:** «Los avisos llegan dentro de la aplicación. Por
correo sólo mandamos lo de tu cuenta.» La enumeración de los tres casos
se cae: quien recibe uno de esos correos no está en esta pantalla.

### UX #018 — Divisiones: el estado antes del concepto

**PANTALLA:** Gestionar torneo → Divisiones (`PanelDivisiones.tsx:86`).

**TEXTO ACTUAL:** «Todavía es un torneo suelto. Agregar una división lo
agrupa con la nueva bajo un mismo evento — cada una queda como un torneo
completo e independiente.»

**PROBLEMA:** Mezcla el estado actual («es un torneo suelto») con la
explicación de qué hace el botón de abajo, y cierra con una garantía
técnica.

**¿REQUIERE CAMBIO DE UX?** Reducción.

**SOLUCIÓN PROPUESTA:** «Este torneo no forma parte de un certamen.
Agregar una división lo agrupa con la nueva.» El resto —que cada división
es un torneo completo— se ve solo apenas se crea la segunda: aparece en
la lista con su propio enlace a gestión.

### UX #019 — Lista de buena fe: dos reglas al pie

**PANTALLA:** Lista de buena fe (`lista-buena-fe/page.tsx:60`).

**TEXTO ACTUAL:** «El DT no ocupa cupo de jugadores. La lista sigue
abierta durante todo el torneo salvo que el organizador la cierre.»

**PROBLEMA:** La primera mitad es una duda real y frecuente. La segunda
describe un estado que el panel ya muestra: cuando la lista está cerrada,
`PanelListaDeBuenaFe` dice «Este torneo ya cerró las incorporaciones a la
lista de buena fe» y no deja agregar.

**¿REQUIERE CAMBIO DE UX?** No: la mitad sobrante ya está resuelta por
estado.

**SOLUCIÓN PROPUESTA:** Dejar «El DT no ocupa cupo de jugadores.», que
además pertenece al contador de cupo, no al pie de página.

---

## 🟢 MANTENER

No se tocan, y conviene decir por qué, porque el criterio de esta
revisión podría leerse como «menos texto siempre».

**Confirmaciones de acciones destructivas.** Archivar equipo, dar de baja
del torneo, cancelar torneo, la advertencia de que cancelar es definitivo
a diferencia de suspender. Acá el párrafo **es** la interfaz: es lo que
separa a alguien de una acción que no puede deshacer.

**Explicaciones en el momento del intento.** `organizador/gestionar/invitar/page.tsx:19`
—«Solo el Titular puede invitar administradores a la organización»— se
queda, y es el contraejemplo exacto de UX #001: ahí alguien entró a la
URL de invitar sin el permiso. Intentó. Merece saber por qué no puede.
Lo mismo con el bloqueo de archivado cuando hay un torneo en curso.

**Estados vacíos con salida.** Los de fixture, tabla, ranking, torneos
sin resultados de búsqueda. Dicen qué no hay y qué hacer.

**Errores.** Los de ingreso, enlace vencido, contraseña, conexión.

**Ayudas de campo en formularios de alta.** «Elegila de la lista para que
el mapa la ubique bien», «Sin esto no se puede calcular tu ranking»,
«Se muestran en la ficha pública. Sin cargar, el torneo aparece como sin
costo». Son una línea, están pegadas a su campo y responden a la duda
mientras se completa.

**Las tarjetas de visibilidad del perfil.** «Público» / «Restringido» con
su descripción: el usuario está eligiendo entre dos opciones y necesita
saber qué implica cada una antes de elegir.

**Las advertencias post-inscripción.** Categoría que no coincide,
inscripción en otra división: son hechos sobre la solicitud que se acaba
de mandar, no explicaciones de cómo funciona el sistema.

---

## Hallazgos funcionales (no de wording)

Se reportan aparte, sin tocarlos en esta pasada.

**F-01 — Texto de rol duplicado en dos archivos.** ~~«Un Administrador
opera sobre todos los torneos de la organización…» está literal en dos
formularios de invitar administrador.~~ **Resuelto el 04/10**: la frase
salió a `lib/rolesDeOrganizacion.ts` y los dos la importan.

**F-02 — Dos formularios para la misma acción.** ~~Invitar
administrador existe dos veces, con su propio estado, su propio manejo
de «persona nueva, hace falta el nombre» y su propio copy.~~ **Resuelto
el 04/10**, y eran **tres**, no dos: asignar un colaborador tenía la
misma copia contra otra ruta. El envío pasó a
`components/useInvitacionPorCorreo.ts`.

Es un hook y no un componente porque lo que se repetía era la lógica, no
la pantalla: una de las tres es una página con etiquetas visibles y las
otras dos son formularios dentro de un acordeón, con `aria-label` y
`placeholder`. Un componente compartido las habría obligado a verse
igual.

Lo que más importaba de unificar es la lectura del error
`error.detalle[0].campo === 'nombreCompleto'`, que distingue «no
pudimos» de «esta persona todavía no tiene cuenta». Tres copias de algo
tan puntual se separan al primer cambio del backend, y las dos que nadie
toca quedan mostrando el mensaje equivocado.

---

## Segunda pasada, sobre capturas reales

Revisando las pantallas en el teléfono salieron seis textos más que la
primera pasada había conservado y no hacían falta.

### UX #020 — Preferencias: el encabezado y el pie

**PANTALLA:** Notificaciones → Preferencias.

**TEXTO ACTUAL:** «Los avisos llegan dentro de la aplicación. Por correo
sólo mandamos lo de tu cuenta.» (encabezado) y «Si apagás algo, el hecho
no se pierde: sigue en tu actividad. Solo deja de interrumpirte.» (pie).

**PROBLEMA:** La pantalla es una lista de seis interruptores. Tenía un
párrafo arriba y otro abajo, los dos sobre cosas que no se deciden acá:
la política de correo y qué pasa con el historial.

**SOLUCIÓN:** Los dos se van. La lista queda sola.

### UX #021 — «Siempre activo — no se puede apagar.», tres veces

**PANTALLA:** Notificaciones → Preferencias, sección Accionables.

**PROBLEMA:** La misma oración debajo de cada una de las tres filas
accionables. Es una propiedad del grupo, no de cada fila.

**¿REQUIERE CAMBIO DE UX?** Sí: pasarla al título de la sección.

**SOLUCIÓN:** El encabezado pasa a «ACCIONABLES · SIEMPRE ACTIVAS» y las
filas quedan con el nombre y la campana deshabilitada. Una marca en vez
de tres oraciones. El `aria-label` de cada campana ya decía «siempre
activo dentro de la app», así que el lector de pantalla no pierde nada.

### UX #022 — Editar torneo: la ayuda de la imagen y la del relámpago

**PANTALLA:** Gestionar torneo → Configuración → Datos del torneo.

**TEXTO ACTUAL:** «Imagen opcional del torneo (JPG, PNG o WEBP). Sin
cargar, se usa el logo de la organización.» y «Con fecha de fin, un
torneo de hasta 3 días se maneja como relámpago: los plazos de
confirmación se cierran cuando termina.»

**PROBLEMA:** La primera describe un comportamiento que ya se está
viendo: el avatar con la inicial de la organización está ahí, arriba del
texto que lo explica. La segunda es una regla de plazos en un campo de
fecha.

**SOLUCIÓN:** Las dos se van.

### UX #023 — El bloque de visibilidad, fuera de Configuración

**PANTALLA:** Gestionar torneo → Configuración.

**PROBLEMA:** Para quien no es Titular quedaba una caja con un título,
una consecuencia y **ningún botón** —porque el componente de verificar
ya no renderiza nada sin permiso—. Una caja que informa de un problema
que quien la lee no puede resolver.

**SOLUCIÓN:** El bloque se va de esta pantalla. La verificación se sigue
ofreciendo en los tres lugares donde hay algo que hacer: el panel de la
organización, su perfil y el último paso de publicar, que es el momento
en que la noticia importa (D-51). Al sacarlo se cae también la consulta
`obtenerResumenParaPublicar`, que esta pantalla hacía en cada carga sólo
para pintar esa caja.

### UX #024 — Cancelar es definitivo, dicho donde se cancela

**PANTALLA:** Gestionar torneo → Configuración → Interrumpir el torneo.

**TEXTO ACTUAL:** «Cancelar es definitivo — a diferencia de "Suspender",
más arriba, que se puede retomar.»

**PROBLEMA:** Estaba fijo, encima del botón, aunque cancelar ya tiene un
segundo paso de confirmación con motivo obligatorio. La advertencia vivía
en el lugar donde nadie está cancelando todavía.

**¿REQUIERE CAMBIO DE UX?** No: el paso de confirmación ya existe.

**SOLUCIÓN:** Se va de la pantalla y «Cancelar es definitivo.» encabeza
el aviso que ya estaba en el paso de confirmación, que pasa a decir:
«Cancelar es definitivo. Los partidos ya jugados cuentan igual para el
score de los equipos.» Más corto que el anterior y con las dos cosas.
