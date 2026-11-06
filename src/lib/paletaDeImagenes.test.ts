import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COLORES_SEMANTICOS, FONDO_IDENTIDAD, PALETA } from './paletaDeImagenes';

/**
 * La paleta de imágenes repite valores de `globals.css` porque `next/og`
 * no lee variables de CSS. Repetir es justo lo que se desincroniza: este
 * test resuelve cada token —siguiendo `var(--otro)` hasta un valor— y
 * exige que coincida.
 */
const css = readFileSync(join(__dirname, '..', 'app', 'globals.css'), 'utf8');
const raiz = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const tokens = new Map(
  [...raiz.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]),
);

function valorDe(token: string): string {
  const valor = tokens.get(token);
  if (valor === undefined) throw new Error(`${token} no está en globals.css`);
  const referencia = valor.match(/^var\((--[\w-]+)\)$/);
  return referencia ? valorDe(referencia[1]!) : valor.toLowerCase();
}

describe('paleta de imágenes', () => {
  it('cada color es el valor de su token en globals.css', () => {
    expect(PALETA).toEqual({
      ink900: valorDe('--ink-900'),
      ink800: valorDe('--ink-800'),
      blanco: valorDe('--blanco'),
      grisClaroSobreOscuro: valorDe('--gris-claro-sobre-oscuro'),
      acento: valorDe('--acento'),
    });
    expect(FONDO_IDENTIDAD.toLowerCase()).toBe(valorDe('--identidad-fondo'));
  });

  it('los colores semánticos son los mismos que usa Badge', () => {
    expect(COLORES_SEMANTICOS).toEqual({
      exito: { fondo: valorDe('--exito-fondo'), texto: valorDe('--exito-texto') },
      informacion: {
        fondo: valorDe('--informacion-fondo'),
        texto: valorDe('--informacion-texto'),
      },
      advertencia: {
        fondo: valorDe('--advertencia-fondo'),
        texto: valorDe('--advertencia-texto'),
      },
      error: { fondo: valorDe('--error-fondo'), texto: valorDe('--error-texto') },
      // Badge usa el secundario para el texto neutro, no `--neutro-texto`.
      neutro: { fondo: valorDe('--neutro-fondo'), texto: valorDe('--color-texto-secundario') },
    });
  });
});
