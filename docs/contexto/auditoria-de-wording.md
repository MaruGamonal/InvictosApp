# Auditoría de wording — INVICTA

> **Alcance.** Todo el texto que puede llegar a los ojos de un usuario final, sobre el commit `1eef9cd` del 30 de septiembre de 2026. No es una corrección de ortografía: el criterio fue que la aplicación le hable al usuario y no al equipo que la construye.
>
> **Método.** Se extrajo automáticamente el texto visible de `src/` —nodos de texto JSX, props de texto (`mensaje`, `titulo`, `placeholder`, `label`, `aria-label`, `alt`…), literales de mensajes, el catálogo de errores y el de etiquetas—, descartando comentarios, `className`, rutas y nombres de variables. Sobre eso se revisó a mano, pantalla por pantalla. El extractor quedó en el scratchpad de la sesión; no se commiteó porque es una herramienta de una sola vez.

---

## RESUMEN

| | |
|---|---|
| Textos extraídos | **927** |
| Textos que llegan a una pantalla | **589** |
| Problemas encontrados | **31** |
| Corregidos | **30** |
| Pendientes | **1** |

| Severidad | Cantidad | Corregidos |
|---|---|---|
| **CRÍTICO** — información interna que no debería llegar al usuario | 4 | 4 |
| **ALTO** — wording que puede provocar una acción incorrecta | 4 | 4 |
| **MEDIO** — inconsistencia terminológica o texto innecesariamente complejo | 15 | 15 |
| **BAJO** — claridad y estilo | 8 | 7 |

Archivos tocados: **46** (28 de producto, 6 de pruebas que afirmaban sobre el copy viejo, más los que arrastró la unificación de términos).

---

## INFORMACIÓN INTERNA EXPUESTA

Cuatro hallazgos. Dos corregidos, dos que necesitan una decisión tuya porque la corrección no es de texto.

### WORDING #001 — CRÍTICO ✅ corregido

**Pantalla:** Gestión del torneo → Fixture (al generar una eliminación directa con una cantidad de equipos que no es potencia de 2).

**Texto actual:** «La eliminación directa del MVP necesita una cantidad de equipos que sea potencia de 2 (2, 4, 8, 16...).»

**Problema:** dice **MVP**. Le cuenta al organizador que está usando un producto mínimo viable y que esa limitación es una etapa de desarrollo, no una regla del formato.

**Acción:** REEMPLAZAR

**Texto nuevo:** «La eliminación directa necesita una cantidad de equipos que sea potencia de 2: 2, 4, 8, 16…»

---

### WORDING #002 — CRÍTICO ✅ corregido: la pantalla se quitó

**Pantalla:** `/admin/sembrar-demo` — **una pantalla pública, sin ningún control de acceso**, alcanzable escribiendo la URL.

**Texto actual:**
- «Carga torneos y equipos de prueba en la base de datos conectada a esta app — **la de producción**, si estás viendo esto en tu dominio de Vercel.»
- Una etiqueta de campo que dice **`CRON_SECRET`**.
- «El mismo valor que ya tenés cargado en **Vercel → tu proyecto → Settings → Environment Variables**.»
- «Andá a **/torneos** y elegí una de las ciudades de la demo.»

**Problema:** es el peor hallazgo del inventario. Un desconocido que escriba esa URL se entera de que existe una herramienta que escribe sobre la base de producción, de **cómo se llama el secreto que la protege** y de dónde está guardado. Es información interna, y además reduce el trabajo de quien quiera adivinarlo.

**Acción:** ELIMINAR.

**Texto nuevo:** [ninguno]

Primero se le sacó el texto que describía la infraestructura. Después, al confirmarse que el camino desde el navegador ya no hace falta, **se borraron la pantalla y la ruta de API que usaba**. El dataset de ejemplo se siembra desde la terminal con `npm run demo:reset`, que nunca estuvo expuesto.

---

### WORDING #003 — CRÍTICO ✅ corregido: fuera de desarrollo no existe

**Pantalla:** `/catalogo` — también **pública y sin control de acceso**.

**Texto actual:** «Catálogo de componentes — INVICTA», «Tokens de color», y debajo todos los componentes del sistema de diseño con sus variantes y todos los estados internos con su etiqueta.

**Problema:** es herramienta interna de diseño servida como si fuera una pantalla del producto. Su propio comentario en el código lo dice: «No es una pantalla del producto». No hay texto que corregir — el problema es que existe para cualquiera.

**Acción:** ELIMINAR de producción.

**Texto nuevo:** [ninguno]

La página devuelve 404 cuando `NODE_ENV === 'production'`. En desarrollo sigue entera, que es donde sirve: mirar un componente en sus variantes sin levantar nada aparte. Hay una prueba de arquitectura (`src/app/catalogo/pagina.arquitectura.test.ts`) que falla si el candado se pierde en un merge — perderlo no rompe nada visible, simplemente la pantalla vuelve a estar para cualquiera.

---

### WORDING #004 — CRÍTICO ✅ corregido antes de esta auditoría

**Pantalla:** Preferencias de notificación.

**Texto actual:** «Dos canales: dentro de la app y correo. **WhatsApp llega en la segunda etapa**, solo para reprogramaciones.»

**Problema:** el ejemplo exacto que planteaste. Expone el roadmap y le promete al usuario algo que no puede usar.

**Acción:** REEMPLAZAR

**Texto nuevo:** «Los avisos llegan dentro de la aplicación. Por correo sólo mandamos lo de tu cuenta: confirmarla, recuperar la contraseña y verificar una organización.»

> Corregido en el commit `b0163db`, junto con el apagado del correo de producto. Queda anotado acá porque es el caso testigo de la categoría.

---

## HALLAZGOS ALTOS

### WORDING #005 — ALTO ✅ corregido

**Pantalla:** Inicio (modo jugador).

**Texto actual:** «1 resultado para confirmar o disputar.» / «N resultados para confirmar o disputar.»

**Problema:** **le pide al usuario una acción que la aplicación no puede hacer.** No existe pantalla ni ruta para confirmar ni para disputar un resultado (son los puntos 5 y 6 de los puntos abiertos). El aviso además no lleva a ningún lado: no es un enlace. La persona lee que tiene algo pendiente, busca dónde hacerlo, y no lo encuentra.

**Acción:** REEMPLAZAR por el hecho, sin la acción imposible.

**Texto nuevo:** «Cargaron el resultado de un partido tuyo.» / «Cargaron el resultado de N partidos tuyos.»

> Cuando se construyan los puntos 5 y 6, este mensaje tiene que recuperar su llamada a la acción y volverse un enlace.

---

### WORDING #006 — ALTO ✅ corregido

**Pantalla:** Equipo de trabajo de la organización (al intentar quitar a quien la creó).

**Texto actual:** «El rol de titular no se asigna ni se quita desde acá.»

**Problema:** **«titular» es el nombre de la columna** (`usuario_titular_id`), no una palabra del producto. Y «desde acá» no dice desde dónde sí, así que la persona se queda buscando otra pantalla que no existe.

**Acción:** REEMPLAZAR

**Texto nuevo:** «No se puede quitar a quien creó la organización.»

---

### WORDING #007 — ALTO ✅ corregido

**Pantallas:** Publicar torneo · Configuración del torneo (dos mensajes distintos) · Panel del organizador (dos mensajes distintos).

**Problema:** **cinco redacciones distintas del mismo estado** — «tu organización no está verificada»— repartidas por tres pantallas, cada una eligiendo qué contar y en qué orden. Dos de ellas en la misma pantalla, una debajo de la otra. La persona que las lee en secuencia no sabe si le están diciendo cinco cosas o la misma cinco veces.

**Acción:** UNIFICAR en dos frases, una por situación.

**Texto nuevo:**
- Sin verificar, torneo publicable: «Tu organización no está verificada: el torneo se comparte por enlace y funciona completo, pero no aparece en las búsquedas.»
- Sin verificar y ya con uno publicado: «Ya tenés un torneo publicado. Verificá tu organización para publicar más de uno a la vez.»

---

### WORDING #008 — ALTO ✅ corregido

**Pantalla:** Solicitudes de ingreso al equipo.

**Texto actual:** «pide ser Jugador»

**Problema:** **muestra el nombre interno del rol**, en mayúscula en medio de la frase, como si «Jugador» fuera un objeto del sistema.

**Acción:** REEMPLAZAR

**Texto nuevo:** «quiere sumarse al plantel»

---

## HALLAZGOS MEDIOS — consistencia terminológica

Todos corregidos. Cada uno se resolvió eligiendo el término que **ya dominaba** el texto de la aplicación, no inventando uno nuevo.

| # | Problema | Antes | Ahora | Ocurrencias |
|---|---|---|---|---|
| 009 | Dos palabras para lo mismo | «email» / «correo» | **correo** (ganaba 16 a 11) | 9 |
| 010 | Dos palabras para lo mismo | «link» / «enlace» | **enlace** (ganaba 19 a 4) | 5 |
| 011 | Voz partida en los errores | «No se pudo…» / «No pudimos…» | **No pudimos…** | 22 |
| 012 | Construcción incorrecta, y conviviendo con la correcta en la misma pantalla | «cerca tuyo» / «cerca de vos» | **cerca de vos** | 4 |
| 013 | Mayúscula inconsistente en el mismo rol | «Invitar Administrador» / «Invitar administrador» | **administrador** | 6 |
| 014 | Dos nombres del mismo modo | «Panel de Organizador» / «modo organizador» | **Modo organizador** | 1 |
| 015 | Dos sustantivos para lo que alguien manda y otro resuelve | «Pedido enviado ✓» / «Solicitud enviada ✓» | **Solicitud** | 2 |
| 016 | Marca de obligatoriedad inconsistente | «Categoría de género · obligatoria» junto a «(opcional)» | sin sufijo; sólo se marca lo opcional | 1 |

---

## HALLAZGOS BAJOS

### WORDING #017 — ✅ La descripción del producto hablaba como un folleto

**Dónde:** metadatos del sitio (`layout.tsx`) y descripción de la PWA (`manifest.ts`) — se ve en los resultados de búsqueda y al instalar la aplicación.

**Antes:** «Plataforma de gestión y descubrimiento de torneos de fútbol amateur.»

**Ahora:** «Torneos de fútbol amateur: encontralos, sumate y seguí la tabla.»

Estaban además **desincronizadas entre sí**; ahora dicen lo mismo.

### WORDING #018 — ✅ Estadísticas públicas explicaban cómo se cargan los datos

**Antes:** «Todavía nadie cargó goleadores ni tarjetas de este torneo — **es un dato opcional al cargar cada resultado**.»

**Problema:** quien ve esa pantalla es un visitante que no puede cargar nada. Explicarle el flujo del organizador es ruido.

**Ahora:** «Todavía no hay goleadores ni tarjetas en este torneo.»

### WORDING #019 — ✅ Una frase que se comía a sí misma

**Antes:** «Todo acá es opcional — nada de esto te bloquea nada.» · **Ahora:** «Todo esto es opcional.»

### WORDING #020 — ✅ Los roles se nombraban en masculino

**Dónde:** gestión del plantel.

**Antes:** «Hacer capitán» · «¿Transferir la capitanía a esta persona? Vos dejás de ser capitán.» · «Hacer delegado» · «designar a otra persona como capitán»

**Problema:** la mitad del catálogo son torneos femeninos. El botón que le pasa la capitanía a una jugadora decía «Hacer capitán».

**Ahora:** «Pasar la capitanía» · «¿Pasarle la capitanía a esta persona? Vos dejás de tenerla.» · «Pasar a delegado/a» · «tenés que pasarle la capitanía a otra persona»

### WORDING #021 — ✅ Un aviso describía el sistema, no a las personas

**Antes:** «Este cambio notifica a inscriptos y seguidores.» / «Este cambio no notifica.»

**Ahora:** «Esto les avisa a los equipos inscriptos y a quienes siguen el torneo.» / «Esto no le avisa a nadie.»

### WORDING #022 — ✅ Concordancia

**Antes:** «Ya habilitado en otro equipo» · **Ahora:** «Ya está en otro equipo de este torneo»

### WORDING #023 — ✅ El canal de notificación en el catálogo de etiquetas

**Antes:** `email → «Email»` · **Ahora:** `email → «Correo»`

---

## LO QUE SE REVISÓ Y ESTÁ BIEN

Vale decirlo, porque es la mayor parte:

- **Los códigos de error nunca se muestran.** `errores.ts` guarda un `codigo` para el código y un `mensaje` para la persona, y las 14 pantallas que ramifican por código lo usan para decidir a dónde ir, nunca para imprimirlo. No hay un solo «Error 403» ni un nombre de tabla en pantalla.
- **Los estados vacíos ya explicaban qué falta y qué hacer**, en vez del genérico «No hay información disponible». «Todavía no hay fixture generado para este torneo. Seguilo desde la ficha y te avisamos cuando esté.» es el patrón, y se repite bien.
- **Los toasts son breves y específicos**: «Equipo creado», «Resultado cargado», «Escudo actualizado». No hay ni un «La operación fue realizada correctamente».
- **Los botones nombran la acción**: «Crear torneo», «Publicar reglamento», «Confirmar baja del torneo», «Verificar organización». Los «Continuar» que hay son pasos reales de un flujo de varios pasos.
- **El voseo es parejo** en toda la aplicación.
- **El estado vive en el control que lo produjo**: «Seguir» → «Siguiendo ✓», «Inscribir a mi equipo» → «Solicitud enviada ✓».

---

## DICCIONARIO DE TERMINOLOGÍA

| Usar siempre | En vez de |
|---|---|
| **correo** | email, mail, e-mail |
| **enlace** | link |
| **solicitud** | pedido, petición, request |
| **organización** | organizador (como entidad), entidad, institución, liga |
| **modo organizador** / **modo jugador** | panel de organizador, vista de administrador, rol |
| **administrador** (minúscula) | Administrador, Admin |
| **plantel** | roster, lista de jugadores |
| **equipo de trabajo** | staff, miembros de la organización |
| **cerca de vos** | cerca tuyo |
| **No pudimos…** | No se pudo…, Error al…, Se ha producido un error |
| **Seguir / Siguiendo / seguidores** | suscribirse, favoritos, agregar |
| **verificar organización** | validar, aprobar, habilitar |
| **publicar** | activar, dar de alta, habilitar |
| **jugador del partido** | MVP del partido, figura |
| **quien creó la organización** | titular, owner, dueño |
| **pasar la capitanía** | hacer capitán, transferir titularidad |
| **partido no disputado** | walkover, WO |

**Términos que se mantienen** porque son del fútbol y no del software: **fixture**, **plantel**, **lista de buena fe**, **certamen**, **división**, **cupo**, **presentación** (por ganar sin jugar), **DT**.

---

## PANTALLAS REVISADAS

**Cuenta e identidad** — Ingresar · Crear cuenta · Cuenta creada · Confirmar enlace · Error de enlace · Recuperar acceso · Elegir contraseña nueva · Confirmar cambio de contraseña · Mi perfil · Editar perfil · Perfil público de jugador

**Notificaciones** — Centro de notificaciones · Preferencias de notificación

**Equipos** — Buscar equipos · Crear equipo · Perfil público del equipo · Gestionar equipo · Plantel · Invitar integrante · Solicitudes de ingreso · Responder invitación · Ranking del equipo

**Torneos (público)** — Descubrir torneos · Ficha del torneo · Fixture · Tabla de posiciones · Estadísticas · Reglamento

**Torneos (organizador)** — Crear torneo · Reglamento inicial · Publicar · Resumen · Equipos · Fixture · Programar partidos · Resultados · Configuración · Divisiones · Colaboradores · Administradores · Suspender/Cancelar

**Torneos (equipo participante)** — Inscribir equipo · Lista de buena fe · Dar de baja del torneo

**Organizaciones** — Modo organizador · Mis organizaciones · Crear organización · Equipo de trabajo · Invitar administrador · Perfil público de la organización · Verificación

**Inicio y transversales** — Inicio (jugador) · Inicio (organizador) · Feed de actividad · Avisos de cuenta · Navegación inferior · Cabecera de modo · Estados vacíos · Toasts · Diálogos de confirmación

**Internas, no del producto** — Catálogo de componentes · Sembrar datos de ejemplo

---

## CAMBIOS REALIZADOS

**Producto (40 archivos)**

`src/app/layout.tsx` · `src/app/manifest.ts` · `src/app/inicio/page.tsx` · `src/app/page.tsx` · `src/app/perfil/editar/FormularioEditarPerfil.tsx` · `src/app/recuperar-password/FormularioRecuperacion.tsx` · `src/app/restablecer-password/FormularioNuevaPassword.tsx` · `src/app/equipo/crear/FormularioCrearEquipo.tsx` · `src/app/equipo/[id]/gestionar/BotonArchivarEquipo.tsx` · `src/app/equipo/[id]/gestionar/FilaIntegranteGestion.tsx` · `src/app/equipo/[id]/gestionar/FilaInvitacionPendiente.tsx` · `src/app/equipo/[id]/gestionar/FormularioEditarEquipo.tsx` · `src/app/equipo/[id]/gestionar/invitar/FormularioInvitarIntegrante.tsx` · `src/app/equipo/[id]/gestionar/solicitudes/PanelSolicitudesIngreso.tsx` · `src/app/equipo/[id]/invitacion/BotonesResponderInvitacion.tsx` · `src/app/torneos/page.tsx` · `src/app/torneo/crear/FormularioCrearTorneo.tsx` · `src/app/torneo/[id]/(publico)/estadisticas/page.tsx` · `src/app/torneo/[id]/crear/publicar/page.tsx` · `src/app/torneo/[id]/crear/publicar/PanelPublicarInicial.tsx` · `src/app/torneo/[id]/crear/reglamento/FormularioReglamentoInicial.tsx` · `src/app/torneo/[id]/equipo/[equipoId]/baja/PanelDarDeBaja.tsx` · `src/app/torneo/[id]/equipo/[equipoId]/lista-buena-fe/PanelListaDeBuenaFe.tsx` · `src/app/torneo/[id]/gestionar/configuracion/page.tsx` · `src/app/torneo/[id]/gestionar/FormularioEditarTorneo.tsx` · `src/app/torneo/[id]/gestionar/PanelAdministradores.tsx` · `src/app/torneo/[id]/gestionar/PanelCancelarTorneo.tsx` · `src/app/torneo/[id]/gestionar/PanelColaboradores.tsx` · `src/app/torneo/[id]/gestionar/PanelDivisiones.tsx` · `src/app/torneo/[id]/gestionar/PanelProgramarPartidos.tsx` · `src/app/organizador/gestionar/page.tsx` · `src/app/organizador/gestionar/ResumenOrganizacion.tsx` · `src/app/organizador/gestionar/invitar/FormularioInvitarAdministrador.tsx` · `src/app/organizador/gestionar/invitar/page.tsx` · `src/components/BotonPedirSumarme.tsx` · `src/components/avisos/Avisos.tsx` · `src/lib/errores.ts` · `src/lib/etiquetas.ts` · `src/services/fixture/_bracket.ts`

**Pruebas que afirmaban sobre el copy viejo (6 archivos)**

`BotonPedirSumarme.test.tsx` · `avisos/Avisos.test.tsx` · `FilaIntegranteGestion.test.tsx` · `FormularioCrearEquipo.test.tsx` · `PanelAdministradores.test.tsx` · `PanelListaDeBuenaFe.test.tsx`

---

## PROBLEMAS PENDIENTES

### 1. Ninguno de los dos pendientes de acceso queda abierto

`/admin/sembrar-demo` se borró, con su ruta de API. `/catalogo` devuelve 404 fuera de desarrollo. Las dos decisiones están registradas arriba, en sus hallazgos.

### 2. El aviso de Inicio tiene que volver a ser accionable

«Cargaron el resultado de un partido tuyo.» es lo honesto hoy, pero es un callejón sin salida: no lleva a ningún lado. Cuando existan las pantallas de confirmar y disputar (puntos 5 y 6 de los puntos abiertos), este texto vuelve a ser una llamada a la acción y un enlace.

### 3. Sin verificar en la aplicación real

Todo esto se verificó por tipos, lint, las 1854 pruebas unitarias, las 55 de integración y la compilación. **Ninguno de estos textos se leyó en una pantalla corriendo**: este entorno no tiene credenciales de Supabase, así que nada que requiera sesión se puede abrir. Los que conviene mirar con los ojos, porque cambiaron de largo y pueden romper un renglón: la fila de «Pasar la capitanía» en el plantel, los avisos de organización sin verificar en Configuración del torneo, y el aviso de Inicio.
