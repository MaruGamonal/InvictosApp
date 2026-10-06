# Lo que queda de tu lado, paso a paso

Todo esto pasa **fuera del repositorio**: en el panel de Supabase, en el
de Vercel y en una terminal de SQL. Nada de esto lo puede hacer el
código, y hasta que esté, dos flujos de la aplicación no funcionan.

El orden importa en un solo lugar, y está marcado.

---

## 1. Plantilla de Magic Link, en Supabase

**Dónde:** Supabase → *Authentication* → *Emails* → pestaña **Magic Link**.

**Qué hacer:** que el enlace del correo apunte a esto, en vez del
`{{ .ConfirmationURL }}` que viene por defecto:

```
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink
```

Si la plantilla es HTML, lo que cambia es el `href` del botón o del
enlace. El texto del correo no hace falta tocarlo.

**Para qué:** es el correo de **confirmación de cuenta**.

**Por qué, si el de ahora "anda":** con el enlace por defecto pasan dos
cosas, las dos silenciosas.

1. El enlace de Supabase es un `GET` que **consume el token** y recién
   después redirige. Los escáneres de correo —los de Gmail corporativo,
   los antivirus— abren los enlaces para revisarlos, así que el token se
   gasta antes de que la persona haga clic y el enlace le llega vencido.
   Con `token_hash` el enlace cae en una pantalla nuestra que **no canjea
   nada**: muestra un botón, y el canje lo hace el `POST` de ese botón.
   Los escáneres siguen enlaces, no completan formularios.
2. El canje por código necesita una cookie que el navegador guardó al
   pedir el enlace, y estos correos los emite un cliente que no escribe
   cookies: esa cookie nunca existió.

**Cómo saber que quedó bien:** pedí un reenvío de confirmación y mirá el
`href` del correo. Tiene que empezar con
`https://www.invicta.com.ar/acceso/confirmar`. Si empieza con
`https://<algo>.supabase.co/auth/v1/verify`, no se guardó.

---

## 2. Plantilla de Reset Password, en Supabase

**Dónde:** mismo lugar, pestaña **Reset Password**.

```
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery
```

> ⚠️ **Este va junto con el despliegue del paso 4.** Mirá la nota al
> final de ese paso antes de tocarlo.

**Para qué:** recuperar la contraseña.

**Por qué:** los mismos dos problemas de arriba, y uno más que se nota
enseguida con usuarios reales: **pedir el reset en la computadora y abrir
el correo en el teléfono no funcionaba**. La cookie que el canje por
código necesita quedó en el otro dispositivo.

**Cómo saber que quedó bien:** ese caso exacto. Pedí la recuperación en
una pantalla y abrí el correo en otra. Vas a ver un paso nuevo —una
pantalla con un botón «Continuar» antes de poder cambiar la contraseña—:
eso es a propósito, es lo que impide que un escáner gaste el enlace.

---

## 3. URLs de vuelta permitidas, en Supabase

**Dónde:** Supabase → *Authentication* → *URL Configuration* → **Redirect URLs**.

**Qué agregar** (las dos):

```
https://www.invicta.com.ar/acceso/confirmar
https://www.invicta.com.ar/restablecer-password/confirmar
```

**Por qué:** Supabase consulta esa lista antes de redirigir y, **si la
URL no está, usa el Site URL en su lugar — sin avisar y sin error**. El
correo llega, el enlace anda, y la persona termina en la portada en vez
de donde tenía que ir.

**Opcional, por las dudas:**

```
https://www.invicta.com.ar/acceso/confirmar/organizacion/*
```

Esa sólo hace falta para el camino de respaldo de la verificación de
organización, el que corre si alguna vez faltan las variables de Resend.
Por el camino normal el enlace lo arma el producto y no pasa por esta
lista.

---

## 4. Desplegar

**Dónde:** Vercel.

**Qué hace:** aplica las migraciones pendientes y deja corriendo el
código nuevo. Las variables `RESEND_API_KEY` y `CORREO_REMITENTE` ya
están cargadas desde el 02/10, así que no hay nada que agregar.

> ⚠️ **El paso 2 y este van juntos, en el mismo rato.**
>
> El código nuevo manda el enlace de recuperación a
> `/restablecer-password/confirmar`, y la plantilla vieja arma ese enlace
> con `?code=` en vez de `token_hash`: esa pantalla va a decir «El enlace
> está incompleto». Al revés pasa lo simétrico, así que **no hay un orden
> que evite el hueco**. Son minutos, pero no dejes el despliegue hecho y
> la plantilla para el día siguiente.
>
> Los enlaces de recuperación que ya salieron por correo antes del
> despliegue siguen funcionando: el camino viejo no se borró.

---

## 5. Comprobar que el despliegue quedó sano

Cuatro consultas en el editor SQL de Supabase. Si alguna no da lo
esperado, el despliegue no terminó bien.

**a) Las migraciones corrieron.**

```sql
select name from pgmigrations order by run_on desc limit 1;
```

Esperado: `1791257068260_alineacion-por-partido`.

**b) Las tareas programadas están donde tienen que estar.**

```sql
select jobname, schedule from cron.job order by jobname;
```

Esperado, exactamente estas tres:

| jobname | schedule |
|---|---|
| `confirmar-resultados-vencidos` | `0 * * * *` |
| `limpiar-intentos-limitados` | `7 5 * * *` |
| `recalcular-score` | `20 4 * * *` |

**`despachar-correos` NO tiene que aparecer.** El correo de producto está
apagado por decisión, y esa tarea quedó desagendada a propósito.

**c) Las tareas apuntan al host con `www`.**

```sql
select jobname, command from cron.job;
```

Las URLs tienen que decir `https://www.invicta.com.ar/…`. **Sin el
`www`**, libcurl descarta el header `Authorization` al seguir la
redirección y la tarea responde 403 sin que nadie se entere.

**d) La aplicación responde.**

```
GET https://www.invicta.com.ar/api/salud
```

Esperado: `200` con `{"conectado":true}`.

---

## 6. Correr el plan de pruebas

Está en `docs/contexto/plan-de-pruebas-usuarios-finales.md`.

**Qué ya no hace falta probar a mano:** el descubrimiento con el selector
de ciudad, la ficha del torneo con sus pestañas, el fixture, la tabla de
posiciones, el perfil del jugador y las puertas de acceso. Todo eso lo
cubren las pruebas de punta a punta desde el 05/10.

**Qué sí hay que probar a mano:** todo lo que necesita sesión, que es la
mayor parte. Ninguna prueba automática puede iniciar sesión, porque eso
pasa por Supabase Auth y el entorno de pruebas no tiene credenciales.

**Los tres casos que yo probaría primero**, porque son los que cambiaron
y los que fallan de forma silenciosa:

1. Pedir verificación de una organización → el correo tiene que decir
   **«Verificá \<nombre de tu organización\>»** en el asunto. Si dice algo
   genérico, falta alguna variable de Resend.
2. Recuperar la contraseña **desde otro dispositivo** (pedirla en la
   computadora, abrir el correo en el teléfono).
3. Confirmar una cuenta nueva de punta a punta.

---

## Resumen

| # | Dónde | Qué |
|---|---|---|
| 1 | Supabase → Emails → Magic Link | Cambiar el enlace a `token_hash` |
| 2 | Supabase → Emails → Reset Password | Cambiar el enlace a `token_hash` ⚠️ junto con el 4 |
| 3 | Supabase → URL Configuration | Agregar dos Redirect URLs |
| 4 | Vercel | Desplegar |
| 5 | SQL de Supabase | Cuatro comprobaciones |
| 6 | La aplicación | Correr el plan de pruebas |
