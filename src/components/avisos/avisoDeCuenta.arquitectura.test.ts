import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Cuando una acción se rechaza por cuenta sin confirmar, el aviso sale
 * por `useAvisos().cuentaNoConfirmada()`, nunca insertando un bloque en
 * la pantalla.
 *
 * Antes cada pantalla lo resolvía a su manera. «Pedir sumarme» se
 * reemplazaba a sí mismo por el aviso, así que el botón desaparecía y la
 * ficha del equipo cambiaba de alto. Los formularios de alta lo metían
 * entre los campos y movían de lugar todo lo que venía después, con el
 * formulario ya completo. Reportado en vivo.
 *
 * `AvisoCuentaNoConfirmada` sobrevive, pero solo como **pantalla
 * entera**: en «Crear equipo» y «Crear torneo» se muestra en lugar del
 * formulario, antes de renderizarlo. Ahí no desplaza nada porque es todo
 * lo que hay. La lista de abajo son esas dos pantallas, y crecer esa
 * lista tiene que ser una decisión, no un descuido.
 */

const APP = join(__dirname, '..', '..', 'app');
const COMPONENTES = join(__dirname, '..');

/** Pantallas donde el aviso ES el contenido, no algo intercalado. */
const PANTALLAS_COMPLETAS = new Set(['app/equipo/crear/page.tsx', 'app/torneo/crear/page.tsx']);

function listarPantallas(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarPantallas(ruta);
    return nombre.endsWith('.tsx') && !nombre.includes('.test.') ? [ruta] : [];
  });
}

const RAIZ = join(__dirname, '..', '..');
const pantallas = [...listarPantallas(APP), ...listarPantallas(COMPONENTES)];
const usanElAviso = pantallas.filter((ruta) =>
  /<AvisoCuentaNoConfirmada/.test(readFileSync(ruta, 'utf8')),
);

describe('el bloqueo por cuenta sin confirmar no se intercala en el contenido', () => {
  it('hay pantallas para revisar (si esto falla, el recorrido está mal)', () => {
    expect(pantallas.length).toBeGreaterThan(0);
  });

  it.each(usanElAviso)('%s', (ruta) => {
    const relativa = relative(RAIZ, ruta).split('\\').join('/');
    expect(
      PANTALLAS_COMPLETAS.has(relativa),
      `${relativa} renderiza <AvisoCuentaNoConfirmada> dentro del contenido: ` +
        'usá `useAvisos().cuentaNoConfirmada()`, que avisa sin mover la pantalla. ' +
        'Si de verdad es una pantalla entera, sumala a PANTALLAS_COMPLETAS.',
    ).toBe(true);
  });
});
