import type { ColorSemantico } from './etiquetas';

/**
 * Los colores del sistema, en hexadecimal, para lo que se dibuja fuera
 * del CSS: la imagen al compartir un torneo (`opengraph-image.tsx`).
 * `next/og` no lee variables de CSS, así que ahí no se puede escribir
 * `var(--acento)`.
 *
 * No son colores nuevos: cada uno es el valor de un token de
 * `src/app/globals.css`, y `paletaDeImagenes.test.ts` falla si alguno
 * deja de coincidir. Si cambia un token, se cambia acá también.
 */
export const PALETA = {
  ink900: '#0e1720',
  ink800: '#142230',
  blanco: '#ffffff',
  grisClaroSobreOscuro: '#a9b4bc',
  acento: '#00a8cc',
} as const;

/** El fondo de las superficies de identidad (`--identidad-fondo`). */
export const FONDO_IDENTIDAD = 'linear-gradient(165deg, #0e1720 0%, #142230 65%, #1b2a38 100%)';

/** Fondo y texto de cada color semántico, como los usa `Badge` (`04`, sección 6). */
export const COLORES_SEMANTICOS: Record<ColorSemantico, { fondo: string; texto: string }> = {
  exito: { fondo: '#e4f3e8', texto: '#12662c' },
  informacion: { fondo: '#e7e9fb', texto: '#322ba0' },
  advertencia: { fondo: '#fbebd3', texto: '#7a4600' },
  error: { fondo: '#fef7f6', texto: '#a11f12' },
  neutro: { fondo: '#eff2f4', texto: '#5c6a74' },
};
