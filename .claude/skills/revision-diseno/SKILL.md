---
name: revision-diseno
description: Revisión integral de diseño de INVICTA — accesibilidad (WCAG 2.2 AA), usabilidad, estética y jerarquía, coherencia con el sistema de diseño y los tokens, flujos y estados, tono del contenido, imagen de marca y responsive móvil. Usar cuando se pida revisar, auditar o validar el diseño, la UX, la UI, la accesibilidad o la coherencia visual de una pantalla, un componente, un flujo, una rama o la aplicación entera, o antes de dar por terminada una pantalla nueva.
---

# Revisión de diseño — INVICTA

Una revisión que mira **todo** lo que una persona ve y toca: accesibilidad,
usabilidad, estética, coherencia, flujos, estados, contenido, imagen y
responsive. Combina **medición automática** (lo que se puede contar) con
**criterio** (lo que hay que mirar), y contrasta todo contra las reglas
escritas del producto, no contra gustos.

## Fuentes de verdad (en este orden)

1. `docs/documentacion/06-reglas-negocio-y-decisiones-pendientes.md` — el porqué de cada regla (`D-nn`).
2. `docs/documentacion/08-brief-diseno.md` — principios (4), energía vs. legibilidad (5.1), color (6), densidad (6.5), tipografía (7), tono (8), plataforma (9), inventario de pantallas (11), decisiones DIS-01…08 (12).
3. `docs/documentacion/05-flujos-ux-user-journeys.md` — principios de UX (2), recorridos (4) y **casos especiales** (5).
4. `docs/documentacion/04-catalogo-enumeraciones.md`, sección 6 — etiqueta y color exactos de cada estado.
5. `docs/diseno/Invictos Design System.dc.html` y las pantallas del paquete, con las diferencias de `docs/diseno/LEEME-ANTES-DE-USAR.md`.
6. `src/app/globals.css` — los tokens reales.

No hace falta leerlos enteros: abrir la sección que toca a lo que se revisa.
El checklist completo, con la regla de origen de cada punto, está en
[`referencias/checklist.md`](referencias/checklist.md) — **leerlo siempre**.

## 1. Delimitar el alcance

Decidir qué se revisa y anotarlo al principio del informe:

- **Una rama / un cambio** → `git diff --name-only origin/main...HEAD -- src` y las rutas que esos archivos afectan.
- **Una pantalla o componente** → el archivo, sus estilos, quién lo usa (`grep` del nombre) y su entrada en `08`, sección 11.
- **Un flujo** → el recorrido de `05`, sección 4, de punta a punta.
- **Toda la aplicación** → las rutas de `src/app/**/page.tsx`; priorizar las de mayor tráfico (descubrimiento, ficha, fixture, tabla, carga de resultados, inicio).

Identificar para cada pantalla: **actor** (`08`, 10), **densidad** (`08`, 6.5), **modo** (jugador/organizador) y si puede llevar publicidad (D-63).

## 2. Revisión estática (siempre)

```bash
node .claude/skills/revision-diseno/scripts/estatico.mjs [archivos o carpetas]
```

Busca colores directos en módulos, foco quitado, texto < 11px, display en
texto, columnas de números sin `tabular-nums`, `<img>` sin alt, `div` con
`onClick`, estilos inline, vocabulario de sistema, tono formal y vacíos
sin salida. Son **candidatos**: confirmar cada uno leyendo el código antes
de reportarlo (p. ej. un `rgba()` en una sombra puede ser aceptable si no
hay token; decirlo).

Correr también los tests de arquitectura que ya cuidan diseño:

```bash
npx vitest run src/app/tokensDeCss.arquitectura.test.ts src/app/cabecerasPorModo.arquitectura.test.ts src/app/clavesDeCssModules.arquitectura.test.ts src/app/publicidad.arquitectura.test.ts
```

## 3. Auditoría en el navegador (cuando se puede levantar la app)

Levantar la aplicación (`npm run dev`, o la build de e2e si no hay `.env` —
ver `test/e2e/README.md`) y correr:

```bash
node .claude/skills/revision-diseno/scripts/auditar.mjs --base http://127.0.0.1:3000 --rutas /,/torneos,/torneo/ID --anchos 360,480 --salida .revision-diseno
```

Para rutas con sesión, pasar `--estado-sesion archivo.json` (un
`storageState` de Playwright; la suite e2e muestra cómo armar la cookie en
`test/e2e/_sesion.ts`).

Mide por ruta y ancho: contraste real (incluso sobre degradés), áreas
táctiles, nombres accesibles, campos sin etiqueta, imágenes, `lang`, `h1`
y orden de títulos, ids repetidos, scroll horizontal, texto cortado, foco
visible con Tab, errores de consola. Deja capturas a 2× y
`informe.md`/`informe.json` en `--salida` (no commitear esa carpeta).

Si no se puede levantar la app, decirlo en el informe y compensar leyendo
el JSX y el CSS con más cuidado; el contraste se calcula a mano con los
valores de los tokens.

## 4. Revisión con criterio (lo que ningún script ve)

**Mirar las capturas** (con la herramienta Read sobre los `.png`) y
recorrer el checklist sección por sección:

1. Accesibilidad — lo que el script no cubre: orden de foco, diálogos, anuncios de error, color como único portador de significado, reduced motion.
2. Coherencia con el sistema — tokens, cabecera por modo, componentes reutilizados, badges de `04`, comparación con el `.dc.html` correspondiente.
3. Estética y jerarquía — ¿la energía está en la tipografía y los números, o en fondos y adornos? ¿Se lee el número al sol?
4. Usabilidad — primer segundo, acción primaria, pulgar, contexto inequívoco, acciones de peso distinto.
5. Estados — cargando, vacío, error, sin permiso, datos extremos, provisorio vs. confirmado, cambios visibles. Si el estado no se puede provocar en el navegador, leerlo en el código.
6. Flujos — recorrer el flujo entero de `05`, contar toques, revisar los casos especiales de `05`, sección 5 que lo tocan.
7. Contenido y tono — voseo, lenguaje de cancha, mensajes de bloqueo con salida, confirmaciones que dicen la consecuencia real.
8. Imagen y marca — INVICTA, identidad oscura / lienzo claro, íconos, escudos, publicidad contenida.
9. Responsive — 360 y 480, teclado abierto, zonas seguras.

Ponerse en los zapatos de cada actor que usa la pantalla: el **visitante**
que llegó por un link de WhatsApp, el **organizador parado en la cancha**
con una mano, el **capitán** coordinando en paralelo, el **jugador** que
sólo quiere saber cuándo juega.

## 5. Informe

Escribirlo en español, en este formato, y guardarlo en
`.revision-diseno/informe-revision.md` además de mostrarlo:

```markdown
# Revisión de diseño — <alcance> — <fecha>

**Veredicto:** listo / listo con ajustes / no listo — una línea de por qué.
**Cobertura:** qué se revisó, a qué anchos, qué no se pudo revisar y por qué.

## Hallazgos

### Bloqueantes

1. **<título corto>** — `ruta/archivo.tsx:42` · <dimensión>
   Qué pasa: … (con el dato medido: "contraste 3.2:1", "área 32×20px", captura).
   Por qué importa: la regla y su origen (`08`, 6.3 / D-85 / WCAG 2.5.8) y a quién afecta.
   Arreglo: concreto — token, componente o texto exacto.

### Altos

### Medios

### Bajos

## Lo que está bien

Dos o tres cosas que respetan el sistema y conviene no romper.

## Resumen por dimensión

| Dimensión            | Estado   | Hallazgos |
| -------------------- | -------- | --------- |
| Accesibilidad        | ✅/⚠️/❌ | n         |
| Coherencia           |          |           |
| Estética y jerarquía |          |           |
| Usabilidad           |          |           |
| Estados              |          |           |
| Flujos               |          |           |
| Contenido y tono     |          |           |
| Imagen y marca       |          |           |
| Responsive           |          |           |
```

Reglas del informe:

- **Cada hallazgo con evidencia** (archivo:línea, medida o captura) y **con su regla de origen**. Sin regla escrita, es una opinión: se puede incluir en "Bajos" diciendo que lo es.
- Agrupar hallazgos repetidos (el mismo problema en 12 botones es un hallazgo con 12 lugares).
- No inflar: un ítem del checklist que se cumple no se reporta.
- Si algo contradice la documentación pero la documentación parece equivocada, señalarlo como **pregunta**, no como error.

## 6. Arreglar (sólo si se pidió)

Si el pedido incluye corregir: empezar por los bloqueantes, usar tokens y
componentes existentes, no tocar reglas de negocio, correr `npm run verify`
y volver a pasar los dos scripts para mostrar el antes y el después. Si un
arreglo pide un token nuevo, agregarlo en `globals.css` con un comentario
que diga por qué, como los que ya hay.
