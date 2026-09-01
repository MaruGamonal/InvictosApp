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
  'identidad/obtenerPerfilPublico.ts', // T18 — lista los equipos del perfil; es la participación pública, no una decisión de permiso
  'equipos/_vinculo.ts', // T19 — helper interno que crea/reactiva el vínculo equipo+perfil+rol; es el plantel en sí
  'equipos/crearEquipo.ts', // T19 — crea el vínculo de capitán al crear el equipo
  'equipos/invitarIntegrante.ts', // T19 — gestiona el plantel: crea/reactiva vínculos invited o active
  'equipos/responderInvitacion.ts', // T19 — resuelve el vínculo invited propio (aceptar/rechazar)
  'equipos/cancelarInvitacion.ts', // T19 — cancela el vínculo invited que el equipo propuso
  'equipos/cambiarRolIntegrante.ts', // T19 — designa/quita roles y transfiere la capitanía sobre el vínculo mismo
  'equipos/quitarIntegrante.ts', // T19 — da de baja el vínculo (propio o de otro integrante)
  'equipos/solicitarIngreso.ts', // T19 — crea el vínculo requested; consulta capitán/delegados solo para notificarles, no para decidir permiso
  'equipos/resolverSolicitudIngreso.ts', // T19 — resuelve el vínculo requested propuesto por la persona
  'equipos/retirarSolicitudIngreso.ts', // T19 — cancela el vínculo requested propio
  'organizadores/invitarMiembro.ts', // T8 — crea el vínculo de administrador
  'organizadores/quitarMiembro.ts', // T8 — borra el vínculo de administrador
  'organizadores/listarMiembros.ts', // T8 — lista el equipo de trabajo; es el propio dato que gestiona, no una decisión de permiso
  'organizadores/asignarColaborador.ts', // T8 — crea/reactiva el vínculo de colaborador de un torneo
  'organizadores/quitarColaborador.ts', // T8 — da de baja lógica el vínculo de colaborador
  'torneos/_notificarCambio.ts', // T10 — resuelve destinatarios (capitán/delegados) para notificar; no decide un permiso
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
