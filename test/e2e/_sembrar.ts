import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { obtenerPool } from '@/db/cliente';
import { cargarResultado } from '@/services/competencia/cargarResultado';
import {
  crearTorneoDePrueba,
  inscribirEquipos,
  generarYConfirmarFixture,
} from '../integracion/_escenarios';

/**
 * T27 — El escenario que recorre la suite de punta a punta.
 *
 * Se arma llamando a los **servicios reales** contra Postgres real, con
 * los mismos ayudantes que ya usa la suite de integración: un torneo
 * sembrado con `INSERT`s a mano podría quedar en un estado que el
 * producto nunca produce, y entonces las pruebas pasarían sobre algo
 * que no existe.
 *
 * Los ids se dejan en un archivo que las pruebas leen: no hay forma de
 * pasarle valores a un `spec` de Playwright desde el setup, y
 * adivinarlos con consultas desde cada prueba sería repetir el armado.
 */

export const ARCHIVO_ESCENARIO = join(process.cwd(), 'test/e2e/.escenario.json');

export interface EscenarioSembrado {
  /** Torneo en curso, con fixture confirmado, cuatro equipos y un resultado cargado. */
  torneoId: string;
  torneoNombre: string;
  organizacionId: string;
  organizacionNombre: string;
  ciudadNombre: string;
  equipoIds: string[];
  equipoNombres: string[];
  /** El partido que quedó con resultado cargado, 3 a 1. */
  partidoConResultadoId: string;
}

export async function sembrarEscenario(): Promise<EscenarioSembrado> {
  const pool = obtenerPool();

  const escenario = await crearTorneoDePrueba({ formato: 'league', cupoEquipos: 8 });

  // D-51: un torneo de organización sin verificar nace `unlisted` y no
  // entra al descubrimiento. Para poder probar la búsqueda hace falta
  // que esté verificada — es lo único que se escribe a mano, porque
  // verificarla de verdad pasa por un correo y acá no hay proveedor.
  await pool.query(`UPDATE organizacion SET nivel_verificacion = 'basic' WHERE id = $1`, [
    escenario.organizacionId,
  ]);
  await pool.query(`UPDATE torneo SET visibilidad = 'public' WHERE id = $1`, [escenario.torneoId]);

  const equipos = await inscribirEquipos(escenario, 4);
  await generarYConfirmarFixture(escenario);

  // Un resultado cargado, porque sin ninguno la tabla de posiciones no
  // tiene filas: `posicion` se llena a medida que llegan los
  // resultados, no al confirmar el fixture. Sin esto la pantalla de
  // tabla mostraría su estado vacío y no habría nada que verificar.
  const { rows: primerPartido } = await pool.query<{ id: string; version: number }>(
    `SELECT id, version FROM partido
     WHERE torneo_id = $1 ORDER BY numero_fecha ASC, id ASC LIMIT 1`,
    [escenario.torneoId],
  );
  await cargarResultado(
    {
      partidoId: primerPartido[0]!.id,
      version: primerPartido[0]!.version,
      golesLocal: 3,
      golesVisitante: 1,
    },
    escenario.titular.contexto,
  );

  const { rows: torneo } = await pool.query<{ nombre: string; ciudad: string }>(
    `SELECT t.nombre, c.nombre AS ciudad
     FROM torneo t JOIN ciudad c ON c.id = t.ciudad_id
     WHERE t.id = $1`,
    [escenario.torneoId],
  );
  const { rows: organizacion } = await pool.query<{ nombre: string }>(
    'SELECT nombre FROM organizacion WHERE id = $1',
    [escenario.organizacionId],
  );
  const { rows: nombresEquipos } = await pool.query<{ id: string; nombre: string }>(
    'SELECT id, nombre FROM equipo WHERE id = ANY($1::uuid[]) ORDER BY nombre',
    [equipos.map((equipo) => equipo.equipoId)],
  );

  const sembrado: EscenarioSembrado = {
    torneoId: escenario.torneoId,
    torneoNombre: torneo[0]!.nombre,
    organizacionId: escenario.organizacionId,
    organizacionNombre: organizacion[0]!.nombre,
    ciudadNombre: torneo[0]!.ciudad,
    equipoIds: nombresEquipos.map((fila) => fila.id),
    equipoNombres: nombresEquipos.map((fila) => fila.nombre),
    partidoConResultadoId: primerPartido[0]!.id,
  };

  writeFileSync(ARCHIVO_ESCENARIO, JSON.stringify(sembrado, null, 2));
  return sembrado;
}
