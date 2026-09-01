import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * "Ningún servicio de este backlog consulta las tablas de vínculos por su
 * cuenta" (`11`, T4) — no es una recomendación, es una regla del backlog.
 * Esta prueba la hace cumplir de forma automática en vez de confiar en
 * que se respete por acuerdo verbal.
 */

const TABLAS_DE_VINCULO = ['integrante_equipo', 'miembro_organizacion', 'colaborador_torneo'];
const SERVICIOS_DIR = join(__dirname, '..', 'services');

function listarArchivosTs(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarArchivosTs(ruta);
    return ruta.endsWith('.ts') && !ruta.endsWith('.test.ts') ? [ruta] : [];
  });
}

describe('ningún servicio consulta las tablas de vínculo directamente', () => {
  const archivos = listarArchivosTs(SERVICIOS_DIR);

  it('hay servicios para revisar (si esto falla, el glob está mal)', () => {
    expect(archivos.length).toBeGreaterThan(0);
  });

  it.each(archivos)('%s', (archivo) => {
    const contenido = readFileSync(archivo, 'utf8');
    for (const tabla of TABLAS_DE_VINCULO) {
      const patron = new RegExp(`\\b${tabla}\\b`, 'i');
      expect(
        patron.test(contenido),
        `${archivo} referencia "${tabla}" directamente — tiene que pasar por src/lib/permisos.ts`,
      ).toBe(false);
    }
  });
});
