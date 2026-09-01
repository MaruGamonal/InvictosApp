import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * "Ningún servicio de este backlog consulta las tablas de vínculos por su
 * cuenta para decidir acceso" (`11`, T4) — no es una recomendación, es
 * una regla del backlog. Esta prueba la hace cumplir de forma automática
 * en vez de confiar en que se respete por acuerdo verbal.
 *
 * Un regex no puede distinguir "leer para decidir un permiso" (prohibido,
 * tiene que pasar por `permisos.ts`) de "leer o escribir porque gestionar
 * ese vínculo es el trabajo mismo del servicio" (T7 crea el vínculo de
 * titular; T8 gestiona miembros y colaboradores; T19 gestiona el
 * plantel). Por eso la regla se aplica con una lista explícita de
 * excepciones, revisada a mano: **agregar un archivo acá es una decisión
 * de diseño, no un permiso genérico** — si el archivo nuevo decide un
 * permiso en vez de gestionar el vínculo en sí, no entra en la lista, se
 * corrige para pasar por `permisos.ts`.
 */

const TABLAS_DE_VINCULO = ['integrante_equipo', 'miembro_organizacion', 'colaborador_torneo'];
const SERVICIOS_DIR = join(__dirname, '..', 'services');

// Rutas relativas a src/services/, con el ticket cuyo trabajo es gestionar
// ese vínculo (no decidir un permiso con él).
const EXCEPCIONES = new Set<string>([
  'organizadores/crearOrganizacion.ts', // T7 — crea el vínculo de titular al crear la organización
]);

function listarArchivosTs(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarArchivosTs(ruta);
    return ruta.endsWith('.ts') && !ruta.endsWith('.test.ts') ? [ruta] : [];
  });
}

describe('ningún servicio decide permisos consultando las tablas de vínculo por su cuenta', () => {
  const archivos = listarArchivosTs(SERVICIOS_DIR).filter(
    (archivo) => !EXCEPCIONES.has(relative(SERVICIOS_DIR, archivo)),
  );

  it('hay servicios para revisar (si esto falla, el glob está mal)', () => {
    expect(archivos.length).toBeGreaterThan(0);
  });

  it.each(archivos)('%s', (archivo) => {
    const contenido = readFileSync(archivo, 'utf8');
    for (const tabla of TABLAS_DE_VINCULO) {
      const patron = new RegExp(`\\b${tabla}\\b`, 'i');
      expect(
        patron.test(contenido),
        `${archivo} referencia "${tabla}" directamente — tiene que pasar por src/lib/permisos.ts, o agregarse a EXCEPCIONES si su trabajo es gestionar ese vínculo`,
      ).toBe(false);
    }
  });
});
