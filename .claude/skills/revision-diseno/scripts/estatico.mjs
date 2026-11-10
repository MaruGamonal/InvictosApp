#!/usr/bin/env node
/**
 * Revisión estática de diseño: lee CSS y TSX sin levantar la aplicación.
 *
 * Uso:
 *   node .claude/skills/revision-diseno/scripts/estatico.mjs [archivo-o-carpeta ...]
 *
 * Sin argumentos revisa `src/`. Con argumentos, sólo esos archivos o
 * carpetas (útil para revisar lo que cambió en una rama:
 * `git diff --name-only main... -- src | xargs node …/estatico.mjs`).
 *
 * Cada hallazgo sale con archivo:línea, la regla y por qué importa en
 * INVICTA. Son **candidatos**: quien revisa decide si es un problema
 * real. Sale con código 1 si hay hallazgos de severidad "alta".
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const RAIZ = process.cwd();
const objetivos = process.argv.slice(2).length ? process.argv.slice(2) : ['src'];

function listar(ruta) {
  if (!existsSync(ruta)) return [];
  if (statSync(ruta).isDirectory()) {
    return readdirSync(ruta).flatMap((n) =>
      n === 'node_modules' || n.startsWith('.') ? [] : listar(join(ruta, n)),
    );
  }
  return ['.css', '.tsx'].includes(extname(ruta)) && !/\.test\.tsx$/.test(ruta) ? [ruta] : [];
}

const archivos = [...new Set(objetivos.flatMap(listar))];
const hallazgos = [];

function anotar(archivo, linea, severidad, regla, detalle) {
  hallazgos.push({ archivo: relative(RAIZ, archivo), linea, severidad, regla, detalle });
}

/** Reglas por línea. `aplica` filtra por tipo de archivo. */
const REGLAS = [
  {
    aplica: (a) => a.endsWith('.module.css'),
    regex: /(?<![\w-])#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/,
    severidad: 'alta',
    regla: 'color-directo',
    detalle:
      'Color escrito directo en un componente. Todo color sale de un token de globals.css (`08`, 6.1 y 11.10): si no, el tema oscuro deja de ser "un cambio de valores".',
  },
  {
    aplica: (a) => a.endsWith('.css'),
    regex: /outline\s*:\s*(none|0)\b/,
    severidad: 'media',
    regla: 'foco-invisible',
    detalle:
      'Se quita el outline. Verificar que el mismo selector (o :focus-visible) dibuje otro indicador de foco visible con contraste ≥ 3:1.',
  },
  {
    aplica: (a) => a.endsWith('.css'),
    regex: /font-size\s*:\s*(\d+(?:\.\d+)?)px/,
    severidad: 'media',
    regla: 'texto-chico',
    filtro: (m) => Number(m[1]) < 11,
    detalle:
      'Texto de menos de 11px. Se lee al sol, en la calle, apurado (`08`, 5.1): justificar o subir.',
  },
  {
    aplica: (a) => a.endsWith('.css'),
    regex: /user-scalable\s*=\s*no|maximum-scale\s*=\s*1\b/,
    severidad: 'alta',
    regla: 'zoom-bloqueado',
    detalle: 'Bloquear el zoom rompe WCAG 1.4.4.',
  },
  {
    aplica: (a) => a.endsWith('.css'),
    regex: /transition\s*:[^;]*\ball\b/,
    severidad: 'baja',
    regla: 'transicion-all',
    detalle: '`transition: all` anima de más. La energía no vive en transiciones (`08`, 5.1).',
  },
  {
    aplica: (a) => a.endsWith('.tsx'),
    regex: /<img\b(?![^>]*\balt=)/,
    severidad: 'alta',
    regla: 'img-sin-alt',
    detalle: 'Imagen sin `alt`. Si es decorativa, `alt=""`; si es un escudo, el nombre del equipo.',
  },
  {
    aplica: (a) => a.endsWith('.tsx'),
    regex: /<div[^>]*\bonClick=/,
    severidad: 'alta',
    regla: 'div-clicable',
    detalle:
      '`div` con onClick: no llega con teclado ni lector de pantalla. Usar <button> o <Link>.',
  },
  {
    aplica: (a) => a.endsWith('.tsx'),
    regex: /style=\{\{[^}]*(color|background|margin|padding)\s*:/,
    severidad: 'media',
    regla: 'estilo-inline',
    detalle: 'Estilo inline de color o espaciado: se saltea los tokens.',
  },
  {
    aplica: (a) => a.endsWith('.tsx'),
    regex:
      /\b(perfil deportivo|integrante habilitado|entidad|registro efectuado|reprogramación efectuada|encuentro)\b/i,
    severidad: 'media',
    regla: 'vocabulario-de-sistema',
    detalle:
      'Vocabulario del modelo de datos o de sistema en texto visible. Lenguaje de cancha (`08`, 8): "plantel", "se movió el partido", "cargá el resultado".',
  },
  {
    aplica: (a) => a.endsWith('.tsx'),
    regex: />\s*(No hay [^<]{0,40}|Sin resultados)\.?\s*</,
    severidad: 'media',
    regla: 'vacio-sin-salida',
    detalle:
      'Posible estado vacío que sólo dice "no hay". Ninguna pantalla vacía sin salida (`05`, principio 5): ofrecer el paso siguiente concreto.',
  },
  {
    aplica: (a) => a.endsWith('.tsx'),
    regex: /\b(usted|ingrese|seleccione|haga clic|presione)\b/i,
    severidad: 'baja',
    regla: 'tono',
    detalle:
      'Tono formal o neutro-ibérico. El producto habla en rioplatense: "ingresá", "elegí", "tocá".',
  },
];

/**
 * Borra los comentarios de bloque conservando los saltos de línea, para
 * que los números de línea sigan valiendo: un hex citado en un
 * comentario de varias líneas no es un color usado.
 */
function sinComentarios(codigo) {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, (bloque) => bloque.replace(/[^\n]/g, ' '));
}

/**
 * Une cada etiqueta JSX de varias líneas en la línea donde abre, para
 * que `<img … alt="" />` partido en renglones no parezca sin `alt`.
 */
function etiquetasEnUnaLinea(lineas) {
  return lineas.map((linea, i) => {
    if (!/<(img|div)\b[^>]*$/.test(linea)) return linea;
    let completa = linea;
    for (
      let j = i + 1;
      j < lineas.length &&
      !/>/.test(lineas[j - 1].slice(lineas[j - 1].lastIndexOf('<'))) &&
      j < i + 30;
      j++
    ) {
      completa += ' ' + lineas[j].trim();
      if (/>/.test(lineas[j])) break;
    }
    return completa;
  });
}

for (const archivo of archivos) {
  const codigo = readFileSync(archivo, 'utf8');
  // Lo que dibuja `next/og` usa estilos inline por obligación: el
  // dibujante no lee CSS. Ahí `estilo-inline` no es un hallazgo.
  const esImagenGenerada = /from 'next\/og'/.test(codigo);
  let lineas = sinComentarios(codigo).split('\n');
  if (archivo.endsWith('.tsx')) lineas = etiquetasEnUnaLinea(lineas);
  lineas.forEach((texto, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(texto)) return; // comentarios
    for (const r of REGLAS) {
      if (!r.aplica(archivo)) continue;
      if (esImagenGenerada && r.regla === 'estilo-inline') continue;
      const m = texto.match(r.regex);
      if (m && (!r.filtro || r.filtro(m))) anotar(archivo, i + 1, r.severidad, r.regla, r.detalle);
    }
  });
}

// Reglas por archivo ------------------------------------------------------

for (const archivo of archivos.filter((a) => a.endsWith('.module.css'))) {
  const css = readFileSync(archivo, 'utf8');
  // Display en texto corrido o etiquetas de formulario (`08`, 7).
  for (const bloque of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const [, selector, cuerpo] = bloque;
    if (
      /--fuente-display/.test(cuerpo) &&
      /\b(label|etiqueta|parrafo|texto|descripcion|ayuda|cuerpo)\b/i.test(selector)
    ) {
      const linea = css.slice(0, bloque.index).split('\n').length;
      anotar(
        archivo,
        linea,
        'media',
        'display-en-texto',
        `\`${selector.trim()}\` usa la familia display. Display nunca en texto corrido ni etiquetas de formulario (\`08\`, 7).`,
      );
    }
  }
  // Tablas/marcadores sin cifras tabulares (`08`, 7, DIS-05).
  if (
    /(tabla|marcador|fila|puntos|goles|posicion)/i.test(archivo + css) &&
    /\b(td|th|\.puntos|\.goles|\.marcador|\.numero)/i.test(css) &&
    !/tabular-nums/.test(css)
  ) {
    anotar(
      archivo,
      1,
      'media',
      'sin-tabular-nums',
      'Muestra columnas de números y no declara `font-variant-numeric: tabular-nums` (DIS-05: requisito de descarte).',
    );
  }
}

// Salida ------------------------------------------------------------------

const orden = { alta: 0, media: 1, baja: 2 };
hallazgos.sort(
  (a, b) => orden[a.severidad] - orden[b.severidad] || a.archivo.localeCompare(b.archivo),
);

const porRegla = {};
for (const h of hallazgos) porRegla[h.regla] = (porRegla[h.regla] ?? 0) + 1;

console.log(`Revisión estática — ${archivos.length} archivos, ${hallazgos.length} candidatos\n`);
for (const [regla, n] of Object.entries(porRegla)) console.log(`  ${regla.padEnd(24)} ${n}`);
console.log('');
for (const h of hallazgos) {
  console.log(`[${h.severidad}] ${h.archivo}:${h.linea}  ${h.regla}\n        ${h.detalle}`);
}
process.exit(hallazgos.some((h) => h.severidad === 'alta') ? 1 : 0);
