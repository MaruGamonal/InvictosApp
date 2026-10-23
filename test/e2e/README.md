# Pruebas de punta a punta

Abren la aplicación de verdad en un navegador y hacen clic. Es lo único
que verifica que el botón lleve a la pantalla correcta, que una Server
Action escriba la cookie que tiene que escribir y que la página se arme
con los datos que la base tiene — nada de eso lo cubren las unitarias ni
las de integración.

```bash
npm run pretest:e2e   # recrea y migra la base `_e2e`, siembra y construye
npm run test:e2e
```

`pretest:e2e` no corre solo: son dos comandos. Construir la aplicación
tarda alrededor de un minuto y no hace falta repetirlo entre corridas si
no cambió el código.

## Qué cubre, y qué no

Cubre las **superficies públicas** (D-04b) —descubrimiento con selector
de ciudad, ficha del torneo con sus pestañas, fixture, tabla de
posiciones, y las puertas de acceso— **y las dieciocho rutas que exigen
sesión**: el inicio del jugador, su perfil y sus notificaciones, el
panel de organizador entero, la gestión de un equipo, la gestión de un
torneo con sus cinco pestañas y las ocho secciones de Configuración, y
los formularios de crear equipo y torneo. Cada una vista por quien
corresponde, y varias por quien **no** corresponde.

## Cómo hay sesión, si no hay Supabase

Este entorno no tiene credenciales de Supabase, y durante mucho tiempo
eso dejó afuera todo lo que necesita estar logueado. Era el agujero más
grande de la verificación: cuando
`/torneo/[id]/gestionar/configuracion` rompió en producción, los tipos,
el lint, las unitarias, las de integración y el build estaban todos en
verde. Era un `Set` exportado desde un módulo cliente, que Next
reemplaza por una referencia sin métodos. Nada de eso lo ve, porque la
prueba unitaria importa el módulo directo y ahí no hay frontera
cliente/servidor. Sólo lo agarraba abrir la pantalla.

La solución tiene dos piezas y **ninguna toca el producto**:

- `_gotrueFalso.mjs` — un servidor de nada que responde
  `GET /auth/v1/user`, que es a lo único que `getUser()` sale. Playwright
  lo levanta como segundo `webServer`, y `NEXT_PUBLIC_SUPABASE_URL`
  apunta ahí durante la suite.
- `_sesion.ts` — escribe la cookie que `@supabase/ssr` escribiría
  después de un login real (`sb-127-auth-token`, con el JSON de la
  sesión en `base64-`).

El código que decide quién sos y qué podés hacer —`obtenerUsuarioIdDeSesion`,
`construirContexto`, cada `verificarPermiso*`— es el mismo que en
producción. Lo único falso es el servidor del otro lado del `fetch`.

Lo que **no** se hizo es abrirle una puerta al código de producción
para saltarse la sesión en pruebas: eso es exactamente la clase de
atajo que después queda, y encima en el peor lugar posible.

El token no se firma. Es un doble de prueba: lleva el `usuario_id`
adentro y el servidor falso lo devuelve. Firmarlo de verdad no agregaría
ninguna garantía sobre el producto —que es lo que estamos probando— y sí
un criptosistema de mentira que mantener.

### Que atrapa lo que tiene que atrapar

Se verificó devolviendo el bug: poniéndole `'use client'` de nuevo al
módulo que exporta `ESTADOS_CON_ACCIONES_DE_ESTADO`, la suite falla con
el mismo mensaje que llegó de producción —`.has is not a function`—, en
dos pruebas. Una suite de punta a punta que nunca se probó contra un
bug real es una suite que se cree.

### Lo primero que encontró

En su primera corrida: en el App Router el layout y la página **se
renderizan en paralelo**, así que un `redirect` en el layout no evita
que la página haga sus consultas. Un colaborador entrando por URL a
`/configuracion` terminaba bien —redirigido— pero dejaba un
`SIN_PERMISO` sin atrapar en el log del servidor, o sea en Sentry. Por
eso cada pantalla de Configuración pide el rol por su cuenta
(`_guardDeSeccion.arquitectura.test.ts` lo hace cumplir) y el redirect
por falta de permiso vive en `obtenerGestionCacheada`, no en el layout.

## El escenario

Lo siembra `_sembrar.ts` llamando a los **servicios reales** contra
Postgres, con los mismos ayudantes que usa la suite de integración. Deja
un torneo en curso, de una organización verificada, con cuatro equipos
inscriptos, fixture confirmado y un resultado cargado (3 a 1). Los ids
quedan en `.escenario.json`, que las pruebas leen.

Lo único que se escribe a mano es la verificación de la organización:
verificarla de verdad pasa por un correo, y acá no hay proveedor. Sin
eso el torneo nace `unlisted` (D-51) y el descubrimiento no tendría nada
que mostrar.

## Dos cosas que cuestan una tarde si no están escritas

**La caché de datos sobrevive al build y al reinicio.** `unstable_cache`
guarda sus entradas en `.next/cache/fetch-cache`, así que una corrida
puede arrancar sirviendo datos del sembrado anterior. El síntoma fue una
prueba buscando una ciudad que la lista cacheada todavía no tenía. Por
eso `preparar-e2e.mjs` borra ese directorio al final.

Como efecto secundario, **cambiar la base mientras la suite corre no se
ve**: las superficies públicas están cacheadas a propósito (T21). Lo que
estas pruebas verifican es la aplicación contra lo que se sembró antes
de levantarla.

**El navegador.** `CHROMIUM_EJECUTABLE` apunta a un Chromium ya
instalado, para entornos donde bajarlo no es una opción:

```bash
CHROMIUM_EJECUTABLE=/ruta/al/chrome npm run test:e2e
```

Sin esa variable se usa el que Playwright baja con
`npx playwright install chromium`, que es el camino normal.
