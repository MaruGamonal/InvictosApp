# Handoff: Invictos — Plataforma de gestión y descubrimiento de fútbol amateur

## Overview

Invictos conecta a organizadores de torneos amateur, capitanes de equipo, jugadores y visitantes en una sola plataforma: crear y publicar torneos, armar planteles, inscribirse, cargar resultados, seguir la tabla de posiciones y descubrir torneos y equipos cerca de tu ciudad. Este paquete contiene el prototipo completo de diseño — el Design System y las pantallas de los 11 dominios funcionales del producto (D1 a D11), más 5 flujos de punta a punta que muestran cómo esas pantallas se conectan en los recorridos principales del usuario.

## About the Design Files

Los archivos `.dc.html` de este paquete son **referencias de diseño creadas en HTML** — prototipos navegables que muestran el look final y el comportamiento esperado, no código de producción para copiar tal cual. La tarea es **recrear estos diseños HTML en el entorno del codebase de destino** (React, Vue, SwiftUI, nativo, etc.) usando sus patrones y librerías ya establecidas — o, si todavía no existe un entorno, elegir el framework más apropiado para el proyecto e implementar los diseños ahí.

Cada archivo es una "Design Component" con:
- Un bloque de plantilla HTML (con estilos inline) que define el layout de cada pantalla.
- Una clase de lógica en JavaScript plano (`class Component extends DCLogic`) que maneja el estado (qué pantalla se muestra, valores de formularios, toggles) y expone los valores que la plantilla consume.
- Muchos de los archivos de un solo dominio contienen **varias pantallas en un solo archivo**, alternadas con un `sc-if`/selector de estado (ver sección Screens / Views) y un selector de navegación (chips) en la parte inferior para saltar entre ellas — esto es solo una convención del prototipo para poder ver todas las pantallas de un dominio en un solo lugar; en la implementación real cada pantalla es una vista/ruta separada.

## Fidelity

**Alta fidelidad (hifi)** en estructura, jerarquía, copy y sistema visual (colores exactos, tipografía, espaciado, estados). Las imágenes son placeholders (`<image-slot>` — ver sección Assets) que el usuario reemplaza con fotos reales; el resto del diseño (textos, layout, colores, componentes) está resuelto y debe recrearse fielmente.

## Design Tokens

### Colores
| Token | Hex | Uso |
|---|---|---|
| Ink 900 (fondo oscuro / texto) | `#0E1720` | Headers oscuros, marcador de partido, tarjetas hero |
| Ink 800 | `#142230` | Fondo de página fuera del "dispositivo", texto principal |
| Ink 700 | `#2C383F` | Avatares/placeholders de escudo |
| Ink 600 | `#414E57` | Avatares de persona, bordes secundarios oscuros |
| Gris texto secundario | `#5C6A74` | Texto secundario sobre fondo claro |
| Gris texto terciario | `#7E8B95` | Labels, texto terciario, notas |
| Gris claro texto sobre oscuro | `#A9B4BC` | Texto secundario sobre fondo oscuro |
| Borde neutro | `#CBD3D8` | Bordes de inputs, chips inactivos |
| Borde sutil | `#E3E8EB` | Bordes de tarjetas |
| Fondo sutil | `#EFF2F4` | Fondos de bloques secundarios, divisores |
| Fondo página clara | `#F7F9FA` | Fondo de bloques informativos |
| Blanco | `#FFFFFF` | Fondo de tarjetas y pantallas |
| **Acento primario (cian)** | `#00A8CC` | Acciones primarias, estado activo, "en juego" |
| Acento primario hover/oscuro | `#007D99` | Links, texto de acción secundaria |
| Verde éxito / confirmado | `#1B8A3C` (texto `#12662C`, fondo `#E4F3E8`) | Estados positivos: aprobado, ganado, verificado, inscripciones abiertas |
| Verde vivo (sobre fondo oscuro) | `#4ADE80` / `#86EFAC` | Punto "en vivo" pulsante sobre paneles oscuros |
| Ámbar advertencia | `#A25C00` (texto `#7A4600`, fondo `#FBEBD3`) | Avisos no bloqueantes: categoría cruzada, no verificado, pendiente |
| Rojo error/disputa | `#A11F12` / `#C42B1C` (fondo `#FEF7F6`, borde `#F2CFCA`) | Disputas, cancelaciones, errores |
| Violeta informativo | `#322BA0` / `#4038C2` (fondo `#E7E9FB`) | Notas informativas neutrales (reglas del sistema, aclaraciones) |

### Tipografía
- **Titulares / números grandes / marcadores**: `Barlow Condensed`, weight 700, `text-transform: uppercase`. Tamaños: 48–64px para marcadores de partido (el número más grande del sistema, reservado solo a pantallas de partido en vivo/resultado), 22–34px para headers de pantalla, 15–20px para nombres de entidad (equipo, torneo) dentro de tarjetas.
- **Cuerpo de texto / labels / botones**: `Barlow`, weights 400 (texto normal), 500 (texto con algo de énfasis), 600 (labels, chips), 700 (botones, títulos de tarjeta, valores destacados).
- Letter-spacing 0.04–0.12em en labels uppercase pequeños (eyebrows, badges de estado).
- Fuentes cargadas desde Google Fonts: `Barlow:wght@400;500;600;700` y `Barlow+Condensed:wght@500;600;700`.

### Espaciado y radios
- Radio de tarjetas: 8–10px. Radio de botones/pills: 6–8px (rectangulares) o `999px` (pill/circular).
- Padding estándar de pantalla: 20–24px horizontal.
- Gap entre elementos de una lista: 8–14px. Gap entre secciones: 18–20px.
- Sombra sutil de tarjeta (Design System, sección de superficies): `box-shadow: 0 1px 2px rgba(14,23,32,0.06)`.

### El "chasis" de dispositivo del prototipo
Cada pantalla del prototipo se muestra dentro de un marco de 390×844px con `border-radius: 34px` simulando un teléfono — esto es solo para la presentación del prototipo, **no se recrea en la app real** (la app real ocupa la pantalla completa del dispositivo).

## Screens / Views

### Design System — `Invictos Design System.dc.html`
Documento de referencia visual con 7 secciones numeradas: 01 tipografía y color, 02 iconografía y componentes de formulario, 03 botones y estados, 04 tarjetas y superficies, 05 patrones de lista, 06 **"Momentos con energía"** (el único lugar donde el sistema "sube la voz": marcador gigante de 64px sobre fondo `#0E1720`, punto "en vivo" pulsante — única animación del sistema, `@keyframes pulso` con opacidad 1↔0.35 cada 1.4s — y un corte diagonal usado como firma gráfica en algunos heroes, aunque el corte se retiró de las pantallas de flujo por pedido explícito y se sustituyó por un degradado sutil `linear-gradient(165deg, #0E1720 0%, #142230 65%, #1B2A38 100%)`), 07 fixture y tabla de posiciones (fila de fixture con resultado siempre centrado entre local/visita, tabla con encabezado oscuro y borde izquierdo de color para marcar clasificación). **Este documento es la fuente de verdad de estilo — cualquier ambigüedad en las otras pantallas se resuelve consultándolo.**

### D1 — Identidad y Perfiles (UC-01 a UC-05) — `Invictos - Entrada.dc.html`, `Invictos - Perfil de jugador.dc.html`
- **Login / Registro / Olvidé mi contraseña** (`Entrada.dc.html`): formulario mínimo — nombre, correo, contraseña. La validación de correo NO se pide al registrarse; se pide recién cuando el usuario intenta sumarse a un plantel o publicar un torneo (ver Flujo 1).
- **Mi perfil (UC-02)**: edición del perfil deportivo — nombre visible, zona/ciudad, posición (5 chips: arquero, defensor, mediocampista, delantero, sin especificar). Ningún campo excepto el nombre visible es obligatorio.
- **Visibilidad del perfil (UC-04)**: switch binario público/restringido — sin niveles intermedios.
- **Perfil público de jugador (UC-03)**: header oscuro con avatar circular, nombre, historial de equipos, estadísticas agregadas.
- **Reclamar perfil (UC-05, post-MVP)**: flujo de reclamar un perfil creado por un capitán antes de tener cuenta — marcado explícitamente como fuera del alcance de la primera entrega.

### D2 — Organizadores (UC-06 a UC-09) — `Invictos - D2 Organizadores.dc.html`
Crear organización → Equipo de trabajo (invitar administradores) → Perfil público del organizador (trayectoria factual + distintivo de verificado) → Transferir titularidad (fase futura, doble confirmación).

### D3 — Equipos y Planteles (UC-10 a UC-15, UC-53) — `Invictos - D3 Equipos y Planteles.dc.html`
Crear equipo (nombre, categoría, ciudad) → Invitar integrantes (buscar por nombre con resultados tipo autocomplete, o invitar por correo si no hay coincidencias) → Responder invitación → Roles y bajas (el Capitán no puede irse sin designar reemplazo; cualquier otro se da de baja al instante sin confirmación) → **Perfil público del equipo (UC-14)** — la pantalla más completa del dominio: header oscuro con escudo circular (`image-slot`), badge "categoría · ciudad", botones Seguir + Pedir sumarme + Compartir, bloques de Próximo partido / Último resultado, Score, Torneos en juego, **Plantel actual**, **Torneos jugados** (en ese orden) → Archivar equipo (acceso movido a la pantalla de administración del plantel, no al perfil público).

### D4 — Torneos (UC-16 a UC-21, UC-51, UC-52) — `Invictos - D4 Torneos.dc.html`
Crear torneo (nombre, modalidad F5/F7/F11, categoría, **ciudad + dirección** como dos campos separados y obligatorios, cupo máximo, costo de inscripción y costo de planilla como **opcionales**) → Definir formato (liga / eliminación directa / grupos+eliminatoria, no se puede cambiar una vez que hay partidos jugados) → Reglamento (opcional, versionado — cada cambio se notifica sin pedir re-aceptación) → Publicar (si la organización no está verificada, el torneo se publica igual pero como no-listado, accesible solo por link) → Panel de ciclo de vida (borrador → publicado → en curso → finalizado, cada paso habilita el siguiente) → Asignar colaboradores (permisos fijos por torneo, no por organización) → Cancelar o suspender.

### D5 — Descubrimiento (UC-22, UC-23) — `Invictos - D5 Descubrimiento.dc.html`, `Invictos - Selector de Ciudad.dc.html`
- **Descubrimiento**: la ciudad es el contexto por defecto (no un filtro que hay que aplicar) — se resuelve en el primer uso y se recuerda. Barra de ciudad + botón "Explorar" arriba, filtros secundarios (modalidad/categoría/estado) plegados debajo. Resultados agrupados por ciudad cuando el usuario eligió más de una (hasta 3 simultáneas, pensado para AMBA). Estado vacío con "Ver los de [provincia]" y "Publicar un torneo acá".
- **Selector de ciudad**: componente compartido (reusado en Descubrimiento, Crear torneo, Crear equipo, Mi perfil) — buscar por texto, agrupado por provincia, hasta 3 ciudades seleccionables con chips removibles.
- **Ficha pública del torneo (UC-23)**: accesible sin cuenta siempre. Cambia de contenido según estado — abierta destaca cupo, en curso destaca próxima fecha (tarjeta con degradado oscuro), finalizada destaca campeón (mismo tratamiento). Debajo: Descripción (movida al inicio del contenido), links a Fixture y a Tabla de posiciones como pantallas propias (no inline), Equipos inscriptos, costo de inscripción y de planilla, Reglamento.
- **Fixture del torneo**: pantallas propia, agrupada por fecha (un renglón de encabezado por fecha, con badge "Próxima" cuando aplica) y varios partidos por fecha, cada fila con escudo-nombre-resultado-escudo, resultado siempre centrado.
- **Tabla de posiciones**: encabezado oscuro, borde izquierdo cian para "clasifica", columna de "quita de puntos" separada de lo ganado en cancha.
- Publicidad solo en tres superficies de consulta: ficha del torneo, fixture y descubrimiento — nunca en pantallas de tarea (cargar resultado, resolver inscripción, etc.).

### D6 — Inscripciones (UC-24 a UC-28) — `Invictos - D6 Inscripciones.dc.html`
Solicitar inscripción (con aviso no bloqueante si la categoría del equipo no coincide con la del torneo, y aceptación de un clic del reglamento) → Resolver solicitudes (el organizador decide siempre, con opción de auto-aprobación configurable) → Inscribir manualmente (para equipos que llegan sin cuenta) → Confirmar plantel habilitado (lista de buena fe por torneo, distinta del plantel permanente; el DT no ocupa cupo) → Dar de baja del torneo (sin confirmación, con walkover a favor del rival en los partidos pendientes).

### D7 — Partidos y Resultados (UC-29 a UC-34) — `Invictos - D7 Partidos y Resultados.dc.html`
Generar fixture (propuesta editable, nunca definitiva sin revisión humana) → Programar/reprogramar (conserva la fecha original visible) → Cargar resultado (marcador grande estilo "momento con energía" sobre fondo oscuro, +/- por equipo) → Confirmar o disputar (ventana de 72hs desde la carga — **pero esto aplica solo cuando el resultado lo carga un capitán**; si lo carga el organizador o un colaborador asignado, el resultado queda confirmado al instante, sin ventana de disputa) → Registrar partido no disputado (walkover configurable, default 3–0) → Cargar eventos del partido (fase 2, opcional — goles y tarjetas, solo a integrantes habilitados).

### D8 — Posiciones y Estadísticas (UC-35 a UC-38) — `Invictos - D8 Posiciones y Estadisticas.dc.html`
Tabla de posiciones (calculada, no editable a mano), Estadísticas del torneo (goleadores — con estado vacío explicado si nadie cargó eventos), Historial del equipo (torneo por torneo, no un acumulado plano), Historial del jugador (sin score individual — el score solo existe a nivel equipo).

### D9 — Reputación y Score (UC-39 a UC-41) — `Invictos - D9 Reputacion y Score.dc.html`
Score y su desglose (visible desde 10 partidos y 2 torneos; siempre explicable, nunca un número opaco; puede bajar sin haber perdido por decaimiento de antigüedad) y Rankings acotados por zona + modalidad + categoría (no existe ranking global).

### D10 — Social (UC-42 a UC-45) — `Invictos - D10 Social.dc.html`
Seguir un torneo y Seguir un equipo señalan a los botones ya presentes en sus respectivos perfiles (D5 y D3) — no se duplican como pantallas propias. Actividad/feed (derivado de hechos del sistema, no editorial — sin posts ni comentarios; estado vacío que invita a descubrir). Seguir jugadores (fase futura, con la razón de producto documentada).

### D11 — Notificaciones (UC-46, UC-47) — `Invictos - D11 Notificaciones.dc.html`
Centro de notificaciones con dos categorías: Accionables (push + email, no se pueden apagar del todo — solo cambiar de canal) e Informativas (solo push, sí se pueden apagar). Preferencias por tipo de notificación.

### Flujos de punta a punta (prototipos clickeables completos)
- **`Invictos - Flujo Registro y primer torneo.dc.html`**: Bienvenida → Registro (nombre, correo, contraseña — sin validar correo en este punto) → Cuenta creada → Ciudad (primer uso de Descubrimiento) → Home (torneos + equipos de la ciudad, con estado vacío si no hay torneos cargados y CTA a crear uno) → Ficha del torneo → Seguir.
- **`Invictos - Flujo Crear equipo, invitar y inscribirse.dc.html`**: Crear equipo → Equipo creado (sos Capitán) → Invitar jugador (buscar por nombre o invitar por correo) → Invitación enviada/aceptada → Encontrar un torneo → Solicitar inscripción (con reglamento visible) → Fin.
- **`Invictos - Flujo Crear torneo, publicar y resultados.dc.html`**: Crear torneo (con ciudad, dirección, costos opcionales) → Formato → Reglamento (opcional, se puede omitir) → Publicar → Ciclo de vida (cerrar inscripciones + generar fixture) → Cargar resultado (como organizador — confirmado al instante) → Fin.
- **`Invictos - Flujo Visitante descubre y se registra.dc.html`**: Descubrimiento sin cuenta → Ficha del torneo → Seguir (dispara el muro de registro mínimo) → Registro → Cuenta creada, ya siguiendo el torneo.
- **`Invictos - Flujo Pedir sumarme y confirmación.dc.html`**: Perfil del equipo → Pedir sumarme → Pendiente → Vista del Capitán (aprobar/rechazar) → Ya en el plantel.

Cada flujo incluye, en varias pantallas, bloques de aviso de **notificación disparada** (fondo `#E8F7FB` o `#F7F9FA`, ícono + texto) — documentan qué notificación del sistema (D11) se dispara en ese punto exacto del flujo; son anotaciones de diseño, no UI final a recrear literalmente, pero indican el trigger que el desarrollador debe implementar.

## Interactions & Behavior

- **Navegación de estado dentro de un archivo de dominio**: cada archivo multi-pantalla usa un estado `screen` (string) en la clase de lógica, con un `sc-if` por pantalla y un helper `go(id)` que lo cambia. Los "chips" de navegación en la parte inferior de cada archivo permiten saltar directamente a cualquier pantalla — son una herramienta de revisión del prototipo, no parte de la UI final.
- **Navegación de estado en los flujos (`Flujo *.dc.html`)**: usan un índice numérico `p` (0-indexado) y un array `pasos` de nombres; `sig()` avanza al siguiente paso. Los chips inferiores saltan a cualquier `p`. **Importante para quien reimplemente**: el número de `sc-if value="{{ p === N }}"` debe coincidir exactamente con la posición de cada paso en el array `pasos` — hay que mantener ambos sincronizados si se agregan/quitan pasos.
- **Botones primarios**: fondo `#00A8CC`, texto `#0E1720`, deshabilitados visualmente con fondo `#CBD3D8` y texto `#7E8B95` cuando falta un campo requerido (nunca se ocultan, se deshabilitan visualmente).
- **Toggles Seguir / Pedir sumarme**: son botones pill independientes, nunca el mismo control — "Seguir" es reversible al toque; "Pedir sumarme" dispara un estado de pendiente que requiere confirmación de otra persona (capitán/delegado).
- **Formularios**: validación por presencia (campo lleno/vacío) reflejada en el color del botón de continuar, no con mensajes de error inline salvo casos puntuales (ej. cupo no puede bajar de los equipos ya aprobados).
- **Estados vacíos**: siempre tienen copy explicativo + una acción sugerida (nunca una lista vacía sin contexto) — patrón repetido en Descubrimiento, Estadísticas, Actividad y Score.
- **Animación**: la única animación del sistema es el pulso del punto "en vivo" (`@keyframes pulso`, ver Design System sección 06). No hay transiciones de página ni micro-animaciones adicionales especificadas.

## State Management

Cada Design Component mantiene su propio estado local (no hay store global en el prototipo). Para la reimplementación, las piezas de estado relevantes por pantalla son:
- **Formularios**: valores de cada input controlado (nombre, correo, contraseña, ciudad, dirección, costos, etc.) + sus validaciones derivadas (booleans "botón habilitado").
- **Navegación de pantalla/paso**: el equivalente a rutas reales en la app final (cada `screen`/`p` del prototipo = una vista o ruta).
- **Toggles de UI**: seguir/no seguir, filtros abiertos/cerrados, categoría de filtro seleccionada, ciudades seleccionadas (array, máx. 3).
- **Selecciones de lista**: plantel habilitado (checkboxes), coincidencias de búsqueda de jugador.
- Los datos de ejemplo (nombres de equipos, torneos, resultados) están hardcodeados como arrays/objetos en cada clase de lógica (`torneosBase`, `equiposCiudadBase`, etc.) — sirven de referencia de forma/shape de los datos reales que la app deberá traer de su backend.

## Design Tokens
Ver sección "Design Tokens" arriba (colores, tipografía, espaciado).

## Assets

Todas las imágenes son **placeholders** vía el componente `<image-slot>` (`image-slot.js`, incluido en este paquete) — un drop-zone que el usuario final completa con sus propias imágenes. Tipos usados:
- `shape="circle"`: escudos de equipo, avatares de persona.
- `shape="rounded"`: logos de torneo.
- `shape="rect" fit="cover"`: la foto hero de la pantalla de Bienvenida (actualmente con un `src` de ejemplo subido por el usuario en `uploads/`, no una imagen final de marca).

No se usan iconos de librería — todos los íconos son SVG inline dibujados a mano (stroke-based, 1.8–2.2px de grosor, siguiendo el estilo outline consistente en todo el sistema).

## Files

Documentación de negocio de referencia: `docs/02-casos-de-uso.md` — describe, caso de uso por caso de uso (UC-01 a UC-52), actores, flujos, reglas de negocio y resultado esperado de cada interacción del producto. Es la fuente de verdad funcional; las pantallas de este paquete son su traducción visual. Los casos UC-48 a UC-50 (administración de plataforma) están fuera de alcance de esta entrega y no tienen diseño.

Todos los archivos `.dc.html` de este paquete abren directamente en un navegador y son navegables — el desarrollador puede recorrerlos con clicks reales para entender el comportamiento antes de reimplementarlo.
