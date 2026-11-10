# Salir a producción, con un ambiente de pruebas al lado

Los pasos a ejecutar, en orden. Cada uno dice **qué hacer**, **dónde**, y
**cómo comprobar que salió bien** antes de pasar al siguiente. Si algo no
da lo que dice acá, parar: seguir con un paso a medias es lo que después
cuesta una tarde de encontrar.

Son tres bloques:

- **A — Producción**: cerrar el agujero de permisos, desplegar y dejarla limpia.
- **B — Ambiente de pruebas**: Supabase nuevo, Vercel, datos demo.
- **C — Abrir**: qué les pasás a los dueños.

Hacé A completo antes de empezar B.

---

## Dos cosas que explican media guía

**1. Las tareas programadas no corren en Vercel.** Corren adentro de la
base de datos, con `pg_cron`, y le pegan al sitio por HTTP. Por eso cada
base necesita saber a qué sitio pegarle. Antes esa dirección estaba
escrita en el código —con lo cual un Supabase nuevo le hubiera disparado
al sitio real— y ahora sale de un secreto del Vault de cada proyecto.

**2. Supabase le concede `ALL` al rol público sobre cada tabla nueva.**
En un proyecto que usa Supabase para todo, eso se compensa con RLS. Acá
no: la aplicación habla con Postgres **directo** por `DATABASE_URL` y
usa Supabase sólo para Auth y Storage, así que nunca hubo una política
de RLS porque nunca hizo falta.

Eso sería alcanzable con la anon key —que es pública, viaja en el bundle
del navegador— **si la Data API estuviera prendida**. En producción
estaba apagada, así que no hubo exposición: no había camino HTTP. Pero
dejaba toda la protección colgando de un toggle del panel, y los
*default privileges* iban a seguir concediendo cada tabla nueva. Por eso
se cierra por abajo, con una migración.

---

# Bloque A — Producción

## A1. La Data API ✅ (verificado el 06/11: ya estaba apagada)

**Dónde:** Supabase de producción → Project Settings → Data API.

Confirmado en off, y así tiene que quedar. Es lo correcto: la
aplicación tiene 14 llamadas a `.auth` y 1 a `.storage` —endpoints
distintos, `/auth/v1` y `/storage/v1`— y **ninguna** a la Data API.

El cartel «No schemas can be queried» es esperado y, para esta
aplicación, inofensivo.

Que estuviera apagada es lo que hizo que los permisos de `anon` no
fueran alcanzables desde afuera. Lo que A2 agrega es que dejen de
depender de este toggle.

## A2. Desplegar ✅ (06/11)

**Dónde:** tu máquina y Vercel.

```bash
git checkout <la-rama-por-defecto>
git merge claude/invictos-proyecto-analysis-211omo
git push
```

Esperá a que el deploy de Production termine en verde. Las migraciones
corren solas en el build (`vercel.json` → `migrate:deploy && next build`);
no hay que correr nada a mano.

Este deploy lleva dos cosas que importan acá:

- La migración que le **quita a `anon` y `authenticated` todo permiso**
  sobre `public`, y arregla los *default privileges* para que las tablas
  que cree la próxima migración no vuelvan a nacer concedidas.
- El host de las tareas saliendo del Vault en vez de estar escrito en el
  código.

## A3. Comprobar producción ✅ (06/11 — queda mirar el SMTP, abajo)

**Dónde:** Supabase de producción → SQL Editor.

Pegá entero el contenido de **`db/consultas/diagnostico-de-ambiente.sql`**
y ejecutalo. Devuelve cuatro filas, siempre — y eso es a propósito: tres
consultas sueltas que devuelven cero filas son ambiguas, porque cero es
la respuesta correcta para una y la equivocada para otra.

En un ambiente desplegado y sano dice:

| chequeo | resultado |
|---|---|
| permisos de anon/authenticated | `OK — cero permisos (cerrado)` |
| secreto host_canonico | `OK — apunta a https://www.invicta.com.ar` |
| tareas programadas | `confirmar-resultados-vencidos => lee host_canonico (OK)`, lo mismo `recalcular-score`, y `limpiar-intentos-limitados => no sale a la red (SQL local)` |
| migración de permisos | `OK — aplicada DD/MM HH:MM` |

La misma consulta sirve para el ambiente de pruebas (paso B8).

Si (2) no devuelve nada, cargalo a mano y las tareas vuelven a andar:

```sql
select vault.create_secret('https://www.invicta.com.ar', 'host_canonico');
```

**Revisá también el SMTP de producción.** Authentication → Emails →
SMTP Settings: tiene que decir que el SMTP propio está **habilitado**.
Si está en el remitente de Supabase, los correos de Auth —confirmar
cuenta y recuperar contraseña— **sólo llegan a los miembros del
proyecto de Supabase**; a cualquier otra dirección Supabase se niega a
mandarlos. Es un límite del servicio, no del plan, y no avisa en el
producto: la persona pide el enlace, la aplicación responde "te lo
mandamos", y el correo nunca sale. Dos minutos de mirar una pantalla
contra un problema que no se ve desde adentro.

**Y que el sitio siga sano:** entrá a `www.invicta.com.ar`, iniciá
sesión y abrí una ficha de torneo. Si el login anda, Auth está bien; si
se ven las fotos, Storage está bien. Es todo lo que podría haberse roto
al apagar la Data API, y no debería.

## A4. Dejar producción sin datos demo ⏸️ (postergado a propósito)

Hay **dos formas**. La primera no necesita tener el proyecto instalado.

### Forma 1 — desde el SQL Editor (más simple)

Pegá entero el contenido de **`db/consultas/auditoria-de-datos-demo.sql`**
en el SQL Editor de producción y ejecutalo. Sólo lee, no modifica nada.

Devuelve ocho filas. Las seis primeras tienen que dar **0**. Las dos
últimas son para comparar: dicen cuántas filas **no** demo hay, así
"todo en cero" no puede confundirse con "la base está vacía".

### Forma 2 — desde tu máquina

Necesita el proyecto instalado: ver
**`preparar-la-maquina-windows.md`**. Con un archivo `.env` en la raíz
que tenga **una sola línea**:

```
DATABASE_URL=<la cadena de conexión de producción>
```

Importa que **no** esté `NEXT_PUBLIC_AMBIENTE`: esa ausencia es lo que
hace que el script se reconozca en producción y se niegue a escribir.

```bash
npm run demo:auditar
```

Imprime el ambiente y el host **antes** de mirar nada, y termina con
código 1 si encuentra algo, así que también sirve en un paso
automático.

### Si aparece algo

Son datos de alguna corrida vieja del seed. Para borrarlos hace falta
la forma 2, porque la limpieza respeta el orden de dependencias entre
tablas y eso no es una consulta suelta:

```bash
# 1. Agregá al .env:  NEXT_PUBLIC_AMBIENTE=pruebas
npm run demo:limpiar -- --confirmar
# 2. Sacá esa línea del .env
npm run demo:auditar   # tiene que dar cero
```

> Que haya que poner esa variable a mano para borrar en producción es a
> propósito: tiene que ser un acto deliberado, no algo que pase por
> tener el archivo equivocado abierto.

**Ojo con una distinción.** `demo:limpiar` borra **sólo** lo marcado
como demo: cuentas `@demo.invicta.com.ar` y entidades con `[DEMO]` en
el nombre. Las cuentas de prueba que hayas creado a mano con un mail
real no las ve el auditor ni las toca la limpieza — ésas se deciden
aparte.

---

# Bloque B — Ambiente de pruebas

## B1. Crear el proyecto de Supabase ✅ (10/11)

**Dónde:** panel de Supabase → New project.

| Campo | Qué poner |
|---|---|
| **Organization** | La que ya tenés |
| **GitHub (optional)** | **No conectar** |
| **Project name** | `invicta-pruebas` |
| **Database password** | «Generate a password», y **guardala ya**: no se puede volver a ver |
| **Region** | «Need a specific region?» → **South America (São Paulo)**. Vercel corre en `gru1`, que es São Paulo |
| **Enable Data API** | **destildar** |
| **Automatically expose new tables** | **destildar** |
| **Enable automatic RLS** | dejar como está |

**Por qué no conectar GitHub:** esa opción hace que Supabase despliegue
cambios de esquema desde el repositorio, y las migraciones ya las corre
el build de Vercel. Dos cosas sobre el mismo esquema se pisan.

**Sobre las dos casillas de Security:** la migración del bloque A cierra
los permisos igual, así que esto es la segunda capa, no la única. Pero
destildarlas deja el proyecto cerrado desde el minuto cero.

> Si el **Table Editor** del panel no anda con la Data API apagada,
> volvé a prenderla y dejá «Automatically expose new tables» apagada. El
> **SQL Editor funciona de las dos formas**, que es lo que hace falta
> para B3.

**Cuando termine de crearse**, anotá de **Project Settings → Data API**:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (**secreta**)

Y las **cadenas de conexión**: botón **Connect**, arriba de todo en la
página del proyecto. Ahí hay tres y **no son equivalentes** — hay que
anotar dos:

| La que dice | Puerto | Para qué |
|---|---|---|
| **Transaction pooler** | `6543` | La aplicación (`DATABASE_URL`) |
| **Session pooler** | `5432` | Las migraciones (`DATABASE_URL_MIGRACIONES`) y tu `.env` local |
| ~~Direct connection~~ | `5432` | **No usar.** En los proyectos nuevos resuelve sólo por IPv6, y ni el build de Vercel ni tu máquina lo hablan |

Las dos traen `[YOUR-PASSWORD]`: reemplazalo por la contraseña, los
corchetes incluidos.

Es la contraseña que pusiste al **crear** el proyecto, y el panel no la
vuelve a mostrar nunca. Si no la guardaste: Settings → Database → **Reset
database password**, que genera una nueva. Hacelo antes de cargar nada,
porque al resetearla cambian las dos cadenas y habría que volver a
pegarlas en Vercel.

> **Por qué dos.** La aplicación corre en funciones sin servidor y
> necesita el modo transacción, donde el lugar en el pooler se ocupa
> sólo mientras dura una consulta; con el modo sesión se agota el cupo
> y ya causó una caída real en producción. Las migraciones, en cambio,
> **no pueden** ir por modo transacción: `node-pg-migrate` se protege
> de dos despliegues simultáneos con un advisory lock, que es de
> sesión, y por el pooler se tomaría en una conexión y se liberaría en
> otra — dejando el despliegue siguiente colgado.

> Las claves siguen ahí aunque la Data API esté apagada: `anon` y
> `service_role` son claves de Auth y Storage también.

**Comprobación:** el proyecto figura *Active* y tenés las cuatro cosas.

## B2. Configurar Auth ✅ (10/11)

**Dónde:** proyecto de pruebas → Authentication → URL Configuration.

- **Site URL**: `https://pruebas.invicta.com.ar`
- **Redirect URLs**: agregá `https://pruebas.invicta.com.ar/**`

### B2.1 — SMTP propio, **primero**

**Dónde:** Authentication → Emails → SMTP Settings → Enable custom SMTP.

Sin esto, la pantalla de plantillas dice *"Set up custom SMTP to edit
templates"* y no deja editar nada. No es un capricho del panel: desde el
3 de junio de 2026 los proyectos nuevos del plan gratuito que usan el
remitente propio de Supabase **no pueden modificar las plantillas de
Auth**. Los proyectos viejos conservan las suyas; por eso producción
tiene las dos con `token_hash` y el proyecto de pruebas, recién creado,
no te deja ponerlas.

Pero el remitente de Supabase tiene dos límites peores que ese, y los
dos se levantan con SMTP propio:

| | remitente de Supabase | con SMTP propio |
|---|---|---|
| a quién le manda | **sólo a los miembros del proyecto**; cualquier otra dirección falla con *"Email address not authorized"* | a cualquiera |
| cuántos | 2 por hora | 30 por hora (ajustable en Rate Limits) |
| plantillas | no se editan (proyectos nuevos, plan gratuito) | se editan |

El de "sólo miembros del proyecto" es el que importa acá: los dueños de
los torneos no son miembros del proyecto de Supabase, así que cualquier
correo de Auth que les toque **no les va a llegar**.

Con la misma cuenta de Resend que ya usás para los correos de producto:

| campo | valor |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` (literal, esa palabra) |
| Password | tu API key de Resend, la que empieza con `re_` |
| Sender email | **sólo la dirección**: `avisos@invicta.com.ar` |
| Sender name | `INVICTA (pruebas)` |

**Ojo con el Sender email.** La variable `CORREO_REMITENTE` que ya está
en Vercel vale `INVICTA <avisos@invicta.com.ar>` —nombre y dirección
juntos, que es el formato que pide la API de Resend—. Supabase los pide
en **dos campos separados**: en *Sender email* va sólo
`avisos@invicta.com.ar`, sin el nombre ni los `<>`. Si pegás la variable
entera ahí, el correo sale mal o Resend lo rechaza.

Dónde está el valor, si no lo tenés a mano: Vercel → Settings →
Environment Variables → filtrá `Production` → `CORREO_REMITENTE`. O en
el panel de Resend → Domains, que es el dominio verificado.

La dirección tiene que estar en un dominio verificado en Resend — si es
el mismo que producción, ya lo está (SPF, DKIM y DMARC se hicieron el
02/10).

**Comprobación:** la pantalla de Templates deja escribir. Si sigue
diciendo que necesitás SMTP, no quedó guardado.

### B2.2 — Las plantillas

**Dónde:** Authentication → Emails → Templates. Dos plantillas, con
`token_hash`:

- **Magic Link**:
  ```
  {{ .SiteURL }}/acceso/confirmar?token_hash={{ .TokenHash }}&type=magiclink
  ```
- **Reset Password**:
  ```
  {{ .SiteURL }}/restablecer-password/confirmar?token_hash={{ .TokenHash }}&type=recovery
  ```

> **Por qué `token_hash`:** el enlace por defecto apunta a un `GET` de
> Supabase que consume el token y recién después redirige. Los escáneres
> de correo abren los enlaces para revisarlos, así que el token se
> quemaba antes de que la persona hiciera clic. Con `token_hash` el
> enlace cae en una pantalla nuestra que no canjea nada: muestra un
> botón, y el canje lo hace el `POST` de ese botón.

**Comprobación:** las dos plantillas muestran `token_hash`, y la lista
de Redirect URLs tiene la línea con `/**`.

### Si decidís abrir pruebas sin SMTP propio

Se puede, porque **las cuentas demo no necesitan ningún correo**: el
seed las crea ya confirmadas de los dos lados —en Supabase Auth y en
`usuario.email_confirmado`— y se entra con email y contraseña. Para lo
que vas a mostrar en el bloque C, alcanza.

Lo que queda roto, para que no te sorprenda:

| flujo | sin SMTP propio |
|---|---|
| entrar con una cuenta demo | **anda** (contraseña, sin correo) |
| verificar una organización | **anda** — ese correo lo escribimos nosotros y sale por Resend, no por Supabase, así que no depende ni de la plantilla ni del remitente |
| registrar una cuenta nueva | el correo no llega (dirección no autorizada), y si llega, el enlace por defecto cae en `/acceso/confirmar` sin `token_hash` y la pantalla dice **"El enlace está incompleto"** |
| "Reenviar enlace de confirmación" | lo mismo |
| "Olvidé mi contraseña" | lo mismo |

Ojo con uno: el seed deja **una cuenta demo sin confirmar** a propósito,
para poder ver el bloqueo de `verificarCuentaConfirmada`. Si un dueño
entra con ésa y toca "Reenviar enlace", cae justo en el flujo roto.

## B3. Cargar los dos secretos del Vault ✅ (10/11)

**Dónde:** proyecto de pruebas → SQL Editor.

Inventá un `CRON_SECRET` para pruebas, **distinto al de producción**.
Cualquier cadena larga al azar. Guardalo: lo vas a volver a usar en B5.

```sql
select vault.create_secret('https://pruebas.invicta.com.ar', 'host_canonico');
select vault.create_secret('EL-CRON-SECRET-QUE-INVENTASTE', 'cron_secret');
```

Reglas del valor de `host_canonico`: **sin barra al final**, y **que no
redirija**.

> `pg_net` usa libcurl, y libcurl **descarta la cabecera `Authorization`
> al seguir una redirección que cambia de host**, por seguridad y sin
> avisar. Si la URL redirige, el pedido llega sin credencial y la
> aplicación lo rechaza con "sin permiso" — que te manda a buscar el
> problema al secreto en vez de a la URL. Ya pasó una vez en producción.

**Comprobación:**

```sql
select name from vault.decrypted_secrets where name in ('host_canonico','cron_secret');
```

Tiene que devolver **las dos filas**.

## B4. Crear la rama ✅ (10/11)

**Dónde:** tu máquina (PowerShell, en la carpeta del proyecto).

La rama por defecto del repositorio hoy es
`claude/invictos-proyecto-analysis-211omo` — es la única que existe, y
es la que Vercel despliega como producción. De ahí sale `pruebas`.

```powershell
cd ~\InvictosApp
git checkout claude/invictos-proyecto-analysis-211omo
git pull
git checkout -b pruebas
git push -u origin pruebas
```

**Comprobación:** `git branch` muestra `* pruebas`, y el `push` termina
con `branch 'pruebas' set up to track 'origin/pruebas'`.

> **Por qué una rama aparte.** Vercel despliega la rama por defecto como
> **Production** y cualquier otra rama como **Preview**. Las variables
> que cargás en B5 están tildadas sólo en `Preview`, así que es la rama
> `pruebas` —y no producción— la que va a tomar el Supabase de pruebas y
> el cartel amarillo. Mientras no toques esta rama, producción sigue
> exactamente como está.

## B5. Variables en Vercel

**Dónde:** proyecto de Vercel → Settings → Environment Variables.

Por cada una: nombre, valor, y **tildar sólo `Preview`** (destildar
Production y Development).

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_AMBIENTE` | `pruebas` |
| `DATABASE_URL` | la del **Transaction pooler**, puerto `6543` |
| `DATABASE_URL_MIGRACIONES` | la del **Session pooler**, puerto `5432` |
| `NEXT_PUBLIC_SUPABASE_URL` | la de B1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la de B1 |
| `SUPABASE_SERVICE_ROLE_KEY` | la de B1 |
| `NEXT_PUBLIC_SITE_URL` | `https://pruebas.invicta.com.ar` |
| `CRON_SECRET` | el de B3, **idéntico** |
| `RESEND_API_KEY` | la misma de producción, o una de prueba |
| `CORREO_REMITENTE` | el mismo de producción, **entero**: `INVICTA <avisos@invicta.com.ar>` |
| `SENTRY_DSN` | uno aparte, o dejarla sin definir |

**Las dos cadenas son obligatorias.** Si falta
`DATABASE_URL_MIGRACIONES`, el despliegue **falla en el build** con un
mensaje que lo explica — no se rompe en silencio, pero te traba hasta
que la cargues.

**`CRON_SECRET` tiene que ser idéntico al del Vault de B3.** Son los dos
lados de la misma cerradura: la base lo manda en la cabecera y la
aplicación lo compara. Si no coinciden, las tareas dan 403.

**Revisá que Production quedó como estaba:** filtrá por `Production` y
confirmá que `NEXT_PUBLIC_AMBIENTE` **no está**, o está en `produccion`.
Nunca en `pruebas`.

## B6. El dominio

**Dónde:** Settings → Domains → Add.

1. Agregá `pruebas.invicta.com.ar`.
2. Cuando pregunte a qué rama, elegí `pruebas`.
3. Cargá en tu DNS el registro que Vercel indique (suele ser un `CNAME`
   a `cname.vercel-dns.com`).

> **Sin dominio fijo no sirve:** la URL de un Preview cambia en cada
> deploy y no se la podés pasar a nadie.

**Comprobación:** abrís `https://pruebas.invicta.com.ar` y carga, con
**una banda amarilla arriba** que dice «Ambiente de pruebas — los datos
no son reales». Si la banda no está, `NEXT_PUBLIC_AMBIENTE` no quedó en
Preview: volvé a B5.

## B7. Sembrar los datos demo

**Dónde:** tu máquina. Si todavía no la preparaste, empezá por
**`preparar-la-maquina-windows.md`** — este paso no se puede hacer
desde el panel de Supabase: el seed pasa por los servicios reales del
producto y crea las cuentas en Supabase Auth.

`.env` con **esto y sólo esto**:

```
NEXT_PUBLIC_AMBIENTE=pruebas
DATABASE_URL=<la del Session pooler, puerto 5432>
NEXT_PUBLIC_SUPABASE_URL=<la de B1>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<la publishable, de B1>
SUPABASE_SERVICE_ROLE_KEY=<la secreta, de B1>
```

> Acá va la del **Session pooler**, no la de transacción: `migrate:up`
> necesita la sesión fija del advisory lock, igual que el despliegue. Y
> el seed anda bien por ahí.

```bash
npm run migrate:up      # si el deploy de la rama ya corrió, no hace nada
npm run demo:sembrar
npm run demo:validar
```

> El `migrate:up` está por si querés sembrar antes de que Vercel
> despliegue la rama: sin esquema no hay dónde sembrar. Si el deploy ya
> pasó, la base ya está migrada y el comando no hace nada.

**Lo primero que imprime `demo:sembrar` son dos líneas. Leelas:**

```
  ambiente: pruebas
  base:     db.xxxx.supabase.co:5432/postgres
```

Si dice `produccion`, el script corta solo y no escribe nada. Si el host
no es el de pruebas, cortá vos con Ctrl+C. El error fácil acá no es
ignorar una advertencia: es tener el `.env` equivocado y no notarlo.

**Al final imprime las once cuentas** con su mail exacto y la contraseña
compartida. **Copialas de ahí**, no de ningún documento: así no pueden
estar desactualizadas.

### Qué queda sembrado

| Torneo | Estado |
|---|---|
| `[DEMO] Apertura Palermo F5` | en curso, con partidos jugados |
| `[DEMO] Liga Masculina Norte F11` | finalizado, con campeón |
| `[DEMO] Copa Femenina Primavera F7` | inscripciones abiertas, una pendiente |
| `[DEMO] Copa Costanera F9` | por empezar, fixture confirmado |
| `[DEMO] Copa Misiones` | certamen con divisiones A y B |
| `[DEMO] Copa Borrador F7` | borrador sin publicar |

**Comprobación:** `demo:validar` termina sin errores, y en
`https://pruebas.invicta.com.ar/torneos` —eligiendo una ciudad— aparecen
torneos con `[DEMO]`.

## B8. La comprobación final, la más barata

Las dos pestañas, una al lado de la otra:

- `https://pruebas.invicta.com.ar` → **se ve la banda amarilla**.
- `https://www.invicta.com.ar` → **no se ve ninguna banda**.

Si las dos se ven iguales, algo quedó mal en B5 y hay que arreglarlo
antes de pasarle el enlace a nadie.

Y en el SQL Editor **de pruebas**, que la migración también cerró ahí:

```sql
select table_name from information_schema.role_table_grants
where grantee in ('anon', 'authenticated') and table_schema = 'public';
```

Cero filas.

---

# Bloque C — Abrir a los dueños

Un mensaje con:

1. **El enlace**: `https://pruebas.invicta.com.ar`
2. **Que es un ambiente de pruebas**: los torneos que ven son
   inventados, y lo que carguen se puede borrar sin aviso cuando se
   resiembre. La banda amarilla se los recuerda.
3. **Cómo entrar**, de las dos formas:
   - Con una cuenta demo (el mail y la contraseña que imprimió el seed).
     La de `organizador` es la que más les sirve: ve el panel completo,
     con torneos en todos los estados.
   - Con su propio mail, registrándose, si quieren probar el alta.
4. **Dónde te escriben** lo que encuentren.

### Si alguien no recibe el correo de confirmación

Es lo primero que va a pasar. Dos causas, en orden de probabilidad:

1. **Resend en modo sandbox** sólo entrega a direcciones verificadas.
   Afecta al correo de verificación de organización. Se arregla
   verificando el dominio en Resend, o agregando esas direcciones.
2. **El correo de confirmación de cuenta** lo manda Supabase Auth, no
   Resend, y tiene un límite de envíos por hora en el plan gratuito.

Mientras tanto, siempre podés pasarles una cuenta demo.

---

## Para después

**Resembrar pruebas**, con el `.env` de pruebas: `npm run demo:reset`.
Borra lo demo, lo vuelve a sembrar y lo valida. Lo que hayan cargado los
dueños con sus propias cuentas **no** se borra: la limpieza sólo toca lo
marcado como demo.

**El correo de producto está apagado** en los dos ambientes, por
decisión (`CORREO_DE_PRODUCTO_ACTIVO` en
`services/notificaciones/tipos.ts`). Lo único que sale por mail es lo de
la cuenta; las notificaciones viven dentro de la aplicación.

**Si cambiás el dominio de pruebas**, hay que actualizar tres lugares:
el secreto `host_canonico` del Vault, `NEXT_PUBLIC_SITE_URL` en Vercel, y
las URLs de Auth en Supabase.
