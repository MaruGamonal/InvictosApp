# Puesta en marcha de la infraestructura — quién hace qué

> **Nota operativa, fuera del embudo.** Ejecuta las decisiones de `06`, D-96 y D-97 y de `10`, T-10 y T-11. Acompaña a `decisiones-infraestructura-T28.md`, que explica **por qué** cada cosa es como es; este documento dice **en qué orden y quién**.

---

## 1. La división del trabajo, en una línea

**Vos hacés lo que requiere una tarjeta de crédito, una identidad o una decisión.** Claude Code hace todo lo demás.

No es una división de dificultad: es de **permisos**. Crear cuentas, comprar un dominio y aceptar términos son actos que solo puede hacer una persona. Escribir configuración, migraciones y código de instrumentación no.

| | Vos | Claude Code |
|---|:--:|:--:|
| Crear cuentas de Vercel, Supabase y Sentry | ✅ | — |
| Registrar el dominio *(hecho)* | ✅ | — |
| Elegir la región al crear el proyecto | ✅ | — |
| Copiar claves al gestor de variables | ✅ | — |
| Búsqueda de marca en INPI | ✅ | — |
| Todo lo demás | — | ✅ |

---

## 2. Lo que tenés que hacer vos, en orden

Son seis pasos y ninguno lleva más de unos minutos. **El orden importa en los dos primeros**, porque lo que se elige ahí no se cambia después sin migrar.

### Paso 1 — Crear el proyecto de Supabase **en San Pablo**

En [supabase.com](https://supabase.com), proyecto nuevo. Al crearlo pide la región: **elegir `South America (São Paulo) · sa-east-1`**.

> ⚠️ **Es el paso más importante de toda la lista y el único difícil de revertir.** Cambiar la región después implica migrar la base entera. Si te distraés y queda en Virginia, cada página del producto va a pagar un cruce de continente por consulta.

Guardá tres datos que la aplicación va a necesitar: la **URL del proyecto**, la **clave anónima** y la **clave de servicio**. La de servicio no se comparte ni se sube al repositorio nunca.

### Paso 2 — Crear la cuenta de Vercel y conectar el repositorio

En [vercel.com](https://vercel.com), plan **Hobby**. Conectá el repositorio del proyecto.

**No hace falta que toques la región acá**: Claude Code la fija en `vercel.json`, que es más confiable que un ajuste de panel porque queda versionado en el repositorio.

### Paso 3 — El dominio ✅ *hecho*

**`invicta.com.ar` ya está registrado.** No hay nada que hacer acá salvo dos cosas:

- **Apuntarlo a Vercel** cuando el proyecto esté desplegado — se hace desde el panel, en Settings → Domains, y Vercel emite el certificado solo.
- **Tomar los usuarios de redes** con el mismo nombre, si todavía no lo hiciste. Son baratos y descubrir tarde que están ocupados no lo es.

> **Contexto que conviene tener presente sin que frene nada:** existe una marca `I INVICTA` viva en clase 9 (Invicta S.p.A., Italia, vigente hasta 2031), así que **el nombre no es registrable como marca**. A la escala de un test de mercado local eso es un riesgo despreciable y la decisión fue seguir (`06`, D-97). Lo que sí conviene es **no invertir en identidad gráfica todavía** y mantener el nombre reemplazable en el código (ver 3.7).

### Paso 4 — Crear la cuenta de Sentry

En [sentry.io](https://sentry.io), plan **Developer**, que es gratuito. Creá **un proyecto de tipo Next.js** y guardá el **DSN**.

### Paso 5 — Cargar las variables de entorno en Vercel

En el panel del proyecto, **Settings → Environment Variables**. Las que Claude Code va a necesitar:

| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` | Paso 1 — **la cadena del pooler en modo transacción, puerto `6543`**. Ver el aviso de acá abajo: el puerto importa |
| `DATABASE_URL_MIGRACIONES` | Paso 1 — **la cadena del pooler en modo sesión** (`Session pooler`, puerto `5432`). Solo la usan las migraciones del despliegue, que no pueden ir por el modo transacción |
| `NEXT_PUBLIC_SUPABASE_URL` | Paso 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Paso 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | Paso 1 — **solo en el servidor**, nunca con prefijo `NEXT_PUBLIC_` |
| `SENTRY_DSN` | Paso 4 |
| `CRON_SECRET` | La generás vos: una cadena larga al azar. La usa la tarea horaria para probar que es ella |
| `NEXT_PUBLIC_SITE_URL` | **El host canónico**, el mismo que devuelve `location.origin` en el navegador (hoy `https://www.invicta.com.ar`) — **sin `/` al final**. Si acá va el host que redirige en vez del de destino, los enlaces de correo llegan a una redirección: las cookies quedan en el otro host y el enlace se ve como vencido |

> **Ninguna de estas va al repositorio.** Es la regla que T28 ya pedía: variables gestionadas fuera del código.

> ⚠️ **`DATABASE_URL` tiene que usar el puerto `6543`, no el `5432`. Causó una caída real en producción.**
>
> Supabase ofrece la misma base por tres cadenas distintas, y en el panel (**Connect**) aparecen juntas:
>
> | Cadena | Puerto | Qué hace |
> |---|---|---|
> | **Transaction pooler** | `6543` | El lugar en el pooler se ocupa **solo mientras dura una consulta**. Es la que va. |
> | **Session pooler** | `5432` | Cada conexión se queda con un lugar **mientras viva**. Va en `DATABASE_URL_MIGRACIONES`. |
> | Direct connection | `5432` | Sin pooler. **No sirve desde Vercel**: en los proyectos nuevos resuelve solo por IPv6, que el entorno de construcción no habla. |
>
> Con la de **modo sesión**, el cupo del plan gratuito es de **15 conexiones para todo el proyecto**. En Vercel cada instancia levanta su propio pool, así que tres instancias atendiendo al mismo tiempo lo agotan y la siguiente persona que entra recibe un error en vez de una página:
>
> ```
> error: (EMAXCONNSESSION) max clients reached in session mode
>        - max clients are limited to pool_size: 15
> ```
>
> El síntoma engaña: la aplicación anda perfecta con una persona y se cae **solo cuando hay varias a la vez**, que es justo cuando no se está mirando el log. Si la aplicación arranca con una URL en modo sesión, ahora avisa sola en Sentry.
>
> **Después de cambiarla hay que redesplegar**: una variable nueva no se aplica a un deploy ya hecho.

> ⚠️ **Las migraciones no pueden ir por el puerto `6543`.** Por eso son dos variables y no una.
>
> `node-pg-migrate` se protege de dos despliegues simultáneos con `pg_try_advisory_lock`, que es un lock **de sesión**: vale mientras viva la conexión que lo tomó. En modo transacción cada consulta puede caer en una conexión distinta, así que el lock se toma en una y se intenta liberar en otra. En el mejor caso no protege nada; en el peor **queda tomado en una conexión que nadie va a liberar y el despliegue siguiente se cuelga esperándolo**.
>
> Por eso `DATABASE_URL_MIGRACIONES` lleva el **pooler en modo sesión**, que sí tiene sesión fija. Corre una vez por despliegue, así que su cupo chico no molesta. **La conexión directa no sirve acá**: en los proyectos nuevos de Supabase resuelve solo por IPv6 y el entorno de construcción de Vercel no lo habla — falla al conectar, y el error no nombra al IPv6 por ningún lado. Si falta y `DATABASE_URL` está en modo transacción, el despliegue **falla de entrada con el motivo escrito**, en vez de dejar el lock colgado.

> ⚠️ **`NEXT_PUBLIC_SITE_URL` faltaba de esta lista y causó un bug real en producción**: sin ella, todo el código cae a `http://localhost:3000` (los mails de confirmación de cuenta, verificación de organización, invitaciones y recuperación de contraseña arman el enlace con esa base) — el enlace del mail termina apuntando a la máquina de quien desarrolló, no al sitio real. **Después de cargarla hay que redesplegar**: una variable nueva no se aplica a un deploy ya hecho.
>
> **Además, en el panel de Supabase** (Authentication → URL Configuration) hay que fijar el mismo valor: **Site URL** a esa misma URL, y agregar `<esa URL>/auth/callback` a **Redirect URLs**. Supabase solo respeta el `emailRedirectTo` que le manda la app si esa URL está en la lista de Redirect URLs — si no, la ignora y usa el Site URL del panel (que en un proyecto nuevo suele quedar en localhost por default).

### Paso 6 — Crear el bucket `media` y dejarlo **público**

En el panel de Supabase, **Storage → New bucket**, nombre `media`, con **Public bucket** activado. O desde el SQL Editor:

```sql
insert into storage.buckets (id, name, public) values ('media', 'media', true);
```

Ahí van **escudos de equipo, portadas de torneo, logos de organización, fotos de perfil y el PDF del reglamento**. Sin el bucket, cada subida falla con `ERROR_INTERNO`; con el bucket privado, la subida funciona y la imagen no se ve nunca, que es el síntoma más confuso de los dos.

Este paso faltaba de esta lista y costó una tanda de bugs reportados en vivo como "la carga de imágenes falla y después no se visualiza en el perfil".

**Cómo verificarlo**, de lo rápido a lo concluyente:

```sql
-- 1. existe y es público
select id, name, public from storage.buckets;

-- 2. si ya se intentó subir algo, ¿llegó a escribirse?
select name, created_at from storage.objects
where bucket_id = 'media' order by created_at desc limit 10;

-- 3. una URL real para abrir en el navegador
select nombre, escudo_url from equipo where escudo_url is not null limit 5;
```

La URL del paso 3 se abre **en una ventana de incógnito** — con la sesión del panel abierta se ve igual aunque el bucket sea privado, y la prueba no dice nada. `Bucket not found` es que no existe; un 403 es que no es público.

No hace falta crear políticas RLS de escritura: la aplicación sube con `SUPABASE_SERVICE_ROLE_KEY`, que las saltea. Lo único que habilita la lectura pública es `public = true`.

### Paso 7 — *(ya no aplica)*

La búsqueda en INPI **ya se hizo**: hay una `I INVICTA` viva en clase 9 con cobertura amplia, así que el nombre no es registrable (`06`, D-97). No queda nada pendiente de tu lado.

---

## 3. Lo que hace Claude Code

Todo esto entra en **T28**, y conviene pedírselo como un solo trabajo. Lo listo con detalle para que puedas copiar la instrucción y para que se pueda verificar después.

### 3.1 Región de ejecución (`10`, T-10)

- `vercel.json` con `{ "regions": ["gru1"] }`.
- Verificar en el resumen del despliegue que las funciones dicen São Paulo y no Washington. **Es el único chequeo de esta lista que hay que mirar con los ojos**, porque el valor por defecto es silencioso.

### 3.2 La tarea horaria en `pg_cron` (`10`, T-11, y `10`, 6.1)

- Habilitar `pg_cron` y `pg_net` en Supabase, **como migración versionada** y no desde el panel.
- Programar la tarea horaria para que llame **por HTTP al endpoint del servicio**, con el `CRON_SECRET` en la cabecera.
- El endpoint valida el secreto y rechaza cualquier llamada sin él.
- **Importante:** la tarea **no escribe SQL por su cuenta**. Llama al servicio, para que ejecute el mismo código que ejecutaría un usuario — es la regla de `10`, 2.1 y es lo que sostiene toda la arquitectura.

### 3.3 Observabilidad (`09`, sección 4)

- Sentry en la aplicación **y en la capa de servicios**, con el error no controlado traducido a `ERROR_INTERNO` **sin filtrar nada al usuario**.
- **Monitoreo de la tarea programada por *check-in***: la tarea avisa a Sentry cuando arranca y cuando termina, y Sentry alerta si no llegó. Hace falta justamente porque la tarea corre **fuera** del hosting.
- Alerta ante un pico de `ERROR_INTERNO`.
- **Cuatro eventos de producto y nada más**: ficha de torneo vista, inscripción iniciada, inscripción enviada, ciudad sin torneos. Los umbrales de D-51 y D-61 se calibran con consultas a la base, no con analítica.

### 3.4 PWA (`09`, 8.1)

- Manifiesto e íconos: **192×192**, **512×512**, **512×512 *maskable*** con margen de seguridad, y `apple-touch-icon` de **180×180**.
- Ícono provisorio: la **I** en Barlow Condensed 700, cian `#00A8CC` sobre `#0E1720`. Son los colores que el Design System ya fijó, así que se ve intencional y no provisorio.
- El momento de ofrecer la instalación **puesto donde tiene sentido, no al entrar**.
- **En iOS la instalación es lo que habilita el push**, así que esto no es cosmético: es lo que hace que llegue la notificación de reprogramación, que es la de mayor valor del producto.

### 3.5 Despliegue

- Migraciones aplicadas **como parte del despliegue**, nunca a mano.
- Entornos separados y verificación previa —tipos, lint y la batería de T27— que impida integrar si algo falla.
- Metadatos de indexación y de previsualización al compartir, para las ocho rutas públicas de `10`, sección 5.
- Medición del peso y del tiempo de la primera carga de la ficha del torneo.

### 3.6 El nombre, en un solo lugar

- **El nombre del producto vive en una constante y en los textos de interfaz**, nunca desparramado por el código, los metadatos, el manifiesto y los correos.
- **Fundamento:** el nombre no es registrable como marca (`06`, D-97) y la decisión fue seguir igual a la escala del test. Concentrarlo en un punto convierte un eventual cambio de nombre en **una línea** en vez de una migración. Es cinco minutos ahora y compra la decisión entera para más adelante.

### 3.7 Almacenamiento de imágenes (`06`, D-96)

- **Límite de tamaño y compresión al subir**, desde el primer archivo. El plan gratuito da 1 GB y los escudos crecen con cada equipo; poner el límite ahora es mucho más barato que migrar después.
- El tope del cliente y el del servidor son **4 MB**, deliberadamente por debajo del corte de la plataforma (~4,5 MB): por encima de eso Vercel corta el cuerpo antes de que llegue a la aplicación y responde algo que no es JSON, así que el rechazo no se puede explicar.
- **El bucket `media` no lo crea el código** — lo creás vos, una vez, en el Paso 6. La aplicación escribe con el cliente admin y asume que ya existe y que es público.

---

## 4. Lo que se decidió NO hacer todavía

Vale escribirlo para que nadie lo agregue por las dudas.

| Qué | Por qué no |
|---|---|
| **Vercel Pro** (USD 20/mes) | La única razón que lo justificaba era el cron horario, y `pg_cron` lo resuelve gratis. Va a hacer falta cuando haya un segundo desarrollador que despliegue |
| **Sentry Team** (USD 26/mes) | El plan gratuito da 5.000 errores por mes. Si se pasa, es una señal de que hay algo roto, no de que falte plan |
| **Analítica paga** | Cuatro eventos entran en cualquier herramienta gratuita |
| **Supabase Pro** (USD 25/mes) | **Es la única que sí hay que contratar pronto** — antes del primer torneo real, por los **backups diarios**. No por capacidad: con datos de terceros adentro, perder información no es un problema técnico sino de confianza |

---

## 5. Cómo saber que quedó bien

Seis verificaciones, en el orden en que conviene hacerlas:

0. **Una imagen subida se ve.** Subí un escudo desde "Crear equipo" y entrá al perfil del equipo. Si no se ve, empezá por el bucket `media` (Paso 6): es la causa más probable.
1. **El resumen del despliegue dice São Paulo** en la región de las funciones.
2. **La tarea horaria aparece en Sentry** con su *check-in*, y un resultado cargado hace más de 72 horas pasa a confirmado solo. La corrida tiene 60 segundos y un presupuesto propio de 45: si queda trabajo sin hacer, lo toma la corrida siguiente y avisa en Sentry — una corrida cortada por la mitad se reportaba como caída y no confirmaba nada.
2b. **`DATABASE_URL` usa el puerto `6543`.** Si usa el `5432` del pooler, Sentry lo dice apenas arranca la aplicación (`modo sesión: cambiar al puerto 6543`). Es la diferencia entre andar y caerse cuando entran varias personas juntas.
3. **Un error provocado a propósito** llega a Sentry con contexto, y el usuario ve `ERROR_INTERNO` y nada más.
4. **El producto se instala** en un teléfono desde el navegador, y una vez instalado **recibe una notificación push**.
5. **Un despliegue con una migración nueva** la aplica solo, y uno que rompe los tipos no llega a producción.

Son, casi textualmente, los criterios de aceptación que T28 ya tenía escritos.
