# Dos ambientes: pruebas con datos demo, producción limpia

Qué hay que hacer para tener un sitio de pruebas que se les pueda pasar
a los dueños de torneos, y una producción que no se contamine.

La decisión tomada: **un solo proyecto de Vercel, dos ramas**.
Producción sale de la rama por defecto; una rama `pruebas` se despliega
como Preview con dominio propio y sus propias variables, apuntando a un
Supabase aparte. Vercel ya hace esto nativo —las variables se configuran
por ambiente— así que no hay nada que inventar y cada cambio llega a los
dos por el mismo camino.

---

## Lo que ya está en el código

| Pieza | Qué hace |
|---|---|
| `npm run demo:sembrar` | Arma el dataset completo **pasando por los servicios reales**, nunca por `INSERT`s a mano. Crea cuentas de verdad en Supabase Auth con contraseña compartida |
| `npm run demo:limpiar -- --confirmar` | Borra **sólo** lo demo: cuentas `@demo.invicta.com.ar` y entidades con `[DEMO]` en el nombre |
| `npm run demo:validar` | Verifica que el dataset no haya quedado en un estado imposible |
| `npm run demo:auditar` | **Léelo como "¿hay basura acá?"**. Sólo lectura, pensado para correr contra producción. Termina con código 1 si encuentra algo |
| `NEXT_PUBLIC_AMBIENTE` | La única variable que distingue los dos ambientes. Prende la banda de la aplicación **y** habilita los scripts demo |
| La banda de arriba | En pruebas: «Ambiente de pruebas — los datos no son reales». En producción no existe |

**El default es producción.** Si la variable falta, está mal escrita o
alguien la borra, no hay banda y los scripts demo se niegan a correr. Al
revés el accidente sería irreversible: datos de mentira mezclados entre
torneos de gente real.

---

## 1. El Supabase de pruebas

Un proyecto nuevo, aparte del de producción. Lo que hay que replicar:

1. **Las plantillas de correo**, iguales a las de producción, con
   `token_hash` (ver `pasos-pendientes-de-tu-lado.md`):
   - Magic Link → `{{ .SiteURL }}/acceso/confirmar?token_hash={{ .TokenHash }}&type=magiclink`
   - Reset Password → `{{ .SiteURL }}/restablecer-password/confirmar?token_hash={{ .TokenHash }}&type=recovery`
2. **Redirect URLs**: `https://<tu-dominio-de-pruebas>/**`
3. **Site URL**: el dominio de pruebas.

### El secreto del host canónico — esto es lo que **no** hay que saltearse

Las tareas programadas no corren en Vercel: las agenda `pg_cron` **dentro
de la base**, y hasta ahora la URL a la que le pegaban estaba escrita en
la migración. Si el Supabase de pruebas corre esas mismas migraciones,
su `pg_cron` le dispara al sitio real una vez por hora.

Por eso el host ahora sale del Vault. En el SQL editor del proyecto de
**pruebas**:

```sql
select vault.create_secret('https://<tu-dominio-de-pruebas>', 'host_canonico');
select vault.create_secret('<el CRON_SECRET de pruebas>', 'cron_secret');
```

Sin `www` si tu dominio no lo lleva, y **sin barra final**. `pg_net` usa
libcurl, y libcurl descarta la cabecera `Authorization` al seguir una
redirección que cambia de host: el valor tiene que ser el host que
responde, no uno que redirija.

**Producción no necesita que hagas nada**: la migración le crea el
secreto sola, reconociéndola por el job que ya tiene agendado con el
host viejo. Una base nueva no tiene ese job, así que no hereda la URL de
producción — que es exactamente el punto.

Para comprobarlo después de desplegar, en cada proyecto:

```sql
select name from vault.decrypted_secrets where name in ('host_canonico','cron_secret');
select jobname, command from cron.job;
```

Si en pruebas `host_canonico` no está, los jobs **no salen a la red** —
no hacen nada y no tiran error. Es a propósito: un default al host de
producción sería justo el accidente que esto evita.

---

## 2. Vercel

1. Crear la rama `pruebas` a partir de la rama por defecto y pushearla.
2. En el proyecto, **Settings → Environment Variables**, cargar para
   **Preview** (no para Production):

| Variable | Valor en pruebas |
|---|---|
| `NEXT_PUBLIC_AMBIENTE` | `pruebas` |
| `DATABASE_URL` | la del Supabase de pruebas |
| `NEXT_PUBLIC_SUPABASE_URL` | la del Supabase de pruebas |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la del Supabase de pruebas |
| `SUPABASE_SERVICE_ROLE_KEY` | la del Supabase de pruebas |
| `NEXT_PUBLIC_SITE_URL` | el dominio de pruebas |
| `CRON_SECRET` | uno nuevo, **distinto** al de producción |
| `RESEND_API_KEY` | la misma o una de prueba (ver abajo) |
| `CORREO_REMITENTE` | puede ser el mismo |
| `SENTRY_DSN` | conviene uno aparte, o ninguno |

3. **Settings → Domains**: asignarle a la rama `pruebas` un dominio
   fijo, por ejemplo `pruebas.invicta.com.ar`. Sin esto la URL cambia en
   cada deploy y no se la podés pasar a nadie.

4. Verificar que **Production** tenga `NEXT_PUBLIC_AMBIENTE` sin definir
   o en `produccion`. Nunca en `pruebas`.

### Sobre los correos

Los dueños van a poder registrarse con su propio mail en el ambiente de
pruebas, así que ese ambiente **tiene que mandar correos de verdad**: la
confirmación de cuenta sale de Supabase Auth y la verificación de
organización, de Resend.

Dos cosas a mirar:

- Resend en modo sandbox sólo entrega a direcciones verificadas. Si los
  dueños no reciben el correo de verificación de organización, es eso.
- El correo **de producto** está apagado por decisión
  (`CORREO_DE_PRODUCTO_ACTIVO` en `services/notificaciones/tipos.ts`), en
  los dos ambientes. Lo único que sale es lo de la cuenta.

---

## 3. Sembrar los datos demo

Con un `.env` local apuntando al **Supabase de pruebas**:

```bash
NEXT_PUBLIC_AMBIENTE=pruebas
DATABASE_URL=<la de pruebas>
NEXT_PUBLIC_SUPABASE_URL=<la de pruebas>
SUPABASE_SERVICE_ROLE_KEY=<la de pruebas>
```

```bash
npm run demo:sembrar
npm run demo:validar
```

El script imprime el ambiente y el host de la base **antes** de tocar
nada. Si dice `produccion`, corta y no escribe: el error fácil acá no es
ignorar una advertencia, es tener el `.env` equivocado y no notarlo.

Para volver a empezar: `npm run demo:reset`.

### Qué les pasás a los dueños

- El dominio de pruebas.
- Las cuentas demo: el usuario que imprime el seed y la contraseña
  compartida (`PASSWORD_DEMO` en `scripts/demo/_identidad.ts`).
- Que **pueden registrarse con su propio mail** si quieren probar el
  alta de punta a punta.
- Que lo que carguen se puede borrar sin aviso cuando se resiembre.

---

## 4. Producción limpia

Con un `.env` apuntando a producción —y **sin** `NEXT_PUBLIC_AMBIENTE=pruebas`:

```bash
npm run demo:auditar
```

Lee y no escribe. Imprime cuántas filas demo hay y, aparte, cuántas **no
demo** tiene la base: así "limpio" no puede querer decir "está vacía".

Si aparece algo, es de alguna corrida anterior a esta separación. Se
limpia con `demo:limpiar` apuntando a esa base, lo que requiere poner
`NEXT_PUBLIC_AMBIENTE=pruebas` a mano en ese `.env` puntual — a
propósito: borrar en producción tiene que ser un acto deliberado, no
algo que pase por tener el archivo equivocado abierto.

---

## Orden recomendado

1. Crear el Supabase de pruebas y cargarle los dos secretos del Vault.
2. Desplegar **producción** con esta tanda de cambios (la migración le
   crea `host_canonico` sola).
3. Comprobar en producción: `npm run demo:auditar` da cero, y
   `select jobname, command from cron.job` ya no muestra el host escrito
   adentro.
4. Crear la rama `pruebas`, cargar las variables de Preview, asignar el
   dominio.
5. Sembrar y validar el ambiente de pruebas.
6. Abrir el sitio de pruebas y confirmar que **se ve la banda amarilla**.
   Abrir producción y confirmar que **no se ve**. Es la comprobación más
   barata de que las variables quedaron de cada lado.
7. Pasarles el enlace a los dueños.
