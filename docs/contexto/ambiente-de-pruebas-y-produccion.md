# Salir a producción con un ambiente de pruebas al lado

Paso a paso de lo que hay que hacer **fuera del repositorio**: un sitio
de pruebas con datos demo para pasarles a los dueños de torneos, y una
producción que no se contamine.

Está escrito para seguirlo de arriba abajo, una sola vez. Cada paso dice
qué hacer, dónde, y **cómo comprobar que salió bien** antes de pasar al
siguiente. Si algo no da lo que dice acá, parar ahí: seguir con un paso
a medias es lo que después cuesta una tarde de encontrar.

La forma elegida: **un solo proyecto de Vercel con dos ramas**.
Producción sale de la rama por defecto; una rama `pruebas` se despliega
como Preview, con su propio dominio y sus propias variables, apuntando a
un Supabase aparte.

---

## Antes de empezar

Tené a mano:

- Acceso al panel de Supabase (el proyecto de producción, y vas a crear otro).
- Acceso al proyecto de Vercel.
- Acceso al DNS de `invicta.com.ar` (para el subdominio de pruebas).
- El repositorio clonado en tu máquina, con `npm install` hecho.

Y entendé una cosa antes de tocar nada, porque explica media guía:

> **Las tareas programadas no corren en Vercel. Corren adentro de la
> base de datos**, con `pg_cron`, y le pegan al sitio por HTTP. Por eso
> cada base necesita saber a qué sitio pegarle. Antes esa dirección
> estaba escrita en el código; ahora sale de un secreto del Vault de
> cada proyecto de Supabase. Si no se lo cargás al de pruebas, sus
> tareas **no hacen nada** — a propósito, para que no le peguen al sitio
> real.

---

## Paso 0 — Comprobar que producción no está expuesta por la Data API

Antes que nada, porque si está mal es más urgente que todo lo demás.

**Dos hechos de este producto:** la aplicación usa Supabase **sólo para
Auth y para subir imágenes** —no hay una sola llamada a la Data API
(PostgREST)— y **ninguna tabla tiene RLS**, porque la aplicación se
conecta a Postgres directo con `DATABASE_URL`.

Si el proyecto de producción se creó con «Enable Data API» y
«Automatically expose new tables» prendidas (los valores por defecto),
esas dos cosas juntas significan que **cualquiera con la anon key puede
leer todas las tablas**, `usuario` y sus mails incluidos. La anon key no
es secreta: viaja en el bundle del navegador, es una `NEXT_PUBLIC_`.

Con los valores de **Project Settings → Data API** de producción:

```bash
curl -s "https://TU-PROYECTO.supabase.co/rest/v1/usuario?select=email&limit=1" \
  -H "apikey: TU-ANON-KEY"
```

- Devuelve `[]` o un error de permisos → está bien, seguí al paso 1.
- **Devuelve un mail** → está expuesto. Se cierra en
  **Project Settings → Data API**, apagando la Data API (la aplicación
  no la usa) o, si preferís dejarla, quitándole los permisos al rol
  `anon` sobre el esquema `public`.

---

## Paso 1 — Crear el proyecto de Supabase de pruebas

**Dónde:** panel de Supabase → New project.

| Campo | Qué poner |
|---|---|
| **Organization** | La que ya tenés |
| **GitHub (optional)** | **No conectar** (ver abajo) |
| **Project name** | `invicta-pruebas` |
| **Database password** | «Generate a password», y **guardala ya**: no se puede volver a ver y la necesitás para el `DATABASE_URL` |
| **Region** | «Need a specific region?» → **South America (São Paulo)**. Vercel corre en `gru1`, que es São Paulo. Si producción está en otra, usá la misma |

**Por qué no conectar GitHub:** esa opción hace que Supabase despliegue
cambios de esquema desde el repositorio, y las migraciones ya las corre
el build de Vercel (`vercel.json` → `migrate:deploy && next build`). Dos
cosas desplegando el mismo esquema se pisan.

### Security — las dos casillas que importan

| Opción | Qué poner | Por qué |
|---|---|---|
| **Enable Data API** | **destildar** | La aplicación no la usa. Es una API REST pública sobre el esquema que no le sirve a nadie acá, y es superficie de ataque gratis |
| **Automatically expose new tables** | **destildar** | Es la que concede permisos al rol público sobre cada tabla nueva. Sin RLS, eso es lectura abierta de todo. Supabase mismo recomienda apagarla |
| **Enable automatic RLS** | dejar destildada | Con la Data API apagada no cambia nada, y la aplicación se conecta como dueña de las tablas, que saltea RLS igual |

> **Si el Table Editor del panel no anda** con la Data API apagada,
> volvé a prenderla y dejá **«Automatically expose new tables» apagada**,
> que es la que realmente abre la puerta. El **SQL Editor funciona de
> las dos formas**, que es lo que hace falta para el paso 3.

### Cuando termine de crearse

Andá a **Project Settings → Data API** y copiá a un lado:

- `Project URL` → es tu `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → es tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → es tu `SUPABASE_SERVICE_ROLE_KEY` (**esta es secreta**:
  nunca va a un archivo del repositorio ni a una variable `NEXT_PUBLIC_`)

Y en **Project Settings → Database → Connection string → URI**, la
cadena de conexión con la contraseña del punto 3 → es tu `DATABASE_URL`.

> Si la cadena trae `[YOUR-PASSWORD]`, reemplazalo por la contraseña real.

> Las claves siguen estando en esa pantalla aunque la Data API esté
> apagada: `anon` y `service_role` son claves de Auth y Storage también,
> no sólo de PostgREST.

**Cómo saber que salió bien:** el proyecto figura como *Active* y tenés
las cuatro cosas anotadas.

---

## Paso 2 — Configurar Auth en el proyecto de pruebas

Esto es lo mismo que ya está hecho en producción. Hay que repetirlo.

**Dónde:** Authentication → URL Configuration.

- **Site URL**: `https://pruebas.invicta.com.ar`
  (o el subdominio que elijas; usá el mismo en todos los pasos).
- **Redirect URLs**: agregá `https://pruebas.invicta.com.ar/**`

**Dónde:** Authentication → Emails → Templates.

Dos plantillas, con el mismo texto que producción. Lo que importa es que
usen `token_hash`:

- **Magic Link**:
  ```
  {{ .SiteURL }}/acceso/confirmar?token_hash={{ .TokenHash }}&type=magiclink
  ```
- **Reset Password**:
  ```
  {{ .SiteURL }}/restablecer-password/confirmar?token_hash={{ .TokenHash }}&type=recovery
  ```

> **Por qué `token_hash` y no el enlace por defecto.** El enlace por
> defecto apunta a un `GET` de Supabase que consume el token y recién
> después redirige. Los escáneres de correo abren los enlaces para
> revisarlos, así que el token se quemaba antes de que la persona
> hiciera clic. Con `token_hash` el enlace cae en una pantalla nuestra
> que no canjea nada: muestra un botón, y el canje lo hace el `POST` de
> ese botón. Los escáneres siguen enlaces, no completan formularios.

**Cómo saber que salió bien:** las dos plantillas muestran `token_hash`
en el cuerpo, y la lista de Redirect URLs tiene la línea con `/**`.

---

## Paso 3 — Cargar los dos secretos del Vault (el paso que no se saltea)

**Dónde:** proyecto de pruebas → SQL Editor → New query.

Primero inventá un `CRON_SECRET` para pruebas, **distinto al de
producción**. Cualquier cadena larga al azar sirve; guardala, la vas a
volver a usar en el paso 5.

Pegá y ejecutá, reemplazando los dos valores:

```sql
select vault.create_secret('https://pruebas.invicta.com.ar', 'host_canonico');
select vault.create_secret('EL-CRON-SECRET-QUE-INVENTASTE', 'cron_secret');
```

Reglas del valor de `host_canonico`:

- **Sin barra al final.** El código le pega la ruta directamente.
- **Exactamente el host que responde**, no uno que redirija. Si tu
  dominio redirige de `pruebas.invicta.com.ar` a otra cosa, poné el
  destino final.

> **Por qué importa tanto.** `pg_net` usa libcurl, y libcurl **descarta
> la cabecera `Authorization` al seguir una redirección que cambia de
> host**, por seguridad y sin avisar. Si la URL redirige, el pedido
> llega sin credencial y la aplicación lo rechaza con "sin permiso" —
> que manda a buscar el problema al valor del secreto en vez de a la
> URL. Ya pasó una vez en producción.

**Cómo saber que salió bien:**

```sql
select name from vault.decrypted_secrets where name in ('host_canonico','cron_secret');
```

Tiene que devolver **las dos filas**.

**En producción no hagas nada.** La migración le crea `host_canonico`
sola, reconociéndola porque ya tiene la tarea agendada con el host viejo
adentro. Una base nueva no tiene esa tarea, así que no hereda la URL de
producción — que es justamente el punto.

---

## Paso 4 — Desplegar producción primero

Antes de armar el ambiente de pruebas conviene que producción ya tenga
esta tanda de cambios: así la migración le crea su secreto y queda igual
que antes, sin sorpresas mezcladas con el ambiente nuevo.

1. Mergeá la rama de trabajo a la rama por defecto (la que Vercel
   despliega como Production).
2. Esperá a que el deploy termine en verde.

**Cómo saber que salió bien.** En el SQL Editor **de producción**:

```sql
select name from vault.decrypted_secrets where name = 'host_canonico';
select jobname, command from cron.job;
```

- La primera tiene que devolver una fila.
- En la segunda, el `command` de `confirmar-resultados-vencidos` y
  `recalcular-score` **ya no tiene que tener `www.invicta.com.ar`
  escrito adentro**: ahora lee `host_canonico` del Vault.

Si `host_canonico` no aparece en producción, cargalo a mano con el mismo
`select vault.create_secret(...)` del paso 3, con la URL de producción.
Mientras no esté, las tareas no corren.

---

## Paso 5 — Crear la rama y configurar Vercel

### 5a. La rama

En tu máquina:

```bash
git checkout <la-rama-por-defecto>
git pull
git checkout -b pruebas
git push -u origin pruebas
```

Vercel va a desplegarla sola como Preview.

### 5b. Las variables

**Dónde:** proyecto de Vercel → Settings → Environment Variables.

Por cada una: escribir nombre y valor, y **tildar sólo `Preview`**
(destildar `Production` y `Development`). Esto es lo que hace que el
ambiente de pruebas use su propia base sin tocar producción.

| Variable | Valor | ¿Secreta? |
|---|---|---|
| `NEXT_PUBLIC_AMBIENTE` | `pruebas` | no |
| `DATABASE_URL` | la del paso 1 | **sí** |
| `NEXT_PUBLIC_SUPABASE_URL` | la del paso 1 | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la del paso 1 | no |
| `SUPABASE_SERVICE_ROLE_KEY` | la del paso 1 | **sí** |
| `NEXT_PUBLIC_SITE_URL` | `https://pruebas.invicta.com.ar` | no |
| `CRON_SECRET` | el que inventaste en el paso 3 | **sí** |
| `RESEND_API_KEY` | la misma de producción, o una de prueba | **sí** |
| `CORREO_REMITENTE` | el mismo de producción | no |
| `SENTRY_DSN` | uno aparte, o dejarla sin definir | no |

**El valor de `CRON_SECRET` en Vercel tiene que ser idéntico al que
cargaste en el Vault** del paso 3. Son los dos lados de la misma
cerradura: la base manda ese valor en la cabecera y la aplicación lo
compara. Si no coinciden, las tareas dan 403.

### 5c. Revisar que producción quedó como estaba

En la misma pantalla, filtrá por `Production` y confirmá:

- `NEXT_PUBLIC_AMBIENTE` **no está**, o está en `produccion`. Nunca en
  `pruebas`.
- Las demás siguen apuntando al Supabase de producción.

### 5d. El dominio

**Dónde:** Settings → Domains → Add.

1. Agregá `pruebas.invicta.com.ar`.
2. Cuando pregunte a qué rama, elegí `pruebas`.
3. Cargá en tu DNS el registro que Vercel te indique (suele ser un
   `CNAME` a `cname.vercel-dns.com`).

> **Sin dominio fijo no sirve.** La URL que Vercel le da a un Preview
> cambia en cada deploy: no se la podés pasar a nadie.

**Cómo saber que salió bien:** abrís `https://pruebas.invicta.com.ar` y
carga el sitio, con **una banda amarilla arriba** que dice «Ambiente de
pruebas — los datos no son reales». Si no está la banda, `NEXT_PUBLIC_AMBIENTE`
no quedó en Preview: revisá 5b.

---

## Paso 6 — Sembrar los datos demo

Esto se corre **desde tu máquina**, apuntando al Supabase de pruebas.

Creá un archivo `.env` en la raíz del repositorio con esto —y sólo esto:

```
NEXT_PUBLIC_AMBIENTE=pruebas
DATABASE_URL=<la del paso 1>
NEXT_PUBLIC_SUPABASE_URL=<la del paso 1>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<la del paso 1>
SUPABASE_SERVICE_ROLE_KEY=<la del paso 1>
```

Después:

```bash
npm run demo:sembrar
npm run demo:validar
```

**Lo primero que imprime `demo:sembrar` son dos líneas:**

```
  ambiente: pruebas
  base:     db.xxxx.supabase.co:5432/postgres
```

**Leelas.** Si dicen `produccion`, el script corta solo y no escribe
nada. Si el host no es el de pruebas, cortá vos con Ctrl+C: el error
fácil acá no es ignorar una advertencia, es tener el `.env` equivocado
y no darte cuenta.

`demo:validar` corre una lista de chequeos que **tienen que dar cero
filas** cada uno. Si alguno falla, el dataset quedó mal y conviene
volver a empezar con `npm run demo:reset`.

**Cómo saber que salió bien:** `demo:validar` termina sin errores, y
abriendo `https://pruebas.invicta.com.ar/torneos` y eligiendo una ciudad
aparecen torneos con `[DEMO]` en el nombre.

### Qué queda sembrado

Seis torneos, cada uno en un estado distinto, para que haya algo que
mirar en cada pantalla:

| Torneo | Estado |
|---|---|
| `[DEMO] Apertura Palermo F5` | en curso, con partidos jugados |
| `[DEMO] Liga Masculina Norte F11` | finalizado, con campeón |
| `[DEMO] Copa Femenina Primavera F7` | inscripciones abiertas, una pendiente |
| `[DEMO] Copa Costanera F9` | por empezar, fixture confirmado |
| `[DEMO] Copa Misiones` | certamen con divisiones A y B |
| `[DEMO] Copa Borrador F7` | borrador sin publicar |

Y once cuentas. **El seed las imprime al final con el mail exacto de
cada una** — copialas de ahí, no de este documento: así nunca pueden
estar desactualizadas. Todas entran con la misma contraseña, que también
imprime.

---

## Paso 7 — Comprobar que producción está limpia

Cambiá el `.env` para que apunte a **producción**, y **sacá la línea
`NEXT_PUBLIC_AMBIENTE=pruebas`**. Después:

```bash
npm run demo:auditar
```

Sólo lee, no escribe nada. Imprime cuántas filas demo hay y, aparte,
cuántas **no** demo tiene la base — así "limpio" no puede querer decir
"la base está vacía".

**Lo que tiene que decir:** `Sin rastros de datos demo.`

Si encuentra algo (de alguna corrida vieja), se limpia así:

1. Agregá temporalmente `NEXT_PUBLIC_AMBIENTE=pruebas` a ese `.env`.
2. `npm run demo:limpiar -- --confirmar`
3. **Sacá la línea de nuevo.**
4. `npm run demo:auditar` para confirmar que quedó en cero.

> Que haya que poner la variable a mano para borrar en producción es a
> propósito: tiene que ser un acto deliberado, no algo que pase por
> tener el archivo equivocado abierto.

---

## Paso 8 — La comprobación final, la más barata

Abrí las dos pestañas, una al lado de la otra:

- `https://pruebas.invicta.com.ar` → **se ve la banda amarilla**.
- `https://www.invicta.com.ar` → **no se ve ninguna banda**.

Si las dos se ven iguales, algo quedó mal en las variables de Vercel
(paso 5b/5c) y hay que arreglarlo antes de pasarle el enlace a nadie.

---

## Qué les pasás a los dueños de torneos

Un mensaje con:

1. **El enlace**: `https://pruebas.invicta.com.ar`
2. **Que es un ambiente de pruebas**: los torneos que ven son inventados,
   y lo que carguen se puede borrar sin aviso cuando se resiembre. La
   banda amarilla de arriba se los recuerda.
3. **Cómo entrar**, de las dos formas:
   - Con una cuenta demo: les pasás el mail y la contraseña que imprimió
     el seed. La de `organizador` es la que más les sirve — ve el panel
     completo, con torneos en todos los estados.
   - Con su propio mail, registrándose. Así prueban el alta de verdad.
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

## Cosas que conviene saber

**El correo de producto está apagado**, en los dos ambientes. Es una
decisión tomada (`CORREO_DE_PRODUCTO_ACTIVO` en
`services/notificaciones/tipos.ts`): lo único que sale por mail es lo de
la cuenta. Las notificaciones viven dentro de la aplicación.

**Las migraciones corren solas en cada deploy** (`vercel.json` →
`buildCommand`). No hay que correr nada a mano después de desplegar.

**Para volver a empezar con los datos de pruebas**, con el `.env` de
pruebas: `npm run demo:reset`. Borra lo demo, lo vuelve a sembrar y lo
valida. Lo que hayan cargado los dueños con sus propias cuentas **no** se
borra: la limpieza sólo toca lo marcado como demo.

**Si cambiás el dominio de pruebas** más adelante, hay que actualizar
tres lugares: el secreto `host_canonico` del Vault, `NEXT_PUBLIC_SITE_URL`
en Vercel, y las URLs de Auth en Supabase.
