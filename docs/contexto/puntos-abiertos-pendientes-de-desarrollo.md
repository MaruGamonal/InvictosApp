# Puntos abiertos — lo que falta desarrollar

> **Qué es esto.** El inventario de todo lo que está pendiente en INVICTA al 29 de septiembre de 2026, sobre el commit `03aefdb`. No es una lista de deseos: cada punto salió de leer el código, no la documentación. Donde digo "no existe", verifiqué que no existe; donde digo "existe a medias", digo exactamente qué mitad.
>
> **Cómo leer la severidad.** `Bloqueante` = si se abre la app a usuarios finales con esto así, algo se rompe o alguien se queda esperando algo que nunca llega. `Importante` = no rompe nada, pero el producto queda cojo y se nota. `Puede esperar` = está decidido que es de una etapa posterior, o el problema todavía no existe por volumen.

---

## Resumen en una tabla

| # | Punto | Severidad | Estado hoy |
|---|---|---|---|
| 1 | Publicidad: el contenedor está, la publicidad no | Importante | **Decidido**: la caja desaparece si no hay anuncio. Sin hacer |
| 2 | El canal `email` de notificaciones no despacha nada | ~~Bloqueante~~ | **Resuelto** (`30/09`). Faltan dos variables en Vercel |
| 3 | `recalcular-score` no está agendada en `pg_cron` | **Bloqueante** | La ruta existe, nada la llama. Siguiente en la fila |
| 4 | `recalcularScore` no tiene lote ni presupuesto de tiempo | Importante | Recorre todos los equipos de una |
| 5 | Confirmar / disputar resultado por el equipo rival (T29) | **Bloqueante** | Servicio sí, ruta y pantalla no |
| 6 | Registrar partido no disputado (walkover, suspendido) | **Bloqueante** | Servicio sí, ruta y pantalla no |
| 7 | El límite de frecuencia vive en memoria del proceso | Importante | Por instancia, no compartido |
| 8 | `/api/admin/sembrar-demo` está en producción y borra datos | **Bloqueante** | Protegido por `CRON_SECRET` |
| 9 | Historial del jugador torneo por torneo (UC-38) | Importante | No existe |
| 10 | "Pedir sumarme sin cuenta" no se retoma tras registrarse | Importante | Sólo "seguir" se retoma |
| 11 | Notificaciones push (Web Push) | Puede esperar | No existe el canal |
| 12 | Monetización: planes, pagos, comisión | Puede esperar | Etapas 2 a 4, no empezadas |
| 13 | Verificación avanzada de organización (`trusted`) | Puede esperar | Sólo la básica por email |
| 14 | Despublicación automática por inactividad (D-80) | Puede esperar | Decidido no construir en MVP |
| 15 | Estados `rechazada` / `suspendida` de organización, `tipo`, seguir a una organización | Puede esperar | Propuesta sin empezar |
| 16 | Tema oscuro (D-71) | Puede esperar | Decidido para después |
| 17 | No hay pruebas end-to-end | Importante | 1806 unitarias, 6 de integración, 0 e2e |
| 18 | Plantilla de mail de Supabase sin actualizar | **Bloqueante** | Paso manual fuera del repo |
| 19 | Comentarios desactualizados en el código | Puede esperar | Dos que mienten |

---

## 1. Publicidad: el contenedor está, la publicidad no

**Dónde está hoy.** `src/components/ContenedorPublicidad.tsx` es una caja con borde punteado que dice «Publicidad». Nada más. Está colocada en las tres superficies que fija D-63:

- `src/app/torneos/page.tsx:299` — en el listado de descubrimiento, en una posición fija de la lista.
- `src/app/torneo/[id]/(publico)/page.tsx:279` — en la ficha del torneo.
- `src/app/torneo/[id]/(publico)/fixture/page.tsx:115` — arriba del fixture.

Y **no está** en ningún flujo de tarea del organizador ni en la inscripción del capitán, que es exactamente lo que D-63 pide.

**Qué falta.** Todo lo que hace que un banner sea un banner:

1. **Decidir de dónde sale el anuncio.** Hoy no hay red (AdSense, una red regional) ni tabla de sponsors propios. Las etapas 1 y 2 de D-31 son dos implementaciones distintas y no comparten casi nada: la red es un script de terceros, el sponsor directo es una entidad nuestra con imagen, enlace, vigencia y zona.
2. **Si es red:** el script de terceros, el consentimiento de cookies que eso arrastra (y hoy la app no tiene banner de consentimiento), y medir cuánto pesa en un teléfono barato — que es el dispositivo objetivo.
3. **Si es sponsor directo:** tabla `sponsor` o similar, subida de imagen (ya hay bucket de imágenes: `db/migrations/1789046007002_bucket-de-imagenes.js`), vigencia, segmentación por ciudad, y una pantalla de administración para cargarlos.
4. **Medición.** Impresiones y clics por superficie. Sin esto no se le puede vender nada a nadie ni saber si la etapa 1 genera.
5. **Qué pasa cuando no hay anuncio.** Hoy la caja vacía se muestra igual, con la palabra «Publicidad». Con usuarios reales eso es ruido: hay que decidir si colapsa a cero alto o si se muestra algo propio.

**Por qué no es urgente.** D-02 manda: sin torneos publicados y tráfico, no hay nada que vender. La publicidad se construye cuando el descubrimiento tiene contenido, no antes. Pero la caja vacía sí conviene resolverla antes de abrir a usuarios: mostrar un rótulo «Publicidad» sobre un rectángulo vacío le dice al usuario que algo está roto.

---

## 2. El canal `email` de notificaciones no despacha nada

> **RESUELTO el 30/09/2026.** Al final de esta sección, qué se construyó
> y qué queda pendiente fuera del repositorio.

**Era lo más grave del inventario.**

`src/services/notificaciones/notificar.ts` aplica la regla de canal de D-53: las notificaciones accionables se registran en dos canales, `in_app` y `email`; las demás sólo `in_app`. Escribe una fila en `notificacion` por cada canal, respetando las preferencias por usuario de UC-47.

**Pero no había nada que leyera las filas con `canal = 'email'` y mandara el correo.** No había proveedor de email transaccional **en el proyecto**: ni Resend, ni SendGrid, ni nodemailer, ni una Edge Function. `listarNotificaciones.ts:66` filtra explícitamente `canal = 'in_app'`, así que esas filas no se veían en ningún lado.

> **Ojo con una confusión fácil, que tuve yo al auditar.** La cuenta de Resend **ya existía**, configurada como SMTP de Supabase Auth — pero en el panel de Supabase, no en el repositorio, así que no aparece en ninguna línea de código. Son dos caminos distintos al mismo proveedor, y conviene tenerlos separados en la cabeza:
>
> | | Correos de autenticación | Correos de producto |
> |---|---|---|
> | Cuáles | Confirmar cuenta, recuperar contraseña, verificar organización, invitaciones | Los 12 tipos accionables de notificación |
> | Quién arma el mail | **Supabase**, con sus plantillas | Nosotros, en `_contenidoDelCorreo.ts` |
> | Cómo llega a Resend | **SMTP** (`smtp.resend.com`), configurado en el panel de Supabase | **API HTTP** (`api.resend.com/emails`), desde `lib/correo.ts` |
> | Está en el repositorio | No | Sí |
>
> Supabase sólo manda sus correos de autenticación: no se le puede pedir que mande «te invitaron a un equipo». De ahí el camino nuevo.

Los únicos correos que hoy salen de verdad son los de Supabase Auth: confirmación de cuenta, recuperación de contraseña, verificación de organización e invitaciones. Todos pasan por `signInWithOtp` o `inviteUserByEmail`.

**Qué significa en la práctica.** A un capitán le llega una invitación a un equipo y la única forma de enterarse es entrar a la app. Una inscripción aprobada, un partido reprogramado, un resultado cargado que hay que confirmar: nada de eso sale de la aplicación. Para un producto que usa gente que entra una vez por semana, eso es la diferencia entre que el torneo funcione y que no.

**Qué falta.**

1. Elegir proveedor y dar de alta el dominio (SPF, DKIM, DMARC — sin eso los correos van a spam).
2. Un despachador: o bien `notificar` manda en el momento, o bien una tarea agendada toma las filas `pending` de canal `email` y las envía. La segunda opción es mejor: sobrevive a un fallo del proveedor y deja reintentos.
3. Plantillas por tipo de notificación, en castellano, con el enlace profundo correcto (ya existe `src/app/notificaciones/_enlace.ts`, que resuelve a dónde lleva cada tipo y en qué modo).
4. Marcar la fila como enviada o fallida — la columna de estado ya existe.
5. Baja de suscripción por categoría, enganchada a las preferencias que ya están en `/notificaciones/preferencias`.

### Qué se construyó

Se eligió el **despacho híbrido**: el correo sale en el momento, y una tarea agendada recoge lo que falló. Proveedor: **Resend**, detrás de una interfaz propia (`src/lib/correo.ts`) — cambiar de proveedor toca un archivo.

| Pieza | Dónde |
|---|---|
| Migración: `failed` como cuarto estado, `intentos`, `fecha_envio`, `ultimo_error`, e índice parcial sobre lo pendiente de email | `db/migrations/1790734699355_despacho-de-correos-de-notificacion.js` |
| El proveedor, con la clasificación de qué se reintenta y qué no | `src/lib/correo.ts` |
| El texto del correo: asunto desde `etiquetas.ts`, enlace desde `enlace.ts`, escapado del nombre de la entidad | `src/services/notificaciones/_contenidoDelCorreo.ts` |
| El despacho de un lote, compartido por los dos caminos | `src/services/notificaciones/_despachoDeCorreo.ts` |
| El envío inmediato, dentro de `notificar()`, que nunca puede voltear el hecho de negocio | `src/services/notificaciones/notificar.ts` |
| La tarea que recoge lo fallido, con lote y presupuesto de tiempo desde el día uno | `src/services/notificaciones/despacharCorreosPendientes.ts` |
| La ruta, con secreto, `maxDuration` y `Sentry.flush` en `finally` | `src/app/api/tareas/despachar-correos/route.ts` |
| `cron.schedule` cada 10 minutos, con host canónico y secreto de Vault | `db/migrations/1790734913801_agendar-despacho-de-correos.js` |

Cuatro decisiones que conviene tener a mano:

- **El asunto sale de `etiquetas.ts`**, el mismo catálogo que ve la persona dentro de la aplicación. No hay un segundo juego de frases para el correo: dos catálogos del mismo aviso se separan al primer cambio de wording.
- **El enlace sale de `enlace.ts`**, que se movió de `app/notificaciones/` a `services/notificaciones/` para que el servicio pudiera usarlo (un servicio no puede importar de una pantalla). La pantalla lo sigue viendo con el nombre de antes.
- **Sólo se le escribe a casillas confirmadas.** Mandarle a una que nadie verificó es la forma más rápida de que el dominio termine en spam.
- **Dos topes para no reintentar para siempre**: cinco intentos, y siete días de antigüedad. A nadie le sirve enterarse el jueves del cambio de horario del partido del domingo pasado.

### Lo que falta, y no está en el repositorio

El dominio **ya está verificado en Resend** con SPF, DKIM y DMARC: es el mismo que Supabase usa hoy para los correos de autenticación. Eso ya está hecho y no hay que volver a tocarlo.

Queda sólo:

1. **`RESEND_API_KEY` en Vercel.** La misma clave que figura como contraseña SMTP en el panel de Supabase sirve tal cual; también se puede crear una nueva en Resend. Misma cuenta, mismo dominio.
2. **`CORREO_REMITENTE` en Vercel**, con el formato `INVICTA <avisos@invicta.com.ar>`: una dirección de ese dominio verificado.
3. **Desplegar**, para que corra la migración que agenda la tarea, y verificar en `cron.job` que quedó agendada.

**Mientras las variables no estén, la aplicación funciona igual**: los avisos quedan encolados en `pending` y no se gasta ningún reintento, así que la tarea los manda en cuanto existan.

### Una cosa a vigilar: la cuota es compartida

Los correos de autenticación y los de producto salen ahora de la misma cuenta de Resend y consumen el mismo cupo. Un torneo de 16 equipos al que se le reprograma una fecha genera un aviso por equipo, más los seguidores; con tres torneos activos el consumo sube rápido. Conviene mirar el panel de Resend después de la primera semana con usuarios reales, antes de que un límite alcanzado deje sin avisar a alguien.

---

## 3. `recalcular-score` no está agendada

**Bloqueante, y fácil de arreglar.**

`src/app/api/tareas/recalcular-score/route.ts` existe, está protegida con `CRON_SECRET`, y llama a `recalcularScore()`. El servicio está completo: ventana de 24 meses, decaimiento lineal por antigüedad, resultados (50) + diferencia de gol comprimida (20) + torneos disputados (15) + posición final (15), y deja el desglose guardado.

**Nada la llama.** Revisé todas las migraciones: el único `cron.schedule` que existe agenda `confirmar-resultados-vencidos`. No hay job para el score, y `vercel.json` no tiene sección `crons`.

**Consecuencia.** La tabla `score_equipo` se llena sólo si alguien invoca la ruta a mano. El score del equipo, el ranking y la confiabilidad se muestran con lo que haya quedado de la última corrida manual — o vacíos.

**Qué falta.** Una migración con `cron.schedule('recalcular-score', ...)` diaria, con el mismo patrón que la existente: host canónico `www.invicta.com.ar`, secreto desde Vault ordenado por `created_at DESC`, `timeout_milliseconds` acorde, y todo dentro del `IF EXISTS` de `pg_cron` + `supabase_vault` para que no rompa en el Postgres local ni en CI.

---

## 4. `recalcularScore` no tiene lote ni presupuesto de tiempo

`recalcularScore()` hace `SELECT id FROM equipo WHERE estado = 'active'` y recorre **todos** los equipos, uno por uno, con dos consultas cada uno. Sin `LIMIT`, sin cursor, sin control de cuánto lleva.

Es exactamente el mismo defecto estructural que tenía `confirmarResultadosVencidos` antes de arreglarlo (ver el incidente de Sentry 7747128577): una función con tiempo máximo de ejecución recorriendo una tabla que crece sin techo. Con 50 equipos anda; con 2.000 se va a cortar por la mitad, y el corte va a ser silencioso porque no hay nada que lo señale.

**Qué falta.** El mismo tratamiento que ya se le dio a la otra tarea: un `MAXIMO_POR_CORRIDA`, un presupuesto de milisegundos, un campo `pendientes` exacto en el resumen y un booleano `puedeHaberMas`, `maxDuration` en la ruta y `Sentry.flush()` en un `finally`. El patrón ya está escrito en `src/services/plataforma/confirmarResultadosVencidos.ts` — es copiarlo.

Conviene hacerlo **antes** de agendarla (punto 3), no después.

---

## 5. Confirmar o disputar el resultado, por el equipo rival (T29)

**Bloqueante para el flujo de resultados.**

`src/services/competencia/confirmarResultado.ts` existe y funciona. Pero su **único** llamador es la tarea programada `confirmar-resultados-vencidos`, que confirma automáticamente lo que venció el plazo.

No hay ruta de API ni pantalla para que el capitán del equipo rival confirme a mano, y **no hay ninguna forma de disputar un resultado**. El estado `disputed` existe en el modelo, `obtenerTabla.ts:224` marca la tabla como `provisorio` cuando hay alguno, y `/torneo/[id]/tabla` lo muestra — pero nada puede poner un partido en ese estado.

**Qué falta.** La ruta `POST /api/partidos/confirmar-resultado`, una pantalla o panel donde el capitán vea «el organizador cargó 3-1, ¿confirmás?» con las dos salidas, el servicio de disputa, y el congelamiento del plazo de confirmación automática mientras la disputa está abierta (D-60) — que la tarea de hoy no contempla.

---

## 6. Registrar un partido no disputado

**Bloqueante para el flujo de resultados.**

Mismo caso: `src/services/competencia/registrarNoDisputado.ts` está escrito y probado, maneja walkover, suspendido y cancelado. **No hay ruta de API ni pantalla que lo invoque** — la única mención en toda la aplicación es un comentario en `src/app/equipo/[id]/page.tsx:39` que lo nombra como invalidador de caché.

En un torneo amateur, un equipo que no se presenta es semanal, no excepcional. Hoy el organizador no tiene cómo registrarlo.

**Qué falta.** Ruta `POST /api/partidos/no-disputado` y la opción en el panel de resultados del torneo, con las tres causas y el efecto correspondiente en la tabla de posiciones.

---

## 7. El límite de frecuencia vive en memoria del proceso

`src/lib/limiteFrecuencia.ts` guarda los intentos en un `Map` del proceso. El propio archivo lo dice: «si el producto pasa a correr en más de una instancia a la vez, este estado tiene que moverse a un almacén compartido».

**Ya corre en más de una instancia.** Vercel levanta funciones serverless en paralelo: cada una tiene su propio `Map` y cuenta desde cero. El límite sigue frenando a alguien que reintenta rápido en la misma instancia, pero no es la defensa que D-51 pide contra crear cuentas y organizaciones descartables en serie.

**Qué falta.** Mover el estado a una tabla (es lo más barato: ya hay Postgres y no agrega un servicio) o a Redis. Es un cambio acotado: el módulo ya tiene la interfaz correcta, cambia la implementación de `verificarLimite`.

---

## 8. `/api/admin/sembrar-demo` está en producción

`src/app/api/admin/sembrar-demo/route.ts` acepta las acciones `limpiar`, `sembrar`, `validar` y `reset`. `limpiar` **borra los datos demo de la base de producción**, y `reset` limpia antes de sembrar.

Está protegida con `CRON_SECRET` en el header `Authorization`, igual que las tareas programadas, así que no es un agujero abierto. Pero es un endpoint destructivo desplegado en producción cuyo secreto es el mismo que usan las tareas: si ese secreto se filtra alguna vez, lo que se pierde no es una corrida de cron.

**Qué falta.** Una de tres, en orden de preferencia: sacarla del despliegue de producción; ponerle un secreto propio distinto de `CRON_SECRET`; o exigir una confirmación explícita en el cuerpo (`{"confirmar":"borrar-datos-demo"}`) además del secreto. También conviene revisar que `limpiarDemo` no pueda tocar nada que no sea del dominio `@demo.invicta.com.ar`.

---

## 9. Historial del jugador torneo por torneo (UC-38)

No existe. `/jugador/[id]` muestra el perfil público, pero no la lista de «jugué la Copa Costanera 2025 con Deportivo Pichincha, 8 partidos, 3 goles». El dato está: `partido`, `inscripcion`, goleadores y tarjetas ya se registran.

Es la pantalla que hace que un jugador vuelva a la app fuera de la semana de su partido. Sin ella el perfil del jugador es una tarjeta de presentación, no un historial.

---

## 10. "Pedir sumarme sin cuenta" no se retoma tras registrarse

El mecanismo genérico está: `src/lib/accionesPendientes.ts` deja registrar una acción antes del alta y ejecutarla cuando el registro se completa. **Está usado para una sola acción**: seguir (`registrarEjecutorSeguir.ts`, enganchado desde `BotonSeguir.tsx`).

`solicitarInscripcion` no tiene ejecutor registrado. Entonces: un capitán sin cuenta entra a un torneo, toca «Inscribir a mi equipo», lo mandan a registrarse, se registra… y queda en la app sin haber pedido nada. Tiene que volver al torneo y repetir.

**Qué falta.** Un `registrarEjecutorInscripcion` análogo al de seguir. Es chico y el andamiaje ya está probado.

---

## 11. Notificaciones push

No existen. El canal está modelado como `'in_app' | 'email'` y no hay un tercero. Hay manifest PWA e íconos (`public/icons/`), así que la app se puede instalar, pero no hay service worker de push, ni suscripciones, ni claves VAPID.

Es de una etapa posterior y depende de que el punto 2 esté resuelto primero: no tiene sentido sumar un canal cuando el que ya está modelado todavía no despacha.

---

## 12. Monetización

D-31 define cuatro etapas y **ninguna está construida**. Lo único que existe es lo que D-33 pidió dejar previsto: la inscripción se modela con importe desde el día uno, hoy siempre cero (`db/migrations/1789064231360_costos-de-torneo.js`).

No hay `Suscripción`, `Plan`, `Pago` ni `Transacción`. No hay pasarela. No hay límites por plan. El análisis de `docs/contexto/14-modelo-de-monetizacion.md` es explícito en que el tope de 4 equipos como plan gratuito sería un muro, no un plan, y que el medidor «equipos por torneo» le paga al usuario por romper el modelo de datos publicando cuatro torneos de cuatro. Esa discusión sigue abierta y D-62 la deja atada a datos de uso reales.

---

## 13. Verificación avanzada de organización

Lo que hay es la verificación básica de D-76: el dueño pide verificación, le llega un mail, confirma, y desde `1790263186905_verificacion-de-organizacion-solicitada.js` queda anclada en la columna `organizacion.verificacion_solicitada_en`. Eso desbloquea D-51: sin verificar, el torneo nace `unlisted` y hay tope de uno publicado.

El nivel `trusted` con distintivo, que la segunda etapa del roadmap define, no está.

---

## 14. Despublicación automática por inactividad (D-80)

Decidido explícitamente **no construir en el MVP**, y la razón está bien escrita en `10-especificacion-tecnica.md:522`: con pocos torneos el problema no existe, el tope de un torneo publicado ya acota el daño, y un falso positivo despublicaría el torneo del primer organizador — el peor error posible en esta etapa.

La infraestructura de tareas programadas ya está y lo deja listo para cuando haga falta.

---

## 15. Organización: estados, tipo, y seguirla

De la propuesta de arquitectura quedaron sin empezar tres cosas:

- Los estados `rechazada` y `suspendida` de una organización (hoy sólo hay el camino feliz).
- La columna `tipo` para distinguir liga, club, complejo.
- Poder **seguir a una organización**, no sólo a un torneo o a un equipo. `seguimiento` hoy acepta `'tournament' | 'team'`.

La tercera es la que más se nota: si alguien confía en Liga Posadas FEM, querría enterarse de su próximo torneo, y hoy sólo puede seguir torneos que ya existen.

---

## 16. Tema oscuro

Decidido para después (D-71). El sistema está preparado: ningún componente escribe un color literal, todo pasa por tokens, y las superficies de identidad son oscuras por decisión de diseño y no por tema. Cuando llegue, es un bloque de valores nuevo, no un rediseño.

---

## 17. No hay pruebas end-to-end

La red automática es grande y buena en lo suyo: **1806 pruebas unitarias en 171 archivos** y **6 suites de integración contra Postgres real** (`cupoInscripciones`, `fixtureValidacion`, `idempotencia`, `permisos`, `restriccionesEsquema`, `transaccionResultado`).

Lo que no hay es una sola prueba que abra la aplicación y haga clic. No está Playwright ni Cypress en las dependencias. Todo lo que es «el botón lleva a la pantalla correcta», «el formulario manda lo que dice», «la sesión sobrevive al refresh» se verifica a mano o no se verifica.

Esto es lo que hace que el plan de pruebas manual del documento hermano sea largo. Con tres o cuatro recorridos end-to-end automatizados (registro, crear torneo y publicar, inscribir equipo, cargar resultado) buena parte de ese plan pasaría a correr solo.

---

## 18. La plantilla de mail de Supabase

**Paso manual, fuera del repositorio, bloqueante.**

La plantilla de Magic Link en Supabase tiene que usar:

```
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink
```

Si no, el enlace de confirmación de cuenta y el de verificación de organización no llegan al destino correcto. Este fue el tercer problema de la misma familia: un flujo que depende de algo que viaja fuera de la base de datos. La verificación ya quedó anclada en una columna para no depender de la plantilla, pero el enlace en sí sigue dependiendo.

---

## 19. Comentarios que mienten

Dos, encontrados de paso:

- `src/app/api/tareas/recalcular-score/route.ts:6` dice «declarada y agendada (diaria), todavía sin fórmula». Es al revés en las dos mitades: la fórmula está completa, y no está agendada.
- `src/lib/accionesPendientes.ts:8` dice «hoy ninguna acción concreta está registrada porque `seguir` es de T25 y `solicitarInscripcion` es de T20 — ninguno de los dos existe todavía». Los dos existen, y `seguir` ya está registrada.

Son comentarios, no código, pero son de los que hacen perder media hora al que venga después.

---

## Lo mínimo para abrir a usuarios finales

Si hubiera que elegir, esto es lo que no puede quedar como está:

1. ~~**El punto 2** — despachar los correos de notificación.~~ **Hecho el 30/09**; faltan dos variables de entorno en Vercel.
2. **Los puntos 5 y 6** — confirmar/disputar y no disputado. Sin esto el ciclo de un partido no cierra.
3. **El punto 3**, después del 4 — agendar el score, en lote.
4. **El punto 18** — la plantilla de mail.
5. **El punto 8** — sacar o blindar el endpoint que borra datos.

El resto aguanta una primera camada de usuarios.
