# Decisiones de infraestructura para T28 — hosting, observabilidad, íconos y dominio

> **Nota de contexto, fuera del embudo.** Prepara las cuatro decisiones que T28 (observabilidad, PWA y despliegue) necesita para arrancar. `09` definió los **roles** —observabilidad, tareas programadas, email, push— pero deliberadamente no nombró proveedores; esto los propone. **Cuando se decidan, van a `09` y a `06`.**
>
> Precios y límites verificados a la fecha de este documento. Conviene re-chequearlos antes de contratar.

---

## 1. Dos hallazgos que conviene mirar antes que nada

Son los dos que muerden solos si nadie los toca.

### 1.1 La región por defecto es Washington, y la base va a estar en San Pablo

**Vercel ejecuta las funciones en `iad1` (Washington) por defecto, en todos los proyectos nuevos.** Supabase, en cambio, sí tiene región sudamericana: **`sa-east-1`, San Pablo**.

Si nadie lo cambia, **cada página renderizada en servidor cruza el continente una vez por consulta**. Y eso cae justo sobre la superficie más importante del producto: la **ficha del torneo**, que es lo que alguien abre desde un grupo de WhatsApp con datos móviles y es la principal puerta de entrada de usuarios nuevos (`07`, MVP, D5).

**Qué hacer, y es gratis:** crear el proyecto de Supabase en **`sa-east-1`** y fijar la región de las funciones en **`gru1` (San Pablo)** — una línea en `vercel.json`:

```json
{ "regions": ["gru1"] }
```

**El plan gratuito de Vercel permite una sola región, pero permite elegir cuál.** No hace falta pagar nada para arreglar esto; hace falta acordarse.

### 1.2 El cron del plan gratuito de Vercel es diario, y la especificación pide horario

`10`, 6.1 dice: **cada hora**, buscar resultados `loaded` con más de 72 horas y sin disputa, y confirmarlos.

**El plan Hobby de Vercel admite cron una vez por día como máximo**, y una expresión más frecuente **falla en el despliegue**, no en ejecución: `0 * * * *` rompe el deploy con un error explícito.

No es un detalle de performance. La pantalla que diseñó Claude Design muestra un contador —*"Quedan N horas para que se dé por confirmado solo"*—; con un cron diario ese contador llega a cero y no pasa nada durante hasta 24 horas más. Se ve roto porque **está** roto.

**Tres salidas, y recomiendo la segunda:**

| Salida | Costo | Contra |
|---|---|---|
| Vercel **Pro** | **USD 20/mes** (incluye 1 asiento y USD 20 de crédito de uso) | Pagar por una sola línea de cron, con el producto todavía sin ingresos (`06`, D-31) |
| **`pg_cron` en Supabase**, llamando al endpoint del servicio con `pg_net` | **Gratis** | Una pieza más que configurar |
| Aflojar la regla a diaria | Gratis | **Cambia una regla de negocio para acomodarse a un plan de hosting.** Es exactamente al revés de como conviene decidir |

**Por qué `pg_cron`:** deja la regla de negocio donde tiene que estar y **desacopla el plazo de 72 horas del plan de hosting**. Además vive al lado del dato, que es donde la tarea opera.

**Un detalle importante para no romper `10`, 2.1:** la tarea **no debe escribir SQL por su cuenta**. `pg_net` llama por HTTP al endpoint del servicio —protegido con un secreto en la cabecera— para que **la tarea programada ejecute exactamente el mismo código que un usuario**, que es la regla que sostiene toda la arquitectura de servicios.

**Y un efecto lateral que viene bien:** los proyectos gratuitos de Supabase **se pausan tras una semana sin actividad**. Una tarea que corre cada hora los mantiene despiertos sin que haya que hacer nada.

---

## 2. Hosting

**Recomendación: Vercel Hobby + Supabase Free, ambos en San Pablo, y subir de plan cuando haya una razón concreta.**

| | Gratis | Cuándo obliga a subir |
|---|---|---|
| **Vercel Hobby** | 1 región de funciones, cron diario | Un segundo desarrollador que despliegue; cron propio; varias regiones. **Pro: USD 20/mes** |
| **Supabase Free** | 500 MB de base, 1 GB de archivos, 50.000 usuarios activos por mes, 5 GB de egreso; **se pausa a la semana sin actividad** | El egreso o los 500 MB. **Pro: USD 25/mes**, con backups diarios y 7 días de retención de logs |

**El límite que va a llegar primero no es la base: es el egreso y el almacenamiento de imágenes.** Escudos de equipo, logos de torneo y fotos de perfil son archivos que crecen con cada equipo, y 1 GB se consume rápido. Conviene **fijar límites de tamaño y comprimir al subir desde el día uno** — es mucho más barato que migrar después.

**Lo que sí conviene contratar antes de tener usuarios reales: Supabase Pro, por los backups diarios.** No por capacidad — por no perder el primer torneo real de alguien. Con datos de terceros adentro, USD 25/mes es seguro, no infraestructura.

---

## 3. Observabilidad

**Recomendación: Sentry en el plan gratuito, y separar dos cosas que se confunden.**

### 3.1 Errores y alertas — Sentry

El plan gratuito da **5.000 errores por mes, 1 usuario y 30 días de retención**. Para un MVP sin tráfico sobra; el escalón siguiente es Team, **USD 26/mes**, con usuarios ilimitados.

Cubre los dos criterios de aceptación de T28: el error no controlado queda registrado con contexto sin exponer nada al usuario, y **la tarea programada que falla dispara una alerta** —Sentry tiene monitoreo de cron con *check-ins*, que es exactamente lo que hace falta cuando la tarea corre desde `pg_cron` y no desde el hosting—.

**Por qué importa más acá que en otros productos:** `09`, 7.3 lo dice — con el producto construido por un agente, **la observabilidad es la única forma de enterarse de una regresión que los tests no cubrieron**. Es la contraparte de T27, no un extra.

### 3.2 Métricas de producto — y la mayoría **no** necesita una herramienta

Acá está la confusión que conviene evitar. El set tiene **valores de arranque que hay que calibrar con datos de uso** (`06`, D-51, D-61): los umbrales del score, el límite de torneos de una organización sin verificar, el plazo de despublicación.

**Casi todo eso ya está en Postgres.** Cuántos partidos confirmados tiene cada equipo, cuántos torneos jugó, cuántos torneos publicados sin inscripciones lleva una organización a los 30 días — son consultas, no eventos de analítica. **Para calibrar D-61 y D-51 no hace falta contratar nada.**

Lo que una herramienta de analítica sí aporta es **lo que no deja rastro en la base**: cuánta gente abre una ficha de torneo y no se inscribe, dónde se cae el descubrimiento, si el estado vacío de una ciudad sin torneos convierte o expulsa. **Eso hay que instrumentarlo desde el día uno, porque no se puede reconstruir hacia atrás.**

**Recomendación:** Vercel Web Analytics (viene con el hosting, sin cookies) o Plausible/Umami si se quiere autohospedar, con **cuatro eventos y nada más** al principio: ficha de torneo vista, inscripción iniciada, inscripción enviada, y ciudad sin torneos. Más eventos al arranque es ruido que nadie mira.

---

## 4. Íconos de la PWA

**No es una decisión de infraestructura: está bloqueada por la identidad gráfica**, que es lo único del proyecto que sigue sin definirse. El nombre está decidido —INVICTA, `06`, D-84— pero el logo y el isotipo **no son alcance del brief** (`08`, 12).

**Recomendación: no bloquear el despliegue por esto.** Los íconos de una PWA se reemplazan cambiando archivos y el manifiesto; no hay migración ni datos de por medio.

**Qué poner mientras tanto:** el escudo con la **I** que ya aparece en la prueba de identidad, o simplemente la letra en la tipografía del sistema —Barlow Condensed 700— en cian sobre `#0E1720`, que son los colores que el Design System ya fijó. Se ve intencional, no provisorio.

**Los tamaños que hay que generar** para que la instalación funcione bien en Android y en iOS: 192×192 y 512×512 en PNG —el de 512 también en versión *maskable*, con margen de seguridad— más el `apple-touch-icon` de 180×180. Vale la pena hacerlo bien ahora: **en iOS, la instalación como PWA es lo que habilita las notificaciones push** (`09`, 8.1), que es el riesgo técnico más concreto del stack y cae sobre la notificación de mayor valor del producto.

---

## 5. Dominio — resuelto

**`invicta.com.ar`, ya registrado** (`06`, D-97).

`.com.ar` es lo que alguien escribe sin pensar para un producto argentino, y transmite localía — que es exactamente lo que corresponde a un test de mercado en una ciudad.

**Lo que la búsqueda en INPI dejó a la vista, y por qué se siguió igual:** hay una marca **`I INVICTA` viva en clase 9** —Invicta S.p.A., de Turín, vigente hasta 2031— con **protección amplia**: cubre toda la clase salvo cinco exclusiones puntuales, así que el software entra. **El nombre no es registrable como marca.**

La decisión fue seguir, y el fundamento es de escala: este es un **test de mercado local**, y la probabilidad de que una fábrica italiana de mochilas accione contra quince organizadores de una ciudad es despreciable. El costo de seguir buscando nombres superaba al del riesgo.

**Las dos contrapartidas que sí conviene respetar:**

1. **No invertir en identidad gráfica todavía.** El logo sigue sin definirse y conviene que siga así hasta que el test diga algo.
2. **Mantener el nombre reemplazable en el código** — una constante y los textos de interfaz, nunca desparramado. Si el test funciona y hay que formalizar, el cambio es una línea.

**Un detalle del INPI que vale como método para la próxima vez:** el campo que decide es **`PROTECCIÓN`**. Si dice *"Excepto"*, el registro cubre toda la clase menos lo que liste, y te tapa. Si en cambio enumera productos concretos, es angosto y podés convivir. Se ve en diez segundos expandiendo el acta.

---

## 6. Qué hacer ahora, y en qué orden

**Se puede desplegar sin resolver el dominio ni el logo.** Ninguno de los dos bloquea T28: se despliega en el subdominio que da Vercel, con íconos tipográficos, y se cambian los dos después sin tocar código de negocio.

| # | Decisión | Recomendación | Costo | ¿Bloquea T28? |
|---|---|---|---|---|
| 1 | **Región** | Supabase en `sa-east-1`, funciones en `gru1` | Gratis | **Sí — y es lo primero** |
| 2 | **Tarea horaria** | `pg_cron` + `pg_net` llamando al endpoint del servicio | Gratis | **Sí** |
| 3 | **Hosting** | Vercel Hobby + Supabase Free; **Supabase Pro antes del primer torneo real**, por los backups | USD 0 → 25/mes | No |
| 4 | **Observabilidad** | Sentry gratuito + 4 eventos de producto | Gratis | Parcial |
| 5 | **Íconos PWA** | Placeholder tipográfico con los colores del Design System | Gratis | No |
| 6 | **Dominio** | ✅ `invicta.com.ar` registrado. Sin registro de marca, por decisión (D-97) | Hecho | No |

**Lo que sí conviene decidir antes de escribir la primera línea de T28 son las dos primeras**, porque cambiarlas después significa migrar la base de región y reescribir la tarea programada.
