# Dataset de desarrollo (datos demo)

Tres scripts que limpian, regeneran y validan los datos de prueba de INVICTA
sobre el modelo **actual** de la aplicación.

```bash
npm run demo:reset      # limpiar + sembrar + validar (lo habitual)

npm run demo:limpiar -- --confirmar   # solo borrar lo demo
npm run demo:sembrar                  # solo sembrar
npm run demo:validar                  # solo chequear consistencia
```

Todos apuntan a la base de `DATABASE_URL`. `demo:reset` es idempotente:
limpia lo que sembró la corrida anterior antes de volver a sembrar.

## Cómo está hecho

**Todo pasa por los servicios reales** (`crearEquipo`, `solicitarInscripcion`,
`cargarResultado`, …), nunca por INSERTs a mano de lo que un servicio sabe
crear. Si una regla del producto rechaza algo, el seed falla en vez de dejar
un estado que la aplicación no podría haber producido. Las dos excepciones
están anotadas en el código: la imagen del torneo (en la app llega por subida
de archivo) y el alta del Administrador de organización (su servicio manda un
correo real).

**Qué se considera demo**, y por eso es seguro borrar: las cuentas con el
dominio `@demo.invicta.com.ar` y todo lo que esas cuentas crearon, más lo que
lleve `[DEMO]` en el nombre. `limpiar.ts` imprime qué va a borrar y qué
sobrevive **antes** de tocar nada. El catálogo (`provincia`, `ciudad`) no se
toca nunca: lo carga una migración.

## Iniciar sesión con los usuarios demo

Cuando el entorno tiene `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`,
el seed crea las cuentas **en Supabase Auth** además de en la base, y se puede
entrar con ellas. Sin esas variables (un Postgres suelto, como el de
desarrollo local) solo se crean las filas: los datos se ven en el sitio, pero
no se puede iniciar sesión como nadie — el script lo avisa al arrancar.

Contraseña de todas las cuentas demo: `InvictaDemo2026`

| Cuenta                                  | Rol que sirve para probar                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `demo.organizador@demo.invicta.com.ar`  | Titular de dos organizaciones verificadas, dueño de todos los torneos               |
| `demo.admin@demo.invicta.com.ar`        | Administrador de organización (no titular)                                          |
| `demo.capitana@demo.invicta.com.ar`     | Capitana (equipos femeninos y mixtos)                                               |
| `demo.capitan@demo.invicta.com.ar`      | Capitán (equipos masculinos y mixtos)                                               |
| `demo.jugador@demo.invicta.com.ar`      | Jugador con cuenta, en un plantel                                                   |
| `demo.delegada@demo.invicta.com.ar`     | Delegada de un equipo                                                               |
| `demo.seguidor@demo.invicta.com.ar`     | Solo sigue equipos y torneos (para el feed)                                         |
| `demo.solicitante@demo.invicta.com.ar`  | Tiene una solicitud de ingreso pendiente                                            |
| `demo.sinconfirmar@demo.invicta.com.ar` | **Email sin confirmar**: prueba el bloqueo de crear equipo / crear torneo / sumarse |

## Qué cubre el dataset

| Torneo                              | Estado que prueba                                                         |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `[DEMO] Apertura Palermo F5`        | En curso: tabla viva, goleadores, jugador del partido, partidos por jugar |
| `[DEMO] Liga Masculina Norte F11`   | Finalizado con campeón y estadísticas finales                             |
| `[DEMO] Copa Femenina Primavera F7` | Inscripciones abiertas, con cupo libre y una solicitud pendiente          |
| `[DEMO] Copa Costanera F9`          | Fixture confirmado, todavía sin resultados                                |
| `[DEMO] Copa Misiones` (A y B)      | Certamen con dos divisiones, con el aviso de equipo en ambas              |
| `[DEMO] Copa Borrador F7`           | Borrador con datos mínimos incompletos: no se puede publicar              |

21 equipos (femeninos, masculinos y mixtos) en tres ciudades, uno sin plantel
para el estado vacío. Los seguidores, los contadores y las estadísticas salen
de relaciones reales, no de números puestos a mano.

## Validación

`npm run demo:validar` corre 21 chequeos y falla (código 1) si alguno devuelve
filas: huérfanos, duplicados, partidos imposibles, la tabla contra los
resultados, las estadísticas contra los eventos, y cobertura (por ejemplo, un
torneo finalizado que quedaría sin campeón por empate en la cima). Mientras eso
pase, un error que aparezca recorriendo el producto es del producto y no del
dato.

## Correrlo contra el entorno desplegado

Desde el navegador, con el `CRON_SECRET` que ya vive en Vercel — corre dentro
del despliegue, así que hereda `SUPABASE_SERVICE_ROLE_KEY` y puede crear las
cuentas de Auth:

```bash
curl -X POST https://invicta.com.ar/api/admin/sembrar-demo \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"accion":"reset"}'
```

Acciones: `limpiar`, `sembrar`, `validar`, `reset`.
