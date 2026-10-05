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

Cubre las **superficies públicas** (D-04b): descubrimiento con selector
de ciudad, ficha del torneo con sus pestañas, fixture, tabla de
posiciones, y las puertas de acceso —qué se sirve sin cuenta y qué
redirige—.

**No cubre nada que necesite sesión.** Las sesiones las resuelve Supabase
Auth contra su servidor, y este entorno no tiene credenciales de
Supabase: `obtenerUsuarioIdDeSesion` llama a `getUser()`, que sin cookie
de sesión devuelve `null` sin salir siquiera a la red. Por eso las
variables de Supabase van en falso en los scripts.

Para cubrir los recorridos con sesión —crear un torneo, inscribir un
equipo, cargar un resultado— hacen falta credenciales reales de un
proyecto de Supabase de pruebas, o un servidor que imite su API de
autenticación. Lo que **no** hay que hacer es abrirle una puerta al
código de producción para saltarse la sesión en pruebas: eso es
exactamente la clase de atajo que después queda.

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
