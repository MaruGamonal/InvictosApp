import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * "`notificar(tipo, destinatarios, origen)` es interno y compartido:
 * ningún servicio arma notificaciones por su cuenta" (`10`, 4.9). Esta
 * prueba hace cumplir que nadie más escriba directamente en la tabla
 * `notificacion` — mismo criterio que `permisos.arquitectura.test.ts`
 * aplica sobre las tablas de vínculo (T4).
 */

const SERVICIOS_DIR = join(__dirname, '..');
const ARCHIVO_PERMITIDO = 'notificaciones/notificar.ts';

function listarArchivosTs(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarArchivosTs(ruta);
    return ruta.endsWith('.ts') && !ruta.endsWith('.test.ts') ? [ruta] : [];
  });
}

describe('ningún servicio arma notificaciones por su cuenta', () => {
  const archivos = listarArchivosTs(SERVICIOS_DIR).filter(
    (archivo) => relative(SERVICIOS_DIR, archivo) !== ARCHIVO_PERMITIDO,
  );

  it('hay servicios para revisar (si esto falla, el glob está mal)', () => {
    expect(archivos.length).toBeGreaterThan(0);
  });

  it.each(archivos)('%s', (archivo) => {
    const contenido = readFileSync(archivo, 'utf8');
    expect(
      /insert\s+into\s+notificacion\b/i.test(contenido),
      `${archivo} inserta en "notificacion" directamente — tiene que llamar a notificar() de src/services/notificaciones/notificar.ts`,
    ).toBe(false);
  });
});
