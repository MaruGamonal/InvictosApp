import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * El catálogo del sistema de diseño es herramienta interna: muestra los
 * nombres internos de todos los estados y no le sirve a ningún usuario.
 * Era una ruta pública (auditoría de wording, hallazgo #003).
 *
 * Esta prueba existe porque el candado es una sola línea fácil de
 * perder en un merge, y perderla no rompe nada visible: la pantalla
 * simplemente vuelve a estar ahí para cualquiera.
 */
describe('el catálogo no se sirve en producción', () => {
  it('la página corta con notFound() cuando NODE_ENV es production', () => {
    const fuente = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(fuente).toContain("import { notFound } from 'next/navigation'");
    expect(fuente).toContain("if (process.env.NODE_ENV === 'production') notFound();");
  });
});
