# Checklist de revisión de diseño — INVICTA

Cada punto dice **qué mirar** y **de dónde sale la regla**. Si un punto no
aplica a la pantalla, se salta; si aplica y no se cumple, es un hallazgo.
Ante una duda de regla de negocio manda `06`; de estilo, el Design System
(`docs/diseno/Invictos Design System.dc.html`); de etiqueta o color de un
estado, `04` sección 6.

Severidades:

- **Bloqueante** — impide usar la pantalla, miente sobre un dato, o rompe
  WCAG A/AA para una tarea principal.
- **Alta** — contradice una regla `[Definido]` de `05`/`06`/`08`, o una
  persona real se equivoca o se traba.
- **Media** — incoherencia visible con el resto del producto o fricción
  evitable.
- **Baja** — pulido.

---

## 1. Accesibilidad (WCAG 2.2 AA)

- [ ] Contraste de texto ≥ 4.5:1 (≥ 3:1 si ≥ 24px o ≥ 18.66px negrita). Sobre
      degradés, medir contra **la parada más clara** (ver el comentario de
      `--cabecera-organizador` en `globals.css`).
- [ ] Contraste de componentes no textuales (bordes de input, íconos con
      significado, indicador de foco) ≥ 3:1.
- [ ] **Ningún estado se comunica sólo con color**: todo badge lleva su
      etiqueta visible del catálogo (`08`, 6.3).
- [ ] Áreas táctiles ≥ 44×44px; nunca < 24px (WCAG 2.5.8). Vale también en
      densidad compacta: la fila puede ser baja, el área no (`08`, 6.5).
- [ ] Todo control tiene nombre accesible; los botones de ícono, `aria-label`.
- [ ] Todo campo tiene `<label>` asociado. El placeholder no es etiqueta.
- [ ] Errores de formulario: en texto, junto al campo, asociados con
      `aria-describedby`, y anunciados (`aria-live` / `role="alert"`).
- [ ] Foco visible en todo lo que se alcanza con Tab, y orden de foco igual al
      orden visual. Las hojas/diálogos atrapan el foco y lo devuelven al cerrar;
      cierran con Escape.
- [ ] Un solo `<h1>`, títulos sin saltos, `<main>`, `<nav>` con nombre.
- [ ] Imágenes: escudo = nombre del equipo; decorativa = `alt=""`.
- [ ] Zoom al 200% y texto agrandado del sistema sin cortar contenido.
- [ ] `prefers-reduced-motion` respetado en lo que se mueva (punto "en vivo",
      momentos de celebración).
- [ ] Idioma `lang="es-AR"` (o `es`) en `<html>`.

## 2. Coherencia con el sistema

- [ ] **Cero colores escritos directo** en componentes: todo sale de un token
      de `src/app/globals.css` (`08`, 6.1; lo cuidan `tokensDeCss` y el script
      estático).
- [ ] Radios, espaciados y sombras con los tokens (`--radio-*`, `--espacio-*`,
      `--sombra-tarjeta`).
- [ ] **Cabecera de pantalla** = `--cabecera-jugador` o
      `--cabecera-organizador` según el modo; **superficie oscura dentro de
      pantalla clara** (marcador, próximo partido) = `--identidad-fondo`
      (test `cabecerasPorModo`).
- [ ] Un componente que ya existe en `src/components/` se reutiliza; no se
      dibuja otro parecido (Badge, FilaTabla, BarraAccionFija, HojaDeOpciones,
      estados vacíos, avisos…).
- [ ] Badge de estado: **etiqueta y color exactamente los de `04`, sección 6**.
      No reinterpretar.
- [ ] Mismo concepto, mismo nombre, mismo ícono y misma posición en todas las
      pantallas (p. ej. "Seguir", "Compartir", volver).
- [ ] Ancho máximo `--ancho-aplicacion` (480px) centrado; nada se estira.
- [ ] Comparar con la pantalla equivalente del paquete `docs/diseno/` —
      respetando las diferencias de `LEEME-ANTES-DE-USAR.md`.

## 3. Estética y jerarquía (`08`, 5 y 7)

- [ ] **La energía vive en tipografía, contraste y momentos**, no en fondos de
      color ni decoración. Si algo hace más difícil leer un número, es
      decorativo (DIS-01).
- [ ] Display (Barlow Condensed, mayúsculas) **sólo** en marcadores,
      posiciones, nombres de torneo/equipo, títulos de sección y números de
      estadística. **Nunca** en texto corrido ni etiquetas de formulario.
- [ ] Cifras tabulares (`font-variant-numeric: tabular-nums`) en toda columna
      de números y en marcadores (DIS-05).
- [ ] El marcador es el elemento más grande de su tarjeta, sin competencia.
- [ ] Jerarquía agresiva: se distingue lo principal de lo secundario a un
      metro de distancia. Máximo dos o tres tamaños de texto por bloque.
- [ ] **Un solo acento** (cian), poco y siempre con significado (acción
      primaria, activo). No verde ni rojo como acento (DIS-03, DIS-04).
- [ ] El acento no se confunde con éxito/error; advertencia y éxito se
      distinguen en un badge chico sin leer el texto (`08`, 6.3).
- [ ] **El contenido del usuario es el que tiene color**: la interfaz no
      compite con escudos y fotos (`08`, principio 5).
- [ ] Densidad declarada y correcta para la tarea: compacta (tabla, fixture,
      plantel, carga de resultados), estándar, amplia (hero, perfil,
      confirmaciones, vacíos) (`08`, 6.5).
- [ ] Alineación a una grilla; márgenes laterales `--espacio-pantalla-x`;
      ritmo vertical constante. Sin bordes + sombra + fondo a la vez.
- [ ] Escudo/avatar sin imagen: **placeholder digno**, no un ícono roto.

## 4. Usabilidad

- [ ] **Se entiende en el primer segundo** qué es la pantalla y qué se puede
      hacer (crítico para el visitante que llega por link — `08`, 10).
- [ ] Una sola acción primaria por pantalla, visible sin scroll o en
      `BarraAccionFija`, al alcance del pulgar.
- [ ] Nada esencial detrás de un gesto oculto (swipe, long-press) (`08`, 9).
- [ ] Acciones de peso distinto **no se ven equivalentes** (p. ej. "Seguir" vs.
      "Pedir sumarme", D-85).
- [ ] El sistema no ofrece acciones que después niega (DT sin permisos de
      gestión, colaborador que sólo ve sus torneos — `08`, 10).
- [ ] **Contexto inequívoco**: en qué torneo / equipo / ciudad / modo se está
      operando, siempre visible (`05`, 5 — colaborador en varios torneos).
- [ ] Teclado del celular correcto por campo (`inputmode`, `type`,
      `autocomplete`); números con teclado numérico.
- [ ] Validación al salir del campo o al enviar, nunca mientras se escribe el
      primer carácter. Se conserva lo cargado si algo falla.
- [ ] Feedback inmediato a cada toque (estado de carga, deshabilitado mientras
      se envía, confirmación al terminar). Nada de doble envío.
- [ ] Acciones destructivas: confirmación que **describe la consecuencia
      real**, sin alarmismo (qué se pierde y qué no — `08`, 8).
- [ ] Deshacer o volver atrás sin perder trabajo. El botón "atrás" del
      teléfono hace lo esperable.

## 5. Estados (cada pantalla, todos)

- [ ] **Cargando** — esqueleto o indicador; el layout no salta al llegar los datos.
- [ ] **Vacío** — nunca "no hay nada": **el paso siguiente concreto** (`05`, principio 5).
- [ ] **Error** — qué pasó, en lenguaje de cancha, y cómo seguir.
- [ ] **Sin permiso / sin sesión** — explica y ofrece entrar; el registro se
      pide **en el momento de la acción** (`05`, principio 1).
- [ ] **Datos extremos** — nombres largos de torneo/equipo, 0 y 99 goles,
      30 equipos, plantel de 1 y de 40, sin escudo, sin foto.
- [ ] **Provisorio vs. confirmado** — un resultado sin confirmar, en disputa,
      confirmado por vencimiento, por presentación o corregido **no se ve igual**
      que uno confirmado, ni en el partido ni en la tabla (`05`, 5; `08`, principio 3).
- [ ] **Lo que cambió se muestra como cambio** — partido reprogramado con su
      fecha original, reglamento modificado con qué y desde cuándo.

## 6. Flujos (`05`, sección 4)

- [ ] Recorrer el flujo completo, no la pantalla suelta: entrada → tarea →
      confirmación → a dónde vuelve.
- [ ] Cantidad de toques del recorrido frecuente; **cargar resultados** es el
      de menor fricción del producto (`05`, 4.3; DIS-07).
- [ ] Cada paso dice dónde estás y cuánto falta (si son varios).
- [ ] Ninguna pantalla sin salida; ningún callejón que obligue a volver al inicio.
- [ ] Al terminar, la persona ve el resultado de lo que hizo (y no una pantalla genérica).
- [ ] Los casos especiales de `05`, sección 5 que tocan este flujo están
      resueltos como dice la tabla (repasar fila por fila).
- [ ] La publicidad aparece **sólo** en ficha pública, fixture y
      descubrimiento, en su contenedor propio; **nunca** en tareas del
      organizador ni en la inscripción del capitán (D-63; test `publicidad`).
- [ ] Compartir hacia afuera con un toque donde el capitán lo necesita.

## 7. Contenido y tono (`08`, 8)

- [ ] Español rioplatense, voseo ("cargá", "elegí", "tocá"). Sin "usted",
      "ingrese", "seleccione".
- [ ] Lenguaje de cancha, no de sistema; **sin vocabulario del modelo de
      datos** — se usa la etiqueta visible de `04`, no el valor técnico.
- [ ] Mensajes de bloqueo: qué pasa, por qué y cómo resolverlo ahí mismo
      (caso testigo: torneo no listado por organización sin verificar ≠
      "tu torneo no existe").
- [ ] Botones con verbo + objeto ("Cargar resultado", no "Aceptar").
- [ ] Fechas y horas en formato local (`sáb 12/4 · 15:30`), sin ambigüedad.
- [ ] Sin ortografía rota ni mayúsculas inconsistentes; tildes en mayúsculas.

## 8. Imagen y marca

- [ ] El nombre es **INVICTA** en todo texto visible (no "Invictos").
- [ ] Superficies de identidad (hero, cabecera de perfil, entrada, tarjeta
      compartible) en oscuro con el acento; cuerpo de trabajo en claro (DIS-02).
- [ ] Ícono, favicon, `manifest`, título de pestaña y vista previa al
      compartir (Open Graph) coherentes y presentes.
- [ ] Fotos y escudos: proporción respetada (`object-fit`), recorte digno,
      sin pixelado a 2×.
- [ ] Íconos de una sola familia, mismo grosor de trazo y tamaño óptico.
- [ ] Contenedor de publicidad que se lee como contenido ajeno **sin texto que
      lo explique** (`08`, 6.4).

## 9. Responsive y plataforma

- [ ] Sin scroll horizontal a 360px y a 480px.
- [ ] En pantalla grande se centra la columna; sólo fixture/configuración
      pueden tener layout propio (`08`, 9).
- [ ] Zonas seguras del teléfono (`env(safe-area-inset-*)`) en barras fijas.
- [ ] Teclado abierto no tapa el campo activo ni la acción primaria.
- [ ] Rendimiento percibido: sin saltos de layout (CLS), imágenes con tamaño
      reservado, fuentes sin parpadeo largo.
