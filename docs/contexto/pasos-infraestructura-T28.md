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
| `NEXT_PUBLIC_SUPABASE_URL` | Paso 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Paso 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | Paso 1 — **solo en el servidor**, nunca con prefijo `NEXT_PUBLIC_` |
| `SENTRY_DSN` | Paso 4 |
| `CRON_SECRET` | La generás vos: una cadena larga al azar. La usa la tarea horaria para probar que es ella |

> **Ninguna de estas va al repositorio.** Es la regla que T28 ya pedía: variables gestionadas fuera del código.

### Paso 6 — *(ya no aplica)*

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

Cinco verificaciones, en el orden en que conviene hacerlas:

1. **El resumen del despliegue dice São Paulo** en la región de las funciones.
2. **La tarea horaria aparece en Sentry** con su *check-in*, y un resultado cargado hace más de 72 horas pasa a confirmado solo.
3. **Un error provocado a propósito** llega a Sentry con contexto, y el usuario ve `ERROR_INTERNO` y nada más.
4. **El producto se instala** en un teléfono desde el navegador, y una vez instalado **recibe una notificación push**.
5. **Un despliegue con una migración nueva** la aplica solo, y uno que rompe los tipos no llega a producción.

Son, casi textualmente, los criterios de aceptación que T28 ya tenía escritos.
