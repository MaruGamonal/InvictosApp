# Plan de pruebas — antes de abrir INVICTA a usuarios finales

> **Para qué es.** Para poder decir «esto se puede usar» con algo más que tests en verde. Está escrito sobre el commit `03aefdb` del 29 de septiembre de 2026, y cubre lo que la red automática **no** puede cubrir.
>
> **Quién lo ejecuta.** Una persona con un teléfono, una computadora y cuatro casillas de correo reales. No hace falta saber programar salvo en el Bloque 0 y en el Bloque 11.
>
> **Cuánto lleva.** El recorrido completo, con el entorno ya preparado, son unas 12 a 16 horas de trabajo repartidas en tres o cuatro días. El Bloque 7 obliga a esperar plazos reales.

---

## 1. Qué ya está garantizado, y qué no

Conviene tener esto claro antes de empezar, para no gastar tiempo probando lo que ya está probado.

**Lo que la red automática cubre hoy** — 1806 pruebas unitarias en 171 archivos, más 6 suites de integración contra un Postgres real:

| Suite | Qué garantiza |
|---|---|
| `permisos.integration.test.ts` | Que cada rol puede lo que puede y no puede lo que no, contra la base real |
| `cupoInscripciones.integration.test.ts` | Que el cupo no se pasa ni con inscripciones concurrentes |
| `transaccionResultado.integration.test.ts` | Que cargar un resultado es atómico: o entra todo o no entra nada |
| `idempotencia.integration.test.ts` | Que repetir una operación no la duplica |
| `fixtureValidacion.integration.test.ts` | Que un fixture generado es válido en los tres formatos |
| `restriccionesEsquema.integration.test.ts` | Que la base rechaza los datos imposibles |
| Las 1806 unitarias | Cada servicio con sus entradas válidas e inválidas, y los componentes con sus estados |

**Lo que no cubre, y es lo que hay que probar a mano:**

- **No hay una sola prueba end-to-end.** Ninguna abre la aplicación y hace clic. Que el botón lleve a la pantalla correcta, que el formulario mande lo que muestra, que la sesión sobreviva a un refresh: nada de eso está verificado.
- **Ningún correo real se envió nunca en una prueba.** Todo lo de Supabase Auth está mockeado.
- **Ningún archivo real se subió nunca.** Escudos, logos e imágenes de torneo están mockeados.
- **Nada se probó en un teléfono de verdad.** Las mediciones de ancho y de área táctil se hicieron en Chromium con el CSS real, que es mejor que adivinar pero no es un teléfono al sol.
- **Las tareas programadas nunca corrieron contra datos reales en producción.**
- **El entorno de este proyecto no tiene credenciales de Supabase**, así que todas las pantallas que requieren sesión se verificaron por tipos, lint, tests y build. Nunca haciendo clic.

---

## 2. Preparar el entorno

### 2.1 Lo que hace falta tener

| Recurso | Cuántos | Para qué |
|---|---|---|
| Casillas de correo reales | 4 | Organizadora, capitán A, capitán B, jugador. Hace falta que sean reales: se prueba que los mails lleguen |
| Teléfono Android | 1 | El dispositivo objetivo. Ideal: uno de gama baja |
| iPhone | 1 | Safari se comporta distinto, sobre todo con `<dialog>` y con la instalación de PWA |
| Computadora | 1 | Para el Bloque 11 y para mirar Sentry y los logs de Vercel |
| Acceso al panel de Supabase | — | Plantillas de correo, Vault, `pg_cron`, tablas |
| Acceso al panel de Vercel | — | Variables de entorno, logs, despliegues |
| Acceso a Sentry | — | Verificar que los errores y los check-ins llegan |

### 2.2 Cargar los datos demo

El repositorio trae un dataset demo completo. Desde una terminal con `.env` cargado:

```
npm run demo:reset
```

apuntando el `.env` a la base del entorno que corresponda. **Sólo desde una terminal**: la pantalla y la ruta que hacían esto desde el navegador se quitaron.

Deja creadas, entre otras cosas: un torneo en curso, uno con inscripciones abiertas, uno finalizado, un borrador sin datos mínimos, un equipo sin plantel y una cuenta sin confirmar para probar el bloqueo. Las cuentas son `demo.organizador@`, `demo.capitana@`, `demo.capitan@`, `demo.jugador@` y `demo.delegada@`, todas en `demo.invicta.com.ar`, con la contraseña que define `PASSWORD_DEMO`.

**Importante:** los datos demo sirven para recorrer la aplicación con contenido. Pero **los Bloques 1 a 8 hay que hacerlos con cuentas nuevas y reales**, porque lo que se prueba es justamente el nacimiento de cada cosa. Los datos demo son el telón de fondo, no el sujeto.

### 2.3 Dónde probar

Sobre **producción**, no sobre local. Media docena de los problemas más graves de este proyecto (el host canónico, el modo del pooler, el tiempo máximo de una función, la plantilla de correo) sólo se manifiestan en el entorno desplegado. Probar en local da una falsa tranquilidad.

---

## Bloque 0 — Pre-vuelo de infraestructura

Esto va primero porque si algo de acá está mal, todo lo demás da resultados que no significan nada.

| # | Qué verificar | Cómo | Esperado |
|---|---|---|---|
| 0.1 | El despliegue está sano | `GET https://www.invicta.com.ar/api/salud` | 200 |
| 0.2 | Las migraciones corrieron | Tabla `pgmigrations` en Supabase | La última es `1790263186905_verificacion-de-organizacion-solicitada` |
| 0.3 | `DATABASE_URL_MIGRACIONES` apunta al Session pooler | Variables en Vercel | Host `…pooler.supabase.com`, puerto `5432`. **Nunca** la conexión directa: es sólo IPv6 y el build no la alcanza |
| 0.4 | `DATABASE_URL` apunta al pooler en modo transacción | Variables en Vercel | Puerto `6543`. Con `5432` se agota `pool_size: 15` (incidente Sentry 7751157836) |
| 0.5 | El secreto de cron está en Vault | `select name from vault.secrets` | Existe `cron_secret`, y su valor coincide con la variable `CRON_SECRET` de Vercel |
| 0.6 | Las tareas están agendadas | `select jobname, schedule from cron.job` | Aparecen `confirmar-resultados-vencidos` (`0 * * * *`) y `recalcular-score` (`20 4 * * *`). `despachar-correos` **no** debe aparecer: el correo de producto está apagado |
| 0.7 | La tarea apunta al host canónico | `select command from cron.job` | `https://www.invicta.com.ar/…` **con `www`**. Sin `www`, libcurl descarta el header `Authorization` en la redirección y la tarea da 403 |
| 0.8 | La plantilla de Magic Link está actualizada | Supabase → Authentication → Email Templates | Usa `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink` |
| 0.9 | Sentry recibe | Provocar un error a propósito (una ruta inexistente de API) | Aparece en Sentry en menos de un minuto |
| 0.10 | El check-in del cron llega | Esperar a la hora en punto y mirar Sentry Crons | Check-in `ok` |
| 0.11 | El bucket de imágenes existe y es accesible | Supabase → Storage | El bucket de la migración `1789046007002` existe con sus políticas |
| 0.12 | La tarea de correos está desagendada | `select jobname from cron.job` | **No** aparece `despachar-correos`. El correo de producto está apagado a propósito |
| 0.13 | Ninguna variable secreta se fue a Sentry | Buscar en un evento de Sentry | **Nunca** debe aparecer `DATABASE_URL` completa: lleva la contraseña. Sólo se reporta el modo |

---

## Bloque 1 — Cuenta e identidad

| # | Caso | Pasos | Esperado |
|---|---|---|---|
| 1.1 | Registro con correo real | Registrarse con una casilla real | Llega el correo, el enlace abre la app y la cuenta queda confirmada |
| 1.2 | El correo no tarda ni cae en spam | Mirar el reloj y la carpeta de spam | Menos de 2 minutos, bandeja de entrada. Si cae en spam: falta SPF/DKIM |
| 1.3 | Cuenta sin confirmar: bloqueo | Con `demo.sinconfirmar`, intentar crear un equipo | Sale el aviso de cuenta no confirmada con el botón «Reenviar enlace», y **no** crea el equipo |
| 1.4 | Reenviar el enlace | Tocar «Reenviar enlace» | Llega un correo nuevo y funciona |
| 1.5 | Límite de frecuencia del reenvío | Tocar «Reenviar» cinco veces seguidas | Corta con un mensaje claro, no con un error genérico. **Ojo:** el límite vive en memoria por instancia, así que puede no cortar — es un punto abierto conocido |
| 1.6 | Ingreso y persistencia | Ingresar, cerrar la pestaña, volver a abrir | Sigue la sesión |
| 1.7 | Refresh en cada pantalla | F5 en `/inicio`, `/perfil`, un torneo, el panel del organizador | Ninguna vuelve a la pantalla de ingreso |
| 1.8 | Recuperar contraseña | Pedir recuperación, abrir el enlace, cambiarla | Entra con la nueva y **no** con la vieja |
| 1.9 | El enlace de recuperación no se reusa | Abrir dos veces el mismo enlace | La segunda vez lo rechaza |
| 1.10 | Editar el perfil | Cambiar nombre, ciudad y foto | Se refleja en `/perfil` y en el perfil público |
| 1.11 | Subir foto de perfil | Desde el teléfono, sacando una foto en el momento | Sube, se ve, y no queda rotada |
| 1.12 | Visibilidad del perfil | Cambiar la configuración de visibilidad y mirar el perfil desde una sesión ajena | Respeta lo configurado |
| 1.13 | Cerrar sesión | Cerrar sesión y volver atrás con el botón del navegador | No se ve contenido de la sesión anterior |

---

## Bloque 2 — Equipo

| # | Caso | Pasos | Esperado |
|---|---|---|---|
| 2.1 | Crear equipo | Nombre, ciudad y escudo | Se crea; quien lo crea queda como capitán |
| 2.2 | Escudo pesado | Subir una foto de 8 MB desde el teléfono | O la acepta o la rechaza con un mensaje claro. Nunca se queda colgada |
| 2.3 | Sin escudo | Crear equipo sin imagen | Muestra la inicial en el placeholder, no un espacio roto |
| 2.4 | Invitar a alguien que ya tiene cuenta | Buscarlo en la plataforma e invitar | Le llega la notificación in-app |
| 2.5 | Invitar a alguien que no tiene cuenta | Cargar el correo directo | Le llega la invitación y, al registrarse, cae en el equipo |
| 2.6 | Responder la invitación | Aceptar desde la otra cuenta | Aparece en el plantel |
| 2.7 | Rechazar la invitación | Rechazar | No aparece, y el capitán se entera |
| 2.8 | Cancelar una invitación | Cancelarla antes de que respondan | Desaparece de las dos puntas |
| 2.9 | Solicitar ingreso | Desde un jugador, pedir sumarse | Le llega al capitán en «Solicitudes de ingreso» |
| 2.10 | Resolver la solicitud | Aceptar y rechazar una | Ambas resuelven bien y avisan |
| 2.11 | Retirar la solicitud | Retirarla antes de que la resuelvan | Desaparece |
| 2.12 | Cambiar rol | Pasar a alguien a cuerpo técnico | Cambia y se ve en el plantel |
| 2.13 | Quitar integrante | Quitar a alguien | Sale del plantel |
| 2.14 | Archivar equipo | Intentar archivar un equipo que está en un torneo en curso | **Lo bloquea antes de intentarlo**, con el motivo |
| 2.15 | Archivar de verdad | Archivar un equipo sin torneos activos | Archiva |
| 2.16 | Perfil público del equipo | Verlo sin sesión | Se ve, con próximo partido y último resultado |
| 2.17 | La cabecera del equipo | Mirarla en el teléfono | Seguir / Compartir centrados, y el ancho respetado |

---

## Bloque 3 — Organización y verificación

| # | Caso | Pasos | Esperado |
|---|---|---|---|
| 3.1 | Crear organización | Desde una cuenta nueva confirmada | Se crea y queda como dueña |
| 3.2 | Logo | Subir el logo | Se ve en el panel y en el perfil público |
| 3.3 | Sin verificar: tope de torneos | Crear dos torneos y publicar los dos | El primero publica; el segundo lo bloquea explicando D-51 |
| 3.4 | Sin verificar: el torneo nace oculto | Publicar el primero y buscarlo en Descubrir sin sesión | No aparece en el listado, pero sí se abre por enlace directo (`unlisted`) |
| 3.5 | Pedir verificación | Tocar «Verificar organización» | Llega el correo **nombrando la organización** |
| 3.6 | Confirmar la verificación | Abrir el enlace | La pantalla dice qué organización se está confirmando, y queda verificada |
| 3.7 | Después de verificar | Volver a Descubrir | El torneo ya aparece en el listado, y se puede publicar más de uno |
| 3.8 | Sólo la dueña pide verificación | Intentarlo desde una cuenta administradora | Lo rechaza |
| 3.9 | Invitar administrador | Invitar por correo | Llega, acepta, y aparece en el equipo de trabajo |
| 3.10 | Una administradora no gestiona administradoras | Intentar invitar a otra desde la cuenta administradora | Lo rechaza (`ADMIN_NO_PUEDE_GESTIONAR_ADMINS`) |
| 3.11 | Quitar administradora | Quitarla | Pierde el acceso al panel de inmediato |
| 3.12 | Varias organizaciones | Crear una segunda | Aparecen las dos en «Mis organizaciones» |
| 3.13 | Cambiar de organización activa | Cambiar con el selector | El panel entero cambia: resumen, torneos, todo |
| 3.14 | La organización activa no da acceso | Ver el Bloque 11, caso 11.4 | — |
| 3.15 | Perfil público de la organización | Verlo sin sesión | Se ve con sus torneos |

---

## Bloque 4 — Torneo: crear, reglamento, publicar

| # | Caso | Pasos | Esperado |
|---|---|---|---|
| 4.1 | Crear torneo | Con todos los datos | Se crea en borrador |
| 4.2 | Borrador incompleto | Crear sin fecha ni dirección e intentar publicar | Lo bloquea diciendo qué falta |
| 4.3 | Imagen del torneo | Subir la portada | Se ve en la ficha y en la tarjeta de descubrimiento |
| 4.4 | Dirección y geocodificación | Escribir una sede real | El buscador la encuentra y guarda las coordenadas |
| 4.5 | Costos | Cargar costo de inscripción y de planilla | Se ven en la ficha pública |
| 4.6 | Formato: liga | Definir liga | Acepta |
| 4.7 | Formato: grupos + eliminatoria | Definirlo | Acepta y pide lo que necesita |
| 4.8 | Torneo relámpago | Crear uno con ventana de 3 días o menos | Se reconoce como relámpago |
| 4.9 | Reglamento por texto | Escribirlo | Se publica y se ve en la pestaña |
| 4.10 | Reglamento por archivo | Subir un PDF | Se sube y se descarga bien |
| 4.11 | Versionar el reglamento | Publicar una segunda versión | Quedan las dos, y la vigente es la nueva |
| 4.12 | Publicar | Publicar el torneo | Pasa a publicado y aparece donde corresponde |
| 4.13 | Divisiones | Agregar una segunda división al mismo certamen | Se agrupan en Descubrir |
| 4.14 | División duplicada | Agregar dos veces la misma | Lo rechaza |
| 4.15 | Modificar publicado | Cambiar la descripción de un torneo ya publicado | Se puede, y los seguidores se enteran |
| 4.16 | Colaboradores | Invitar a alguien como colaborador del torneo | Entra y ve lo que le corresponde, no más |

---

## Bloque 5 — Inscripciones

| # | Caso | Pasos | Esperado |
|---|---|---|---|
| 5.1 | Abrir inscripciones | Pasar el torneo a inscripciones abiertas | El botón «Inscribir a mi equipo» aparece en la ficha |
| 5.2 | Pedir inscripción | Desde un capitán con equipo | Se envía, y el botón pasa a «Solicitud enviada ✓» — **no** aparece un cartel debajo |
| 5.3 | Al organizador le llega | Mirar el panel de inscripciones | Está la solicitud |
| 5.4 | Aceptar | Aceptarla | El equipo queda inscripto y el capitán se entera |
| 5.5 | Rechazar con división sugerida | Rechazar por división equivocada | Llega el rechazo **con la división sugerida** |
| 5.6 | Aviso de doble división | Pedir inscripción en dos divisiones del mismo certamen | Sale el aviso antes de confirmar |
| 5.7 | Cupo lleno | Llenar el cupo e intentar una más | Va a lista de espera, no se pasa del cupo |
| 5.8 | El contador de cupo | Mirarlo en el panel | Refleja lo real |
| 5.9 | Inscribir a mano | Inscribir un equipo desde el organizador | Entra directo, sin solicitud |
| 5.10 | Lista de buena fe | Confirmar el plantel desde el capitán | Queda confirmada y el organizador la ve |
| 5.11 | Plantel insuficiente | Intentar confirmar con menos jugadores de los necesarios | Lo bloquea explicando |
| 5.12 | Sin cuenta, pedir sumarse | Sin sesión, tocar «Inscribir a mi equipo», registrarse | **Punto abierto conocido:** hoy la solicitud *no* se retoma sola. Verificar que al menos no se pierda el rumbo |
| 5.13 | Sin cuenta, seguir | Sin sesión, tocar «Seguir», registrarse | Al terminar el registro **ya está siguiendo** |
| 5.14 | Dar de baja del torneo | Desde el equipo, darse de baja | Sale, y el fixture se resuelve como corresponde |

---

## Bloque 6 — Fixture y programación

| # | Caso | Pasos | Esperado |
|---|---|---|---|
| 6.1 | Generar fixture de liga | Con 6 equipos | Todos juegan contra todos, sin repetir ni faltar |
| 6.2 | Generar con número impar | Con 7 equipos | Maneja la fecha libre |
| 6.3 | Generar grupos + eliminatoria | Con 8 equipos | Genera los grupos y el cuadro |
| 6.4 | Cuadrangular | Con 4 equipos | Genera lo que corresponde al formato |
| 6.5 | Regenerar | Generar dos veces | O lo impide o avisa qué se pierde. Nunca duplica partidos en silencio |
| 6.6 | Confirmar el fixture | Confirmarlo | Queda firme y los equipos se enteran |
| 6.7 | Programar un partido | Poner fecha, hora, sede y dirección | Se ve en el fixture público |
| 6.8 | Reprogramar | Cambiar fecha y hora de un partido ya programado | Cambia, y **avisa a los dos equipos y a los seguidores** |
| 6.9 | El fixture público | Verlo sin sesión, en el teléfono | Se lee bien, con el ancho respetado |

---

## Bloque 7 — Resultados, tabla y plazos

> Este bloque requiere esperar plazos reales. Conviene arrancarlo el primer día.

| # | Caso | Pasos | Esperado |
|---|---|---|---|
| 7.1 | Cargar resultado | Desde el organizador, 3-1 | Queda cargado y **nace confirmado** (lo cargó el organizador, D-95) |
| 7.2 | Goleadores | Cargar los goleadores del partido | Se ven en Estadísticas |
| 7.3 | Tarjetas | Cargar amarillas y rojas | Se ven en Estadísticas |
| 7.4 | Jugador del partido | Designarlo | Se ve donde corresponde |
| 7.5 | La tabla se actualiza | Mirar la tabla después de cargar | Puntos, diferencia de gol y orden correctos |
| 7.6 | Cargar dos resultados a la vez | Dos personas cargando el mismo partido al mismo tiempo | Uno gana, el otro recibe un error claro. Nunca queda mitad y mitad |
| 7.7 | Ajustar puntos | Restar puntos a un equipo | La tabla lo refleja y se ve la marca de ajuste |
| 7.8 | Confirmación automática | Cargar un resultado como colaborador y esperar 72 h | La tarea horaria lo confirma |
| 7.9 | La tarea no se pasa de tiempo | Mirar los logs de Vercel de esa corrida | Termina dentro del presupuesto y reporta `pendientes` si cortó |
| 7.10 | Torneo relámpago | Terminar un relámpago con resultados sin confirmar | Se confirman al pasar a finalizado, no a las 72 h |
| 7.11 | **Confirmar a mano por el rival** | Buscar dónde confirmar desde el equipo rival | **Punto abierto: hoy no existe la pantalla ni la ruta.** Registrar como falta, no como bug |
| 7.12 | **Disputar un resultado** | Buscar cómo disputar | **Punto abierto: no existe.** La tabla sabe mostrar «provisorio» pero nada puede llegar a ese estado |
| 7.13 | **Partido no disputado** | Buscar cómo registrar un walkover | **Punto abierto: el servicio existe, la pantalla no** |
| 7.14 | Score del equipo | Mirar el score al día siguiente de cargar varios resultados | Se actualizó: la tarea corre a las 4:20 UTC. Un equipo sin resultados en 24 meses queda sin score, no en cero |

---

## Bloque 8 — Interrumpir un torneo

| # | Caso | Pasos | Esperado |
|---|---|---|---|
| 8.1 | Suspender | Suspender un torneo en curso con motivo | Cambia de estado, se ve el motivo, avisa a todos |
| 8.2 | Cancelar | Cancelar con motivo | Ídem, y queda claro que no vuelve |
| 8.3 | Un torneo cancelado no acepta nada | Intentar cargar un resultado | Lo rechaza |
| 8.4 | Finalizar | Llevar un torneo hasta el final | Pasa a finalizado y la tabla queda firme |

---

## Bloque 9 — Descubrimiento y pantallas públicas

| # | Caso | Pasos | Esperado |
|---|---|---|---|
| 9.1 | Descubrir sin sesión | Entrar a `/torneos` sin cuenta | Se ven los torneos publicados de la ciudad elegida |
| 9.2 | Elegir ciudad | Cambiar de ciudad con el selector | Cambia el listado. La ciudad es contexto, nunca se infiere sola (D-90) |
| 9.3 | Buscar ciudad | Escribir una ciudad chica | La encuentra en el catálogo nacional |
| 9.4 | Filtros rápidos | Probar los cuatro | Filtran de verdad |
| 9.5 | Buscar por nombre | Buscar un torneo por nombre | Lo encuentra |
| 9.6 | Certámenes agrupados | Ver un certamen con dos divisiones | Aparece agrupado, no dos veces |
| 9.7 | Ficha pública | Abrir un torneo sin sesión | Se ve todo: ficha, fixture, tabla, estadísticas, reglamento |
| 9.8 | Acciones sin cuenta | Tocar Seguir e Inscribir sin sesión | Llevan a ingresar. Compartir funciona sin cuenta |
| 9.9 | Compartir | Compartir un torneo desde el teléfono | Abre el menú nativo con el enlace correcto |
| 9.10 | Enlace compartido | Abrir el enlace en otro teléfono | Abre el torneo, no la home |
| 9.11 | Cabecera del torneo | Mirarla en el teléfono | Seguir / Inscribir / Compartir centrados y dentro de la cabecera |
| 9.12 | La caja de publicidad | Mirar las tres superficies | **Punto abierto:** hoy se ve un rectángulo punteado que dice «Publicidad». Decidir si se muestra así en el lanzamiento |
| 9.13 | Perfil del jugador | Abrir uno sin sesión | Se ve. **Falta el historial torneo por torneo (UC-38)** |

---

## Bloque 10 — Notificaciones

| # | Caso | Pasos | Esperado |
|---|---|---|---|
| 10.1 | Centro de notificaciones | Entrar a `/notificaciones` | Están las que se generaron en los bloques anteriores |
| 10.2 | Marcar leída | Tocar una | Se marca y el contador baja |
| 10.3 | El enlace lleva bien | Tocar una notificación de cada tipo | Cada una cae en la pantalla correcta |
| 10.4 | El modo no cambia solo | Estando en modo organizador, tocar una notificación de un torneo propio | Queda en **modo organizador**, no lo pasa a jugador |
| 10.5 | El modo no da permisos | Ver Bloque 11, caso 11.5 | — |
| 10.6 | Preferencias | Apagar una categoría y provocar ese aviso | No llega |
| 10.7 | Preferencias por usuario | Dos usuarios con preferencias distintas, mismo evento | A cada uno lo que eligió |
| 10.8 | **No** llega correo de producto | Provocar varias notificaciones accionables y mirar la casilla | **No llega nada.** El correo de producto está apagado por decisión: sólo se manda lo de la cuenta |
| 10.9 | Las tres accionables no se pueden apagar | Ir a Preferencias | Invitaciones, estado de inscripción y cambios de horario aparecen como «Siempre activo», sin interruptor y sin botón de correo |
| 10.10 | Las informativas sí se apagan | Apagar «Resultados de lo que sigo» y provocar uno | No aparece el aviso |
| 10.11 | El correo de cuenta sigue saliendo | Pedir recuperación de contraseña | Llega, como siempre: eso lo manda Supabase y no se tocó |

---

## Bloque 11 — Permisos y seguridad

> Este bloque se hace con la consola del navegador o con `curl`, no con clics. Es el más importante de todos: la regla del proyecto es que **ocultar el botón no alcanza**, porque alguien puede llamar la API directo.

| # | Caso | Cómo | Esperado |
|---|---|---|---|
| 11.1 | Torneo ajeno | `POST /api/torneos/actualizar` con el id de un torneo de otra organización | Lo rechaza |
| 11.2 | Resultado ajeno | `POST /api/partidos/cargar-resultado` en un torneo donde no se tiene rol | Lo rechaza |
| 11.3 | Inscripción ajena | `POST /api/inscripciones/resolver` sobre un torneo ajeno | Lo rechaza |
| 11.4 | **La cookie de organización activa no da acceso** | Editar a mano la cookie de organización activa, poniendo el id de una organización ajena, y recargar el panel | **Cae a la primera organización propia.** Nunca muestra la ajena. Es la prueba más importante del bloque |
| 11.5 | El `modo` de una notificación no otorga nada | Forzar `modo=organizador` en el enlace de una notificación desde una cuenta sin rol | No da acceso a nada. Un valor desconocido cae a `jugador` |
| 11.6 | La bandera de sesión no autoriza | Borrar o falsear la marca de sesión en `sessionStorage` | No cambia nada: cada servicio resuelve la sesión en el servidor |
| 11.7 | Administradora no gestiona administradoras | `POST /api/organizaciones/invitar-administrador` desde una cuenta administradora | `ADMIN_NO_PUEDE_GESTIONAR_ADMINS` |
| 11.8 | Verificación sólo por la dueña | `POST /api/organizaciones/solicitar-verificacion` desde una administradora | Lo rechaza |
| 11.9 | Tareas sin secreto | `POST /api/tareas/confirmar-resultados-vencidos` sin header | 401 |
| 11.10 | Tareas con secreto equivocado | Lo mismo con un secreto inventado | 401 |
| 11.11 | El endpoint que borraba datos ya no existe | `POST /api/admin/sembrar-demo` | 404. Se quitó junto con su pantalla |
| 11.12 | Cuenta sin confirmar por API | Con una cuenta sin confirmar, `POST /api/equipos` | `CUENTA_NO_CONFIRMADA` |
| 11.13 | Subida de archivos | Intentar subir un archivo a un recurso ajeno | Lo rechaza |
| 11.14 | Sin sesión | Cualquier ruta que requiera sesión, sin cookie | 401, nunca 500 |

---

## Bloque 12 — Dispositivo, rendimiento y PWA

| # | Caso | Cómo | Esperado |
|---|---|---|---|
| 12.1 | Ancho en el teléfono | Recorrer todas las pantallas en Android y en iPhone | Ninguna se sale del ancho. Sin scroll horizontal |
| 12.2 | Ancho en la computadora | Abrir la app maximizada | Columna de 480px centrada, con fondo a los costados. **En todas las secciones, también en modo organizador** |
| 12.3 | Área táctil | Intentar tocar los controles más chicos con el pulgar | Nada por debajo de 44px de alto |
| 12.4 | Al sol | Salir afuera con el teléfono | Se lee. Es el escenario real del organizador un domingo |
| 12.5 | Con una mano | Cargar un resultado completo con una sola mano | Se puede sin malabares |
| 12.6 | Conexión lenta | Throttling 3G lento | Las pantallas cargan, los estados de carga se ven, nada queda en blanco |
| 12.7 | Sin conexión | Modo avión en medio de una acción | Da un error claro, no se queda colgada |
| 12.8 | El menú inferior | Recorrer las pantallas mirando el menú | Aparece de una, sin demora, en los dos modos |
| 12.9 | Instalar la PWA | Instalarla en Android y en iPhone | Se instala con el ícono correcto y abre bien |
| 12.10 | `<dialog>` en Safari | Abrir el diálogo de inscripción en iPhone | Se abre y se cierra bien |
| 12.11 | Teclado del teléfono | Abrir los formularios largos | El teclado no tapa el campo que se está completando |
| 12.12 | Rotar la pantalla | Rotar en medio de un formulario | No se pierde lo escrito |

---

## Bloque 13 — Datos y recuperación

| # | Caso | Cómo | Esperado |
|---|---|---|---|
| 13.1 | Backup | Verificar en Supabase que los backups automáticos están activos | Activos, con retención conocida |
| 13.2 | Restaurar | Probar una restauración a un proyecto aparte | Se puede, y se sabe cuánto tarda |
| 13.3 | Datos demo separables | Verificar que todo lo demo está bajo `@demo.invicta.com.ar` | Sí, y `limpiarDemo` no toca nada más |
| 13.4 | Sacar los datos demo | Correr la limpieza antes de abrir a usuarios reales | La base queda sin torneos ni equipos `[DEMO]` |
| 13.5 | Una migración nueva no rompe el deploy | Crear una migración de prueba con `npm run migrate:create` y desplegar | Corre. **Nunca** escribir el timestamp a mano: `node-pg-migrate` rechaza una migración fuera de orden y el deploy falla |

---

## Criterios de salida

Se puede abrir a usuarios finales cuando:

1. **Todo el Bloque 0 está en verde.** Sin excepción. Un fallo acá invalida el resto.
2. **Todo el Bloque 11 está en verde.** Sin excepción. Un permiso que se puede saltar es una falla de seguridad, no un bug de prioridad media.
3. **Los Bloques 1 a 6 no tienen ningún fallo que impida completar el recorrido.** Un capitán tiene que poder crear su equipo, inscribirlo y ver el fixture sin ayuda.
4. **El Bloque 7 cierra el ciclo de un partido.** Hoy no cierra: faltan los casos 7.11, 7.12 y 7.13, que son puntos abiertos de desarrollo, no bugs. **Esto es lo que hay que decidir antes de abrir**: o se construyen, o se abre sabiendo que el organizador carga resultados y nadie los puede objetar.
5. **El Bloque 10 avisa dentro de la aplicación, y eso es lo esperado.** El despacho por correo está construido pero **apagado por decisión** (punto 2 de los abiertos): el único mail que sale es el de la cuenta. Lo que hay que verificar acá es que el centro de notificaciones no se pierda nada, porque ahora es el único canal.
6. **El Bloque 12 pasa en un teléfono de gama baja, al sol.** No en el emulador.

---

## Cómo registrar lo que aparezca

Para cada hallazgo, lo mínimo que sirve:

- **Qué caso** (el número de este plan).
- **Qué esperaba y qué pasó**, en una línea cada uno.
- **Cómo repetirlo**, con los datos exactos: qué cuenta, qué torneo, qué equipo.
- **Dónde**: teléfono y navegador, o computadora y navegador.
- **Cuándo**, con hora — para poder cruzarlo con Sentry y con los logs de Vercel.
- **Captura**, si es visual.

Y la clasificación:

| Clase | Qué es | Qué hacer |
|---|---|---|
| **Bug** | Algo que debería andar y no anda | Se arregla antes de abrir |
| **Falta** | Algo que nunca se construyó | Va al documento de puntos abiertos, se decide si se construye |
| **Roce** | Anda, pero cuesta usarlo | Se anota, se prioriza después |
| **Duda** | No está claro qué debería pasar | Se resuelve como decisión de producto, no como bug |

La distinción entre **bug** y **falta** importa: los casos 7.11, 7.12, 7.13, 9.12, 9.13, 10.8 y 5.12 de este plan van a fallar, y van a fallar porque son faltas conocidas. Anotarlas como bugs hace perder tiempo buscando un error que no está.
