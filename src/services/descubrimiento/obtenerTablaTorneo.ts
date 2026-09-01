import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPuedeVerTorneo } from '@/lib/permisos';
import { obtenerTabla, type TablaDeGrupo } from '@/services/posiciones/obtenerTabla';

/**
 * UC-23/UC-35 — La tabla pública del torneo (`10`, sección 5): resuelve
 * a qué fase corresponde antes de delegar en `obtenerTabla` (T15), que
 * no conoce el torneo, solo la fase o el grupo puntual. Mismo criterio
 * de visibilidad que `obtenerFichaTorneo`/`obtenerFixturePublico` —
 * `obtenerTabla` en sí no lo aplica porque también la usan llamadores
 * internos ya autorizados (`generarFixture`, T13), así que la puerta va
 * acá, en la entrada pública.
 *
 * La fase con tabla es la última fase de tipo `league`: en `league` es
 * la única; en `groups_knockout` es la fase de grupos; en `knockout`
 * puro no hay ninguna, y la respuesta es una lista vacía — el torneo no
 * tiene tabla, no es un error.
 */

const esquemaEntrada = z.object({ torneoId: z.string().uuid() });
export type ObtenerTablaTorneoInput = z.infer<typeof esquemaEntrada>;

export const obtenerTablaTorneo: Servicio<ObtenerTablaTorneoInput, TablaDeGrupo[]> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  const pool = obtenerPool();

  const { rows: torneoRows } = await pool.query<{
    id: string;
    organizacion_id: string;
    estado: string;
  }>('SELECT id, organizacion_id, estado FROM torneo WHERE id = $1', [datos.torneoId]);
  const torneo = torneoRows[0];
  if (!torneo) throw crearError('NO_ENCONTRADO');
  await verificarPuedeVerTorneo(contexto, {
    id: torneo.id,
    organizacionId: torneo.organizacion_id,
    estado: torneo.estado,
  });

  const { rows: faseRows } = await pool.query<{ id: string }>(
    `SELECT id FROM fase WHERE torneo_id = $1 AND tipo_fase = 'league' ORDER BY orden DESC LIMIT 1`,
    [datos.torneoId],
  );
  const fase = faseRows[0];
  if (!fase) return [];

  return obtenerTabla({ faseId: fase.id }, contexto);
};
