# Resumen para actualizar la documentación

**Para qué es esto.** Un insumo para llevar el paquete de `docs/documentacion/` a la
realidad del código. Cada punto dice **qué cambió**, **por qué**, y **qué documento
tocar**. No reemplaza a esos documentos: los alimenta.

**Cómo leerlo.** Lo que está bajo "Decisiones nuevas" son reglas de negocio que hoy
viven solo en el código y en los mensajes de commit — esas son las que urge escribir.
Lo demás es implementación que confirma o precisa decisiones que ya estaban.

---

## 1. Decisiones nuevas, todavía sin número

Estas salieron de esta tanda de trabajo y **no están en `06`**. Propongo numerarlas al
incorporarlas.

### D-nnn — La organización es la entidad principal del modo organizador

Un torneo **siempre** pertenece a una organización, y sin organización no hay torneo
posible. Ya era cierto en el esquema (`torneo.organizacion_id` es `NOT NULL`) pero el
producto no lo mostraba así: la organización era un rótulo de la cabecera.

- El panel de organizador sigue el orden: organización activa → su estado → acciones →
  torneos → otras organizaciones.
- La cabecera dice el **modo** en el título ("Organizador") y la **entidad** al lado,
  como selector.
- Crear organización dejó de ser automático: `asegurarOrganizacionPropia` ya no crea
  una sola, falla con `SIN_ORGANIZACION` y la pantalla ofrece crearla.

**Documentos:** `02` (UC-06, UC-16), `03` (relación usuario–organización–torneo), `05`
(flujo del organizador), `08` (jerarquía de la pantalla).

### D-nnn — Una cuenta puede administrar varias organizaciones, con una activa

`miembro_organizacion` admitía varias desde el esquema inicial, pero el panel mostraba
la primera y no había forma de llegar a las otras.

- La organización activa vive en una **cookie**, igual que la ciudad del descubrimiento
  (D-90): es contexto de navegación, no un dato de la cuenta.
- **La cookie no otorga nada.** `resolverOrganizacionActiva` la valida contra los
  vínculos reales; un id ajeno o viejo se ignora y cae a la primera propia.
- Con una sola organización no hay selector: ofrecer elegir entre una cosa promete una
  opción que no existe.

**Documentos:** `02` (UC-06/UC-07), `06` (decisión nueva), `10` (sección de contexto).

### D-nnn — El modo no se pierde al tocar una notificación

Quien gestionaba una organización tocaba un aviso de su propio torneo y aparecía en la
ficha pública con el nav de Jugador, sin haberlo pedido.

- El modo viaja en la URL desde la campanita (`?modo=organizador`).
- En modo organizador, un torneo lleva a su **panel de gestión**; un equipo sigue yendo
  a su ficha (un equipo no es de la organización).
- El modo **solo elige nav y destino**: no otorga permisos, y un valor raro cae en
  "jugador".

**Documentos:** `02` (UC-46), `05` (navegación entre modos), `07` (notificaciones).

### D-nnn — El bloqueo se comunica, no se esconde

Cuando una organización sin verificar ya tiene su torneo publicado (D-51), "Crear
torneo" **sigue a la vista**, con `aria-disabled`, y al tocarlo explica por qué y ofrece
la salida. Un botón escondido no responde la pregunta "¿por qué no puedo?".

Vale como principio general de la interfaz, no solo para este caso.

**Documentos:** `08` (patrones de estado bloqueado), `05`.

---

## 2. D-51 — se completó la mitad que faltaba

La regla estaba implementada desde T10. **La otra mitad no existía**:
`solicitarVerificacionBasica` era un servicio sin ruta HTTP ni botón, así que
**verificar una organización era imposible desde la aplicación**.

Ahora:

- `POST /api/organizaciones/solicitar-verificacion`, exclusiva del Titular.
- `BotonVerificarOrganizacion`, un componente para las tres pantallas donde hay que
  ofrecerla (publicar, configuración del torneo, lista de organizaciones).
- Al publicar sin verificar, el resultado **se queda en pantalla** y explica: el torneo
  existe, se comparte por link, funciona completo; lo que falta es que aparezca en las
  búsquedas. Con "Verificar ahora" al lado, que es lo que `05` §5 ya pedía.
- El límite de torneos publicados se avisa **antes** de tocar el botón
  (`obtenerResumenParaPublicar.limitePublicadosAlcanzado`). Es lo que se muestra, no lo
  que decide: `publicarTorneo` lo vuelve a comprobar.

**Confirmación de la decisión tomada en esta sesión:** ante la contradicción entre
"bloquear la creación" y "solo 1 si no verifico", se mantuvo **D-51**: una organización
sin verificar crea y publica **un** torneo; el bloqueo aparece en el segundo.

**Documentos:** `02` (UC-06, UC-18), `06` (D-51, aclarar que el bloqueo es al publicar
el segundo), `05` §5.

---

## 3. Verificación básica: qué cambió de mecanismo

**El flujo se rompió tres veces por depender de algo que viaja fuera de la base:**

| Intento | Por dónde viajaba la intención | Por qué falló |
|---|---|---|
| 1 | `options.data` de `signInWithOtp` | Solo se aplica al **crear** la cuenta |
| 2 | Ruta de `emailRedirectTo` | La plantilla del correo puede no reenviarla |
| 3 (actual) | **Columna en la base** | — |

- `organizacion.verificacion_solicitada_en` se estampa **antes** de mandar el correo.
- Al volver de cualquier enlace, `confirmarVerificacionesPendientes` busca qué pidió esa
  persona y lo aplica.
- Gates: solo organizaciones **propias** (titular), pedido de **menos de 24 h** (el
  enlace vive una) y todavía `unverified`. Verificar limpia la marca.
- La prueba sigue siendo la misma que fija **D-76**: controlar la casilla de correo.

**La plantilla del correo no vive en el repositorio.** Queda documentada en
`pasos-infraestructura-T28.md` paso 5b, con el texto exacto y por qué `{{ .RedirectTo }}`
y `{{ .TokenHash }}`.

**Documentos:** `02` (UC-06), `03` (columna nueva), `10` (flujo de acceso).

---

## 4. Infraestructura — tres reglas que hay que dejar escritas

### 4.1 Tres cadenas de conexión, no una

| Para | Cadena | Puerto | Por qué |
|---|---|---|---|
| La aplicación (`DATABASE_URL`) | Transaction pooler | `6543` | El lugar se ocupa por consulta, no por visita |
| Las migraciones (`DATABASE_URL_MIGRACIONES`) | **Session pooler** | `5432` | Sesión fija (advisory lock) **e IPv4** |
| Desarrollo local | la que haya | — | Sin pooler de por medio |

**Dos trampas, las dos sufridas en producción:**

- **Modo sesión en la aplicación** agota el cupo (15 conexiones en el plan gratuito) con
  tres instancias simultáneas: `EMAXCONNSESSION`. La aplicación ahora **avisa sola en
  Sentry** si arranca así, y baja su `max` por instancia.
- **La conexión directa no se alcanza desde Vercel**: en los proyectos nuevos resuelve
  solo por IPv6. Por eso las migraciones van por el *session pooler* y no por ella.

**Documentos:** `09` (arquitectura de despliegue), `pasos-infraestructura-T28.md` (ya
actualizado).

### 4.2 El trabajo por lote se acota, siempre

`confirmarResultadosVencidos` recorría **todo** lo vencido sin tope ni reloj, dentro de
una función con límite de tiempo de pared. Anduvo mientras vinieron pocos por hora; la
primera vez que vencieron muchos juntos la corrida se cortó por la mitad.

- Lote de 200, más viejo primero; presupuesto propio de 45 s; corta **entre**
  confirmaciones, nunca dentro de una.
- Informa cuántos quedaron; la corrida siguiente los toma (reintentar ya era seguro).
- `maxDuration = 60` escrito, no heredado. `maxRuntime` de Sentry de 10 min a 2.
- El check-in de cierre se vacía con `Sentry.flush` en un `finally`.

**Como regla:** toda tarea programada declara su límite, acota su lote y cierra su
check-in. Vale para las tres de `10` §6.

**Documentos:** `09` §4, `10` §6.1.

### 4.3 Un `pool.on('error')` no es opcional

`pg` emite `'error'` cuando se cae una conexión **ociosa**, y un `'error'` sin listener
tumba el proceso de Node. Era la causa de "después de guardar, el inicio y el perfil
fallan por unos minutos" — los minutos eran el arranque en frío.

**Documentos:** `09` (nota de infraestructura).

---

## 5. Interfaz — patrones que quedaron fijados

Estos ya no son de una pantalla: son del sistema.

- **El feedback de una acción es temporal y no ocupa lugar fijo.** Un solo componente
  (`Avisos`) con cuatro tonos. El éxito se va solo; el error y la advertencia se cierran
  a mano. Reemplazó al `"Guardado."` permanente dentro de los formularios.
- **El estado vive en el control que lo produjo.** "Siguiendo ✓", "Pedido enviado ✓",
  "Solicitud enviada ✓" — nunca un cartel insertado debajo que corre la pantalla.
- **Lo que dura hasta que alguien lo resuelve no se avisa con un toast.** La
  organización sin verificar es un bloque fijo con su salida al lado; publicar un torneo
  es un evento y se avisa.
- **Una sola acción principal por tarjeta.** Dos botones del mismo tamaño peleando el
  ancho de un teléfono fue el origen de las superposiciones del panel.
- **44 px de área táctil**, sin excepciones (`08` §10). Verificado midiendo en Chromium
  a 360/375/390/430 px.
- **Las dos cabeceras de identidad son la misma pieza.** Equipo y torneo llevan sus
  acciones en el hero oscuro; jugador y organizador comparten `CabeceraDeModo`.

**Documentos:** `08` (secciones de patrones y de estado), `05`.

---

## 6. Lo que quedó pendiente de la propuesta de arquitectura

De los 15 puntos planteados, **sin empezar**:

- Estados de organización: `rechazada` con motivo, `suspendida`. Hoy solo hay
  `nivel_verificacion` (unverified/basic/trusted) y `estado` (active/inactive).
- Columna `tipo` de organización.
- **Seguir organizaciones**: `seguimiento` solo acepta `team` y `tournament`.
- Perfil público de organización con conteo de seguidores.

Y del backlog anterior: **#51** (seguir sin cuenta no retoma tras registro), **#52**,
**#53**, **#68** (partido no disputado), **#69** (confirmar/disputar resultado, T29),
**#83** (UC-38), **#84** (UC-44).

---

## 7. Limitación que conviene dejar escrita

**El entorno de desarrollo no tiene credenciales de Supabase.** Inicio, Perfil, el panel
de organizador y todo lo que exige sesión se verifican por tipos, lint, tests y build —
**nunca haciendo clic**. El layout sí se puede medir (harness de CSS real en Chromium, a
los cuatro anchos).

Cuando algo de esos caminos se toca, el primer chequeo después del despliegue es
recorrerlo a mano. Conviene que el documento de pruebas lo diga, para que no se confunda
"tests en verde" con "verificado en la aplicación".
