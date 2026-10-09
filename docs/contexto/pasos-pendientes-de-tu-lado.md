# Lo que queda de tu lado, paso a paso

> **Revisado el 06/10 contra el panel real.** Las tres cosas de Supabase
> —las dos plantillas y las Redirect URLs— **ya están hechas**. Lo que
> queda es desplegar, comprobar y probar.

---

## Lo que ya está, y por qué está bien

### Plantilla de Magic Link

```
{{ .SiteURL }}/acceso/confirmar?token_hash={{ .TokenHash }}&type=magiclink
```

### Plantilla de Reset Password

```
{{ .SiteURL }}/restablecer-password/confirmar?token_hash={{ .TokenHash }}&type=recovery
```

### Redirect URLs

```
https://www.invicta.com.ar/**
```

**Las dos plantillas usan `token_hash`, que es lo que importaba.** Con
eso quedan resueltos los dos problemas del enlace por defecto:

1. **Los escáneres de correo ya no gastan el enlace.**
   `{{ .ConfirmationURL }}` apunta a un `GET` de Supabase que consume el
   token y recién después redirige; los escáneres abren los enlaces para
   revisarlos, así que el token se quemaba antes de que la persona
   hiciera clic. Con `token_hash` el enlace cae en una pantalla nuestra
   que no canjea nada: muestra un botón, y el canje lo hace el `POST` de
   ese botón. Los escáneres siguen enlaces, no completan formularios.
2. **Ya no hace falta una cookie que no existía.** El canje por código
   necesita un verificador PKCE guardado en el navegador donde se pidió
   el enlace. Por eso recuperar la contraseña en la computadora y abrir
   el correo en el teléfono no funcionaba.

**Sobre `{{ .SiteURL }}` en vez de `{{ .RedirectTo }}`:** está bien, y
tiene una ventaja. `{{ .RedirectTo }}` toma la URL que el código pide y
**la valida contra la lista de Redirect URLs**: si no coincide, Supabase
la reemplaza por el Site URL en silencio, y el enlace termina en la
portada. `{{ .SiteURL }}` no pasa por esa validación, así que no se puede
romper por un error en la lista. Como las dos rutas están escritas a
mano en la plantilla y coinciden exactamente con lo que el código espera,
no se pierde nada.

Lo único que esa forma descarta es el `organizacion/<id>` del final, que
el código agrega al pedir verificación de una organización. **No
importa**: desde el 02/10 ese correo lo arma y lo manda el producto por
Resend, con su propia URL, y no pasa por esta plantilla. El camino que sí
la usaba quedó como respaldo, para si algún día faltan las variables de
Resend, y aun ahí la verificación se resuelve del lado del servidor.

**La lista `/**` sigue haciendo falta** aunque las dos plantillas no la
usen: las **invitaciones** a administradores y colaboradores siguen
saliendo con la plantilla por defecto de Supabase, que sí vuelve por
`/auth/callback` validando contra esta lista. El globstar lo cubre. Y un
comodín sobre el propio dominio no abre ningún riesgo: sólo permite
volver a tu sitio.

### Una sola cosa para mirar

Que el **Site URL** no termine en barra. Si está cargado como
`https://www.invicta.com.ar/`, las plantillas arman
`https://www.invicta.com.ar//acceso/confirmar`, con doble barra. Tiene
que ser `https://www.invicta.com.ar`, sin barra final.

---

## 1. Desplegar

**Dónde:** Vercel.

Aplica las migraciones pendientes y deja corriendo el código nuevo. Las
variables `RESEND_API_KEY` y `CORREO_REMITENTE` ya están desde el 02/10,
así que no hay nada que agregar.

Ya no hay que coordinarlo con ningún cambio de plantilla: las dos están
puestas de antes, y el código nuevo manda a las mismas rutas que ellas
ya apuntan.

---

## 2. Comprobar que el despliegue quedó sano

Cuatro consultas en el editor SQL de Supabase.

**a) Las migraciones corrieron.**

```sql
select name from pgmigrations order by run_on desc limit 1;
```

Esperado: `1791320122646_torneos-de-organizacion-verificada-al-descubrimiento`.

**b) Las tareas programadas están donde tienen que estar.**

```sql
select jobname, schedule from cron.job order by jobname;
```

Esperado, exactamente estas tres:

| jobname                        | schedule    |
| ------------------------------ | ----------- |
| `confirmar-resultados-vencidos`| `0 * * * *` |
| `limpiar-intentos-limitados`   | `7 5 * * *` |
| `recalcular-score`             | `20 4 * * *`|

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

## 3. Correr el plan de pruebas

Está en `docs/contexto/plan-de-pruebas-usuarios-finales.md`.

**Qué ya no hace falta probar a mano:** descubrimiento con selector de
ciudad, ficha del torneo con sus pestañas, fixture, tabla de posiciones,
perfil del jugador y puertas de acceso. Todo eso lo cubren las pruebas de
punta a punta desde el 05/10.

**Qué sí:** todo lo que necesita sesión, que es la mayor parte. Ninguna
prueba automática puede iniciar sesión, porque eso pasa por Supabase Auth
y el entorno de pruebas no tiene credenciales.

**Los casos que probaría primero**, porque son los que cambiaron y los
que fallan en silencio:

1. **Pedir verificación de una organización** → el asunto del correo
   tiene que decir **«Verificá \<nombre de tu organización\>»**. Si dice
   algo genérico, falta alguna variable de Resend.
2. **Recuperar la contraseña desde otro dispositivo**: pedirla en la
   computadora, abrir el correo en el teléfono. Era el caso que fallaba.
3. **Confirmar una cuenta nueva** de punta a punta.
4. **Verificar una organización que ya tiene un torneo publicado** → el
   torneo tiene que aparecer en la búsqueda de su ciudad enseguida. Antes
   no aparecía nunca (ver abajo).
5. **Un torneo en borrador**: al entrar a gestionarlo, la primera
   pestaña tiene que ser el bloque de publicar, con la lista de datos que
   falten. Publicar ya no está en Configuración.
6. **Configuración**: ahora es un menú de siete filas, cada una con su
   estado al lado ("Sin definir", "Versión 2 · 5 de octubre", "2
   asignados"), y cada sección en su propia pantalla. De cada una se
   vuelve con "‹ Configuración".
7. **El Resumen de un torneo con cosas trabadas**: tiene que listar
   "Para resolver" — resultados objetados, equipos esperando respuesta,
   partidos jugados sin resultado, partidos sin programar — y los mismos
   números tienen que aparecer como burbuja en las pestañas Equipos,
   Fixture y Resultados.

En 2 y 3 vas a ver un paso nuevo —una pantalla con un botón «Continuar»
antes de entrar—: es a propósito, es lo que impide que un escáner de
correo gaste el enlace.

---

## Lo que repara el despliegue, sin que hagas nada

Dos cosas reportadas el 06/10 que ya están arregladas en el código y se
aplican solas al desplegar:

**Los torneos de una organización verificada no aparecían en las
búsquedas.** La visibilidad se decidía al publicar y nunca se volvía a
mirar: un torneo publicado antes de verificar la organización quedaba
fuera del descubrimiento para siempre. Ahora verificar los mete, y la
migración `1791320122646` repara los que ya habían quedado afuera — no
hay que volver a publicarlos ni tocar nada a mano. **Si después del
despliegue tu torneo sigue sin aparecer**, revisá que la organización
figure verificada y que el torneo no esté en borrador ni cancelado.

**El aviso de "Reenviar enlace" se duplicaba y no decía qué pasaba.**
Eran tres cosas: el reintento apilaba un segundo aviso idéntico; el
motivo del servidor se descartaba y se mostraba "Probá de nuevo" junto a
un botón que iba a volver a fallar; y el reenvío automático se comía
entera la cuota del botón, así que tocar tres veces una acción bloqueada
dejaba "Reenviar enlace" muerto antes del primer toque. Si volvés a ver
un fallo ahí, ahora el aviso dice el motivo real.

---

## Resumen

| #   | Dónde            | Qué                                      |
| --- | ---------------- | ---------------------------------------- |
| ✅  | Supabase         | Las dos plantillas y las Redirect URLs    |
| 1   | Vercel           | Desplegar                                 |
| 2   | SQL de Supabase  | Cuatro comprobaciones                     |
| 3   | La aplicación    | Correr el plan de pruebas                 |
