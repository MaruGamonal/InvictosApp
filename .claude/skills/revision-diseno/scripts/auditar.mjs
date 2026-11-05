#!/usr/bin/env node
/**
 * Auditoría en el navegador: abre cada ruta a ancho de teléfono, la mide
 * y le saca captura. Lo que mide es lo que se puede medir sin criterio
 * humano — contraste, áreas táctiles, nombres accesibles, desbordes,
 * foco—; el resto lo decide quien mira las capturas.
 *
 * Uso:
 *   node .claude/skills/revision-diseno/scripts/auditar.mjs \
 *     --base http://127.0.0.1:3000 \
 *     --rutas /,/torneos,/torneo/123 \
 *     [--anchos 360,480] [--salida .revision-diseno] \
 *     [--estado-sesion sesion.json] [--sin-capturas]
 *
 * `--estado-sesion` es un storageState de Playwright (cookies de una
 * sesión ya iniciada) para las rutas que redirigen a /ingresar.
 *
 * Deja en `--salida`: capturas por ruta y ancho, `informe.json` y
 * `informe.md`. Sale con código 1 si hay hallazgos de severidad "alta".
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

async function cargarChromium() {
  for (const modulo of ['@playwright/test', 'playwright']) {
    try {
      const m = await import(modulo);
      if (m.chromium) return m.chromium;
    } catch {}
  }
  // Fuera del proyecto (o con Playwright global): la resolución CJS sí
  // respeta NODE_PATH.
  const requerir = createRequire(join(process.cwd(), 'x.js'));
  for (const modulo of ['@playwright/test', 'playwright']) {
    try {
      const m = requerir(modulo);
      if (m.chromium) return m.chromium;
    } catch {}
  }
  throw new Error('No encontré Playwright. Correr `npm install` (es devDependency del proyecto).');
}

function argumento(nombre, porDefecto) {
  const i = process.argv.indexOf(`--${nombre}`);
  if (i === -1) return porDefecto;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}

const base = String(argumento('base', 'http://127.0.0.1:3000')).replace(/\/$/, '');
const rutas = String(argumento('rutas', '/'))
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);
const anchos = String(argumento('anchos', '360,480')).split(',').map(Number);
const salida = String(argumento('salida', '.revision-diseno'));
const estadoSesion = argumento('estado-sesion', null);
const sinCapturas = Boolean(argumento('sin-capturas', false));

mkdirSync(salida, { recursive: true });

/** Corre dentro de la página. Devuelve hallazgos crudos. */
function medirEnPagina() {
  const res = [];
  const anotar = (severidad, regla, detalle, el) => {
    let selector = '';
    if (el) {
      const partes = [];
      let n = el;
      for (let i = 0; n && n.nodeType === 1 && i < 4; i++, n = n.parentElement) {
        let s = n.tagName.toLowerCase();
        if (n.id) s += `#${n.id}`;
        else if (n.classList.length) s += '.' + [...n.classList].slice(0, 2).join('.');
        partes.unshift(s);
      }
      selector = partes.join(' > ');
    }
    const texto = el
      ? (el.innerText || el.getAttribute?.('aria-label') || '').trim().slice(0, 50)
      : '';
    res.push({ severidad, regla, detalle, selector, texto });
  };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      cs.visibility !== 'hidden' &&
      cs.display !== 'none' &&
      Number(cs.opacity) > 0
    );
  };

  // --- Color y contraste -------------------------------------------------
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = 1] = m[1]
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number);
    return { r, g, b, a };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const mezclar = (arriba, abajo) => ({
    r: arriba.r * arriba.a + abajo.r * (1 - arriba.a),
    g: arriba.g * arriba.a + abajo.g * (1 - arriba.a),
    b: arriba.b * arriba.a + abajo.b * (1 - arriba.a),
    a: 1,
  });
  /** Fondos posibles detrás de un elemento: con un degradé, todas sus paradas. */
  const fondos = (el) => {
    const capas = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const img = cs.backgroundImage;
      if (img && img !== 'none') {
        if (/url\(/.test(img)) return null; // foto de fondo: no se puede medir
        const paradas = [...img.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0]));
        if (paradas.length)
          return paradas.map((p) => capas.reduceRight((acc, c) => mezclar(c, acc), p));
      }
      const bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0) {
        if (bg.a >= 1) return [capas.reduceRight((acc, c) => mezclar(c, acc), bg)];
        capas.push(bg);
      }
    }
    const blanco = { r: 255, g: 255, b: 255, a: 1 };
    return [capas.reduceRight((acc, c) => mezclar(c, acc), blanco)];
  };

  const conTexto = [...document.querySelectorAll('body *')].filter(
    (el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()),
  );
  for (const el of conTexto) {
    const cs = getComputedStyle(el);
    const color = parse(cs.color);
    if (!color) continue;
    const tam = parseFloat(cs.fontSize);
    const negrita = Number(cs.fontWeight) >= 700;
    const grande = tam >= 24 || (negrita && tam >= 18.66);
    const minimo = grande ? 3 : 4.5;
    const detras = fondos(el);
    if (!detras) continue;
    const peor = Math.min(...detras.map((f) => ratio(color.a < 1 ? mezclar(color, f) : color, f)));
    if (peor < minimo) {
      anotar(
        peor < minimo - 1 ? 'alta' : 'media',
        'contraste',
        `Contraste ${peor.toFixed(2)}:1 (mínimo ${minimo}:1, texto ${tam}px${negrita ? ' negrita' : ''}). WCAG 1.4.3; se lee al sol.`,
        el,
      );
    }
    if (tam < 12) anotar('media', 'texto-chico', `Texto de ${tam}px.`, el);
  }

  // --- Áreas táctiles ----------------------------------------------------
  const interactivos = [
    ...document.querySelectorAll(
      'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=link], [tabindex]:not([tabindex="-1"])',
    ),
  ].filter(visible);
  for (const el of interactivos) {
    const r = el.getBoundingClientRect();
    // Un enlace dentro de un párrafo queda exceptuado por WCAG 2.5.8.
    const enLinea =
      el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p');
    if (enLinea) continue;
    const lado = Math.min(r.width, r.height);
    if (lado < 24)
      anotar(
        'alta',
        'area-tactil',
        `${Math.round(r.width)}×${Math.round(r.height)}px: menos de 24px (WCAG 2.5.8).`,
        el,
      );
    else if (lado < 44)
      anotar(
        'media',
        'area-tactil',
        `${Math.round(r.width)}×${Math.round(r.height)}px: menos de 44px. Se usa de pie, con una mano (\`05\`, 2.1).`,
        el,
      );
  }

  // --- Nombres accesibles ------------------------------------------------
  const nombre = (el) =>
    (
      el.getAttribute('aria-label') ||
      (el.getAttribute('aria-labelledby') &&
        el
          .getAttribute('aria-labelledby')
          .split(' ')
          .map((id) => document.getElementById(id)?.innerText || '')
          .join(' ')) ||
      el.innerText ||
      el.getAttribute('title') ||
      [...el.querySelectorAll('img[alt]')].map((i) => i.alt).join(' ') ||
      el.querySelector('svg title')?.textContent ||
      ''
    ).trim();
  for (const el of document.querySelectorAll('a[href], button, [role=button]')) {
    if (visible(el) && !nombre(el))
      anotar(
        'alta',
        'sin-nombre',
        'Control sin nombre accesible: el lector de pantalla dice "botón" y nada más.',
        el,
      );
  }
  for (const el of document.querySelectorAll(
    'input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea',
  )) {
    if (!visible(el)) continue;
    const etiquetado =
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      el.closest('label') ||
      (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`));
    if (!etiquetado)
      anotar(
        'alta',
        'campo-sin-etiqueta',
        'Campo sin <label> asociado (el placeholder no cuenta).',
        el,
      );
  }
  for (const img of document.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) anotar('alta', 'img-sin-alt', 'Imagen sin alt.', img);
    else if (visible(img) && img.complete && img.naturalWidth === 0)
      anotar(
        'media',
        'img-rota',
        'Imagen que no cargó: ¿hay placeholder digno? (`08`, 11.10).',
        img,
      );
  }

  // --- Estructura --------------------------------------------------------
  if (!document.documentElement.lang) anotar('alta', 'sin-lang', '<html> sin lang.', null);
  if (!document.title.trim()) anotar('media', 'sin-title', 'La pestaña no tiene título.', null);
  const h1 = [...document.querySelectorAll('h1')].filter(visible);
  if (h1.length !== 1)
    anotar('media', 'h1', `Hay ${h1.length} <h1> visibles; tiene que haber exactamente uno.`, null);
  let anterior = 0;
  for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    const nivel = Number(h.tagName[1]);
    if (anterior && nivel > anterior + 1)
      anotar('baja', 'saltos-de-titulo', `De h${anterior} a h${nivel} sin intermedio.`, h);
    anterior = nivel;
  }
  if (!document.querySelector('main, [role=main]'))
    anotar(
      'baja',
      'sin-main',
      'No hay <main>: el lector de pantalla no puede saltar al contenido.',
      null,
    );
  const ids = {};
  for (const el of document.querySelectorAll('[id]')) ids[el.id] = (ids[el.id] || 0) + 1;
  for (const [id, n] of Object.entries(ids))
    if (n > 1) anotar('media', 'id-repetido', `id="${id}" aparece ${n} veces.`, null);

  // --- Desborde ----------------------------------------------------------
  const anchoVisible = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > anchoVisible + 1) {
    const culpables = [...document.querySelectorAll('body *')]
      .filter((el) => visible(el) && el.getBoundingClientRect().right > anchoVisible + 1)
      .slice(0, 3);
    anotar(
      'alta',
      'scroll-horizontal',
      `La página mide ${document.documentElement.scrollWidth}px en una pantalla de ${anchoVisible}px.`,
      culpables[0] || null,
    );
  }
  for (const el of conTexto) {
    if (
      el.scrollWidth > el.clientWidth + 1 &&
      getComputedStyle(el).overflow === 'hidden' &&
      getComputedStyle(el).textOverflow !== 'ellipsis'
    ) {
      anotar('media', 'texto-cortado', 'Texto cortado sin elipsis.', el);
    }
  }
  return res;
}

const chromium = await cargarChromium();
const navegador = await chromium.launch();
const informe = [];

for (const ancho of anchos) {
  const contexto = await navegador.newContext({
    viewport: { width: ancho, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'es-AR',
    ...(estadoSesion && existsSync(estadoSesion)
      ? { storageState: JSON.parse(readFileSync(estadoSesion, 'utf8')) }
      : {}),
  });
  for (const ruta of rutas) {
    const pagina = await contexto.newPage();
    const errores = [];
    pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
    pagina.on('pageerror', (e) => errores.push(String(e)));
    const hallazgos = [];
    let estado = null;
    try {
      const r = await pagina.goto(base + ruta, { waitUntil: 'networkidle', timeout: 30000 });
      estado = r?.status() ?? null;
      await pagina.evaluate(() => document.fonts?.ready);
      if (estado && estado >= 400)
        hallazgos.push({ severidad: 'alta', regla: 'http', detalle: `Respondió ${estado}.` });
      if (!pagina.url().startsWith(base + ruta.split('?')[0])) {
        hallazgos.push({
          severidad: 'baja',
          regla: 'redireccion',
          detalle: `Terminó en ${pagina.url()} (¿falta --estado-sesion?).`,
        });
      }
      hallazgos.push(...(await pagina.evaluate(medirEnPagina)));

      // Foco con teclado: los primeros 20 Tab tienen que verse.
      for (let i = 0; i < 20; i++) {
        await pagina.keyboard.press('Tab');
        const foco = await pagina.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const cs = getComputedStyle(el);
          const visible =
            (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ||
            cs.boxShadow !== 'none';
          return {
            visible,
            etiqueta:
              el.tagName.toLowerCase() +
              (el.className ? '.' + String(el.className).split(' ')[0] : ''),
            texto: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40),
          };
        });
        if (!foco) break;
        if (!foco.visible)
          hallazgos.push({
            severidad: 'alta',
            regla: 'foco-invisible',
            detalle: 'Con teclado no se ve dónde está el foco (WCAG 2.4.7).',
            selector: foco.etiqueta,
            texto: foco.texto,
          });
      }
      await pagina.evaluate(() => document.activeElement?.blur());

      if (!sinCapturas) {
        const archivo = join(
          salida,
          `${ruta.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '') || 'raiz'}@${ancho}.png`,
        );
        await pagina.screenshot({ path: archivo, fullPage: true });
        hallazgos.push({ severidad: 'info', regla: 'captura', detalle: archivo });
      }
    } catch (e) {
      hallazgos.push({ severidad: 'alta', regla: 'no-abre', detalle: String(e).split('\n')[0] });
    }
    for (const err of errores)
      hallazgos.push({ severidad: 'media', regla: 'consola', detalle: err.slice(0, 200) });
    // Colapsar repetidos (la misma regla en el mismo selector).
    const vistos = new Map();
    for (const h of hallazgos) {
      const clave = `${h.regla}|${h.selector ?? ''}|${h.detalle}`;
      const previo = vistos.get(clave);
      if (previo) previo.veces++;
      else vistos.set(clave, { ...h, veces: 1 });
    }
    informe.push({ ruta, ancho, estado, hallazgos: [...vistos.values()] });
    await pagina.close();
  }
  await contexto.close();
}
await navegador.close();

// Salida ------------------------------------------------------------------

writeFileSync(join(salida, 'informe.json'), JSON.stringify(informe, null, 2));
const orden = { alta: 0, media: 1, baja: 2, info: 3 };
let md = `# Auditoría automática — ${new Date().toISOString().slice(0, 16)}\n\nBase: ${base}\n\n`;
let altas = 0;
for (const { ruta, ancho, estado, hallazgos } of informe) {
  const reales = hallazgos
    .filter((h) => h.severidad !== 'info')
    .sort((a, b) => orden[a.severidad] - orden[b.severidad]);
  altas += reales.filter((h) => h.severidad === 'alta').length;
  md += `## \`${ruta}\` @ ${ancho}px — ${estado ?? 'sin respuesta'} — ${reales.length} hallazgos\n\n`;
  const captura = hallazgos.find((h) => h.regla === 'captura');
  if (captura) md += `Captura: \`${captura.detalle}\`\n\n`;
  for (const h of reales) {
    md += `- **[${h.severidad}] ${h.regla}**${h.veces > 1 ? ` ×${h.veces}` : ''} — ${h.detalle}${h.selector ? ` \`${h.selector}\`` : ''}${h.texto ? ` «${h.texto}»` : ''}\n`;
  }
  md += '\n';
}
writeFileSync(join(salida, 'informe.md'), md);
console.log(md);
console.log(`Informe en ${join(salida, 'informe.md')} (${altas} hallazgos de severidad alta).`);
process.exit(altas ? 1 : 0);
