# Puntos abiertos — lo que falta desarrollar

> **Qué es esto.** El inventario de todo lo que está pendiente en INVICTA al 29 de septiembre de 2026, sobre el commit `03aefdb`. No es una lista de deseos: cada punto salió de leer el código, no la documentación. Donde digo "no existe", verifiqué que no existe; donde digo "existe a medias", digo exactamente qué mitad.
>
> **Cómo leer la severidad.** `Bloqueante` = si se abre la app a usuarios finales con esto así, algo se rompe o alguien se queda esperando algo que nunca llega. `Importante` = no rompe nada, pero el producto queda cojo y se nota. `Puede esperar` = está decidido que es de una etapa posterior, o el problema todavía no existe por volumen.

---

## Resumen en una tabla

| # | Punto | Severidad | Estado hoy |
|---|---|---|---|
| 1 | Publicidad: el contenedor está, la publicidad no | Importante | **La caja vacía ya no se muestra** (`02/10`). Falta de dónde salen los anuncios, que es T24 |
| 2 | El canal `email` de notificaciones no despacha nada | ~~Bloqueante~~ | **Cerrado** (`30/09`). El despacho existe; el correo de producto queda **apagado por decisión** |
| 3 | `recalcular-score` no está agendada en `pg_cron` | ~~Bloqueante~~ | **Resuelto** (`30/09`): agendada diaria a las 4:20 UTC |
| 4 | `recalcularScore` no tiene lote ni presupuesto de tiempo | ~~Importante~~ | **Resuelto** (`30/09`), y antes de agendarla |
| 5 | Confirmar / disputar resultado por el equipo rival (T29) | ~~Bloqueante~~ | **Resuelto** (`30/09`), con la resolución de la objeción incluida |
| 6 | Registrar partido no disputado (walkover, suspendido) | ~~Bloqueante~~ | **Resuelto** (`30/09`) |
| 7 | El límite de frecuencia vive en memoria del proceso | ~~Importante~~ | **Resuelto** (`04/10`): cuenta en Postgres, compartido entre instancias |
| 8 | `/api/admin/sembrar-demo` está en producción y borra datos | ~~Bloqueante~~ | **Resuelto** (`30/09`): la ruta y su pantalla se quitaron |
| 9 | Historial del jugador torneo por torneo (UC-38) | Importante | No existe |
| 10 | "Pedir sumarme sin cuenta" no se retoma tras registrarse | ~~Importante~~ | **Resuelto** (`02/10`), aunque no como decía este documento |
| 11 | Notificaciones push (Web Push) | Puede esperar | No existe el canal |
| 12 | Monetización: planes, pagos, comisión | Puede esperar | Etapas 2 a 4, no empezadas |
| 13 | Verificación avanzada de organización (`trusted`) | Puede esperar | Sólo la básica por email |
| 14 | Despublicación automática por inactividad (D-80) | Puede esperar | Decidido no construir en MVP |
| 15 | Estados `rechazada` / `suspendida` de organización, `tipo`, seguir a una organización | Puede esperar | Propuesta sin empezar |
| 16 | Tema oscuro (D-71) | Puede esperar | Decidido para después |
| 17 | No hay pruebas end-to-end | ~~Importante~~ | **Parcial** (`05/10`): 10 de punta a punta sobre las superficies públicas. Los recorridos con sesión siguen sin cubrir |
| 18 | Plantilla de mail de Supabase sin actualizar | **Bloqueante** | Paso manual fuera del repo |
| 19 | Comentarios desactualizados en el código | ~~Puede esperar~~ | **Cerrado** (`02/10`) |

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
5. ~~**Qué pasa cuando no hay anuncio.**~~ **Resuelto el 02/10**: sin anuncio el contenedor no se renderiza. El rótulo «Publicidad» pasó a acompañar al anuncio en vez de reemplazarlo —es lo que lo declara como tal (D-75)—, y el `min-height` de 90px se fue: la caja la define el anuncio. Las tres llamadas quedan puestas y la prueba de arquitectura las sigue exigiendo; cuando haya anuncios, el único cambio es pasarlos como `children`.

**Por qué no es urgente.** D-02 manda: sin torneos publicados y tráfico, no hay nada que vender. La publicidad se construye cuando el descubrimiento tiene contenido, no antes. Pero la caja vacía sí conviene resolverla antes de abrir a usuarios: mostrar un rótulo «Publicidad» sobre un rectángulo vacío le dice al usuario que algo está roto.

---

## 2. El canal `email` de notificaciones no despacha nada

> **CERRADO el 30/09/2026, y no como estaba planteado.** El despacho se
> construyó entero y funciona, pero **el correo de producto quedó
> apagado a propósito**: el único mail que sale es el de la cuenta. Al
> final de la sección, qué se construyó, por qué está apagado y cómo se
> prende.

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

~~Queda sólo `RESEND_API_KEY` y `CORREO_REMITENTE` en Vercel.~~
**Cargadas el 02/10**, y probadas con el correo de verificación de
organización, que es el único que las usa hoy.

Que estén **no prende ningún correo de producto**: eso lo decide
`CORREO_DE_PRODUCTO_ACTIVO`, que sigue en `false`. Con el interruptor
apagado `canalesDe()` nunca devuelve `email`, así que no se encola
ninguna fila, y además la tarea `despachar-correos` está desagendada.
Son dos cerrojos independientes y los dos siguen puestos.

### Y sin embargo, está apagado

Con todo eso construido, la decisión fue **no mandar ningún correo de producto por ahora**. El interruptor es `CORREO_DE_PRODUCTO_ACTIVO`, en `src/services/notificaciones/tipos.ts`, y hoy vale `false`.

El motivo no es técnico. Un remitente que manda de más se filtra entero, y con eso se pierden también **los correos de la cuenta** —confirmar el alta, recuperar la contraseña, verificar una organización—, que son los que no se pueden perder. Mientras el producto se estrena, el criterio es no ocupar la casilla de nadie.

Qué cambió en concreto:

- `canalesDe()` devuelve `['in_app']` para los **16 tipos**, no sólo para los informativos. Antes eran 12 los que salían por correo, y siete de ellos ni siquiera se podían apagar desde Preferencias.
- Las tres categorías accionables de `/notificaciones/preferencias` —invitaciones, estado de inscripción, cambios de horario— **perdieron el botón de correo**. Siguen sin poder apagarse: una invitación que no llega deja a alguien afuera de un partido, y ahora que no hay un segundo canal de respaldo, menos todavía.
- La tarea `despachar-correos` se **desagendó** (`1790736418929_desagendar-despacho-de-correos.js`). Con el interruptor apagado no hay filas que mandar, y correr 144 veces por día para no encontrar nada ensucia los check-ins de Sentry hasta que nadie los mira.

**Para volver a prenderlo**: `CORREO_DE_PRODUCTO_ACTIVO = true`, el `down` de esa migración —que reagenda la tarea idéntica—, y las dos variables de entorno de abajo. Nada que reescribir. Hay una prueba (`tipos.test.ts`) que falla si alguien pone el interruptor en `true` sin actualizarla: es a propósito, para que prenderlo sea una decisión y no un descuido.

### Una cosa a vigilar cuando vuelva: la cuota es compartida

Los correos de autenticación y los de producto saldrían de la misma cuenta de Resend y consumen el mismo cupo. Un torneo de 16 equipos al que se le reprograma una fecha genera un aviso por equipo, más los seguidores; con tres torneos activos el consumo sube rápido. Conviene mirar el panel de Resend después de la primera semana con usuarios reales, antes de que un límite alcanzado deje sin avisar a alguien.

---

## 3. `recalcular-score` no está agendada

> **RESUELTO el 30/09/2026**, junto con el punto 4 y en ese orden: primero el lote, después agendarla.

`src/app/api/tareas/recalcular-score/route.ts` existe, está protegida con `CRON_SECRET`, y llama a `recalcularScore()`. El servicio está completo: ventana de 24 meses, decaimiento lineal por antigüedad, resultados (50) + diferencia de gol comprimida (20) + torneos disputados (15) + posición final (15), y deja el desglose guardado.

**Nada la llama.** Revisé todas las migraciones: el único `cron.schedule` que existe agenda `confirmar-resultados-vencidos`. No hay job para el score, y `vercel.json` no tiene sección `crons`.

**Consecuencia.** La tabla `score_equipo` se llena sólo si alguien invoca la ruta a mano. El score del equipo, el ranking y la confiabilidad se muestran con lo que haya quedado de la última corrida manual — o vacíos.

**Qué falta.** Una migración con `cron.schedule('recalcular-score', ...)` diaria, con el mismo patrón que la existente: host canónico `www.invicta.com.ar`, secreto desde Vault ordenado por `created_at DESC`, `timeout_milliseconds` acorde, y todo dentro del `IF EXISTS` de `pg_cron` + `supabase_vault` para que no rompa en el Postgres local ni en CI.

---

## 4. `recalcularScore` no tiene lote ni presupuesto de tiempo

> **RESUELTO el 30/09/2026.**

`recalcularScore()` hace `SELECT id FROM equipo WHERE estado = 'active'` y recorre **todos** los equipos, uno por uno, con dos consultas cada uno. Sin `LIMIT`, sin cursor, sin control de cuánto lleva.

Es exactamente el mismo defecto estructural que tenía `confirmarResultadosVencidos` antes de arreglarlo (ver el incidente de Sentry 7747128577): una función con tiempo máximo de ejecución recorriendo una tabla que crece sin techo. Con 50 equipos anda; con 2.000 se va a cortar por la mitad, y el corte va a ser silencioso porque no hay nada que lo señale.

**Qué falta.** El mismo tratamiento que ya se le dio a la otra tarea: un `MAXIMO_POR_CORRIDA`, un presupuesto de milisegundos, un campo `pendientes` exacto en el resumen y un booleano `puedeHaberMas`, `maxDuration` en la ruta y `Sentry.flush()` en un `finally`. El patrón ya está escrito en `src/services/plataforma/confirmarResultadosVencidos.ts` — es copiarlo.

Conviene hacerlo **antes** de agendarla (punto 3), no después.

### Qué se construyó

`MAXIMO_POR_CORRIDA = 200` y `MILISEGUNDOS_DE_PRESUPUESTO = 45_000`, con `pendientes` exacto y `puedeHaberMas`, igual que en la tarea horaria.

La parte que no es copia es **el orden**, y es lo que hace que recortar no pierda a nadie:

```sql
LEFT JOIN score_equipo s ON s.equipo_id = e.id
ORDER BY s.ultima_actualizacion ASC NULLS FIRST
LIMIT $1
```

El que hace más que no se recalcula va primero, y el que nunca se calculó —todavía sin fila en `score_equipo`— va antes que todos. Lo que no entró hoy encabeza la cola mañana.

La tarea quedó agendada **diaria a las 4:20 UTC** (1:20 de la madrugada en Argentina), en `db/migrations/1790737006885_agendar-recalculo-de-score.js`. Diaria y no horaria: el score mide desempeño con decaimiento en una ventana de 24 meses, entre una hora y la siguiente no cambia nada que se note, y recalcular todos los equipos activos es el trabajo más caro de la plataforma.

---

## 5. Confirmar o disputar el resultado, por el equipo rival (T29)

> **RESUELTO el 30/09/2026**, y más grande de lo que decía este punto: una objeción sin forma de resolverse deja el partido congelado para siempre, así que la resolución entró en la misma tanda.

**Era bloqueante para el flujo de resultados.**

`src/services/competencia/confirmarResultado.ts` existe y funciona. Pero su **único** llamador es la tarea programada `confirmar-resultados-vencidos`, que confirma automáticamente lo que venció el plazo.

No hay ruta de API ni pantalla para que el capitán del equipo rival confirme a mano, y **no hay ninguna forma de disputar un resultado**. El estado `disputed` existe en el modelo, `obtenerTabla.ts:224` marca la tabla como `provisorio` cuando hay alguno, y `/torneo/[id]/tabla` lo muestra — pero nada puede poner un partido en ese estado.

**Qué se construyó.**

| Pieza | Dónde |
|---|---|
| Quién es el equipo rival: el que **no** cargó | `src/services/competencia/_rival.ts` |
| `confirmarResultado` abierto al rival, sin tocar el camino de la tarea | `confirmarResultado.ts` |
| Objetar, con motivo obligatorio y en una transacción | `disputarResultado.ts` |
| Resolver: el organizador rechaza y el resultado queda firme | `resolverDisputa.ts` |
| Resolver dándole la razón: el organizador corrige, y la corrección cierra la objeción | dentro de `cargarResultado.ts` |
| Leer un partido y decir qué puede hacer quien lo mira | `obtenerPartido.ts` |
| La pantalla del partido | `src/app/torneo/[id]/partido/[partidoId]/` |
| Tres rutas | `/api/partidos/{confirmar-resultado, objetar-resultado, resolver-objecion}` |

Cinco decisiones que conviene tener a mano:

- **El rival es el que no cargó.** Quien cargó ya dio su versión al cargarla. Capitanía **o** delegación, porque `cargarResultado` ya le notifica a los dos roles, y avisarle a alguien de algo que después no puede hacer es la peor combinación posible.
- **La resolución no era opcional.** Una objeción abierta congela el plazo (D-60): ni el rival ni la tarea de las 72 horas confirman. Sin forma de resolverla, el partido y la tabla quedaban en suspenso para siempre.
- **Hay dos salidas y viven en lugares distintos.** Rechazar la objeción es `resolverDisputa`. Darle la razón es corregir el resultado con `cargarResultado`, que ya recalcula la tabla y rehace los eventos, y que ahora cierra la objeción como `upheld` en la misma transacción. Duplicar ese camino habría sido reescribir la operación más delicada del producto para cambiarle una columna.
- **Un capitán no puede recargar por encima de una objeción abierta** (`RESULTADO_CON_OBJECION_ABIERTA`). Si pudiera, la vaciaría de sentido y dejaría el partido de vuelta en `loaded` con la objeción viva: nadie lo confirmaría nunca.
- **El permiso se resuelve en el servicio, no en la pantalla.** Los dos booleanos que la pantalla recibe deciden qué se dibuja, nunca si se puede.

**Lo que esta tanda destrabó de paso**: la pantalla del partido es la primera del producto, así que los cuatro tipos de notificación de origen `partido` —programado, reprogramado, resultado por confirmar, resultado objetado— **dejaron de quedarse sin enlace**, y el aviso de Inicio dejó de ser un callejón sin salida.

---

## 6. Registrar un partido no disputado

> **RESUELTO el 30/09/2026.** Con esto el ciclo de un partido cierra: cargar, confirmar, objetar, resolver, y lo que no se jugó.

**Era bloqueante para el flujo de resultados.**

Mismo caso: `src/services/competencia/registrarNoDisputado.ts` está escrito y probado, maneja walkover, suspendido y cancelado. **No hay ruta de API ni pantalla que lo invoque** — la única mención en toda la aplicación es un comentario en `src/app/equipo/[id]/page.tsx:39` que lo nombra como invalidador de caché.

En un torneo amateur, un equipo que no se presenta es semanal, no excepcional. Hoy el organizador no tiene cómo registrarlo.

**Qué se construyó.** La ruta `POST /api/partidos/no-disputado` y, en el panel de Resultados, una acción secundaria por partido: «No se jugó». Se abre sólo al pedirla —lo habitual es que el partido se haya jugado, y la carga del resultado tiene que quedar a la vista primero— y pregunta las tres cosas del catálogo: suspendido, ganado por presentación o anulado. El equipo ganador se pide **sólo** para la presentación, que es la única de las tres que lo necesita.

**Un problema que este cambio destapó y también se arregló.** El panel dividía los partidos en «pendientes» (todo lo que no estuviera `played`) y «cargados» (`played` o `walkover`). Con eso, un partido ganado por presentación o anulado **seguía apareciendo en pendientes**, con los campos de goles al lado de algo que ya estaba resuelto. Ahora pendiente es lo que todavía puede recibir un resultado —sin programar, programado o suspendido, que se reprograma y se juega— y lo demás baja a la lista de abajo con su etiqueta, porque un walkover con su 3-0 configurado se lee como un partido jugado si no se dice lo que es.

---

## 7. El límite de frecuencia vive en memoria del proceso

`src/lib/limiteFrecuencia.ts` guarda los intentos en un `Map` del proceso. El propio archivo lo dice: «si el producto pasa a correr en más de una instancia a la vez, este estado tiene que moverse a un almacén compartido».

**Ya corre en más de una instancia.** Vercel levanta funciones serverless en paralelo: cada una tiene su propio `Map` y cuenta desde cero. El límite sigue frenando a alguien que reintenta rápido en la misma instancia, pero no es la defensa que D-51 pide contra crear cuentas y organizaciones descartables en serie.

> **RESUELTO el 04/10.** El conteo pasó a una tabla (`intento_limitado`)
> y a la función `registrar_intento_limitado`, en la migración
> `1791076072275_limite-de-frecuencia-compartido`. Postgres y no Redis:
> ya está ahí y esto no justifica sumar un servicio con su propia
> disponibilidad, su clave y su factura.
>
> **Una función y no tres consultas.** Limpiar, insertar y contar desde
> la aplicación son tres viajes, y entre el insert y el count otra
> instancia puede insertar lo suyo: dos pedidos simultáneos se cuentan
> cada uno sin ver al otro y los dos pasan. Un
> `pg_advisory_xact_lock(hashtext(clave))` los serializa **por clave**,
> así que dos cuentas distintas no se esperan. Un solo `SELECT` desde la
> aplicación, un solo viaje.
>
> **Si la base no contesta, cae al conteo en memoria** en vez de negar.
> Un límite degradado a por-instancia sigue frenando al que reintenta en
> bucle; negar convertiría un hipo de la base en "no podés ingresar". El
> primer fallo por proceso va a Sentry: sin eso el límite dejaría de ser
> compartido en silencio, que es justo el problema que esto vino a
> resolver.
>
> Las filas se limpian solas por clave en cada llamada, y hay un barrido
> diario (`limpiar-intentos-limitados`, 5:07 UTC) para las claves que no
> se vuelven a consultar.
>
> **Sobre la prueba de concurrencia, que es la que importa.** La primera
> versión lanzaba diez llamadas en paralelo y pasaba igual con la
> función sin lock: el pool las despacha tan rápido y cada una tarda tan
> poco que casi nunca se solapan. Se reemplazó por una que fuerza el
> solapamiento —una transacción abierta retiene el lock y la segunda
> llamada tiene que esperar— y se verificó que **falla** si se le quita
> el lock a la función. Una prueba de concurrencia que pasa con y sin la
> defensa no prueba nada.

---

## 8. `/api/admin/sembrar-demo` está en producción

> **RESUELTO el 30/09/2026**: se quitaron la ruta y la pantalla. El dataset de ejemplo se siembra desde la terminal, con `npm run demo:reset`.

`src/app/api/admin/sembrar-demo/route.ts` acepta las acciones `limpiar`, `sembrar`, `validar` y `reset`. `limpiar` **borra los datos demo de la base de producción**, y `reset` limpia antes de sembrar.

Está protegida con `CRON_SECRET` en el header `Authorization`, igual que las tareas programadas, así que no es un agujero abierto. Pero es un endpoint destructivo desplegado en producción cuyo secreto es el mismo que usan las tareas: si ese secreto se filtra alguna vez, lo que se pierde no es una corrida de cron.

**Qué se hizo.** Se eligió la primera de las tres opciones que estaban planteadas —sacarla del despliegue— porque el camino desde el navegador dejó de hacer falta. Se borraron `src/app/api/admin/sembrar-demo/route.ts` y la pantalla `/admin/sembrar-demo` que la usaba. Los scripts siguen enteros: `npm run demo:limpiar`, `demo:sembrar`, `demo:validar` y `demo:reset` corren desde una terminal con su `.env`.

**Lo que queda anotado para cuando se toque de nuevo**: conviene revisar que `limpiarDemo` no pueda borrar nada que no sea del dominio `@demo.invicta.com.ar`. Hoy corre sólo desde una terminal, con alguien mirando, así que el riesgo bajó mucho — pero el resguardo sigue sin estar.

---

## 9. Historial del jugador torneo por torneo (UC-38)

No existe. `/jugador/[id]` muestra el perfil público, pero no la lista de «jugué la Copa Costanera 2025 con Deportivo Pichincha, 8 partidos, 3 goles». El dato está: `partido`, `inscripcion`, goleadores y tarjetas ya se registran.

Es la pantalla que hace que un jugador vuelva a la app fuera de la semana de su partido. Sin ella el perfil del jugador es una tarjeta de presentación, no un historial.

---

## 10. "Pedir sumarme sin cuenta" no se retoma tras registrarse

El mecanismo genérico está: `src/lib/accionesPendientes.ts` deja registrar una acción antes del alta y ejecutarla cuando el registro se completa. **Está usado para una sola acción**: seguir (`registrarEjecutorSeguir.ts`, enganchado desde `BotonSeguir.tsx`).

`solicitarInscripcion` no tiene ejecutor registrado. Entonces: un capitán sin cuenta entra a un torneo, toca «Inscribir a mi equipo», lo mandan a registrarse, se registra… y queda en la app sin haber pedido nada. Tiene que volver al torneo y repetir.

> **RESUELTO el 02/10 — y la solución que proponía este punto no servía.**
>
> Decía: «un `registrarEjecutorInscripcion` análogo al de seguir». Un
> ejecutor no habría tenido nada que ejecutar. El redirect a `/ingresar`
> ocurre en `empezar()`, **antes** de que la persona elija equipo
> —`BotonInscribirEquipo` pide `/api/equipos/mios` y recién con esa lista
> abre el panel—, así que en el momento de guardar la acción pendiente no
> existe ningún `equipoId`. Y quien se acaba de registrar directamente no
> tiene equipos: no hay inscripción posible que retomar.
>
> Lo que sí se perdía era **el lugar**. Ahora:
>
> - El 401 manda a `/ingresar?accion=inscribir&torneoId=<id>` en vez de
>   `/ingresar` a secas.
> - Terminar el ingreso o el registro vuelve a `/torneo/<id>?inscribir=1`.
> - `BotonInscribirEquipo` lee ese parámetro al montar y **reabre el
>   panel solo**, salvo que ya haya una inscripción vigente —en cuyo caso
>   no hay nada que retomar—. Después lo saca de la URL, para que
>   recargar no lo reabra.
>
> Quien no tenga equipos cae en el paso «sin-equipos», con el camino para
> crear uno. Es el final honesto del flujo: no se puede inscribir un
> equipo que no existe.
>
> De paso, `seguirPendiente` se generalizó a `AccionPendienteDeLaUrl`, un
> tipo con dos variantes. `seguir` sigue teniendo ejecutor —se completa
> sola— y `inscribir` no lo tiene, a propósito.

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

> **PARCIALMENTE RESUELTO el 05/10.** Hay suite de punta a punta con
> Playwright: `npm run pretest:e2e && npm run test:e2e`, 10 pruebas,
> contra la aplicación **construida** y una base propia (`_e2e`)
> sembrada con los servicios reales. Detalle en `test/e2e/README.md`.
>
> **Cubre las superficies públicas**: el descubrimiento con su selector
> de ciudad —que es lo que sólo un navegador puede verificar, porque la
> ciudad viaja en una cookie que escribe una Server Action—, la ficha
> del torneo con sus pestañas, el fixture, la tabla de posiciones y las
> puertas de acceso.
>
> **No cubre los recorridos con sesión**, que son los cuatro que este
> punto pedía. Las sesiones las resuelve Supabase Auth contra su
> servidor y este entorno no tiene credenciales. Para cubrirlos hacen
> falta las de un proyecto de Supabase de pruebas, o un servidor que
> imite su API de autenticación. Lo que no hay que hacer es abrirle una
> puerta al código de producción para saltarse la sesión en pruebas.
>
> Dos cosas que aparecieron construyéndola y están anotadas en el README
> porque cuestan una tarde: `unstable_cache` guarda sus entradas en
> `.next/cache/fetch-cache` y **sobrevive al build y al reinicio del
> servidor**, así que la corrida arrancaba sirviendo datos del sembrado
> anterior; y como efecto de lo mismo, cambiar la base mientras la suite
> corre no se ve, porque las superficies públicas están cacheadas a
> propósito (T21).
>
> Hallazgo de paso, sin arreglar: **un torneo en curso sin ningún
> resultado cargado muestra la tabla de posiciones vacía**. `posicion`
> se llena a medida que llegan los resultados, no al confirmar el
> fixture, así que entre el inicio del torneo y el primer resultado la
> pantalla dice «Todavía no hay tabla de posiciones». Un usuario
> esperaría ver a los equipos en cero.

---

## 18. La plantilla de mail de Supabase

**Paso manual, fuera del repositorio, bloqueante.**

> **Actualización del 02/10.** La verificación de organización ya **no**
> depende de esto: ese correo lo arma y lo manda el producto
> (`_correoDeVerificacion.ts` + `lib/correo.ts`), con el token que
> `generateLink` devuelve sin enviar nada. Lo de abajo sigue siendo
> necesario **para la confirmación de cuenta**, que sigue saliendo por
> la plantilla de Supabase.

### 18.a — La plantilla de Magic Link

En *Authentication → Emails → Magic Link*, el enlace tiene que apuntar a:

```
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink
```

y **no** al `{{ .ConfirmationURL }}` que viene por defecto.

Afecta a la confirmación de cuenta (`lib/emailConfirmacion.ts`), que usa
`signInWithOtp` con el **cliente admin** — y al camino de respaldo de la
verificación de organización, el que corre cuando no hay proveedor de
correo propio configurado.

Por qué, dos razones independientes:

1. **El enlace se gasta antes de que lo toquen.** `{{ .ConfirmationURL }}`
   apunta a `/auth/v1/verify` de Supabase, que es un `GET` que consume el
   token y recién después redirige. Los escáneres de correo abren los
   enlaces para revisarlos, así que el token se quema antes de que la
   persona haga clic y el enlace llega vencido. Con `{{ .TokenHash }}` el
   enlace va directo a nuestra pantalla, que no canjea nada: muestra un
   botón. Los escáneres siguen enlaces (`GET`) pero no completan
   formularios (`POST`), así que abrirla no consume el token.

2. **La cookie que el canje por código necesita no existe.** El flujo de
   `{{ .ConfirmationURL }}` termina en `exchangeCodeForSession`, que
   busca en el navegador un verificador PKCE guardado al pedir el enlace.
   Estos enlaces los emite el **cliente admin**, que no escribe cookies:
   esa cookie nunca existió. Por eso el canje es
   `verifyOtp({ token_hash })` en `api/acceso/confirmar/route.ts`.

### 18.b — La lista de URLs permitidas

En *Authentication → URL Configuration → Redirect URLs*, tiene que estar:

```
https://www.invicta.com.ar/acceso/confirmar
```

Supabase consulta esa lista antes de redirigir y, **si la URL no está,
usa el Site URL en su lugar** — sin avisar.

Mientras el camino de respaldo de la verificación de organización siga
existiendo, conviene sumar también:

```
https://www.invicta.com.ar/acceso/confirmar/organizacion/*
```

El `*` alcanza para el id: los separadores que `*` no cruza son `.` y
`/`, y un UUID no tiene ninguno de los dos. Por el camino bueno —el
correo propio— esto ya no hace falta: la URL la arma el producto, no
Supabase.

### 18.c — La plantilla de Reset Password

Desde el 04/10 recuperar la contraseña también usa `token_hash`. En
*Authentication → Emails → Reset Password*:

```
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery
```

y en *Redirect URLs*:

```
https://www.invicta.com.ar/restablecer-password/confirmar
```

### Lo que no hay que tocar

**Invite user** se queda con su plantilla por defecto. Ese flujo emite
el enlace desde el cliente de servidor, que escribe la cookie, así que
el canje por código funciona y vuelve por `/auth/callback`.

> ~~Pendiente aparte: `/restablecer-password/confirmar` no se alcanzaba
> nunca.~~ **Resuelto el 04/10**: ver «18 ter» más abajo. Recuperar la
> contraseña pasó al patrón `token_hash`, así que **la plantilla «Reset
> Password» también hay que cambiarla**.

---

## 18 bis. El correo de verificación de organización

**Hecho el 02/10.** Antes salía por la plantilla de Magic Link de
Supabase, compartida con la confirmación de cuenta, así que **no podía
nombrar la organización**: quien tiene dos clubes a cargo recibía dos
correos idénticos y tenía que adivinar cuál era cuál.

Supabase tiene **seis plantillas fijas** (Confirm signup, Magic Link,
Invite user, Change Email, Reset Password, Reauthentication) y no deja
agregar una séptima, así que la única salida era sacar ese correo de
Supabase. `auth.admin.generateLink()` devuelve el `hashed_token` **sin
mandar nada**; con eso el producto arma el enlace y despacha el correo
por `lib/correo.ts`, el mismo camino que ya usan las notificaciones.

Dos efectos secundarios, los dos buenos:

- El enlace lo arma el producto, así que este flujo **ya no depende de la
  lista de Redirect URLs** del panel.
- El armazón del correo (cabecera, tarjeta, botón, pie y colores) pasó a
  `lib/plantillaDeCorreo.ts`, compartido con los correos de
  notificación. Antes había un solo juego de HTML; con dos copias se iba
  a separar al primer cambio de color.

Depende de `RESEND_API_KEY` y `CORREO_REMITENTE` en Vercel, **cargadas y
probadas el 02/10**. Sin ellas `hayProveedorDeCorreo()` da `false` y el
flujo cae al envío de Supabase: un correo genérico que no nombra la
organización, pero que llega. El camino de respaldo se deja puesto.

---

## 18 ter. Recuperar la contraseña tenía dos caminos, y el conectado era el peor

**Resuelto el 04/10.**

Había dos implementaciones completas. La conectada —`redirectTo` a
`/auth/callback/restablecer-password`, con `exchangeCodeForSession`—
tenía dos problemas, los dos visibles con usuarios reales:

1. **Pedirlo en un dispositivo y abrirlo en otro no funcionaba.**
   `@supabase/ssr@0.12.5` fuerza `flowType: 'pkce'` en
   `createServerClient` (está en el propio paquete). El canje por código
   busca un verificador que quedó **como cookie en el navegador donde se
   pidió el enlace**. Pedir el reset en la notebook y abrir el correo en
   el teléfono fallaba.
2. **Los escáneres de correo gastaban el enlace**, igual que pasaba con
   Magic Link: `{{ .ConfirmationURL }}` es un `GET` que consume el token.

La otra —`/restablecer-password/confirmar` + su API, con `verifyOtp`—
arregla las dos cosas: no necesita cookie, así que anda desde cualquier
dispositivo, y la pantalla no canjea nada, muestra un botón cuyo `POST`
ningún escáner dispara. Estaba escrita y probada, y **nunca se
conectó**: nada en el código enlazaba a esa pantalla.

Lo que cambió es una línea de `redirectTo`, más los comentarios que
seguían nombrando el camino viejo. El canje por código **se queda** en
`/auth/callback`, porque las invitaciones lo usan y porque los enlaces
de recuperación que ya salieron por correo apuntan ahí.

> ⚠️ **Hay una ventana entre el despliegue y el cambio de plantilla.**
> El código nuevo manda a `/restablecer-password/confirmar`, y la
> plantilla vieja arma el enlace con `?code=` en vez de `token_hash`:
> esa pantalla avisa que el enlace está incompleto. No hay orden que
> evite el hueco —con la plantilla nueva y el código viejo pasa lo
> simétrico—, así que las dos cosas van juntas. Son minutos.
>
> Se puede cerrar del todo con unas cinco líneas: que la pantalla, al
> recibir `?code=`, reenvíe a `/auth/callback/restablecer-password`. No
> se agregó porque es compatibilidad temporal y el hueco es corto; si
> se quiere, es un cambio chico.

---

## 19. Comentarios que mienten

Dos, encontrados de paso:

- ~~`src/app/api/tareas/recalcular-score/route.ts:6` decía «declarada y agendada (diaria), todavía sin fórmula», al revés en las dos mitades.~~ Corregido el 30/09.
- ~~`src/lib/accionesPendientes.ts:8` dice «hoy ninguna acción concreta está registrada porque `seguir` es de T25 y `solicitarInscripcion` es de T20 — ninguno de los dos existe todavía». Los dos existen, y `seguir` ya está registrada.~~ Corregido el 02/10.

Son comentarios, no código, pero son de los que hacen perder media hora al que venga después.

---

## Lo mínimo para abrir a usuarios finales

Si hubiera que elegir, esto es lo que no puede quedar como está:

1. ~~**El punto 2** — despachar los correos de notificación.~~ **Hecho el 30/09**; las dos variables de entorno quedaron cargadas el 02/10, con redespliegue y prueba. Con eso corrieron también las cuatro migraciones del 30/09.
2. ~~**Los puntos 5 y 6**~~ — los dos **hechos el 30/09**. El ciclo de un partido cierra.
3. ~~**El punto 3**, después del 4 — agendar el score, en lote.~~ **Hecho el 30/09**, en ese orden.
4. **El punto 18** — la plantilla de mail.
5. ~~**El punto 8** — sacar o blindar el endpoint que borra datos.~~ **Hecho el 30/09**: se quitó.

El resto aguanta una primera camada de usuarios.
