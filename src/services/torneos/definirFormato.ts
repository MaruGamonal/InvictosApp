import { z } from 'zod';
import type { Servicio } from '@/lib/servicio';
import { obtenerPool } from '@/db/cliente';
import { crearError } from '@/lib/errores';
import { validarEntrada } from '@/lib/validacion';
import { verificarPermisoTorneo } from '@/lib/permisos';

/**
 * UC-17 — Definir el formato del torneo: crea **fases y grupos** (`03`,
 * 3.8). Fase y Grupo existen incluso en el formato más simple —un
 * torneo de liga tiene una única fase con un único grupo— para que
 * ninguna consulta de tabla o de fixture necesite un camino distinto
 * según el formato.
 *
 * En `groups_knockout` solo se crean los grupos (zonas) de la **primera**
 * fase: los de la fase eliminatoria dependen de quién clasifica, y eso
 * todavía no existe en este ticket (T13 genera el fixture).
 *
 * Redefinir el formato de un torneo que ya lo tenía definido reemplaza
 * la estructura anterior por completo — es lo mismo que volver a elegir
 * formato antes de que el torneo tenga nada jugado, no una excepción.
 * Con partidos jugados, falla con `TORNEO_YA_EMPEZADO`.
 */

const ZONAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const esquemaEntrada = z.discriminatedUnion('formato', [
  z.object({
    torneoId: z.string().uuid(),
    formato: z.literal('league'),
    idaYVuelta: z.boolean().optional(),
  }),
  z.object({
    torneoId: z.string().uuid(),
    formato: z.literal('knockout'),
    idaYVuelta: z.boolean().optional(),
  }),
  z.object({
    torneoId: z.string().uuid(),
    formato: z.literal('groups_knockout'),
    cantidadZonas: z.number().int().min(2).max(ZONAS.length),
    clasificadosPorZona: z.number().int().min(1),
    idaYVuelta: z.boolean().optional(),
  }),
]);

export type DefinirFormatoInput = z.infer<typeof esquemaEntrada>;

export interface DefinirFormatoResultado {
  fases: Array<{ id: string; tipoFase: 'league' | 'knockout'; orden: number; grupos: string[] }>;
}

export const definirFormato: Servicio<DefinirFormatoInput, DefinirFormatoResultado> = async (
  input,
  contexto,
) => {
  const datos = validarEntrada(esquemaEntrada, input);
  await verificarPermisoTorneo(contexto, datos.torneoId, 'configurar_torneo');

  const pool = obtenerPool();
  const { rows: jugados } = await pool.query(
    `SELECT 1 FROM partido WHERE torneo_id = $1 AND estado = 'played' LIMIT 1`,
    [datos.torneoId],
  );
  if (jugados.length > 0) throw crearError('TORNEO_YA_EMPEZADO');

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    await cliente.query(
      `DELETE FROM grupo WHERE fase_id IN (SELECT id FROM fase WHERE torneo_id = $1)`,
      [datos.torneoId],
    );
    await cliente.query('DELETE FROM fase WHERE torneo_id = $1', [datos.torneoId]);

    await cliente.query('UPDATE torneo SET formato = $1, version = version + 1 WHERE id = $2', [
      datos.formato,
      datos.torneoId,
    ]);

    const fases: DefinirFormatoResultado['fases'] = [];

    if (datos.formato === 'groups_knockout') {
      const { rows: faseGrupos } = await cliente.query<{ id: string }>(
        `INSERT INTO fase (torneo_id, nombre, tipo_fase, orden, ida_y_vuelta, clasifican_por_grupo)
         VALUES ($1, 'Fase de grupos', 'league', 1, $2, $3) RETURNING id`,
        [datos.torneoId, datos.idaYVuelta ?? false, datos.clasificadosPorZona],
      );
      const faseGruposId = faseGrupos[0]!.id;
      const nombresZonas: string[] = [];
      for (let i = 0; i < datos.cantidadZonas; i += 1) {
        const nombre = `Zona ${ZONAS[i]}`;
        await cliente.query('INSERT INTO grupo (fase_id, nombre) VALUES ($1, $2)', [
          faseGruposId,
          nombre,
        ]);
        nombresZonas.push(nombre);
      }
      fases.push({ id: faseGruposId, tipoFase: 'league', orden: 1, grupos: nombresZonas });

      const { rows: faseElim } = await cliente.query<{ id: string }>(
        `INSERT INTO fase (torneo_id, nombre, tipo_fase, orden, ida_y_vuelta)
         VALUES ($1, 'Eliminación directa', 'knockout', 2, false) RETURNING id`,
        [datos.torneoId],
      );
      fases.push({ id: faseElim[0]!.id, tipoFase: 'knockout', orden: 2, grupos: [] });
    } else {
      const tipoFase = datos.formato === 'league' ? 'league' : 'knockout';
      const nombreFase = datos.formato === 'league' ? 'Fase única' : 'Eliminación directa';
      const { rows: fase } = await cliente.query<{ id: string }>(
        `INSERT INTO fase (torneo_id, nombre, tipo_fase, orden, ida_y_vuelta)
         VALUES ($1, $2, $3, 1, $4) RETURNING id`,
        [datos.torneoId, nombreFase, tipoFase, datos.idaYVuelta ?? false],
      );
      const faseId = fase[0]!.id;
      await cliente.query(`INSERT INTO grupo (fase_id, nombre) VALUES ($1, 'Grupo único')`, [
        faseId,
      ]);
      fases.push({ id: faseId, tipoFase, orden: 1, grupos: ['Grupo único'] });
    }

    await cliente.query('COMMIT');
    return { fases };
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
};
