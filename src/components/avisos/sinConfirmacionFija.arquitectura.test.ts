import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Ninguna pantalla vuelve a dejar un «Guardado.» fijo dentro del
 * formulario.
 *
 * Era el patrón de tres pantallas y tenía los mismos tres problemas en
 * todas: se quedaba para siempre (guardar dos veces no se distinguía de
 * guardar una), ocupaba lugar fijo y empujaba el contenido, y en un
 * formulario largo caía fuera de la pantalla justo al tocar el botón.
 * Eso último se reportó en vivo sobre Configuración del torneo, como
 * que guardar no daba ninguna señal.
 *
 * La confirmación de que algo salió bien va por `useAvisos`, que la
 * muestra sobre el contenido y la retira sola.
 *
 * Esto no alcanza a los avisos que **tienen** que quedarse: una
 * advertencia que hay que mirar antes de seguir (el nombre duplicado al
 * invitar), o el estado de una pantalla. El regex busca la confirmación
 * de una acción recién hecha, que es lo único que se reemplazó.
 */

const SRC = join(__dirname, '..', '..');
const CONFIRMACION_FIJA = /["'>\s](Guardado|Guardados|Guardada|Guardadas)\.?["'<\s]/;

/** El propio componente de avisos, que cita el patrón que reemplaza. */
const CARPETA_DE_AVISOS = __dirname;

function listarPantallas(dir: string): string[] {
  if (dir === CARPETA_DE_AVISOS) return [];
  return readdirSync(dir).flatMap((nombre) => {
    if (nombre === 'node_modules') return [];
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarPantallas(ruta);
    return nombre.endsWith('.tsx') && !nombre.includes('.test.') ? [ruta] : [];
  });
}

const pantallas = listarPantallas(SRC);

describe('la confirmación de guardado no vuelve a quedarse fija en el formulario', () => {
  it('hay pantallas para revisar (si esto falla, el recorrido está mal)', () => {
    expect(pantallas.length).toBeGreaterThan(0);
  });

  it.each(pantallas)('%s', (ruta) => {
    const contenido = readFileSync(ruta, 'utf8');
    expect(
      CONFIRMACION_FIJA.test(contenido),
      `${relative(SRC, ruta)} muestra un «Guardado.» dentro de la pantalla: ` +
        'usá `useAvisos().exito("…")`, que lo muestra sobre el contenido y lo retira solo',
    ).toBe(false);
  });
});
